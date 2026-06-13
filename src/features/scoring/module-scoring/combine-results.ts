import {
  buildModuleScoreResult,
  type ModuleScorerType,
  type ModuleScoreResult,
} from "./scorer-types";

/**
 * Combine the parts of a MIXED module into one result (Phase 1–2). Several
 * modules pair scorers, e.g.:
 *  - module 2 (communication & problem-solving): deterministic puzzles + behavioral;
 *  - module 4 (AI fluency): deterministic quiz + LLM open scenario;
 *  - module 5 (data literacy): interactive chart end-state + LLM interpretation;
 *  - module 6 (SQL): interactive result-set + LLM query-shape rubric;
 *  - module 19 (SJT): deterministic choices + LLM justification.
 *
 * The combined result simply concatenates the parts' competency scores and
 * re-rolls them up with the shared rules (confidence-weighted module score,
 * human-review escalation, fallback-confidence cap), so a mixed module is
 * indistinguishable downstream from a single-scorer module.
 */
export function combineModuleResults(args: {
  readonly module_id: string;
  readonly scorer_type: ModuleScorerType;
  readonly scorer_version: string;
  readonly parts: readonly ModuleScoreResult[];
  readonly now?: string;
}): ModuleScoreResult {
  return buildModuleScoreResult({
    module_id: args.module_id,
    scorer_type: args.scorer_type,
    scorer_version: args.scorer_version,
    competency_scores: args.parts.flatMap((part) => part.competency_scores),
    used_fallback: args.parts.some((part) => part.used_fallback),
    now: args.now,
  });
}
