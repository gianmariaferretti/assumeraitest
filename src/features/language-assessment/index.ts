export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export * from "./language-test-plan";

export type CefrLevel = (typeof CEFR_LEVELS)[number];
export type DeclaredCefrLevel = CefrLevel | "unknown";

export type LanguageDimension =
  | "comprehension"
  | "clarity"
  | "structure"
  | "vocabulary"
  | "role_communication"
  | "grammar"
  | "response_quality";

export type DisallowedLanguageSignalKind =
  | "accent"
  | "native_status"
  | "nationality"
  | "voice_tone"
  | "emotion"
  | "personality"
  | "biometric";

export interface EvidenceSnippet {
  source: string;
  snippet: string;
  timestamp_start?: string;
  timestamp_end?: string;
  confidence?: number;
}

export interface LanguageDimensionSignal {
  dimension: LanguageDimension;
  score: number;
  confidence: number;
  evidence: EvidenceSnippet[];
}

export interface RoleLanguageRequirement {
  language: string;
  minimum_level: CefrLevel;
  role_essential?: boolean;
}

export interface DisallowedLanguageSignal {
  kind: DisallowedLanguageSignalKind;
  note?: string;
}

export interface LanguageAssessmentInput {
  candidate_id: string;
  language: string;
  declared_level: DeclaredCefrLevel;
  transcript_quality: number;
  dimension_signals: LanguageDimensionSignal[];
  role_requirement?: RoleLanguageRequirement;
  disallowed_signals?: DisallowedLanguageSignal[];
  version?: string;
  generated_at: string;
  audit_event_id: string;
}

export interface LanguageDimensionScore {
  dimension: LanguageDimension;
  score: number;
  confidence: number;
  evidence: EvidenceSnippet[];
  missing_data: string[];
}

export type RoleRequirementFitStatus =
  | "meets"
  | "below_threshold"
  | "unknown"
  | "not_required";

export interface RoleRequirementFit {
  language: string;
  minimum_level?: CefrLevel;
  assessed_level: DeclaredCefrLevel;
  status: RoleRequirementFitStatus;
  role_essential: boolean;
}

export interface LanguageAssessmentResult {
  candidate_id: string;
  language: string;
  declared_level: DeclaredCefrLevel;
  assessed_level: DeclaredCefrLevel;
  score: number;
  confidence: number;
  dimensions: Record<LanguageDimension, LanguageDimensionScore | null>;
  evidence: EvidenceSnippet[];
  missing_data: string[];
  role_requirement_fit: RoleRequirementFit;
  excluded_signals: DisallowedLanguageSignal[];
  human_review_required: boolean;
  review_reasons: string[];
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: null;
  audit_event_id: string;
}

export interface RoleLanguageRequirementsInput {
  candidate_id: string;
  role_id: string;
  assessments: LanguageAssessmentResult[];
  required_languages: RoleLanguageRequirement[];
  generated_at: string;
  audit_event_id: string;
  version?: string;
}

export type RoleLanguageRequirementStatus =
  | "meets"
  | "below_threshold"
  | "missing_evidence";

export interface RoleLanguageRequirementResult {
  language: string;
  minimum_level: CefrLevel;
  assessed_level: DeclaredCefrLevel;
  status: RoleLanguageRequirementStatus;
  role_essential: boolean;
  evidence: EvidenceSnippet[];
  confidence: number;
}

export type LanguageReviewRecommendation =
  | "language_evidence_meets_role_requirements"
  | "needs_human_review"
  | "role_language_gap_needs_human_review";

export interface RoleLanguageRequirementsResult {
  candidate_id: string;
  role_id: string;
  requirements: RoleLanguageRequirementResult[];
  review_recommendation: LanguageReviewRecommendation;
  quality_score_adjustment: 0;
  human_review_required: boolean;
  review_reasons: string[];
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: null;
  audit_event_id: string;
}

const LANGUAGE_ASSESSMENT_VERSION = "language-assessment-v0.1.0";
const REQUIRED_DIMENSIONS: LanguageDimension[] = [
  "comprehension",
  "clarity",
  "structure",
  "vocabulary",
  "role_communication",
  "grammar",
  "response_quality",
];

export function assessLanguage(input: LanguageAssessmentInput): LanguageAssessmentResult {
  const normalizedSignals = normalizeDimensionSignals(input.dimension_signals);
  const dimensions = buildDimensionScores(normalizedSignals);
  const providedSignals = normalizedSignals.filter((signal) => signal.evidence.length > 0);
  const evidence = providedSignals.flatMap((signal) => signal.evidence);
  const score =
    providedSignals.length > 0
      ? roundToWhole(average(providedSignals.map((signal) => signal.score)))
      : 0;
  const assessedLevel = providedSignals.length > 0 ? mapScoreToCefrLevel(score) : "unknown";
  const confidence = calculateConfidence(
    providedSignals,
    clampScore(input.transcript_quality),
  );
  const missingData = buildMissingData(dimensions, input.transcript_quality);
  const excludedSignals = sanitizeExcludedSignals(input.disallowed_signals ?? []);
  const roleFit = evaluateSingleRoleRequirement(
    input.language,
    assessedLevel,
    input.role_requirement,
  );
  const reviewReasons = buildReviewReasons({
    confidence,
    transcriptQuality: input.transcript_quality,
    missingData,
    excludedSignals,
    roleFit,
  });

  return {
    candidate_id: input.candidate_id,
    language: input.language,
    declared_level: input.declared_level,
    assessed_level: assessedLevel,
    score,
    confidence,
    dimensions,
    evidence,
    missing_data: missingData,
    role_requirement_fit: roleFit,
    excluded_signals: excludedSignals,
    human_review_required: reviewReasons.length > 0,
    review_reasons: reviewReasons,
    version: input.version ?? LANGUAGE_ASSESSMENT_VERSION,
    generated_at: input.generated_at,
    reviewed_by_human: false,
    human_override: null,
    audit_event_id: input.audit_event_id,
  };
}

export function assessRoleLanguageRequirements(
  input: RoleLanguageRequirementsInput,
): RoleLanguageRequirementsResult {
  const assessmentsByLanguage = new Map<string, LanguageAssessmentResult>(
    input.assessments.map((assessment) => [normalizeLanguage(assessment.language), assessment]),
  );
  const requirements = input.required_languages.map((requirement) => {
    const assessment = assessmentsByLanguage.get(normalizeLanguage(requirement.language));
    if (!assessment || assessment.assessed_level === "unknown") {
      return {
        language: requirement.language,
        minimum_level: requirement.minimum_level,
        assessed_level: "unknown" as const,
        status: "missing_evidence" as const,
        role_essential: requirement.role_essential ?? false,
        evidence: [],
        confidence: 0,
      };
    }

    return {
      language: requirement.language,
      minimum_level: requirement.minimum_level,
      assessed_level: assessment.assessed_level,
      status:
        compareCefrLevels(assessment.assessed_level, requirement.minimum_level) >= 0
          ? ("meets" as const)
          : ("below_threshold" as const),
      role_essential: requirement.role_essential ?? false,
      evidence: assessment.evidence,
      confidence: assessment.confidence,
    };
  });
  const reviewReasons = buildRoleFitReviewReasons(requirements, input.assessments);

  return {
    candidate_id: input.candidate_id,
    role_id: input.role_id,
    requirements,
    review_recommendation: resolveReviewRecommendation(requirements),
    quality_score_adjustment: 0,
    human_review_required: reviewReasons.length > 0,
    review_reasons: reviewReasons,
    version: input.version ?? LANGUAGE_ASSESSMENT_VERSION,
    generated_at: input.generated_at,
    reviewed_by_human: false,
    human_override: null,
    audit_event_id: input.audit_event_id,
  };
}

export function compareCefrLevels(left: DeclaredCefrLevel, right: DeclaredCefrLevel): number {
  if (left === "unknown" || right === "unknown") {
    return left === right ? 0 : left === "unknown" ? -1 : 1;
  }

  return CEFR_LEVELS.indexOf(left) - CEFR_LEVELS.indexOf(right);
}

export function mapScoreToCefrLevel(score: number): CefrLevel {
  const normalized = clampScore(score);
  if (normalized < 25) return "A1";
  if (normalized < 40) return "A2";
  if (normalized < 55) return "B1";
  if (normalized < 70) return "B2";
  if (normalized < 85) return "C1";
  return "C2";
}

function normalizeDimensionSignals(
  signals: LanguageDimensionSignal[],
): LanguageDimensionSignal[] {
  return signals.map((signal) => ({
    ...signal,
    score: clampScore(signal.score),
    confidence: clampScore(signal.confidence),
    evidence: signal.evidence.map((snippet) => ({
      ...snippet,
      confidence:
        snippet.confidence === undefined ? undefined : clampScore(snippet.confidence),
    })),
  }));
}

function sanitizeExcludedSignals(
  signals: DisallowedLanguageSignal[],
): DisallowedLanguageSignal[] {
  return signals.map((signal) => ({ kind: signal.kind }));
}

function buildDimensionScores(
  signals: LanguageDimensionSignal[],
): Record<LanguageDimension, LanguageDimensionScore | null> {
  const signalByDimension = new Map<LanguageDimension, LanguageDimensionSignal>(
    signals.map((signal) => [signal.dimension, signal]),
  );

  return REQUIRED_DIMENSIONS.reduce(
    (dimensions, dimension) => {
      const signal = signalByDimension.get(dimension);
      dimensions[dimension] = signal
        ? {
            dimension,
            score: signal.score,
            confidence: signal.confidence,
            evidence: signal.evidence,
            missing_data:
              signal.evidence.length === 0
                ? [`Missing ${dimensionLabel(dimension)} evidence`]
                : [],
          }
        : null;
      return dimensions;
    },
    {} as Record<LanguageDimension, LanguageDimensionScore | null>,
  );
}

function calculateConfidence(
  providedSignals: LanguageDimensionSignal[],
  transcriptQuality: number,
): number {
  if (providedSignals.length === 0) {
    return 0;
  }

  const evidenceConfidence = average(providedSignals.map((signal) => signal.confidence));
  const coverage = (providedSignals.length / REQUIRED_DIMENSIONS.length) * 100;

  return roundToWhole(evidenceConfidence * 0.55 + transcriptQuality * 0.25 + coverage * 0.2);
}

function buildMissingData(
  dimensions: Record<LanguageDimension, LanguageDimensionScore | null>,
  transcriptQuality: number,
): string[] {
  const missing = REQUIRED_DIMENSIONS.flatMap((dimension) =>
    dimensions[dimension] === null ? [`Missing ${dimensionLabel(dimension)} evidence`] : [],
  );

  if (transcriptQuality < 60) {
    missing.push("Transcript quality below reliable scoring threshold");
  }

  return missing;
}

function evaluateSingleRoleRequirement(
  language: string,
  assessedLevel: DeclaredCefrLevel,
  requirement?: RoleLanguageRequirement,
): RoleRequirementFit {
  if (!requirement) {
    return {
      language,
      assessed_level: assessedLevel,
      status: "not_required",
      role_essential: false,
    };
  }

  if (assessedLevel === "unknown") {
    return {
      language: requirement.language,
      minimum_level: requirement.minimum_level,
      assessed_level: assessedLevel,
      status: "unknown",
      role_essential: requirement.role_essential ?? false,
    };
  }

  return {
    language: requirement.language,
    minimum_level: requirement.minimum_level,
    assessed_level: assessedLevel,
    status:
      compareCefrLevels(assessedLevel, requirement.minimum_level) >= 0
        ? "meets"
        : "below_threshold",
    role_essential: requirement.role_essential ?? false,
  };
}

function buildReviewReasons(input: {
  confidence: number;
  transcriptQuality: number;
  missingData: string[];
  excludedSignals: DisallowedLanguageSignal[];
  roleFit: RoleRequirementFit;
}): string[] {
  const reasons = new Set<string>();

  if (input.confidence < 70) {
    reasons.add("low_language_assessment_confidence");
  }
  if (input.transcriptQuality < 60) {
    reasons.add("low_transcript_quality");
  }
  if (input.missingData.some((item) => item.startsWith("Missing "))) {
    reasons.add("insufficient_language_dimension_coverage");
  }
  if (input.excludedSignals.length > 0) {
    reasons.add("disallowed_language_signal_excluded");
  }
  if (input.roleFit.status === "below_threshold") {
    reasons.add("role_language_threshold_not_met");
  }
  if (input.roleFit.status === "unknown") {
    reasons.add("role_language_threshold_needs_review");
  }
  if (input.roleFit.status !== "not_required") {
    reasons.add("cefr_level_requires_human_calibration");
  }

  return [...reasons];
}

function buildRoleFitReviewReasons(
  requirements: RoleLanguageRequirementResult[],
  assessments: LanguageAssessmentResult[],
): string[] {
  const reasons = new Set<string>();

  if (requirements.some((requirement) => requirement.status === "missing_evidence")) {
    reasons.add("missing_role_language_assessment");
  }
  if (requirements.some((requirement) => requirement.status === "below_threshold")) {
    reasons.add("role_language_threshold_not_met");
  }
  if (assessments.some((assessment) => assessment.human_review_required)) {
    reasons.add("language_assessment_requires_review");
  }

  return [...reasons];
}

function resolveReviewRecommendation(
  requirements: RoleLanguageRequirementResult[],
): LanguageReviewRecommendation {
  if (
    requirements.some(
      (requirement) =>
        requirement.role_essential &&
        (requirement.status === "below_threshold" ||
          requirement.status === "missing_evidence"),
    )
  ) {
    return "role_language_gap_needs_human_review";
  }

  if (requirements.some((requirement) => requirement.status !== "meets")) {
    return "needs_human_review";
  }

  return "language_evidence_meets_role_requirements";
}

function normalizeLanguage(language: string): string {
  return language.trim().toLocaleLowerCase();
}

function dimensionLabel(dimension: LanguageDimension): string {
  return dimension.replaceAll("_", " ");
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToWhole(value: number): number {
  return Math.round(value);
}
