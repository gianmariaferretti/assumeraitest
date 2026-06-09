import {
  RESUME_PARSER_CONTRACT_VERSION,
  type CandidateReviewPrompt,
  type FieldConfidence,
  type IdFactory,
  type ResumeDocumentInput,
  resumeDocumentInputSchema,
  type ResumeParseDraft,
  type ResumeParserProvider,
  resumeParserProviderResultSchema
} from "./contracts";
import { resolveRawCvRetentionDays } from "./retention";
import { assertNoProtectedTraitInferences, assertNoScoreFields } from "./safety";

const LOW_CONFIDENCE_THRESHOLD = 70;

export interface ParseResumeDocumentOptions {
  readonly now?: Date | string;
  readonly idFactory?: IdFactory;
  readonly rawCvRetentionDays?: number;
}

function defaultIdFactory(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function asIsoString(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? new Date().toISOString();
}

function formatParserConfidenceForPrompt(confidence: number): string {
  return `${normalizeConfidenceScale(confidence)}%`;
}

function normalizeConfidenceScale(confidence: number): number {
  const normalized = confidence > 0 && confidence <= 1 ? confidence * 100 : confidence;

  return Math.round(Math.min(100, Math.max(0, normalized)));
}

function normalizeFieldConfidenceScale(fieldConfidence: FieldConfidence): FieldConfidence {
  return Object.fromEntries(
    Object.entries(fieldConfidence).map(([fieldPath, confidence]) => [
      fieldPath,
      normalizeConfidenceScale(confidence)
    ])
  );
}

function buildCandidateReviewPrompts(
  fieldConfidence: Record<string, number>,
  missingData: readonly string[],
  unresolvedAmbiguities: readonly string[],
  idFactory: IdFactory
): CandidateReviewPrompt[] {
  const prompts: CandidateReviewPrompt[] = [];

  for (const [fieldPath, confidence] of Object.entries(fieldConfidence)) {
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      prompts.push({
        prompt_id: idFactory("review_prompt"),
        field_path: fieldPath,
        reason: "low_confidence",
        severity: "candidate_review",
        message: `Please confirm or correct ${fieldPath}; parser confidence is ${formatParserConfidenceForPrompt(
          confidence
        )}.`
      });
    }
  }

  for (const item of missingData) {
    prompts.push({
      prompt_id: idFactory("review_prompt"),
      field_path: item,
      reason: "missing_data",
      severity: "candidate_review",
      message: `Please add or confirm missing profile data: ${item}.`
    });
  }

  for (const ambiguity of unresolvedAmbiguities) {
    prompts.push({
      prompt_id: idFactory("review_prompt"),
      field_path: ambiguity,
      reason: "ambiguity",
      severity: "manual_review_recommended",
      message: `Please resolve ambiguous resume evidence: ${ambiguity}.`
    });
  }

  return prompts;
}

export async function parseResumeDocument(
  document: ResumeDocumentInput,
  provider: ResumeParserProvider,
  options: ParseResumeDocumentOptions = {}
): Promise<ResumeParseDraft> {
  const parsedDocument = resumeDocumentInputSchema.parse(document);
  const idFactory = options.idFactory ?? defaultIdFactory;
  const generatedAt = asIsoString(options.now);
  const rawCvRetentionDays = options.rawCvRetentionDays ?? resolveRawCvRetentionDays();
  const rawProviderResult = await provider.parse(parsedDocument);

  assertNoProtectedTraitInferences(rawProviderResult);
  assertNoScoreFields(rawProviderResult);

  const parsedProviderResult = resumeParserProviderResultSchema.parse(rawProviderResult);
  const providerResult = {
    ...parsedProviderResult,
    parser_confidence: normalizeConfidenceScale(parsedProviderResult.parser_confidence),
    field_confidence: normalizeFieldConfidenceScale(parsedProviderResult.field_confidence)
  };

  if (providerResult.profile.candidate_id !== parsedDocument.candidate_id) {
    throw new Error("Resume parser provider returned a profile for a different candidate_id.");
  }

  const auditEventId = providerResult.profile.parse_metadata?.audit_event_id ?? idFactory("audit_resume_parse");
  const unresolvedAmbiguities = providerResult.unresolved_ambiguities ?? [];
  const lowConfidenceReviewRequired =
    providerResult.parser_confidence < LOW_CONFIDENCE_THRESHOLD ||
    Object.values(providerResult.field_confidence).some((confidence) => confidence < LOW_CONFIDENCE_THRESHOLD) ||
    providerResult.missing_data.length > 0 ||
    unresolvedAmbiguities.length > 0;

  const profile = {
    ...providerResult.profile,
    confirmed_by_candidate: false,
    updated_at: generatedAt,
    parse_metadata: {
      ...providerResult.profile.parse_metadata,
      parser_version: provider.version,
      parser_confidence: providerResult.parser_confidence,
      field_confidence: providerResult.field_confidence,
      missing_data: providerResult.missing_data,
      audit_event_id: auditEventId
    },
    confirmation_metadata: {
      status: "draft" as const,
      correction_count: 0,
      correction_ids: [],
      audit_event_id: auditEventId
    }
  };

  const validatedProfile = resumeParserProviderResultSchema.shape.profile.parse(profile);

  return {
    parse_id: idFactory("resume_parse"),
    resume_document_id: parsedDocument.resume_document_id,
    candidate_id: parsedDocument.candidate_id,
    profile: validatedProfile,
    parser_name: provider.name,
    parser_version: provider.version,
    parser_confidence: providerResult.parser_confidence,
    field_confidence: providerResult.field_confidence,
    missing_data: providerResult.missing_data,
    unresolved_ambiguities: unresolvedAmbiguities,
    candidate_review_prompts: buildCandidateReviewPrompts(
      providerResult.field_confidence,
      providerResult.missing_data,
      unresolvedAmbiguities,
      idFactory
    ),
    low_confidence_review_required: lowConfidenceReviewRequired,
    raw_cv_retention_days: rawCvRetentionDays,
    audit_event_id: auditEventId,
    generated_at: generatedAt,
    contract_version: RESUME_PARSER_CONTRACT_VERSION
  };
}
