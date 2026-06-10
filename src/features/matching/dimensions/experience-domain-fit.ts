import type { DimensionDraft, MatchingScoreInput } from "../engine-types";
import {
  average,
  confidenceFromEvidence,
  fromUpstreamDimension,
  isNumber,
  normalize,
} from "../engine-utils";

export function getExperienceDomainFit(input: MatchingScoreInput): DimensionDraft {
  const upstream = input.resumeScorecard?.scores?.ExperienceRelevanceScore;
  if (upstream?.score !== undefined) {
    return fromUpstreamDimension(upstream);
  }

  const candidateText = normalize(
    input.candidate.experience
      .flatMap((experience) => [
        experience.title,
        experience.industry,
        experience.function,
        ...(experience.responsibilities ?? []),
        ...(experience.measurable_impact ?? []),
        ...(experience.tools ?? []),
      ])
      .filter(Boolean)
      .join(" "),
  );
  const roleTokens = [
    input.role.title,
    input.role.role_type,
    ...(input.role.requirements.required_skills ?? []),
    ...(input.role.requirements.nice_to_have_skills ?? []),
  ].filter(Boolean);
  const matches = roleTokens.filter((token) => candidateText.includes(normalize(token)));
  const evidenceQuality = average(
    input.candidate.experience
      .map((experience) => experience.evidence_quality)
      .filter(isNumber),
  );
  const tokenScore = roleTokens.length ? (matches.length / roleTokens.length) * 100 : 65;
  const score = average([tokenScore, evidenceQuality || 60]);

  return {
    score,
    confidence: confidenceFromEvidence(input.candidate.experience.length + matches.length),
    evidence: [
      matches.length ? `Experience overlaps role signals: ${matches.join(", ")}.` : "",
      ...input.candidate.experience
        .flatMap((experience) => experience.measurable_impact ?? [])
        .slice(0, 3),
    ],
    missing_data: matches.length ? [] : ["Role-domain evidence is limited."],
  };
}
