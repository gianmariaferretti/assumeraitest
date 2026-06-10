import type { DimensionDraft, MatchingScoreInput } from "../engine-types";
import {
  average,
  candidateHasSkill,
  clamp,
  confidenceFromEvidence,
  isNumber,
} from "../engine-utils";

export function getGrowthPotentialFit(input: MatchingScoreInput): DimensionDraft {
  const evidenceQuality = average(
    input.candidate.experience
      .map((experience) => experience.evidence_quality)
      .filter(isNumber),
  );
  const measurableImpactCount = input.candidate.experience.flatMap(
    (experience) => experience.measurable_impact ?? [],
  ).length;
  const niceToHaveMatches = (input.role.requirements.nice_to_have_skills ?? []).filter((skill) =>
    candidateHasSkill(input.candidate, skill),
  ).length;
  const score = clamp(
    (evidenceQuality || 55) * 0.65 + Math.min(measurableImpactCount * 8, 20) + Math.min(niceToHaveMatches * 5, 15),
    0,
    100,
  );

  return {
    score,
    confidence: confidenceFromEvidence(measurableImpactCount + niceToHaveMatches),
    evidence: input.candidate.experience
      .flatMap((experience) => experience.measurable_impact ?? [])
      .slice(0, 4),
    missing_data: measurableImpactCount ? [] : ["Measurable impact evidence is limited."],
  };
}
