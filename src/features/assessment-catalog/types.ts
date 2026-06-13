import type { ModuleScorerType } from "../scoring/module-scoring/scorer-types";

/**
 * Assessment module catalog (Phases 1–2). The single source of truth that turns
 * the engine into a configurable library: each of the 22 modules declares its
 * track, how it is scored, the competencies it measures, its time budget, and
 * how it unlocks. The catalog drives both the candidate journey (default module
 * plan + prerequisites) and scorer routing.
 */

export type AssessmentTrack =
  | "core"
  | "technical"
  | "cognitive"
  | "language"
  | "human"
  | "meta";

export type AssessmentPhase = 1 | 2 | 3;

export interface AssessmentModuleDefinition {
  readonly module_id: string;
  readonly title: string;
  readonly track: AssessmentTrack;
  readonly scorer_type: ModuleScorerType;
  /** active = shipped; draft = declared, not yet user-facing. */
  readonly status: "active" | "draft";
  readonly phase: AssessmentPhase;
  /** Candidate time budget; CORE modules sum to ~20 minutes. */
  readonly duration_budget_seconds: number;
  readonly competencies: readonly string[];
  readonly description: string;
  /** CORE modules every candidate completes; gate the rest of the journey. */
  readonly core?: boolean;
  /** CV skills that auto-trigger this module (reuses the unlock synonym map). */
  readonly auto_trigger_keywords?: readonly string[];
  /** Seniority gate (e.g. leadership is senior-only). */
  readonly senior_only?: boolean;
  /**
   * Descriptive-only modules (e.g. work-style preferences) NEVER contribute a
   * quality score to matching — they yield a fit profile for human review,
   * mirroring the Phase 13/14 flag-only philosophy.
   */
  readonly descriptive_only?: boolean;
}
