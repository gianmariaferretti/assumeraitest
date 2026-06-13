/**
 * Module scoring abstraction (Phase 0 of the 22-module assessment library).
 *
 * Today the interview has effectively ONE scorer: the behavioral LLM + BARS/STAR
 * evaluator wired through conduct-turn → aggregation. The 22-module library needs
 * several scoring strategies (deterministic quizzes, work samples, language
 * sub-skills, interactive end-state grading). This module introduces a
 * scorer-agnostic result shape + a router so each module declares HOW it is
 * graded while aggregation and matching stay agnostic to the scorer type.
 *
 * Non-negotiables preserved from the existing engine:
 *  - every score is a recommendation for human review, never an auto hire/reject;
 *  - every score carries verbatim evidence + a plain-language reason (also the
 *    EU AI Act audit string);
 *  - every scorer has a deterministic fallback that NEVER claims high confidence.
 *
 * Scale: results are normalized to 0–100 (the matching ingest scale). The
 * behavioral adapter converts the engine's native 1–10 BARS scale.
 */

export type ModuleScorerType =
  | "behavioral" // existing LLM + BARS/STAR, via a thin adapter
  | "deterministic" // rule-based answer-key quiz grader
  | "work_sample" // automated tests + rubric (+ optional LLM)
  | "language" // mixed: deterministic + LLM + ASR+LLM per sub-skill
  | "interactive"; // structured end-state grading (SQL/spreadsheet/chart)

export const MODULE_SCORER_TYPES: readonly ModuleScorerType[] = [
  "behavioral",
  "deterministic",
  "work_sample",
  "language",
  "interactive",
];

/** Confidence at or below this is always routed to a human reviewer. */
export const LOW_CONFIDENCE_REVIEW_THRESHOLD = 0.5;
/** A deterministic fallback may never report more than this confidence. */
export const FALLBACK_MAX_CONFIDENCE = 0.4;

/** Scorer-agnostic per-competency score. Always carries evidence + a reason. */
export interface ScoredCompetency {
  readonly competency_id: string;
  /** Normalized 0–100 (matching ingest scale). */
  readonly score: number;
  /** 0–1. */
  readonly confidence: number;
  /** Verbatim evidence: candidate answers, graded items, snippets. */
  readonly evidence: readonly string[];
  /** Plain-language reason; doubles as the EU AI Act audit string. */
  readonly reason: string;
  readonly needs_human_review: boolean;
}

/** What every scorer emits. Maps onto aggregation + matching shapes downstream. */
export interface ModuleScoreResult {
  readonly module_id: string;
  readonly scorer_type: ModuleScorerType;
  readonly scorer_version: string;
  readonly competency_scores: readonly ScoredCompetency[];
  /** 0–100 module roll-up. */
  readonly module_score: number;
  /** 0–1. */
  readonly confidence: number;
  readonly needs_human_review: boolean;
  /** True when a deterministic fallback produced this result. */
  readonly used_fallback: boolean;
  readonly generated_at: string;
}

export interface ModuleScoringInput {
  readonly module_id: string;
  readonly candidate_id: string;
  readonly interview_session_id: string;
  /** Scorer-specific payload, validated by each scorer. */
  readonly payload: unknown;
  readonly now?: string;
}

export interface ModuleScorer {
  readonly type: ModuleScorerType;
  readonly version: string;
  scoreModule(input: ModuleScoringInput): Promise<ModuleScoreResult>;
}

export function clampScore0to100(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

/**
 * Roll competency scores up to a module result. Confidence-weighted mean for
 * the module score; the module needs human review when any competency does,
 * when overall confidence is low, or when a fallback produced the result.
 */
export function buildModuleScoreResult(args: {
  readonly module_id: string;
  readonly scorer_type: ModuleScorerType;
  readonly scorer_version: string;
  readonly competency_scores: readonly ScoredCompetency[];
  readonly used_fallback: boolean;
  readonly now?: string;
}): ModuleScoreResult {
  const competencies = args.competency_scores;
  const totalWeight = competencies.reduce(
    (sum, competency) => sum + Math.max(0.1, competency.confidence),
    0,
  );
  const moduleScore =
    competencies.length === 0 || totalWeight === 0
      ? 0
      : clampScore0to100(
          competencies.reduce(
            (sum, competency) => sum + competency.score * Math.max(0.1, competency.confidence),
            0,
          ) / totalWeight,
        );

  const rawConfidence =
    competencies.length === 0
      ? 0
      : competencies.reduce((sum, competency) => sum + competency.confidence, 0) /
        competencies.length;
  const confidence = clampConfidence(
    args.used_fallback ? Math.min(rawConfidence, FALLBACK_MAX_CONFIDENCE) : rawConfidence,
  );

  const needsHumanReview =
    competencies.length === 0 ||
    args.used_fallback ||
    confidence <= LOW_CONFIDENCE_REVIEW_THRESHOLD ||
    competencies.some((competency) => competency.needs_human_review);

  return {
    module_id: args.module_id,
    scorer_type: args.scorer_type,
    scorer_version: args.scorer_version,
    competency_scores: competencies,
    module_score: moduleScore,
    confidence,
    needs_human_review: needsHumanReview,
    used_fallback: args.used_fallback,
    generated_at: args.now ?? new Date().toISOString(),
  };
}
