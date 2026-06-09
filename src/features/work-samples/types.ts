export type WorkSampleKind = "coding" | "writing" | "analysis";

export type WorkSampleCapability =
  | "cpu-only"
  | "standard-library"
  | "local-read-only"
  | "network"
  | "filesystem-write"
  | "external-services";

export type ProhibitedWorkSampleSignal =
  | "direct_age"
  | "protected_attribute"
  | "accent"
  | "personality"
  | "biometric"
  | "emotion"
  | "face"
  | "health"
  | "family_status"
  | "nationality";

export interface WorkSampleRubricCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
  scoringGuidance: string;
  evidenceRequired: readonly string[];
  disallowedSignals: readonly string[];
}

export interface WorkSampleRubric {
  version: string;
  scoringVersion: string;
  criteria: readonly WorkSampleRubricCriterion[];
  confidenceGuidance: string;
  humanReviewGuidance: string;
}

export interface CodingFile {
  path: string;
  language: "python" | "typescript" | "javascript";
  contents: string;
}

export interface CodingTestSpec {
  id: string;
  title: string;
  command: string;
  assertions: string[];
  contents: string;
}

export interface CodingWorkSampleSpec {
  language: "python" | "typescript" | "javascript";
  starterFiles: readonly CodingFile[];
  tests: readonly CodingTestSpec[];
}

export interface SafeExecutionPlan {
  mode: "static-review" | "local-static-tests";
  rawMediaRequired: boolean;
  allowedCapabilities: readonly WorkSampleCapability[];
  forbiddenCapabilities: readonly WorkSampleCapability[];
  timeLimitMinutes: number;
  memoryLimitMb: number;
  requiresHumanReview: boolean;
  notes: readonly string[];
}

export interface WorkSampleMetadata {
  roleFamilies: readonly string[];
  skillTags: readonly string[];
  difficulty: "baseline" | "intermediate";
  estimatedReviewMinutes: number;
}

export interface WorkSampleDefinition {
  id: string;
  kind: WorkSampleKind;
  title: string;
  version: string;
  status: "draft" | "active";
  timeboxMinutes: number;
  prompt: string;
  candidateInstructions: string;
  expectedOutput: string;
  antiTrickQuestionNotes: readonly string[];
  metadata: WorkSampleMetadata;
  rubric: WorkSampleRubric;
  safeExecutionPlan: SafeExecutionPlan;
  prohibitedSignals: readonly ProhibitedWorkSampleSignal[];
  coding?: CodingWorkSampleSpec;
}

export interface RoleProfileLike {
  role_id?: string;
  title?: string;
  role_type?: string;
  requirements?: {
    required_skills?: string[];
    nice_to_have_skills?: string[];
    required_languages?: Array<{ language?: string; minimum_level?: string }>;
  };
  calibration?: {
    required_evidence?: string[];
    interview_modules?: string[];
    score_bars?: Record<string, number>;
  };
}

export interface WorkSampleValidationError {
  code: string;
  path: string;
  message: string;
  workSampleId?: string;
}

export interface WorkSampleValidationResult {
  valid: boolean;
  errors: WorkSampleValidationError[];
}
