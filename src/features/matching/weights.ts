/**
 * Match dimensions and their weights.
 *
 * The in-code defaults are the seed values of the versioned
 * matching_weight_sets table (see persistence.ts); every computed match
 * records the weights_version it was scored with. Role calibration can still
 * override individual dimension weights per role — the result is always
 * re-normalized to sum to 1.
 */

export const MATCH_DIMENSIONS = [
  "RoleSkillFit",
  "ExperienceDomainFit",
  "InterviewEvidenceFit",
  "LanguageLocationAvailabilityFit",
  "CandidatePreferenceFit",
  "CompanyBarFit",
  "GrowthPotentialFit",
  "EducationCredentialFit",
  "MatchConfidence",
  "ValuesAlignmentFit",
] as const;

export type MatchDimensionName = (typeof MATCH_DIMENSIONS)[number];

export const DEFAULT_MATCH_WEIGHTS_VERSION = "match-weights-v1";

export const DEFAULT_MATCH_WEIGHTS: Record<MatchDimensionName, number> = {
  RoleSkillFit: 0.22,
  ExperienceDomainFit: 0.18,
  InterviewEvidenceFit: 0.15,
  LanguageLocationAvailabilityFit: 0.12,
  CandidatePreferenceFit: 0.1,
  CompanyBarFit: 0.1,
  GrowthPotentialFit: 0.07,
  EducationCredentialFit: 0.04,
  MatchConfidence: 0.02,
  // Phase 13: values alignment on declared work-style dimensions (low default;
  // weights are normalized at scoring time, so the sum need not be 1).
  ValuesAlignmentFit: 0.05,
};

/** A versioned weight set (from matching_weight_sets or the in-code default). */
export interface MatchWeightSet {
  readonly version: string;
  readonly weights: Record<MatchDimensionName, number>;
}

export const DEFAULT_MATCH_WEIGHT_SET: MatchWeightSet = {
  version: DEFAULT_MATCH_WEIGHTS_VERSION,
  weights: DEFAULT_MATCH_WEIGHTS,
};

export function resolveWeights(
  roleWeights?: (Partial<Record<MatchDimensionName, number>> & Record<string, number | undefined>) | null,
  baseWeights: Record<MatchDimensionName, number> = DEFAULT_MATCH_WEIGHTS,
): Record<MatchDimensionName, number> {
  const candidateWeights = MATCH_DIMENSIONS.reduce(
    (weights, name) => {
      const weight = roleWeights?.[name];
      weights[name] = typeof weight === "number" ? weight : baseWeights[name];
      return weights;
    },
    {} as Record<MatchDimensionName, number>,
  );

  const total = Object.values(candidateWeights).reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return baseWeights;
  }

  return MATCH_DIMENSIONS.reduce(
    (weights, name) => {
      weights[name] = candidateWeights[name] / total;
      return weights;
    },
    {} as Record<MatchDimensionName, number>,
  );
}

export function calculateWeightedMatchScore(
  dimensions: Record<MatchDimensionName, { readonly score: number }>,
  weights: Record<MatchDimensionName, number>,
): number {
  const weightedScore = MATCH_DIMENSIONS.reduce(
    (total, name) => total + dimensions[name].score * weights[name],
    0,
  );

  return Math.round(Math.min(100, Math.max(0, weightedScore)));
}
