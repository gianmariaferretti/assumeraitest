import type { DimensionDraft, HardGateOutcome, MatchingScoreInput } from "../engine-types";
import {
  average,
  evaluateRequiredLanguages,
  hasLocationOverlap,
  hasOverlap,
} from "../engine-utils";

export function getLanguageLocationAvailabilityFit(
  input: MatchingScoreInput,
  hardGates: HardGateOutcome[],
): DimensionDraft {
  const languageEvaluation = evaluateRequiredLanguages(input.candidate, input.role);
  const locationMatch = hasLocationOverlap(input.candidate, input.role);
  const workModeMatch = hasOverlap(
    input.candidate.preferences.work_modes,
    input.role.work_modes ?? [],
  );
  const hardGateFailure = hardGates.some((gate) => !gate.passed);
  const languageHardGateFailure = hardGates.some(
    (gate) => gate.gate_type === "language" && !gate.passed,
  );
  const score = average([
    languageEvaluation.score,
    locationMatch ? 85 : 45,
    workModeMatch ? 85 : 45,
  ]);

  return {
    score: languageHardGateFailure
      ? Math.min(score, 45)
      : hardGateFailure
        ? Math.min(score, 65)
        : score,
    confidence: languageEvaluation.confidence,
    evidence: [
      ...languageEvaluation.evidence,
      locationMatch ? "Candidate location preferences overlap role constraints." : "",
      workModeMatch ? "Candidate work-mode preferences overlap role work modes." : "",
    ],
    missing_data: [
      ...languageEvaluation.missing,
      ...(locationMatch ? [] : ["Location overlap evidence is incomplete."]),
      ...(workModeMatch ? [] : ["Work-mode overlap evidence is incomplete."]),
    ],
  };
}
