import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  InMemoryStorageProvider,
  ingestResumeDocument,
  type ResumeDocumentMetadata,
  type ResumeIngestionInput,
  type ResumeUploadAuditEvent,
  type SafeResumeUploadError,
  type StorageProvider
} from "../resume-ingestion";
import { SupabaseStorageProvider } from "../../lib/storage/supabase-storage-provider";
import type { ResumeParserRuntimeMode } from "./resume-parser-mode";
import {
  hasAnthropicResumeParserKey,
  normalizeResumeParserProvider
} from "./resume-parser-provider-config";
import {
  confirmCandidateProfile,
  createAnthropicResumeParserProvider,
  parseResumeDocument,
  type CandidateProfile,
  type CandidateProfileConfirmation,
  type CandidateProfileCorrectionRequest,
  type ConfirmCandidateProfileRequest,
  type FieldConfidence,
  type IdFactory,
  type ResumeDocumentInput,
  type ResumeParseDraft,
  type ResumeParserProvider,
  type ResumeParserProviderResult
} from "../resume-parsing";
import { enrichCandidateProfileUniversities } from "../university-enrichment";

export type CandidateResumeProfilePipelineErrorCode =
  | "candidate_mismatch"
  | "confirmation_failed"
  | "parse_failed"
  | "profile_not_found"
  | SafeResumeUploadError["code"];

export interface CandidateResumeProfilePipelineError {
  readonly code: CandidateResumeProfilePipelineErrorCode;
  readonly message: string;
  readonly status: number;
  readonly correlationId?: string;
}

export interface CandidateResumeScoreReadiness {
  readonly status:
    | "blocked_pending_candidate_confirmation"
    | "ready_for_scoring";
  readonly scoring_allowed: boolean;
  readonly candidate_confirmation_required: boolean;
  readonly employer_visible_without_consent: false;
  readonly recommendation_only: true;
  readonly requires_meaningful_human_review: true;
  readonly human_review_required: boolean;
  readonly reason_codes: readonly string[];
  readonly parser_confidence: number;
  readonly missing_data: readonly string[];
  readonly audit_event_id: string;
  readonly generated_at: string;
}

export interface CandidateResumeNextStep {
  readonly label: string;
  readonly href: string;
}

export interface CandidateResumeProfilePipelineSession {
  readonly resumeDocument: ResumeDocumentMetadata;
  readonly uploadAuditEvent: ResumeUploadAuditEvent;
  readonly parseDraft: ResumeParseDraft;
  readonly confirmation?: CandidateProfileConfirmation;
  readonly scoreReadiness: CandidateResumeScoreReadiness;
  readonly nextStep: CandidateResumeNextStep;
  readonly correlationId: string;
}

export interface CandidateResumeProfileReviewField {
  readonly field_path: string;
  readonly label: string;
  readonly value: string;
  readonly confidence: number | null;
  readonly input_kind: "text" | "textarea" | "csv";
}

export interface CandidateResumeProfileReview {
  readonly resumeDocumentId: string;
  readonly candidateId: string;
  readonly parseId: string;
  readonly profile: CandidateProfile;
  readonly reviewFields: readonly CandidateResumeProfileReviewField[];
  readonly candidateReviewPrompts: ResumeParseDraft["candidate_review_prompts"];
  readonly rawCvRetentionDays: number;
  readonly scoreReadiness: CandidateResumeScoreReadiness;
  readonly nextStep: CandidateResumeNextStep;
}

export interface StartCandidateResumeProfilePipelineInput extends ResumeIngestionInput {
  readonly parserMode?: ResumeParserRuntimeMode;
  readonly rawTextOverride?: string;
}

export type StartCandidateResumeProfilePipelineResult =
  | { readonly ok: true; readonly session: CandidateResumeProfilePipelineSession }
  | { readonly ok: false; readonly error: CandidateResumeProfilePipelineError };

export interface ConfirmCandidateResumeProfilePipelineInput {
  readonly resumeDocumentId: string;
  readonly candidateId: string;
  readonly confirmedBy: string;
  readonly auditEventId: string;
  readonly confirmedAt?: string;
  readonly corrections?: readonly CandidateProfileCorrectionRequest[];
}

export type ConfirmCandidateResumeProfilePipelineResult =
  | { readonly ok: true; readonly session: CandidateResumeProfilePipelineSession }
  | { readonly ok: false; readonly error: CandidateResumeProfilePipelineError };

export interface CandidateResumeProfilePipeline {
  start(
    input: StartCandidateResumeProfilePipelineInput
  ): Promise<StartCandidateResumeProfilePipelineResult>;
  getProfileReview(resumeDocumentId: string): CandidateResumeProfileReview | undefined;
  restore(session: CandidateResumeProfilePipelineSession): void;
  confirm(
    input: ConfirmCandidateResumeProfilePipelineInput
  ): ConfirmCandidateResumeProfilePipelineResult;
}

interface CandidateResumeProfilePipelineOptions {
  readonly storage?: StorageProvider;
  readonly provider?: ResumeParserProvider;
  readonly sessionStore?: CandidateResumeProfileSessionStore;
  readonly idFactory?: IdFactory;
  readonly now?: Date | (() => Date);
}

export interface CandidateResumeProfileSessionStore {
  get(resumeDocumentId: string): CandidateResumeProfilePipelineSession | undefined;
  set(resumeDocumentId: string, session: CandidateResumeProfilePipelineSession): void;
}

const CEFR_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2", "unknown"]);
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: false });
const LOCAL_PROFILE_DRAFT_STORE_PATH = join(
  process.cwd(),
  "data-sources",
  "local",
  "profile-drafts.json"
);

const globalSessionStore = globalThis as typeof globalThis & {
  __assumeraiCandidateResumeProfileSessions?: Map<
    string,
    CandidateResumeProfilePipelineSession
  >;
  __assumeraiCandidateResumeProfileSessionStore?: CandidateResumeProfileSessionStore;
};

export function createCandidateResumeProfilePipeline(
  options: CandidateResumeProfilePipelineOptions = {}
): CandidateResumeProfilePipeline {
  return new InMemoryCandidateResumeProfilePipeline(options);
}

export function buildCandidateProfileCorrectionsFromFormValues(
  profile: CandidateProfile,
  values: Readonly<Record<string, string | undefined>>
): CandidateProfileCorrectionRequest[] {
  const corrections: CandidateProfileCorrectionRequest[] = [];

  addCorrection(corrections, profile, "contact.full_name", values["contact.full_name"]);
  addCorrection(corrections, profile, "contact.email", values["contact.email"]);
  addCorrection(corrections, profile, "contact.location", values["contact.location"]);
  if (hasFormValue(values, "preferences.target_roles")) {
    addCorrection(
      corrections,
      profile,
      "preferences.target_roles",
      parseCsv(values["preferences.target_roles"])
    );
  }
  if (hasFormValue(values, "preferences.locations")) {
    addCorrection(
      corrections,
      profile,
      "preferences.locations",
      parseCsv(values["preferences.locations"])
    );
  }
  if (hasFormValue(values, "preferences.work_modes")) {
    addCorrection(
      corrections,
      profile,
      "preferences.work_modes",
      parseSelectedWorkModes(values["preferences.work_modes"])
    );
  }
  addEducationCorrection(corrections, profile, values);
  addExperienceCorrection(corrections, profile, values);

  if (hasFormValue(values, "skills")) {
    addCorrection(
      corrections,
      profile,
      "skills",
      parseCsv(values.skills).map((skill) => ({
        name: skill,
        category: "technical" as const,
        evidence_count: 1,
        evidence: ["Candidate profile confirmation"]
      }))
    );
  }

  if (hasFormValue(values, "languages")) {
    addCorrection(corrections, profile, "languages", parseConfirmedLanguages(values.languages));
  }

  return corrections;
}

export function createInMemoryCandidateResumeProfileSessionStore(
  sessions = new Map<string, CandidateResumeProfilePipelineSession>()
): CandidateResumeProfileSessionStore {
  return {
    get(resumeDocumentId: string): CandidateResumeProfilePipelineSession | undefined {
      return sessions.get(resumeDocumentId);
    },
    set(resumeDocumentId: string, session: CandidateResumeProfilePipelineSession): void {
      sessions.set(resumeDocumentId, session);
    }
  };
}

/**
 * Default storage: the private Supabase bucket in production (raw CVs must
 * survive serverless instances and be retention-managed); in-memory only under
 * NODE_ENV=test, and in local dev when no service role is configured.
 */
function createDefaultStorageProvider(): StorageProvider {
  if (process.env.NODE_ENV === "test") {
    return new InMemoryStorageProvider();
  }

  const supabaseStorageConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (process.env.NODE_ENV === "production" || supabaseStorageConfigured) {
    return new SupabaseStorageProvider();
  }

  return new InMemoryStorageProvider();
}

function createDefaultResumeProfileSessionStore(): CandidateResumeProfileSessionStore {
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "production") {
    return createSharedInMemoryCandidateResumeProfileSessionStore();
  }

  globalSessionStore.__assumeraiCandidateResumeProfileSessionStore ??=
    new FileBackedCandidateResumeProfileSessionStore(LOCAL_PROFILE_DRAFT_STORE_PATH);

  return globalSessionStore.__assumeraiCandidateResumeProfileSessionStore;
}

function createSharedInMemoryCandidateResumeProfileSessionStore(): CandidateResumeProfileSessionStore {
  globalSessionStore.__assumeraiCandidateResumeProfileSessions ??= new Map();
  return createInMemoryCandidateResumeProfileSessionStore(
    globalSessionStore.__assumeraiCandidateResumeProfileSessions
  );
}

function shouldUseSharedDefaultSessionStore(
  options: CandidateResumeProfilePipelineOptions
): boolean {
  return (
    options.storage === undefined &&
    options.provider === undefined &&
    options.sessionStore === undefined &&
    options.idFactory === undefined &&
    options.now === undefined
  );
}

class FileBackedCandidateResumeProfileSessionStore
  implements CandidateResumeProfileSessionStore
{
  constructor(private readonly filePath: string) {}

  get(resumeDocumentId: string): CandidateResumeProfilePipelineSession | undefined {
    return this.readSessions()[resumeDocumentId];
  }

  set(resumeDocumentId: string, session: CandidateResumeProfilePipelineSession): void {
    const sessions = this.readSessions();
    sessions[resumeDocumentId] = session;
    this.writeSessions(sessions);
  }

  private readSessions(): Record<string, CandidateResumeProfilePipelineSession> {
    if (!existsSync(this.filePath)) {
      return {};
    }

    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return parsed as Record<string, CandidateResumeProfilePipelineSession>;
    } catch {
      return {};
    }
  }

  private writeSessions(sessions: Record<string, CandidateResumeProfilePipelineSession>): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(sessions, null, 2));
  }
}

class InMemoryCandidateResumeProfilePipeline implements CandidateResumeProfilePipeline {
  private readonly sessions: CandidateResumeProfileSessionStore;
  private readonly storage: StorageProvider;
  private readonly provider: ResumeParserProvider;
  private readonly idFactory?: IdFactory;
  private readonly now?: Date | (() => Date);

  constructor(options: CandidateResumeProfilePipelineOptions) {
    this.storage = options.storage ?? createDefaultStorageProvider();
    this.provider = options.provider ?? createDefaultResumeParserProvider();
    this.sessions =
      options.sessionStore ??
      (shouldUseSharedDefaultSessionStore(options)
        ? createDefaultResumeProfileSessionStore()
        : createInMemoryCandidateResumeProfileSessionStore());
    this.idFactory = options.idFactory;
    this.now = options.now;
  }

  async start(
    input: StartCandidateResumeProfilePipelineInput
  ): Promise<StartCandidateResumeProfilePipelineResult> {
    const now = input.now ?? this.resolveNow();
    const ingestion = await ingestResumeDocument(
      {
        ...input,
        idFactory: input.idFactory ?? this.idFactory,
        now
      },
      this.storage
    );

    if (!ingestion.ok) {
      return { ok: false, error: ingestion.error };
    }

    try {
      const provider = resolveResumeParserProvider(this.provider, input.parserMode);
      const unsupportedInputError = validateResumeParserInput(
        provider,
        input.file,
        input.rawTextOverride,
        input.correlationId
      );

      if (unsupportedInputError) {
        return { ok: false, error: unsupportedInputError };
      }

      const parseDraft = await parseResumeDocument(
        {
          resume_document_id: ingestion.document.id,
          candidate_id: ingestion.document.candidateId,
          raw_text:
            normalizeRawTextOverride(input.rawTextOverride) ??
            createResumeRawTextPlaceholder(input.file),
          raw_file_base64: encodeRawFileForProvider(input.file.bytes),
          source_filename: input.file.name,
          content_type: input.file.mimeType,
          uploaded_at: ingestion.document.retention.receivedAt
        },
        provider,
        {
          idFactory: input.idFactory ?? this.idFactory,
          now,
          rawCvRetentionDays: input.config.rawCvRetentionDays
        }
      );
      const enrichedParseDraft: ResumeParseDraft = {
        ...parseDraft,
        profile: enrichCandidateProfileUniversities(parseDraft.profile)
      };

      const session: CandidateResumeProfilePipelineSession = {
        resumeDocument: ingestion.document,
        uploadAuditEvent: ingestion.auditEvent,
        parseDraft: enrichedParseDraft,
        scoreReadiness: buildBlockedScoreReadiness(enrichedParseDraft),
        nextStep: {
          label: "Review parsed profile",
          href: ingestion.document.candidateConfirmation.handoffPath
        },
        correlationId: input.correlationId
      };

      this.sessions.set(ingestion.document.id, session);
      return { ok: true, session };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "parse_failed",
          message: error instanceof Error ? error.message : "Resume parsing failed.",
          status: 422,
          correlationId: input.correlationId
        }
      };
    }
  }

  getProfileReview(resumeDocumentId: string): CandidateResumeProfileReview | undefined {
    const session = this.sessions.get(resumeDocumentId);

    if (!session) {
      return undefined;
    }

    return buildProfileReview(session);
  }

  restore(session: CandidateResumeProfilePipelineSession): void {
    this.sessions.set(session.resumeDocument.id, session);
  }

  confirm(
    input: ConfirmCandidateResumeProfilePipelineInput
  ): ConfirmCandidateResumeProfilePipelineResult {
    const session = this.sessions.get(input.resumeDocumentId);

    if (!session) {
      return {
        ok: false,
        error: {
          code: "profile_not_found",
          message: "No parsed profile draft was found for this resume document.",
          status: 404
        }
      };
    }

    if (session.resumeDocument.candidateId !== input.candidateId) {
      return {
        ok: false,
        error: {
          code: "candidate_mismatch",
          message: "This parsed profile belongs to a different candidate.",
          status: 403
        }
      };
    }

    try {
      const request: ConfirmCandidateProfileRequest = {
        candidate_id: input.candidateId,
        confirmed_by: input.confirmedBy,
        audit_event_id: input.auditEventId,
        confirmed_at: input.confirmedAt ?? this.resolveNow().toISOString(),
        corrections: input.corrections ?? []
      };
      const confirmation = confirmCandidateProfile(session.parseDraft, request, {
        idFactory: this.idFactory,
        now: request.confirmed_at
      });
      const updatedSession: CandidateResumeProfilePipelineSession = {
        ...session,
        confirmation,
        scoreReadiness: buildReadyScoreReadiness(session.parseDraft, confirmation),
        nextStep: {
          label: "Continue to interview handoff",
          href: "/candidate/interview/moving-forward"
        }
      };

      this.sessions.set(input.resumeDocumentId, updatedSession);
      return { ok: true, session: updatedSession };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "confirmation_failed",
          message:
            error instanceof Error
              ? error.message
              : "Candidate profile confirmation failed.",
          status: 422
        }
      };
    }
  }

  private resolveNow(): Date {
    if (this.now instanceof Date) {
      return new Date(this.now);
    }

    if (typeof this.now === "function") {
      return this.now();
    }

    return new Date();
  }
}

export const candidateResumeProfilePipeline = createCandidateResumeProfilePipeline();

function buildBlockedScoreReadiness(
  draft: ResumeParseDraft
): CandidateResumeScoreReadiness {
  return {
    status: "blocked_pending_candidate_confirmation",
    scoring_allowed: false,
    candidate_confirmation_required: true,
    employer_visible_without_consent: false,
    recommendation_only: true,
    requires_meaningful_human_review: true,
    human_review_required: true,
    reason_codes: [
      "candidate_profile_not_confirmed",
      ...buildParserReviewReasonCodes(draft)
    ],
    parser_confidence: draft.parser_confidence,
    missing_data: draft.missing_data,
    audit_event_id: draft.audit_event_id,
    generated_at: draft.generated_at
  };
}

function buildReadyScoreReadiness(
  draft: ResumeParseDraft,
  confirmation: CandidateProfileConfirmation
): CandidateResumeScoreReadiness {
  return {
    status: "ready_for_scoring",
    scoring_allowed: true,
    candidate_confirmation_required: false,
    employer_visible_without_consent: false,
    recommendation_only: true,
    requires_meaningful_human_review: true,
    human_review_required: draft.low_confidence_review_required,
    reason_codes: [
      "confirmed_profile_ready_for_resume_scoring",
      ...buildParserReviewReasonCodes(draft)
    ],
    parser_confidence: draft.parser_confidence,
    missing_data: draft.missing_data,
    audit_event_id: confirmation.audit_event_id,
    generated_at: confirmation.confirmed_at
  };
}

function buildParserReviewReasonCodes(draft: ResumeParseDraft): string[] {
  const reasons: string[] = [];

  if (draft.low_confidence_review_required) {
    reasons.push("parser_low_confidence_or_missing_data");
  }

  if (draft.unresolved_ambiguities.length > 0) {
    reasons.push("parser_ambiguity_requires_review");
  }

  return reasons;
}

function buildProfileReview(
  session: CandidateResumeProfilePipelineSession
): CandidateResumeProfileReview {
  const profile = session.confirmation?.profile ?? session.parseDraft.profile;

  return {
    resumeDocumentId: session.resumeDocument.id,
    candidateId: session.resumeDocument.candidateId,
    parseId: session.parseDraft.parse_id,
    profile,
    reviewFields: buildReviewFields(profile, session.parseDraft.field_confidence),
    candidateReviewPrompts: session.parseDraft.candidate_review_prompts,
    rawCvRetentionDays: session.parseDraft.raw_cv_retention_days,
    scoreReadiness: session.scoreReadiness,
    nextStep: session.nextStep
  };
}

function addCorrection(
  corrections: CandidateProfileCorrectionRequest[],
  profile: CandidateProfile,
  fieldPath: string,
  correctedValue: unknown
): void {
  if (correctedValue === undefined) {
    return;
  }

  const previousValue = getProfilePathValue(profile, fieldPath);

  if (areProfileValuesEqual(previousValue, correctedValue)) {
    return;
  }

  corrections.push({
    field_path: fieldPath,
    corrected_value: correctedValue,
    reason: "Candidate confirmed or corrected this profile field."
  });
}

function hasFormValue(
  values: Readonly<Record<string, string | undefined>>,
  fieldPath: string
): boolean {
  return Object.prototype.hasOwnProperty.call(values, fieldPath);
}

function hasAnyFormValue(
  values: Readonly<Record<string, string | undefined>>,
  fieldPaths: readonly string[]
): boolean {
  return fieldPaths.some((fieldPath) => hasFormValue(values, fieldPath));
}

function addEducationCorrection(
  corrections: CandidateProfileCorrectionRequest[],
  profile: CandidateProfile,
  values: Readonly<Record<string, string | undefined>>
): void {
  const fieldPaths = Object.keys(values).filter((fieldPath) =>
    /^education\.\d+\.(institution|degree|field|start_date|end_date|grades|honors|projects)$/.test(
      fieldPath
    )
  );

  if (fieldPaths.length === 0 || !hasAnyFormValue(values, fieldPaths)) {
    return;
  }

  const nextEducation = [...profile.education];
  const indices = uniqueSortedIndices(fieldPaths);

  for (const index of indices) {
    const currentEducation = nextEducation[index] ?? {
      institution: "",
      degree: "",
      field: ""
    };
    const nextRecord = {
      ...currentEducation,
      institution:
        values[`education.${index}.institution`] ?? currentEducation.institution,
      degree: values[`education.${index}.degree`] ?? currentEducation.degree,
      field: values[`education.${index}.field`] ?? currentEducation.field,
      ...optionalStringField(
        "start_date",
        values[`education.${index}.start_date`],
        currentEducation.start_date
      ),
      ...optionalStringField(
        "end_date",
        values[`education.${index}.end_date`],
        currentEducation.end_date
      ),
      ...optionalStringField(
        "grades",
        values[`education.${index}.grades`],
        currentEducation.grades
      ),
      ...optionalStringArrayField(
        "honors",
        values[`education.${index}.honors`],
        currentEducation.honors
      ),
      ...optionalStringArrayField(
        "projects",
        values[`education.${index}.projects`],
        currentEducation.projects
      )
    };

    if (hasEducationRecordContent(nextRecord)) {
      nextEducation[index] = nextRecord;
    }
  }

  addCorrection(
    corrections,
    profile,
    "education",
    nextEducation.filter(hasEducationRecordContent)
  );
}

function addExperienceCorrection(
  corrections: CandidateProfileCorrectionRequest[],
  profile: CandidateProfile,
  values: Readonly<Record<string, string | undefined>>
): void {
  const fieldPaths = Object.keys(values).filter((fieldPath) =>
    /^experience\.\d+\.(company|title|start_date|end_date|responsibilities|measurable_impact|tools)$/.test(
      fieldPath
    )
  );

  if (fieldPaths.length === 0 || !hasAnyFormValue(values, fieldPaths)) {
    return;
  }

  const nextExperience = [...profile.experience];
  const indices = uniqueSortedIndices(fieldPaths);

  for (const index of indices) {
    const currentExperience = nextExperience[index] ?? {
      company: "",
      title: "",
      start_date: ""
    };
    const nextRecord = {
      ...currentExperience,
      company: values[`experience.${index}.company`] ?? currentExperience.company,
      title: values[`experience.${index}.title`] ?? currentExperience.title,
      start_date:
        values[`experience.${index}.start_date`] ?? currentExperience.start_date,
      ...optionalNullableStringField(
        "end_date",
        values[`experience.${index}.end_date`],
        currentExperience.end_date
      ),
      ...optionalStringArrayField(
        "responsibilities",
        values[`experience.${index}.responsibilities`],
        currentExperience.responsibilities
      ),
      ...optionalStringArrayField(
        "measurable_impact",
        values[`experience.${index}.measurable_impact`],
        currentExperience.measurable_impact
      ),
      ...optionalStringArrayField(
        "tools",
        values[`experience.${index}.tools`],
        currentExperience.tools
      )
    };

    if (hasExperienceRecordContent(nextRecord)) {
      nextExperience[index] = nextRecord;
    }
  }

  addCorrection(
    corrections,
    profile,
    "experience",
    nextExperience.filter(hasExperienceRecordContent)
  );
}

function getProfilePathValue(profile: CandidateProfile, fieldPath: string): unknown {
  let cursor: unknown = profile;

  for (const segment of fieldPath.split(".")) {
    if (cursor === null || typeof cursor !== "object") {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function areProfileValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function uniqueSortedIndices(fieldPaths: readonly string[]): number[] {
  return [
    ...new Set(
      fieldPaths.flatMap((fieldPath) => {
        const match = /\.(\d+)\./.exec(fieldPath);
        return match ? [Number.parseInt(match[1], 10)] : [];
      })
    )
  ].sort((left, right) => left - right);
}

function optionalStringField(
  key: string,
  submittedValue: string | undefined,
  currentValue: string | undefined
): Record<string, string> {
  const value = submittedValue ?? currentValue;

  return value && value.trim().length > 0 ? { [key]: value.trim() } : {};
}

function optionalNullableStringField(
  key: string,
  submittedValue: string | undefined,
  currentValue: string | null | undefined
): Record<string, string | null> {
  const value = submittedValue ?? currentValue;

  if (value === null) {
    return { [key]: null };
  }

  return value && value.trim().length > 0 ? { [key]: value.trim() } : {};
}

function optionalStringArrayField(
  key: string,
  submittedValue: string | undefined,
  currentValue: readonly string[] | undefined
): Record<string, string[]> {
  if (submittedValue !== undefined) {
    const values = parseTextList(submittedValue);

    return values.length > 0 ? { [key]: values } : {};
  }

  return currentValue && currentValue.length > 0 ? { [key]: [...currentValue] } : {};
}

function hasEducationRecordContent(record: CandidateProfile["education"][number]): boolean {
  return [record.institution, record.degree, record.field, record.grades ?? ""].some(
    (value) => value.trim().length > 0
  );
}

function hasExperienceRecordContent(record: CandidateProfile["experience"][number]): boolean {
  return [record.company, record.title, record.start_date].some(
    (value) => value.trim().length > 0
  );
}

function buildReviewFields(
  profile: CandidateProfile,
  fieldConfidence: FieldConfidence
): CandidateResumeProfileReviewField[] {
  return [
    textField("contact.full_name", "Full name", profile.contact?.full_name, fieldConfidence),
    textField("contact.email", "Email", profile.contact?.email, fieldConfidence),
    textField("contact.location", "Location", profile.contact?.location, fieldConfidence),
    csvField(
      "preferences.target_roles",
      "Target roles",
      profile.preferences.target_roles,
      fieldConfidence
    ),
    csvField("preferences.locations", "Preferred locations", profile.preferences.locations, fieldConfidence),
    csvField("preferences.work_modes", "Work modes", profile.preferences.work_modes, fieldConfidence),
    ...buildExperienceReviewFields(profile, fieldConfidence),
    ...buildEducationReviewFields(profile, fieldConfidence),
    csvField(
      "skills",
      "Skills",
      profile.skills.map((skill) => skill.name),
      fieldConfidence
    ),
    csvField(
      "languages",
      "Languages",
      profile.languages.map((language) =>
        [language.language, language.declared_level].filter(Boolean).join(" ")
      ),
      fieldConfidence
    )
  ];
}

function buildEducationReviewFields(
  profile: CandidateProfile,
  fieldConfidence: FieldConfidence
): CandidateResumeProfileReviewField[] {
  const educationRecordCount = Math.min(Math.max(profile.education.length + 1, 1), 4);
  const fields: CandidateResumeProfileReviewField[] = [];

  for (let index = 0; index < educationRecordCount; index += 1) {
    const education = profile.education[index];
    const labelPrefix = `Education ${index + 1}`;

    fields.push(
      textField(
        `education.${index}.institution`,
        `${labelPrefix} institution`,
        education?.institution,
        fieldConfidence
      ),
      textField(
        `education.${index}.degree`,
        `${labelPrefix} degree`,
        education?.degree,
        fieldConfidence
      ),
      textField(
        `education.${index}.field`,
        `${labelPrefix} field`,
        education?.field,
        fieldConfidence
      ),
      textField(
        `education.${index}.end_date`,
        `${labelPrefix} year`,
        education?.end_date,
        fieldConfidence
      ),
      textField(
        `education.${index}.grades`,
        `${labelPrefix} grades or GPA`,
        education?.grades,
        fieldConfidence
      ),
      csvField(
        `education.${index}.honors`,
        `${labelPrefix} honors`,
        education?.honors ?? [],
        fieldConfidence
      )
    );
  }

  return fields;
}

function buildExperienceReviewFields(
  profile: CandidateProfile,
  fieldConfidence: FieldConfidence
): CandidateResumeProfileReviewField[] {
  const experienceRecordCount = Math.min(Math.max(profile.experience.length + 1, 1), 6);
  const fields: CandidateResumeProfileReviewField[] = [];

  for (let index = 0; index < experienceRecordCount; index += 1) {
    const experience = profile.experience[index];
    const labelPrefix = `Role ${index + 1}`;

    fields.push(
      textField(
        `experience.${index}.title`,
        `${labelPrefix} title`,
        experience?.title,
        fieldConfidence
      ),
      textField(
        `experience.${index}.company`,
        `${labelPrefix} company`,
        experience?.company,
        fieldConfidence
      ),
      textField(
        `experience.${index}.start_date`,
        `${labelPrefix} start`,
        experience?.start_date,
        fieldConfidence
      ),
      textField(
        `experience.${index}.end_date`,
        `${labelPrefix} end`,
        experience?.end_date ?? undefined,
        fieldConfidence
      ),
      textareaField(
        `experience.${index}.responsibilities`,
        `${labelPrefix} responsibilities`,
        experience?.responsibilities,
        fieldConfidence
      ),
      textareaField(
        `experience.${index}.measurable_impact`,
        `${labelPrefix} measurable impact`,
        experience?.measurable_impact,
        fieldConfidence
      )
    );
  }

  return fields;
}

function textField(
  fieldPath: string,
  label: string,
  value: string | undefined,
  fieldConfidence: FieldConfidence
): CandidateResumeProfileReviewField {
  return {
    field_path: fieldPath,
    label,
    value: value ?? "",
    confidence: fieldConfidence[fieldPath] ?? null,
    input_kind: "text"
  };
}

function csvField(
  fieldPath: string,
  label: string,
  value: readonly string[],
  fieldConfidence: FieldConfidence
): CandidateResumeProfileReviewField {
  return {
    field_path: fieldPath,
    label,
    value: value.join(", "),
    confidence: fieldConfidence[fieldPath] ?? null,
    input_kind: "csv"
  };
}

function textareaField(
  fieldPath: string,
  label: string,
  value: readonly string[] | undefined,
  fieldConfidence: FieldConfidence
): CandidateResumeProfileReviewField {
  return {
    field_path: fieldPath,
    label,
    value: (value ?? []).join("\n"),
    confidence: fieldConfidence[fieldPath] ?? null,
    input_kind: "textarea"
  };
}

function createLocalResumeTextParserProvider(): ResumeParserProvider {
  return {
    name: "local-resume-text-parser",
    version: "local-resume-text-parser-v1",
    parse(document: ResumeDocumentInput): ResumeParserProviderResult {
      return parseLocalResumeText(document);
    }
  };
}

function createDefaultResumeParserProvider(): ResumeParserProvider {
  const requestedProvider = normalizeResumeParserProvider(
    process.env.RESUME_PARSER_PROVIDER
  );

  if (requestedProvider === "local") {
    return createLocalResumeTextParserProvider();
  }

  if (
    requestedProvider === "anthropic" ||
    (process.env.NODE_ENV !== "test" && hasAnthropicResumeParserKey(process.env))
  ) {
    return createAnthropicResumeParserProvider();
  }

  return createLocalResumeTextParserProvider();
}

function resolveResumeParserProvider(
  defaultProvider: ResumeParserProvider,
  parserMode: ResumeParserRuntimeMode | undefined
): ResumeParserProvider {
  if (parserMode === "local") {
    return createLocalResumeTextParserProvider();
  }

  return defaultProvider;
}

function validateResumeParserInput(
  provider: ResumeParserProvider,
  file: ResumeIngestionInput["file"],
  rawTextOverride: string | undefined,
  correlationId: string
): CandidateResumeProfilePipelineError | undefined {
  if (normalizeRawTextOverride(rawTextOverride)) {
    return undefined;
  }

  if (isPlainTextLike(file.mimeType, file.name)) {
    return undefined;
  }

  if (provider.name === "anthropic-resume-parser" && isPdfLike(file.mimeType, file.name)) {
    return undefined;
  }

  return {
    code: "parse_failed",
    message:
      "This file type cannot be parsed by the current resume parser. Upload a PDF with Claude enabled, upload a text/HTML/JSON resume, or paste resume text.",
    status: 422,
    correlationId
  };
}

function parseLocalResumeText(document: ResumeDocumentInput): ResumeParserProviderResult {
  const text = stripHtml(document.raw_text);
  const generatedAt = document.uploaded_at ?? new Date().toISOString();
  const fullName = readLabel(text, "Name") ?? "Candidate";
  const email = readLabel(text, "Email");
  const location = readLabel(text, "Location");
  const targetRoles = parseCsv(readLabel(text, "Role targets"));
  const workModes = parseWorkModes(readLabel(text, "Work modes"));
  const education = parseEducation(readLabel(text, "Education"));
  const experience = parseExperience(readLabel(text, "Experience"));
  const skills = parseCsv(readLabel(text, "Skills"));
  const languages = parseLanguages(readLabel(text, "Languages"));
  const missingData = buildMissingData({
    email,
    education,
    experience,
    targetRoles,
    workModes
  });
  const fieldConfidence = buildFieldConfidence({
    fullName,
    email,
    location,
    targetRoles,
    workModes,
    education,
    experience,
    skills,
    languages
  });
  const parserConfidence = calculateParserConfidence(fieldConfidence, missingData);

  return {
    profile: {
      candidate_id: document.candidate_id,
      profile_version: "candidate-profile-v0",
      confirmed_by_candidate: false,
      created_at: generatedAt,
      updated_at: generatedAt,
      source_refs: {
        resume_document_id: document.resume_document_id,
        resume_parse_id: null,
        profile_confirmation_audit_event_id: null
      },
      contact: {
        full_name: fullName,
        ...(email ? { email } : {}),
        ...(location ? { location } : {})
      },
      education,
      experience,
      skills: skills.map((skill) => ({
        name: skill,
        category: "technical",
        evidence_count: 1,
        evidence: ["Candidate resume upload"]
      })),
      languages,
      certifications: [],
      portfolio: [],
      preferences: {
        target_roles: targetRoles,
        locations: location ? [location] : [],
        work_modes: workModes
      },
      parse_metadata: {
        resume_document_id: document.resume_document_id,
        parser_version: "local-resume-text-parser-v1",
        parser_confidence: parserConfidence,
        field_confidence: fieldConfidence,
        missing_data: missingData,
        input_hash: hashText(text),
        audit_event_id: `audit_resume_parse_${sanitizeId(document.resume_document_id)}`
      },
      privacy_boundary: {
        candidate_owned: true,
        employer_visible_without_consent: false,
        sharing_snapshot_required: true,
        active_consent_record_ids: []
      }
    },
    parser_confidence: parserConfidence,
    field_confidence: fieldConfidence,
    missing_data: missingData,
    unresolved_ambiguities: []
  };
}

function createResumeRawTextPlaceholder(file: ResumeIngestionInput["file"]): string {
  if (isPlainTextLike(file.mimeType, file.name)) {
    const decoded = TEXT_DECODER.decode(file.bytes).replace(/\u0000/g, " ").trim();

    if (decoded.length > 0) {
      return decoded;
    }
  }

  return `Uploaded resume file: ${file.name}. Content type: ${file.mimeType || "unknown"}.`;
}

function encodeRawFileForProvider(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function isPlainTextLike(mimeType: string, filename: string): boolean {
  const normalizedMime = mimeType.toLowerCase();
  const normalizedName = filename.toLowerCase();

  return (
    normalizedMime.startsWith("text/") ||
    normalizedMime.includes("json") ||
    normalizedName.endsWith(".txt") ||
    normalizedName.endsWith(".md") ||
    normalizedName.endsWith(".csv") ||
    normalizedName.endsWith(".html") ||
    normalizedName.endsWith(".htm") ||
    normalizedName.endsWith(".json")
  );
}

function isPdfLike(mimeType: string, filename: string): boolean {
  return mimeType.toLowerCase().includes("pdf") || filename.toLowerCase().endsWith(".pdf");
}

function normalizeRawTextOverride(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : undefined;
}

function stripHtml(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function readLabel(text: string, label: string): string | undefined {
  const expression = new RegExp(`^\\s*${escapeRegExp(label)}\\s*:\\s*(.+)$`, "im");
  const match = text.match(expression);
  const value = match?.[1]?.trim();

  return value && value.length > 0 ? value : undefined;
}

function parseCsv(value: string | undefined): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(/[,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
}

function parseTextList(value: string | undefined): string[] {
  const normalized = value ?? "";
  const separator = normalized.includes("\n") ? /\r?\n+/ : /[;,]+/;

  return normalized
    .split(separator)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseWorkModes(value: string | undefined): Array<"remote" | "hybrid" | "onsite"> {
  const modes = parseCsv(value).map((mode) => mode.toLowerCase());
  const parsed = modes.filter((mode): mode is "remote" | "hybrid" | "onsite" =>
    ["remote", "hybrid", "onsite"].includes(mode)
  );

  return parsed.length > 0 ? parsed : ["remote"];
}

function parseSelectedWorkModes(
  value: string | undefined
): Array<"remote" | "hybrid" | "onsite"> {
  const modes = parseCsv(value).map((mode) => mode.toLowerCase());

  return modes.filter((mode): mode is "remote" | "hybrid" | "onsite" =>
    ["remote", "hybrid", "onsite"].includes(mode)
  );
}

function parseEducation(value: string | undefined): CandidateProfile["education"] {
  if (!value) {
    return [];
  }

  const [institution, degree, field, endDate] = value.split("|").map((item) => item.trim());

  if (!institution || !degree || !field) {
    return [];
  }

  return [
    {
      institution,
      institution_canonical: institution,
      degree,
      field,
      ...(endDate ? { end_date: endDate } : {}),
      ranking_confidence: 50,
      enrichment_needed: true
    }
  ];
}

function parseExperience(value: string | undefined): CandidateProfile["experience"] {
  if (!value) {
    return [];
  }

  const [company, title, startDate, endDate, responsibilities, impact] = value
    .split("|")
    .map((item) => item.trim());

  if (!company || !title || !startDate) {
    return [];
  }

  return [
    {
      company,
      title,
      start_date: startDate,
      end_date: endDate || null,
      responsibilities: responsibilities ? [responsibilities] : [],
      measurable_impact: impact ? [impact] : [],
      evidence_quality: 70
    }
  ];
}

function parseLanguages(value: string | undefined): CandidateProfile["languages"] {
  return parseCsv(value).map((item) => {
    const parts = item.split(/\s+/);
    const maybeLevel = parts[parts.length - 1]?.toUpperCase() ?? "unknown";
    const declaredLevel = CEFR_LEVELS.has(maybeLevel) ? maybeLevel : "unknown";
    const language =
      declaredLevel === "unknown" ? item : parts.slice(0, -1).join(" ").trim();

    return {
      language: language || item,
      declared_level: declaredLevel as CandidateProfile["languages"][number]["declared_level"],
      assessed_level: "unknown" as const,
      evidence: ["Candidate resume upload"]
    };
  });
}

function parseConfirmedLanguages(value: string | undefined): CandidateProfile["languages"] {
  return parseCsv(value).map((item) => {
    const parts = item.split(/\s+/);
    const maybeLevel = parts[parts.length - 1]?.toUpperCase() ?? "unknown";
    const declaredLevel = CEFR_LEVELS.has(maybeLevel) ? maybeLevel : "unknown";
    const language =
      declaredLevel === "unknown" ? item : parts.slice(0, -1).join(" ").trim();

    return {
      language: language || item,
      declared_level: declaredLevel as CandidateProfile["languages"][number]["declared_level"],
      assessed_level: "unknown" as const,
      evidence: ["Candidate profile confirmation"]
    };
  });
}

function buildMissingData(input: {
  readonly email: string | undefined;
  readonly education: CandidateProfile["education"];
  readonly experience: CandidateProfile["experience"];
  readonly targetRoles: readonly string[];
  readonly workModes: readonly string[];
}): string[] {
  const missing: string[] = [];

  if (!input.email) {
    missing.push("contact.email");
  }

  if (input.education.length === 0) {
    missing.push("education");
  }

  if (input.experience.length === 0) {
    missing.push("experience");
  }

  if (input.targetRoles.length === 0) {
    missing.push("preferences.target_roles");
  }

  if (input.workModes.length === 0) {
    missing.push("preferences.work_modes");
  }

  missing.push("preferences.salary_range");
  return missing;
}

function buildFieldConfidence(input: {
  readonly fullName: string;
  readonly email: string | undefined;
  readonly location: string | undefined;
  readonly targetRoles: readonly string[];
  readonly workModes: readonly string[];
  readonly education: CandidateProfile["education"];
  readonly experience: CandidateProfile["experience"];
  readonly skills: readonly string[];
  readonly languages: CandidateProfile["languages"];
}): FieldConfidence {
  return {
    "contact.full_name": input.fullName === "Candidate" ? 35 : 92,
    "contact.email": input.email ? 95 : 25,
    "contact.location": input.location ? 86 : 40,
    "preferences.target_roles": input.targetRoles.length > 0 ? 82 : 35,
    "preferences.locations": input.location ? 80 : 35,
    "preferences.work_modes": input.workModes.length > 0 ? 78 : 35,
    "preferences.salary_range": 0,
    "education.0.institution": input.education[0]?.institution ? 72 : 30,
    "education.0.degree": input.education[0]?.degree ? 72 : 30,
    "education.0.field": input.education[0]?.field ? 72 : 30,
    "experience.0.company": input.experience[0]?.company ? 74 : 30,
    "experience.0.title": input.experience[0]?.title ? 74 : 30,
    "experience.0.start_date": input.experience[0]?.start_date ? 74 : 30,
    skills: input.skills.length > 0 ? 82 : 30,
    languages: input.languages.length > 0 ? 76 : 30
  };
}

function calculateParserConfidence(
  fieldConfidence: FieldConfidence,
  missingData: readonly string[]
): number {
  const values = Object.values(fieldConfidence);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const missingPenalty = Math.min(missingData.length * 3, 18);

  return Math.max(0, Math.round(average - missingPenalty));
}

function hashText(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `resume_input_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
