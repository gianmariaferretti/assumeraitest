import type { InterviewScorecard, UpstreamScoreDimension } from "../../matching/engine-types";

import type { ModuleScoreResult } from "./scorer-types";

/**
 * Bridge module-scoring results into the matching engine's `InterviewScorecard`
 * (Phase 0). Matching stays agnostic to scorer type: it only ever sees
 * `module_scores` (0–100, with evidence + confidence) and an overall roll-up.
 * `engine.ts` / `engine-types.ts` are not modified — this maps onto shapes they
 * already accept.
 *
 * `manual_review_flags` carries the module ids that need human review, so the
 * existing review-required logic in matching keeps working unchanged.
 */

function resultToDimension(result: ModuleScoreResult): UpstreamScoreDimension {
  return {
    score: result.module_score,
    confidence: Math.round(result.confidence * 100),
    evidence: result.competency_scores.flatMap((competency) => competency.evidence).slice(0, 12),
    missing_data: result.needs_human_review
      ? [`${result.module_id}: flagged for human review (${result.scorer_type} scorer).`]
      : [],
  };
}

export function modulesToInterviewScorecard(
  results: readonly ModuleScoreResult[],
): InterviewScorecard {
  const moduleScores: Record<string, UpstreamScoreDimension> = {};
  for (const result of results) {
    moduleScores[result.module_id] = resultToDimension(result);
  }

  const overall =
    results.length === 0
      ? undefined
      : Math.round(results.reduce((sum, result) => sum + result.module_score, 0) / results.length);
  const overallConfidence =
    results.length === 0
      ? undefined
      : Math.round(
          (results.reduce((sum, result) => sum + result.confidence, 0) / results.length) * 100,
        );

  return {
    overall_interview_score: overall,
    interview_confidence_score: overallConfidence,
    module_scores: moduleScores,
    manual_review_flags: results
      .filter((result) => result.needs_human_review)
      .map((result) => result.module_id),
  };
}
