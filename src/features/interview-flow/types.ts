import type { CandidateProfile } from "../resume-parsing";
import type { CandidateInterviewLanguageCode } from "./interview-language";
import type { FunnelState } from "./funnel-state-machine";
import type { ModuleIntegritySummary } from "./integrity-signals";

export type ModuleId = "motivation" | "language" | "domain" | "work_sample" | "case";

export type RoleFamily = "sales" | "consulting" | "ai_analyst" | "python_developer" | "operations";

export type Difficulty = "baseline" | "intermediate" | "advanced";

export type StarEvidenceElement = "situation" | "task" | "action" | "result";

export type FollowUpReason =
  | "clarify_evidence"
  | "validate_role_requirement"
  | "resolve_contradiction"
  | "increase_confidence";

export type InterviewStatus = "in_progress" | "completed";

export type InterviewMode = "text" | "audio" | "video";

export interface FollowUpRule {
  reason: FollowUpReason;
  trigger: string;
}

export interface InterviewModule {
  id: ModuleId;
  title: string;
  purpose: string;
  targetMinutes: number;
  version: string;
  roleSpecificFocus: string;
  requiredEvidence: string[];
}

export interface InterviewQuestion {
  id: string;
  version: string;
  moduleId: ModuleId;
  roleFamily: RoleFamily;
  difficulty: Difficulty;
  prompt: string;
  rubric: string[];
  expectedSignals: string[];
  disallowedSignals: string[];
  evidenceRequirements: string[];
  timeTargetSeconds: number;
  followUpRules: FollowUpRule[];
  followUpReason?: FollowUpReason;
  followUpOfQuestionId?: string;
  resumeGrounding?: ResumeQuestionGrounding;
}

export interface ResumeQuestionGrounding {
  resumeEvidence: string[];
  roleEvidence: string[];
  missingRoleEvidence: string[];
}

export interface RoleRequiredLanguage {
  language: string;
  minimum_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
}

export interface RoleHardGate {
  gate_type: string;
  description: string;
  lawful_basis_note: string;
  role_essential: boolean;
}

export interface RoleProfileInput {
  role_id?: string;
  title?: string;
  role_type?: string;
  seniority?: string;
  requirements?: {
    required_skills?: string[];
    nice_to_have_skills?: string[];
    required_languages?: RoleRequiredLanguage[];
    hard_gates?: RoleHardGate[];
  };
  calibration?: {
    version?: string;
    required_evidence?: string[];
    interview_modules?: string[];
  };
}

export interface ResponseAnalysisFlags {
  lowConfidence?: boolean;
  ambiguous?: boolean;
  unsupportedClaim?: boolean;
  contradiction?: boolean;
  roleRequirementMissing?: boolean;
  missingStarElements?: StarEvidenceElement[];
}

export interface InterviewResponse {
  id: string;
  questionId: string;
  moduleId: ModuleId;
  answerText: string;
  answeredAt: string;
  followUpReason?: FollowUpReason;
}

export interface FollowUpCaps {
  maxTotalFollowUps: number;
  maxFollowUpsPerQuestion: number;
  maxFollowUpsPerModule: number;
}

export interface FollowUpCounts {
  total: number;
  byQuestion: Record<string, number>;
  byModule: Record<ModuleId, number>;
}

/** Per-module sub-session lifecycle (the async "Session Store" of the flow). */
export type ModuleSessionState = "not_started" | "in_progress" | "completed" | "skipped";

/** Overall interview status across all module sub-sessions. */
export type GlobalInterviewStatus = "in_progress" | "all_required_completed";

/**
 * An independent interview sub-session for a single module. Each module runs and
 * resumes on its own, carrying its own questions, responses, follow-up budget,
 * and funnel state (from `funnel-state-machine`).
 */
export interface ModuleSession {
  moduleId: string;
  state: ModuleSessionState;
  /** Whether completing this module is required before a match can be made. */
  requiredForMatch: boolean;
  questions: InterviewQuestion[];
  responses: InterviewResponse[];
  currentQuestionId: string;
  followUpCounts: FollowUpCounts;
  funnelState: FunnelState;
  startedAt?: string;
  completedAt?: string;
  /**
   * Read-only context for human reviewers (tab switches, pauses, paste
   * events). NEVER an input to any score computation.
   */
  integritySummary?: ModuleIntegritySummary;
}

export interface InterviewSession {
  sessionId: string;
  candidateId: string;
  interviewLanguage: CandidateInterviewLanguageCode;
  roleId?: string;
  roleTitle: string;
  status: InterviewStatus;
  mode: InterviewMode;
  version: string;
  modulePlan: InterviewModule[];
  questions: InterviewQuestion[];
  responses: InterviewResponse[];
  currentQuestionId: string;
  currentModuleIndex: number;
  followUpCounts: FollowUpCounts;
  caps: FollowUpCaps;
  /** Independent per-module sub-sessions, keyed by module id. */
  module_sessions: Record<string, ModuleSession>;
  /** Aggregate status: all_required_completed only when every required module is done. */
  global_status: GlobalInterviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewSessionInput {
  candidateId: string;
  interviewLanguage?: CandidateInterviewLanguageCode;
  roleProfile: RoleProfileInput;
  candidateProfile?: CandidateProfile;
  questionBank?: InterviewQuestion[];
  now?: string;
  sessionId?: string;
  caps?: Partial<FollowUpCaps>;
  /**
   * Module ids that must be completed before a match can be made. When omitted,
   * every module in the plan is treated as required.
   */
  requiredModuleIds?: string[];
}

export interface RecordInterviewResponseInput {
  questionId: string;
  answerText: string;
  analysisFlags?: ResponseAnalysisFlags;
  answeredAt?: string;
}

export interface QuestionSafetyViolation {
  questionId: string;
  field: string;
  reason: string;
}

export interface QuestionSafetyResult {
  safe: boolean;
  violations: QuestionSafetyViolation[];
}

export interface QuestionBankValidationResult {
  valid: boolean;
  violations: QuestionSafetyViolation[];
}
