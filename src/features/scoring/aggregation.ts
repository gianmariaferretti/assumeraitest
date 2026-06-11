import type { ModuleId, TurnScoringMode } from "../interview-flow/types";
import {
  barsLevelForScore,
  countCompleteStarElements,
  type BarsEvaluation,
  type BarsLevel,
  type CompetencyTier,
  type DetectedRedFlag,
} from "./bars/types";
import {
  bootstrapWeightedMean,
  intervalsDistinguishable,
  type BootstrapInterval,
} from "./bootstrap";
import { zScoreVsCohort, type PeerCohortStats, type PeerCohortStatus } from "./peer-cohort";

/**
 * Scorecard aggregation — Function 4's data layer.
 *
 * Rolls per-answer BARS evaluations up to:
 *   competency score -> module score -> overall scorecard
 *
 * Two design rules from the spec:
 *  - A partial score is visible immediately after each module.
 *  - The final score only materializes once all REQUIRED modules are complete.
 *
 * Aggregation is deterministic and explainable; the natural-language candidate
 * explanation is built elsewhere (interview-evaluation) citing these snippets.
 */

export interface ModuleWeight {
  readonly moduleId: ModuleId | string;
  readonly weight: number;
  readonly required: boolean;
}

export interface CompetencyScore {
  readonly competency_id: string;
  readonly tier?: CompetencyTier;
  /**
   * Relative weight of this competency within its module (default 1). Used by
   * the Phase 15 seniority weighting of learning agility; never zero.
   */
  readonly weight?: number;
  readonly bars_score: number; // weighted mean across that competency's answers, 1-10
  readonly bars_level: BarsLevel;
  readonly answers_evaluated: number;
  readonly mean_star_completeness: number; // 0-4
  readonly confidence: number; // 0-1
  readonly evidence_snippets: readonly string[];
  readonly red_flags: readonly DetectedRedFlag[];
  readonly human_review_required: boolean;
  /** 95% percentile-bootstrap CI over this competency's per-answer scores. */
  readonly score_interval?: BootstrapInterval;
}

export interface ModuleScore {
  readonly module_id: ModuleId | string;
  readonly bars_score: number;
  readonly bars_level: BarsLevel;
  readonly competencies: readonly CompetencyScore[];
  readonly confidence: number;
  readonly red_flag_count: number;
  readonly high_severity_red_flag_count: number;
  readonly human_review_required: boolean;
  /** 95% percentile-bootstrap CI over this module's competency scores. */
  readonly score_interval?: BootstrapInterval;
}

export type ScorecardStatus = "preview" | "final";

export interface Scorecard {
  readonly status: ScorecardStatus;
  /** Visible at all times; weighted across completed modules only. */
  readonly partial_score: number;
  /** Null until all required modules are complete. */
  readonly final_score: number | null;
  readonly overall_level: BarsLevel;
  readonly modules: readonly ModuleScore[];
  readonly required_modules_total: number;
  readonly required_modules_completed: number;
  readonly confidence: number;
  readonly human_review_required: boolean;
  /** 95% bootstrap CI over completed modules (always available). */
  readonly partial_score_interval?: BootstrapInterval;
  /** 95% bootstrap CI for the final score; null until required modules complete. */
  readonly final_score_interval?: BootstrapInterval | null;
  /** Z-score vs the peer cohort; null when the cohort is too small. */
  readonly z_score?: number | null;
  readonly peer_cohort?: {
    readonly sampleSize: number;
    readonly status: PeerCohortStatus;
    readonly interpretation: string;
  };
}

export interface CompetencyMeta {
  readonly tier?: CompetencyTier;
  /** Relative module-level weight for this competency (default 1). */
  readonly weight?: number;
}

/**
 * Realistic-arc scoring weights (Phase 11). A baseline_only turn (the warm-up
 * opening, the closing courtesy questions) NEVER moves any competency score:
 * it is excluded from aggregation entirely. low_weight turns (role-family
 * motivation, the strengths on-ramp) count at half weight.
 */
export const SCORING_MODE_WEIGHTS: Readonly<Record<TurnScoringMode, number>> = {
  baseline_only: 0,
  low_weight: 0.5,
  full: 1,
};

/** A BARS evaluation optionally annotated with its turn's scoring mode. */
export type ScoringModeAwareEvaluation = BarsEvaluation & {
  readonly scoring_mode?: TurnScoringMode;
};

function scoringModeWeight(evaluation: ScoringModeAwareEvaluation): number {
  return SCORING_MODE_WEIGHTS[evaluation.scoring_mode ?? "full"];
}

/** Group evaluations by competency and reduce each to a competency score. */
export function assessCompetencyScores(
  evaluations: readonly ScoringModeAwareEvaluation[],
  metaByCompetency: Readonly<Record<string, CompetencyMeta>> = {},
): CompetencyScore[] {
  // baseline_only turns are excluded before any aggregation: they calibrate a
  // communication baseline and must never move a competency score.
  const scorable = evaluations.filter((evaluation) => scoringModeWeight(evaluation) > 0);

  const byCompetency = new Map<string, ScoringModeAwareEvaluation[]>();
  for (const evaluation of scorable) {
    const list = byCompetency.get(evaluation.competency_id) ?? [];
    list.push(evaluation);
    byCompetency.set(evaluation.competency_id, list);
  }

  return [...byCompetency.entries()].map(([competencyId, runs]) => {
    // Confidence-weighted mean keeps low-confidence answers from dominating;
    // the arc scoring mode scales the weight on top of confidence.
    const weighted = weightedMean(
      runs.map((run) => ({
        value: run.bars_score,
        weight: Math.max(0.1, run.confidence) * scoringModeWeight(run),
      })),
    );
    const score = clampScore(weighted);
    const meanStar =
      runs.reduce((sum, run) => sum + countCompleteStarElements(run.star_completeness), 0) /
      runs.length;
    const confidence = average(runs.map((run) => run.confidence));
    const evidence = unique(runs.flatMap((run) => run.evidence_snippets)).slice(0, 6);
    const redFlags = dedupeRedFlags(runs.flatMap((run) => run.red_flags));
    const humanReview =
      runs.some((run) => run.human_review_required) ||
      redFlags.some((flag) => flag.severity === "high");

    const scoreInterval = bootstrapWeightedMean(
      runs.map((run) => ({
        value: run.bars_score,
        weight: Math.max(0.1, run.confidence) * scoringModeWeight(run),
      })),
    );

    const metaWeight = metaByCompetency[competencyId]?.weight;

    return {
      competency_id: competencyId,
      tier: metaByCompetency[competencyId]?.tier,
      // Spread keeps the key absent (not undefined) when no weight is set.
      ...(metaWeight !== undefined ? { weight: metaWeight } : {}),
      bars_score: score,
      bars_level: barsLevelForScore(score),
      answers_evaluated: runs.length,
      mean_star_completeness: round2(meanStar),
      confidence: round2(confidence),
      evidence_snippets: evidence,
      red_flags: redFlags,
      human_review_required: humanReview,
      score_interval: scoreInterval,
    };
  });
}

/** Reduce a module's competency scores to a single module score. */
export function assessModuleScore(
  moduleId: ModuleId | string,
  competencyScores: readonly CompetencyScore[],
): ModuleScore {
  if (competencyScores.length === 0) {
    return {
      module_id: moduleId,
      bars_score: 0,
      bars_level: "below_standard",
      competencies: [],
      confidence: 0,
      red_flag_count: 0,
      high_severity_red_flag_count: 0,
      human_review_required: true,
    };
  }

  // Confidence-weighted mean, scaled by the optional per-competency weight
  // (Phase 15: learning agility weighs by seniority — more for juniors).
  const weighted = weightedMean(
    competencyScores.map((competency) => ({
      value: competency.bars_score,
      weight: Math.max(0.1, competency.confidence) * (competency.weight ?? 1),
    })),
  );
  const score = clampScore(weighted);
  const confidence = average(competencyScores.map((competency) => competency.confidence));
  const redFlags = competencyScores.flatMap((competency) => competency.red_flags);
  const highSeverity = redFlags.filter((flag) => flag.severity === "high").length;
  const humanReview =
    competencyScores.some((competency) => competency.human_review_required) || highSeverity > 0;

  const scoreInterval = bootstrapWeightedMean(
    competencyScores.map((competency) => ({
      value: competency.bars_score,
      weight: Math.max(0.1, competency.confidence) * (competency.weight ?? 1),
    })),
  );

  return {
    module_id: moduleId,
    bars_score: score,
    bars_level: barsLevelForScore(score),
    competencies: competencyScores,
    confidence: round2(confidence),
    red_flag_count: redFlags.length,
    high_severity_red_flag_count: highSeverity,
    human_review_required: humanReview,
    score_interval: scoreInterval,
  };
}

export interface AggregateScorecardInput {
  /** Completed module scores (a module appears here only once finished). */
  readonly completedModules: readonly ModuleScore[];
  /** Weight + required flag per module in the candidate's plan. */
  readonly moduleWeights: readonly ModuleWeight[];
  /** Peer cohort stats for Z-score normalization; omit to skip norming. */
  readonly peerCohortStats?: PeerCohortStats;
}

/**
 * Build the candidate-visible scorecard. partial_score is always available;
 * final_score is gated on all required modules being complete.
 */
export function aggregateScorecard(input: AggregateScorecardInput): Scorecard {
  const weightByModule = new Map(
    input.moduleWeights.map((weight) => [String(weight.moduleId), weight]),
  );

  const requiredTotal = input.moduleWeights.filter((weight) => weight.required).length;
  const completedRequired = input.completedModules.filter(
    (module) => weightByModule.get(String(module.module_id))?.required,
  ).length;

  const weightedEntries = input.completedModules.map((module) => {
    const weight = weightByModule.get(String(module.module_id))?.weight ?? 1;
    return { value: module.bars_score, weight: Math.max(0.0001, weight) };
  });

  const partial = clampScore(weightedMean(weightedEntries));
  const allRequiredComplete = requiredTotal > 0 && completedRequired >= requiredTotal;
  const status: ScorecardStatus = allRequiredComplete ? "final" : "preview";
  const finalScore = allRequiredComplete ? partial : null;

  const confidence = input.completedModules.length
    ? average(input.completedModules.map((module) => module.confidence))
    : 0;
  const humanReview = input.completedModules.some((module) => module.human_review_required);
  const scoreInterval = bootstrapWeightedMean(weightedEntries);
  const norming = input.peerCohortStats
    ? zScoreVsCohort(partial, input.peerCohortStats)
    : undefined;

  return {
    status,
    partial_score: partial,
    final_score: finalScore,
    overall_level: barsLevelForScore(partial),
    modules: input.completedModules,
    required_modules_total: requiredTotal,
    required_modules_completed: completedRequired,
    confidence: round2(confidence),
    human_review_required: humanReview,
    partial_score_interval: scoreInterval,
    final_score_interval: allRequiredComplete ? scoreInterval : null,
    ...(norming
      ? {
          z_score: norming.z,
          peer_cohort: {
            sampleSize: input.peerCohortStats!.sampleSize,
            status: input.peerCohortStats!.cohortStatus,
            interpretation: norming.interpretation,
          },
        }
      : {}),
  };
}

/**
 * True only when two score intervals do not overlap — i.e. the difference is
 * statistically distinguishable, not noise. For matching / UI ("A 7.5 [6.8,8.1]
 * vs B 7.1 [6.4,7.9] — not distinguishable").
 */
export function scoresStatisticallyDistinguishable(
  a: BootstrapInterval,
  b: BootstrapInterval,
): boolean {
  return intervalsDistinguishable(a, b);
}

/* ------------------------------------------------------------------ *
 * Math + utils
 * ------------------------------------------------------------------ */

function weightedMean(entries: readonly { value: number; weight: number }[]): number {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) return 0;
  return entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function dedupeRedFlags(flags: readonly DetectedRedFlag[]): DetectedRedFlag[] {
  const seen = new Set<string>();
  const out: DetectedRedFlag[] = [];
  for (const flag of flags) {
    if (seen.has(flag.pattern)) continue;
    seen.add(flag.pattern);
    out.push(flag);
  }
  return out;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
