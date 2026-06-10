import type { DimensionDraft, HardGateOutcome, MatchingScoreInput } from "../engine-types";
import { average, roundScore } from "../engine-utils";

export function getMatchConfidence(
  input: MatchingScoreInput,
  hardGates: HardGateOutcome[],
): DimensionDraft {
  const parserConfidence = input.candidate.parse_metadata?.parser_confidence ?? 60;
  const resumeConfidence = input.resumeScorecard?.confidence_score ?? 60;
  const interviewConfidence = input.interviewScorecard?.interview_confidence_score ?? 45;
  const calibrationCompleteness = input.role.calibration.weights ? 85 : 70;
  const missingCriticalEvidence = [
    ...(input.candidate.parse_metadata?.missing_data ?? []),
    ...(!input.interviewScorecard ? ["Interview evidence is not available."] : []),
    ...hardGates.filter((gate) => !gate.passed).map((gate) => gate.explanation),
  ];
  const evidenceCompleteness = Math.max(35, 90 - missingCriticalEvidence.length * 12);
  const confidence = average([
    parserConfidence,
    resumeConfidence,
    interviewConfidence,
    calibrationCompleteness,
    evidenceCompleteness,
  ]);

  return {
    score: confidence,
    confidence,
    evidence: [
      `Parser confidence ${roundScore(parserConfidence)}.`,
      `Role calibration ${input.role.calibration.version} is present.`,
    ],
    missing_data: missingCriticalEvidence,
  };
}
