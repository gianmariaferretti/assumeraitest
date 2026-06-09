export const INTERVIEW_SCORECARD_VERSION = "interview-scorecard-v0";
export const INTERVIEW_FORMULA_VERSION = "interview-default-formula-v0";

export const INTERVIEW_SCORE_DIMENSIONS = [
  "InterviewCommunicationScore",
  "RoleUnderstandingScore",
  "MotivationAlignmentScore",
  "DomainKnowledgeScore",
  "WorkSampleScore",
  "ProblemSolvingScore",
  "JudgmentUnderAmbiguityScore",
  "CollaborationSignalScore",
  "LanguageAssessmentScore",
  "EvidenceQualityScore",
] as const;

export type InterviewScoreDimension = (typeof INTERVIEW_SCORE_DIMENSIONS)[number];

export const DEFAULT_INTERVIEW_WEIGHTS: Readonly<Record<InterviewScoreDimension, number>> = {
  ProblemSolvingScore: 0.18,
  WorkSampleScore: 0.16,
  InterviewCommunicationScore: 0.15,
  RoleUnderstandingScore: 0.14,
  DomainKnowledgeScore: 0.12,
  JudgmentUnderAmbiguityScore: 0.1,
  LanguageAssessmentScore: 0.08,
  MotivationAlignmentScore: 0.05,
  EvidenceQualityScore: 0.02,
  CollaborationSignalScore: 0,
};

export type InterviewEvidenceInput = {
  source: string;
  snippet: string;
  timestampStart?: string;
  timestampEnd?: string;
  confidence?: number;
};

export type InterviewEvidence = {
  source: string;
  snippet: string;
  timestamp_start?: string;
  timestamp_end?: string;
  confidence?: number;
};

export type InterviewDimensionInput = {
  dimension: InterviewScoreDimension;
  score: number;
  confidence: number;
  evidence: InterviewEvidenceInput[];
  missingData?: string[];
};

export type RawInterviewMediaAsset = {
  id: string;
  uri: string;
};

export type HumanOverride = {
  reviewer_id?: string;
  reason?: string;
  previous_score?: number;
  new_score?: number;
  overridden_at?: string;
} | null;

export type InterviewScoreDimensionResult = {
  score: number;
  confidence: number;
  evidence: InterviewEvidence[];
  missing_data: string[];
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: HumanOverride;
  audit_event_id: string;
};

export type InterviewScorecard = {
  candidate_id: string;
  interview_session_id: string;
  role_id?: string;
  overall_interview_score: number;
  interview_confidence_score: number;
  module_scores: Record<InterviewScoreDimension, InterviewScoreDimensionResult>;
  candidate_facing_summary: string;
  employer_facing_summary: string;
  training_suggestions: string[];
  manual_review_flags: string[];
  raw_media_deleted_at: string | null;
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: HumanOverride;
  audit_event_id: string;
};

export type CreateInterviewScorecardInput = {
  candidateId: string;
  interviewSessionId: string;
  roleId?: string;
  generatedAt?: string;
  auditEventId: string;
  dimensions: InterviewDimensionInput[];
  weights?: Partial<Record<InterviewScoreDimension, number>>;
  rawMedia?: RawInterviewMediaAsset[];
};

export type CreateInterviewScorecardOptions = {
  deleteRawMedia?: (asset: RawInterviewMediaAsset) => Promise<string | Date | void> | string | Date | void;
};

export type CandidateInterviewScorecardView = {
  candidate_id: string;
  interview_session_id: string;
  role_id?: string;
  overall_interview_score: number;
  interview_confidence_score: number;
  module_scores: Record<InterviewScoreDimension, InterviewScoreDimensionResult>;
  summary: string;
  training_suggestions: string[];
  manual_review_flags: string[];
  generated_at: string;
  version: string;
};

export type EmployerInterviewScorecardView =
  | {
      access_granted: false;
      reason: "candidate_consent_required";
    }
  | {
      access_granted: true;
      scorecard: Pick<
        InterviewScorecard,
        | "candidate_id"
        | "interview_session_id"
        | "role_id"
        | "overall_interview_score"
        | "interview_confidence_score"
        | "module_scores"
        | "employer_facing_summary"
        | "manual_review_flags"
        | "generated_at"
        | "version"
        | "audit_event_id"
      >;
    };

const NEUTRAL_SCORE = 50;
const LOW_CONFIDENCE_REVIEW_THRESHOLD = 60;

const DISALLOWED_SIGNAL_PATTERNS: ReadonlyArray<readonly [signal: string, pattern: RegExp]> = [
  ["accent", /\baccent(?:ed|s)?\b/i],
  ["voice tone", /\bvoice\s+tone\b|\btone\s+of\s+voice\b/i],
  ["emotion", /\bemotion(?:al|s)?\b|\baffect\b|\bmood\b/i],
  ["face", /\bface\b|\bfacial\b|\bsmil(?:e|ed|ing)\b/i],
  ["biometric", /\bbiometric(?:s)?\b/i],
  ["personality", /\bpersonality\b|\btemperament\b/i],
  ["age", /\bage\b|\byears?\s+old\b|\bborn\b/i],
  ["race", /\brace\b|\bracial\b/i],
  ["ethnicity", /\bethnicity\b|\bethnic\b/i],
  ["religion", /\breligion\b|\breligious\b/i],
  ["gender", /\bgender\b/i],
  ["disability", /\bdisabilit(?:y|ies)\b/i],
  ["sexual orientation", /\bsexual\s+orientation\b/i],
  ["family status", /\bfamily\s+status\b|\bmarital\s+status\b/i],
  ["health", /\bhealth\b|\bmedical\b/i],
  ["pregnancy", /\bpregnan(?:t|cy)\b/i],
  ["caregiving", /\bcaregiv(?:er|ing)\b/i],
  ["nationality", /\bnationality\b|\bnative\s+speaker\b/i],
];

export async function createInterviewScorecard(
  input: CreateInterviewScorecardInput,
  options: CreateInterviewScorecardOptions = {},
): Promise<InterviewScorecard> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const manualReviewFlags = new Set<string>();
  const dimensionsByName = new Map<InterviewScoreDimension, InterviewDimensionInput>(
    input.dimensions.map((dimension) => [dimension.dimension, dimension] as const),
  );
  const moduleScores = {} as Record<InterviewScoreDimension, InterviewScoreDimensionResult>;

  for (const dimension of INTERVIEW_SCORE_DIMENSIONS) {
    const dimensionInput = dimensionsByName.get(dimension);
    moduleScores[dimension] = buildDimensionScore({
      auditEventId: input.auditEventId,
      dimension,
      generatedAt,
      input: dimensionInput,
      manualReviewFlags,
    });
  }

  const normalizedWeights = normalizeWeights(input.weights);
  const overallInterviewScore = roundScore(
    INTERVIEW_SCORE_DIMENSIONS.reduce(
      (total, dimension) => total + normalizedWeights[dimension] * moduleScores[dimension].score,
      0,
    ),
  );
  const interviewConfidenceScore = roundScore(
    INTERVIEW_SCORE_DIMENSIONS.reduce(
      (total, dimension) => total + normalizedWeights[dimension] * moduleScores[dimension].confidence,
      0,
    ),
  );

  if (interviewConfidenceScore < LOW_CONFIDENCE_REVIEW_THRESHOLD) {
    manualReviewFlags.add("Low interview confidence requires human review");
  }

  const rawMediaDeletedAt = await deleteRawMediaAfterScoring({
    deleteRawMedia: options.deleteRawMedia,
    generatedAt,
    manualReviewFlags,
    rawMedia: input.rawMedia ?? [],
  });

  const sortedManualReviewFlags = [...manualReviewFlags].sort();

  return {
    candidate_id: input.candidateId,
    interview_session_id: input.interviewSessionId,
    role_id: input.roleId,
    overall_interview_score: overallInterviewScore,
    interview_confidence_score: interviewConfidenceScore,
    module_scores: moduleScores,
    candidate_facing_summary: buildCandidateSummary(overallInterviewScore, interviewConfidenceScore),
    employer_facing_summary: buildEmployerSummary(overallInterviewScore, interviewConfidenceScore),
    training_suggestions: buildTrainingSuggestions(moduleScores),
    manual_review_flags: sortedManualReviewFlags,
    raw_media_deleted_at: rawMediaDeletedAt,
    version: INTERVIEW_SCORECARD_VERSION,
    generated_at: generatedAt,
    reviewed_by_human: false,
    human_override: null,
    audit_event_id: input.auditEventId,
  };
}

export function createCandidateInterviewScorecardView(
  scorecard: InterviewScorecard,
): CandidateInterviewScorecardView {
  return {
    candidate_id: scorecard.candidate_id,
    interview_session_id: scorecard.interview_session_id,
    role_id: scorecard.role_id,
    overall_interview_score: scorecard.overall_interview_score,
    interview_confidence_score: scorecard.interview_confidence_score,
    module_scores: scorecard.module_scores,
    summary: scorecard.candidate_facing_summary,
    training_suggestions: scorecard.training_suggestions,
    manual_review_flags: scorecard.manual_review_flags,
    generated_at: scorecard.generated_at,
    version: scorecard.version,
  };
}

export function createEmployerInterviewScorecardView(
  scorecard: InterviewScorecard,
  access: { candidateConsentRecorded: boolean },
): EmployerInterviewScorecardView {
  if (!access.candidateConsentRecorded) {
    return {
      access_granted: false,
      reason: "candidate_consent_required",
    };
  }

  return {
    access_granted: true,
    scorecard: {
      candidate_id: scorecard.candidate_id,
      interview_session_id: scorecard.interview_session_id,
      role_id: scorecard.role_id,
      overall_interview_score: scorecard.overall_interview_score,
      interview_confidence_score: scorecard.interview_confidence_score,
      module_scores: scorecard.module_scores,
      employer_facing_summary: scorecard.employer_facing_summary,
      manual_review_flags: scorecard.manual_review_flags,
      generated_at: scorecard.generated_at,
      version: scorecard.version,
      audit_event_id: scorecard.audit_event_id,
    },
  };
}

function buildDimensionScore(args: {
  auditEventId: string;
  dimension: InterviewScoreDimension;
  generatedAt: string;
  input: InterviewDimensionInput | undefined;
  manualReviewFlags: Set<string>;
}): InterviewScoreDimensionResult {
  if (!args.input) {
    args.manualReviewFlags.add("Missing interview evidence requires human review");
    return {
      score: NEUTRAL_SCORE,
      confidence: 0,
      evidence: [],
      missing_data: [`No interview evidence supplied for ${args.dimension}`],
      version: INTERVIEW_FORMULA_VERSION,
      generated_at: args.generatedAt,
      reviewed_by_human: false,
      human_override: null,
      audit_event_id: args.auditEventId,
    };
  }

  const disallowedSignals = new Set<string>();
  const evidence = args.input.evidence.flatMap((evidenceInput) => {
    const evidenceSignals = findDisallowedSignals(evidenceInput.snippet);
    for (const signal of evidenceSignals) {
      disallowedSignals.add(signal);
    }

    if (evidenceSignals.length > 0) {
      return [];
    }

    return [normalizeEvidence(evidenceInput)];
  });

  const missingData = [...(args.input.missingData ?? [])];
  if (disallowedSignals.size > 0) {
    for (const signal of disallowedSignals) {
      args.manualReviewFlags.add(`Disallowed interview signal excluded: ${signal}`);
    }
    missingData.push("Provided evidence contained disallowed interview signals and was excluded.");
  }

  return {
    score: disallowedSignals.size > 0 ? NEUTRAL_SCORE : clampScore(args.input.score),
    confidence: disallowedSignals.size > 0 ? 0 : clampScore(args.input.confidence),
    evidence,
    missing_data: missingData,
    version: INTERVIEW_FORMULA_VERSION,
    generated_at: args.generatedAt,
    reviewed_by_human: false,
    human_override: null,
    audit_event_id: args.auditEventId,
  };
}

function normalizeEvidence(evidence: InterviewEvidenceInput): InterviewEvidence {
  return {
    source: evidence.source,
    snippet: evidence.snippet,
    timestamp_start: evidence.timestampStart,
    timestamp_end: evidence.timestampEnd,
    confidence: evidence.confidence === undefined ? undefined : clampScore(evidence.confidence),
  };
}

function findDisallowedSignals(text: string): string[] {
  return DISALLOWED_SIGNAL_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([signal]) => signal);
}

function normalizeWeights(
  weights: Partial<Record<InterviewScoreDimension, number>> = {},
): Record<InterviewScoreDimension, number> {
  const mergedWeights = Object.fromEntries(
    INTERVIEW_SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      Math.max(0, weights[dimension] ?? DEFAULT_INTERVIEW_WEIGHTS[dimension]),
    ]),
  ) as Record<InterviewScoreDimension, number>;

  const totalWeight = INTERVIEW_SCORE_DIMENSIONS.reduce(
    (total, dimension) => total + mergedWeights[dimension],
    0,
  );

  if (totalWeight === 0) {
    return { ...DEFAULT_INTERVIEW_WEIGHTS };
  }

  return Object.fromEntries(
    INTERVIEW_SCORE_DIMENSIONS.map((dimension) => [dimension, mergedWeights[dimension] / totalWeight]),
  ) as Record<InterviewScoreDimension, number>;
}

async function deleteRawMediaAfterScoring(args: {
  deleteRawMedia: CreateInterviewScorecardOptions["deleteRawMedia"];
  generatedAt: string;
  manualReviewFlags: Set<string>;
  rawMedia: RawInterviewMediaAsset[];
}): Promise<string | null> {
  if (args.rawMedia.length === 0) {
    return null;
  }

  if (!args.deleteRawMedia) {
    args.manualReviewFlags.add("Raw interview media deletion hook unavailable");
    return null;
  }

  const deletedAtValues: string[] = [];
  for (const asset of args.rawMedia) {
    try {
      const deletedAt = await args.deleteRawMedia(asset);
      deletedAtValues.push(normalizeDeletionTimestamp(deletedAt, args.generatedAt));
    } catch {
      args.manualReviewFlags.add(`Raw interview media deletion failed for ${asset.id}`);
    }
  }

  if (deletedAtValues.length !== args.rawMedia.length) {
    return null;
  }

  return deletedAtValues
    .map((value) => new Date(value))
    .sort((a, b) => b.getTime() - a.getTime())[0]
    .toISOString();
}

function normalizeDeletionTimestamp(value: string | Date | void, fallback: string): string {
  if (value instanceof Date) {
    return toIsoTimestamp(value, fallback);
  }

  if (typeof value === "string") {
    return toIsoTimestamp(new Date(value), fallback);
  }

  return toIsoTimestamp(new Date(fallback), fallback);
}

function toIsoTimestamp(value: Date, fallback: string): string {
  if (Number.isFinite(value.getTime())) {
    return value.toISOString();
  }

  return new Date(fallback).toISOString();
}

function buildCandidateSummary(score: number, confidence: number): string {
  return `Interview score ${score} with ${confidence} confidence. This is a decision-support scorecard for review, not an automated hiring decision.`;
}

function buildEmployerSummary(score: number, confidence: number): string {
  return `Interview score ${score} with ${confidence} confidence for human review. Do not use this scorecard as an automated hiring or rejection decision.`;
}

function buildTrainingSuggestions(
  moduleScores: Record<InterviewScoreDimension, InterviewScoreDimensionResult>,
): string[] {
  return INTERVIEW_SCORE_DIMENSIONS.filter((dimension) => moduleScores[dimension].confidence < 60).map(
    (dimension) => `Review or strengthen evidence for ${dimension}.`,
  );
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return NEUTRAL_SCORE;
  }

  return Math.min(100, Math.max(0, roundScore(score)));
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
