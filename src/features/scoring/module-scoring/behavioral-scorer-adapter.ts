import type { CompetencyScore, ModuleScore } from "../aggregation";

import {
  buildModuleScoreResult,
  clampConfidence,
  clampScore0to100,
  type ModuleScoreResult,
  type ScoredCompetency,
} from "./scorer-types";

/**
 * Behavioral scorer adapter (Phase 0). The existing LLM + BARS/STAR flow
 * (conduct-turn → aggregation) is UNTOUCHED; this is a thin, pure mapping that
 * projects an aggregation `ModuleScore` (native 1–10 BARS scale) onto the
 * scorer-agnostic `ModuleScoreResult` (0–100) so behavioral modules sit in the
 * same module-scoring contract as deterministic/quiz modules.
 *
 * No new scoring logic lives here — it only re-expresses what aggregation
 * already computed, preserving evidence and the human-review signal.
 */

export const BEHAVIORAL_SCORER_VERSION = "behavioral-bars-adapter-v1";

function competencyToScored(competency: CompetencyScore): ScoredCompetency {
  return {
    competency_id: competency.competency_id,
    score: clampScore0to100(competency.bars_score * 10),
    confidence: clampConfidence(competency.confidence),
    evidence: [...competency.evidence_snippets],
    reason:
      `BARS ${competency.bars_score}/10 (${competency.bars_level}) over ` +
      `${competency.answers_evaluated} answer(s); behavioral evidence scored against the ` +
      "competency's anchors. Recommendation for human review, not an automated decision.",
    needs_human_review: competency.human_review_required,
  };
}

/**
 * Map an aggregation module score to the common result shape. `usedFallback`
 * is surfaced by the caller (the behavioral evaluator records per-answer
 * fallback provenance); it never lets the result claim high confidence.
 */
export function moduleScoreToResult(
  moduleScore: ModuleScore,
  options?: { readonly usedFallback?: boolean; readonly now?: string },
): ModuleScoreResult {
  return buildModuleScoreResult({
    module_id: String(moduleScore.module_id),
    scorer_type: "behavioral",
    scorer_version: BEHAVIORAL_SCORER_VERSION,
    competency_scores: moduleScore.competencies.map(competencyToScored),
    used_fallback: options?.usedFallback ?? false,
    now: options?.now,
  });
}
