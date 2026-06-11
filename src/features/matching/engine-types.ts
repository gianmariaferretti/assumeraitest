import type { WorkStyleKey, WorkStyleProfile } from "../scoring/work-style/types";
import type { MatchDimensionName, MatchWeightSet } from "./weights";

export const MATCHING_VERSION = "company-matching-v0";
export const MATCHING_MODEL_VERSION = "deterministic-matching-v0";

export type ConsentDecisionValue = "accepted" | "declined";
export type MatchStatus =
  | "candidate_visible"
  | "candidate_accepted"
  | "candidate_declined"
  | "employer_review"
  | "closed";

export interface CandidateEducation {
  institution?: string;
  institution_canonical?: string;
  degree?: string;
  field?: string;
  projects?: string[];
  ranking_confidence?: number;
  enrichment_needed?: boolean;
  university_signal?: {
    score: number;
    confidence: number;
    tier: string;
    source_id: string;
    scoring_approved: boolean;
    enrichment_needed: boolean;
    evidence?: readonly string[];
  };
}

export interface CandidateExperience {
  company?: string;
  title?: string;
  industry?: string;
  function?: string;
  responsibilities?: string[];
  measurable_impact?: string[];
  tools?: string[];
  leadership_scope?: string;
  evidence_quality?: number;
}

export interface CandidateSkill {
  name: string;
  category?: string;
  evidence_count?: number;
  evidence?: string[];
}

export interface CandidateLanguage {
  language: string;
  declared_level?: string;
  assessed_level?: string;
  evidence?: string[];
}

export interface CandidatePreferences {
  target_roles: string[];
  locations: string[];
  work_modes: string[];
  company_sizes?: string[];
  salary_range?: {
    currency?: string;
    min?: number;
    max?: number;
  };
  industries?: string[];
  work_style?: string[];
}

export interface CandidateProfile {
  candidate_id: string;
  profile_version?: string;
  confirmed_by_candidate?: boolean;
  contact?: {
    full_name?: string;
    email?: string;
    location?: string;
    work_authorization?: string;
  };
  education: CandidateEducation[];
  experience: CandidateExperience[];
  skills: CandidateSkill[];
  languages: CandidateLanguage[];
  certifications?: string[];
  portfolio?: string[];
  preferences: CandidatePreferences;
  parse_metadata?: {
    parser_version?: string;
    parser_confidence?: number;
    missing_data?: string[];
    audit_event_id?: string;
  };
}

export interface RoleHardGate {
  gate_type: string;
  description: string;
  lawful_basis_note?: string;
  role_essential: boolean;
}

export interface RequiredLanguage {
  language: string;
  minimum_level: string;
}

export interface RoleProfile {
  role_id: string;
  company_id: string;
  title: string;
  status?: string;
  seniority?: string;
  role_type?: string;
  location_constraints?: string[];
  work_modes?: string[];
  compensation_range?: {
    currency?: string;
    min?: number;
    max?: number;
  };
  requirements: {
    required_skills: string[];
    nice_to_have_skills: string[];
    required_languages?: RequiredLanguage[];
    certifications?: string[];
    hard_gates: RoleHardGate[];
  };
  calibration: {
    version: string;
    score_bars?: Record<string, number>;
    weights?: Partial<Record<MatchDimensionName, number>> & Record<string, number | undefined>;
    required_evidence?: string[];
    interview_modules?: string[];
    /** Company-declared work-style expectations (Phase 13), versioned. */
    work_style_key?: WorkStyleKey;
    created_by?: string;
    created_at?: string;
    audit_event_id?: string;
  };
}

export interface CompanyProfile {
  company_id: string;
  name?: string;
  industry?: string;
  size?: string;
  locations?: string[];
  work_modes?: string[];
  culture_attributes?: string[];
  data_visibility_policy?: string;
  enrichment?: {
    canonical_name: string;
    identity_confidence: number;
    candidate_context_score: number;
    source_id: string;
    source_version: string;
    license_review_status: string;
    allowed_use: string;
    disallowed_use: string;
    retrieved_at: string;
    stale_after: string;
    evidence: readonly string[];
  };
}

export interface EvidenceObject {
  source?: string;
  snippet?: string;
  confidence?: number;
}

export interface UpstreamScoreDimension {
  score?: number;
  confidence?: number;
  evidence?: Array<string | EvidenceObject>;
  missing_data?: string[];
}

export interface ResumeScorecard {
  overall_resume_screen_score?: number;
  confidence_score?: number;
  scores?: Record<string, UpstreamScoreDimension>;
  risk_flags?: string[];
  recommendations?: string[];
}

export interface InterviewScorecard {
  overall_interview_score?: number;
  interview_confidence_score?: number;
  module_scores?: Record<string, UpstreamScoreDimension>;
  manual_review_flags?: string[];
}

export interface PartialScoreDimension {
  score: number;
  confidence?: number;
  evidence?: string[];
  missing_data?: string[];
}

export interface CandidateDecisionInput {
  decision: ConsentDecisionValue;
  decided_at: string;
  consent_record_id?: string | null;
  audit_event_id?: string;
}

export interface CandidateDecision {
  decision: ConsentDecisionValue;
  decided_at: string;
  consent_record_id: string | null;
  audit_event_id: string;
}

/** Completion signal for a single interview module, from the unlock engine. */
export interface ModuleCompletionInput {
  module_id: string;
  required_for_match: boolean;
  completed: boolean;
}

export interface MatchingScoreInput {
  candidate: CandidateProfile;
  role: RoleProfile;
  company?: CompanyProfile;
  resumeScorecard?: ResumeScorecard;
  interviewScorecard?: InterviewScorecard;
  dimensionOverrides?: Partial<Record<MatchDimensionName, PartialScoreDimension>>;
  candidateDecision?: CandidateDecisionInput | null;
  /**
   * Per-module completion. When provided, the match is blocked until every
   * module flagged required_for_match is completed (Phase 5 match guard).
   */
  requiredModuleStatuses?: readonly ModuleCompletionInput[];
  /**
   * Versioned base weight set (from matching_weight_sets). Falls back to the
   * in-code defaults when omitted; role calibration still overrides per
   * dimension on top of it.
   */
  weightSet?: MatchWeightSet;
  /** Candidate's descriptive work-style profile (Phase 13). */
  workStyleProfile?: WorkStyleProfile;
  generatedAt?: string;
  version?: string;
  auditEventId?: string;
  matchId?: string;
  modelVersion?: string;
  scoringVersion?: string;
  inputHash?: string;
}

export interface ScoreDimension {
  score: number;
  confidence: number;
  evidence: string[];
  missing_data: string[];
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: null;
  audit_event_id: string;
}

export interface HardGateOutcome {
  gate_type: string;
  passed: boolean;
  explanation: string;
  role_essential: boolean;
}

export interface MatchExplanation {
  summary: string;
  supporting_evidence: string[];
  missing_evidence: string[];
  risks_uncertainties: string[];
  suggested_next_step: string;
}

export type EmployerVisibilityState =
  | "hidden_pending_candidate_consent"
  | "candidate_declined"
  | "shared_after_candidate_consent"
  | "withdrawn";

export interface EmployerVisibility {
  state: EmployerVisibilityState;
  candidate_consent_required: true;
  visible_to_company: boolean;
  consent_record_id: string | null;
  candidate_sharing_snapshot_id: string | null;
}

export interface DecisionPolicy {
  recommendation_only: true;
  requires_meaningful_human_review: true;
  no_hidden_automated_rejection: true;
}

export interface CompanyMatch {
  match_id: string;
  candidate_id: string;
  role_id: string;
  company_id: string;
  status: MatchStatus;
  match_score: number;
  match_confidence: number;
  overall_match: ScoreDimension;
  evidence: string[];
  missing_data: string[];
  dimensions: Record<MatchDimensionName, ScoreDimension>;
  hard_gates: HardGateOutcome[];
  explanations: {
    candidate_facing: MatchExplanation;
    employer_facing?: MatchExplanation;
  };
  candidate_decision: CandidateDecision | null;
  employer_visibility: EmployerVisibility;
  human_review_required: boolean;
  /** True when the match is blocked before scoring (e.g. required modules incomplete). */
  match_blocked?: boolean;
  version: string;
  model_version: string;
  scoring_version: string;
  /** Version of the weight set this match was scored with. */
  weights_version: string;
  input_hash: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: null;
  audit_event_id: string;
  decision_policy: DecisionPolicy;
}

export type EmployerMatchView =
  | {
      allowed: false;
      reason: string;
    }
  | {
      allowed: true;
      match: CompanyMatch;
    };

export interface DimensionDraft {
  score: number;
  confidence: number;
  evidence: string[];
  missing_data: string[];
}

export interface LanguageEvaluation {
  passed: boolean;
  evidence: string[];
  missing: string[];
  failed: string[];
  score: number;
  confidence: number;
}

export interface LanguageEvaluationOptions {
  readonly requireAssessedForPass?: boolean;
}
