import { z } from "zod";

export const RESUME_PARSER_CONTRACT_VERSION = "resume-parser-contract-v1";

export const confidenceSchema = z.number().min(0).max(100);
const nonEmptyStringSchema = z.string().min(1);
const dateTimeStringSchema = z.string().min(1);

export const workModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export const skillCategorySchema = z.enum(["technical", "business", "work", "language", "other"]);
export const languageLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "unknown"]);

export const fieldConfidenceSchema = z.record(z.string().min(1), confidenceSchema);

export const universitySignalSchema = z
  .object({
    institution_id: z.string().min(1),
    canonical_name: z.string().min(1),
    country: z.string().optional(),
    tier: z.enum([
      "tier-1-global-leading",
      "tier-2-strong-international",
      "tier-3-regional-specialized",
      "tier-4-recognized-limited-data",
      "tier-5-unknown-insufficient-data"
    ]),
    score: confidenceSchema,
    confidence: confidenceSchema,
    source_id: z.string().min(1),
    source_version: z.string().min(1),
    ranking_year: z.string().optional(),
    license_review_status: z.string().min(1),
    scoring_approved: z.boolean(),
    enrichment_needed: z.boolean(),
    manual_review_required: z.boolean(),
    retrieved_at: z.string().min(1),
    stale_after: z.string().min(1),
    evidence: z.array(z.string())
  })
  .strict();

export const candidateProfileSchema = z
  .object({
    candidate_id: nonEmptyStringSchema,
    profile_version: nonEmptyStringSchema,
    confirmed_by_candidate: z.boolean(),
    created_at: dateTimeStringSchema,
    updated_at: dateTimeStringSchema,
    source_refs: z
      .object({
        resume_document_id: z.string().nullable().optional(),
        resume_parse_id: z.string().nullable().optional(),
        profile_confirmation_audit_event_id: z.string().nullable().optional()
      })
      .strict()
      .optional(),
    contact: z
      .object({
        full_name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        work_authorization: z.string().optional()
      })
      .strict()
      .optional(),
    education: z.array(
      z
        .object({
          institution: z.string(),
          institution_canonical: z.string().optional(),
          degree: z.string(),
          field: z.string(),
          start_date: z.string().optional(),
          end_date: z.string().optional(),
          grades: z.string().optional(),
          honors: z.array(z.string()).optional(),
          projects: z.array(z.string()).optional(),
          ranking_confidence: confidenceSchema.optional(),
          enrichment_needed: z.boolean().optional(),
          university_signal: universitySignalSchema.optional()
        })
        .strict()
    ),
    experience: z.array(
      z
        .object({
          company: z.string(),
          title: z.string(),
          start_date: z.string(),
          end_date: z.string().nullable().optional(),
          duration_months: z.number().int().min(0).nullable().optional(),
          industry: z.string().optional(),
          function: z.string().optional(),
          responsibilities: z.array(z.string()).optional(),
          measurable_impact: z.array(z.string()).optional(),
          tools: z.array(z.string()).optional(),
          leadership_scope: z.string().optional(),
          evidence_quality: confidenceSchema.optional()
        })
        .strict()
    ),
    skills: z.array(
      z
        .object({
          name: z.string(),
          category: skillCategorySchema,
          recency: z.string().optional(),
          evidence_count: z.number().int().min(0),
          evidence: z.array(z.string()).optional()
        })
        .strict()
    ),
    languages: z.array(
      z
        .object({
          language: z.string(),
          declared_level: languageLevelSchema.optional(),
          assessed_level: languageLevelSchema.optional(),
          evidence: z.array(z.string()).optional()
        })
        .strict()
    ),
    certifications: z.array(z.string()).optional(),
    portfolio: z.array(z.string()).optional(),
    preferences: z
      .object({
        target_roles: z.array(z.string()),
        locations: z.array(z.string()),
        work_modes: z.array(workModeSchema),
        company_sizes: z.array(z.string()).optional(),
        salary_range: z
          .object({
            currency: z.string().optional(),
            min: z.number().min(0).optional(),
            max: z.number().min(0).optional()
          })
          .strict()
          .optional(),
        industries: z.array(z.string()).optional(),
        work_style: z.array(z.string()).optional(),
        negative_preferences: z.array(z.string()).optional(),
        client_facing_preference: z.enum(["avoid", "low", "moderate", "high"]).optional(),
        travel_preference: z.enum(["avoid", "low", "moderate", "high"]).optional(),
        meeting_load_preference: z.enum(["low", "moderate", "high"]).optional(),
        deep_work_preference: z.enum(["low", "moderate", "high"]).optional(),
        team_style_preference: z.array(z.string()).optional()
      })
      .strict(),
    parse_metadata: z
      .object({
        resume_document_id: z.string().optional(),
        resume_parse_id: z.string().optional(),
        parser_version: z.string().optional(),
        parser_confidence: confidenceSchema.optional(),
        field_confidence: fieldConfidenceSchema.optional(),
        missing_data: z.array(z.string()).optional(),
        input_hash: z.string().optional(),
        audit_event_id: z.string().optional()
      })
      .strict()
      .optional(),
    confirmation_metadata: z
      .object({
        status: z.enum(["draft", "confirmed"]),
        confirmed_at: z.string().optional(),
        confirmed_by: z.string().optional(),
        correction_count: z.number().int().min(0).optional(),
        correction_ids: z.array(z.string()).optional(),
        audit_event_id: z.string().optional()
      })
      .strict()
      .optional(),
    privacy_boundary: z
      .object({
        candidate_owned: z.literal(true),
        employer_visible_without_consent: z.literal(false),
        sharing_snapshot_required: z.literal(true),
        active_consent_record_ids: z.array(z.string())
      })
      .strict()
      .optional()
  })
  .strict();

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type FieldConfidence = z.infer<typeof fieldConfidenceSchema>;

export const resumeDocumentInputSchema = z
  .object({
    resume_document_id: nonEmptyStringSchema,
    candidate_id: nonEmptyStringSchema,
    raw_text: z.string().min(1),
    raw_file_base64: z.string().min(1).optional(),
    source_filename: z.string().optional(),
    content_type: z.string().optional(),
    uploaded_at: z.string().optional()
  })
  .strict();

export type ResumeDocumentInput = z.infer<typeof resumeDocumentInputSchema>;

export const resumeParserProviderResultSchema = z
  .object({
    profile: candidateProfileSchema,
    parser_confidence: confidenceSchema,
    field_confidence: fieldConfidenceSchema,
    missing_data: z.array(z.string()),
    unresolved_ambiguities: z.array(z.string()).optional()
  })
  .strict();

export type ResumeParserProviderResult = z.infer<typeof resumeParserProviderResultSchema>;

export interface ResumeParserProvider {
  readonly name: string;
  readonly version: string;
  parse(document: ResumeDocumentInput): Promise<ResumeParserProviderResult> | ResumeParserProviderResult;
}

export interface CandidateReviewPrompt {
  readonly prompt_id: string;
  readonly field_path: string;
  readonly reason: "low_confidence" | "missing_data" | "ambiguity";
  readonly severity: "candidate_review" | "manual_review_recommended";
  readonly message: string;
}

export interface ResumeParseDraft {
  readonly parse_id: string;
  readonly resume_document_id: string;
  readonly candidate_id: string;
  readonly profile: CandidateProfile;
  readonly parser_name: string;
  readonly parser_version: string;
  readonly parser_confidence: number;
  readonly field_confidence: FieldConfidence;
  readonly missing_data: readonly string[];
  readonly unresolved_ambiguities: readonly string[];
  readonly candidate_review_prompts: readonly CandidateReviewPrompt[];
  readonly low_confidence_review_required: boolean;
  readonly raw_cv_retention_days: number;
  readonly audit_event_id: string;
  readonly generated_at: string;
  readonly contract_version: typeof RESUME_PARSER_CONTRACT_VERSION;
}

export interface CandidateProfileCorrectionRequest {
  readonly field_path: string;
  readonly corrected_value: unknown;
  readonly reason?: string;
}

export interface AppliedCandidateProfileCorrection {
  readonly correction_id: string;
  readonly field_path: string;
  readonly previous_value: unknown;
  readonly corrected_value: unknown;
  readonly reason?: string;
  readonly corrected_at: string;
}

export interface ConfirmCandidateProfileRequest {
  readonly candidate_id: string;
  readonly confirmed_by: string;
  readonly audit_event_id: string;
  readonly confirmed_at?: string;
  readonly corrections?: readonly CandidateProfileCorrectionRequest[];
}

export interface CandidateProfileConfirmation {
  readonly confirmation_id: string;
  readonly parse_id: string;
  readonly candidate_id: string;
  readonly status: "confirmed";
  readonly profile: CandidateProfile;
  readonly corrections: readonly AppliedCandidateProfileCorrection[];
  readonly confirmed_by: string;
  readonly confirmed_at: string;
  readonly audit_event_id: string;
}

export type IdFactory = (prefix: string) => string;
