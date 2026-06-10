import type { DimensionDraft, MatchingScoreInput } from "../engine-types";
import { average, isNumber, normalizeEvidence } from "../engine-utils";

export function getInterviewEvidenceFit(input: MatchingScoreInput): DimensionDraft {
  if (!input.interviewScorecard) {
    return {
      score: 40,
      confidence: 35,
      evidence: [],
      missing_data: ["Interview evidence is not available."],
    };
  }

  const moduleScores = Object.values(input.interviewScorecard.module_scores ?? {});
  const evidence = moduleScores.flatMap((dimension) => normalizeEvidence(dimension.evidence)).slice(0, 5);
  const missing = moduleScores.flatMap((dimension) => dimension.missing_data ?? []);

  return {
    score: input.interviewScorecard.overall_interview_score ?? average(moduleScores.map((dimension) => dimension.score).filter(isNumber)),
    confidence:
      input.interviewScorecard.interview_confidence_score ??
      average(moduleScores.map((dimension) => dimension.confidence).filter(isNumber)),
    evidence,
    missing_data: missing,
  };
}
