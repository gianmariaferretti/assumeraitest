import { createDeterministicScorer } from "../quiz-engine/deterministic-scorer";

import type { ModuleScorer, ModuleScorerType } from "./scorer-types";

/**
 * Scorer router (Phase 0). Each module declares HOW it is graded; the router
 * resolves the scorer for that type. Modules default to `behavioral` so the
 * existing interview flow is unchanged when a module has no explicit entry.
 *
 * `behavioral` has no live scorer here: that path runs through the existing
 * per-turn conduct-turn → aggregation pipeline and is projected with
 * `behavioral-scorer-adapter.ts`. Registering a scorer for it would duplicate
 * that flow, so the router exposes only the NEW scorer types and treats
 * behavioral as "scored elsewhere".
 */

/** Module id → scorer type. Absent ids default to behavioral. */
export const MODULE_SCORER_TYPES: Readonly<Record<string, ModuleScorerType>> = {
  // CORE behavioral modules (existing flow):
  motivation: "behavioral",
  // Phase 1+ modules register here as they land, e.g.:
  // logical_reasoning: "deterministic",
  // language_reading: "deterministic",
  // coding_with_ai: "work_sample",
};

export function resolveModuleScorerType(moduleId: string): ModuleScorerType {
  return MODULE_SCORER_TYPES[moduleId] ?? "behavioral";
}

const SCORER_FACTORIES: Partial<Record<ModuleScorerType, () => ModuleScorer>> = {
  deterministic: createDeterministicScorer,
  // work_sample / language / interactive scorers register here in later phases.
};

/**
 * Resolve a live scorer for a scorer type. Returns undefined for `behavioral`
 * (scored via the existing pipeline + adapter) and for types not yet
 * implemented — callers must handle the behavioral/legacy path explicitly.
 */
export function resolveModuleScorer(type: ModuleScorerType): ModuleScorer | undefined {
  return SCORER_FACTORIES[type]?.();
}

/** True when the module is graded by a live scorer registered in the router. */
export function hasLiveScorer(type: ModuleScorerType): boolean {
  return SCORER_FACTORIES[type] !== undefined;
}
