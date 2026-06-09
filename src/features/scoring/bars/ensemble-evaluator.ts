import {
  evaluateResponseWithBars,
  type BarsEvaluatorOptions,
  type EvaluateResponseInput,
  type EvaluatorSystemPromptVariant,
} from "./evaluator";
import { cohensKappa } from "./inter-rater-monitor";
import {
  barsLevelForScore,
  STAR_ELEMENTS,
  type BarsEvaluation,
  type BarsLevel,
  type DetectedRedFlag,
  type EvaluatorFollowUpRecommendation,
  type RedFlagSeverity,
  type StarCompleteness,
} from "./types";
import type { StarEvidenceElement } from "../../interview-flow/types";

/**
 * Ensemble (multi-rater) evaluator — Phase 1 of the scoring rigor upgrade.
 *
 * Runs N=3 independent rater calls in parallel (with light prompt jitter so the
 * raters attend to different facets of the SAME rubric), then aggregates them
 * deterministically: median score, modal BARS level, majority STAR, union of red
 * flags, and an EMPIRICAL confidence derived from the observed score spread (IQR)
 * rather than self-reported by a single model. A single AI decision is never
 * left isolated.
 */

export const ENSEMBLE_AGGREGATION_METHOD = "ensemble_median_v0";
export const DEFAULT_ENSEMBLE_RATERS = 3;
export const MIN_ENSEMBLE_RATERS = 1;
export const MAX_ENSEMBLE_RATERS = 7;
/** IQR width at/above which the ensemble routes to human review. */
export const ENSEMBLE_REVIEW_IQR_WIDTH = 3;
/** Modal-level agreement below which the ensemble routes to human review. */
export const ENSEMBLE_REVIEW_MIN_AGREEMENT = 0.5;

const SEVERITY_RANK: Record<RedFlagSeverity, number> = { low: 0, medium: 1, high: 2 };
const SEVERITY_BY_RANK: readonly RedFlagSeverity[] = ["low", "medium", "high"];

export interface EnsembleEvaluatorOptions extends BarsEvaluatorOptions {
  readonly raters?: number;
  readonly promptJitter?: boolean;
}

export interface EnsembleBarsEvaluation extends BarsEvaluation {
  readonly replicate_group_id: string;
  readonly raters_total: number;
  readonly raters_anthropic: number;
  readonly raters_fallback: number;
  readonly score_distribution: readonly number[];
  readonly score_median: number;
  readonly score_iqr: readonly [number, number];
  readonly level_modal: BarsLevel;
  readonly level_agreement_ratio: number;
  readonly cohen_kappa_estimate?: number;
  readonly aggregation_method: "ensemble_median_v0";
  readonly individual_runs: readonly BarsEvaluation[];
}

export async function evaluateResponseEnsemble(
  input: EvaluateResponseInput,
  options?: EnsembleEvaluatorOptions,
): Promise<EnsembleBarsEvaluation> {
  const ratersTotal = clampInt(options?.raters ?? DEFAULT_ENSEMBLE_RATERS, MIN_ENSEMBLE_RATERS, MAX_ENSEMBLE_RATERS);
  const promptJitter = options?.promptJitter ?? true;
  const baseOptions = stripEnsembleOptions(options);
  const replicateGroupId = generateUuid();

  const raterInputs: EvaluateResponseInput[] = Array.from({ length: ratersTotal }, (_, index) => ({
    ...input,
    options: baseOptions,
    systemPromptVariant: promptJitter ? variantForRater(index) : "default",
  }));

  const settled = await Promise.allSettled(
    raterInputs.map((raterInput) => evaluateResponseWithBars(raterInput)),
  );

  const individualRuns: BarsEvaluation[] = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  if (individualRuns.length === 0) {
    // Should not happen (evaluateResponseWithBars never rejects), but stay safe.
    const fallback = await evaluateResponseWithBars({ ...input, options: baseOptions });
    individualRuns.push(fallback);
  }

  return aggregateEnsemble(input, individualRuns, replicateGroupId, individualRuns.length);
}

function aggregateEnsemble(
  input: EvaluateResponseInput,
  runs: readonly BarsEvaluation[],
  replicateGroupId: string,
  ratersTotal: number,
): EnsembleBarsEvaluation {
  const scores = runs.map((run) => run.bars_score);
  const sorted = [...scores].sort((a, b) => a - b);
  const scoreMedian = clampScore(median(sorted));
  const q25 = quantile(sorted, 0.25);
  const q75 = quantile(sorted, 0.75);
  const iqrWidth = q75 - q25;

  const levels = runs.map((run) => run.bars_level);
  const levelModal = modalLevel(levels, scoreMedian);
  const levelAgreementRatio = round2(levels.filter((level) => level === levelModal).length / ratersTotal);

  const ratersAnthropic = runs.filter((run) => run.source === "anthropic").length;
  const ratersFallback = ratersTotal - ratersAnthropic;

  const starCompleteness = majorityStar(runs, ratersTotal);
  const redFlags = mergeRedFlags(runs);
  const evidenceSnippets = unique(runs.flatMap((run) => run.evidence_snippets)).slice(0, 6);
  const followup = aggregateFollowUp(runs, starCompleteness, input.targetStarElements);
  const confidence = clamp01(1 - iqrWidth / 9);

  const humanReviewRequired =
    levelAgreementRatio < ENSEMBLE_REVIEW_MIN_AGREEMENT ||
    iqrWidth >= ENSEMBLE_REVIEW_IQR_WIDTH ||
    runs.some((run) => run.human_review_required) ||
    ratersAnthropic === 0;

  const anthropicRun = runs.find((run) => run.source === "anthropic");
  const fallbackRun = runs.find((run) => run.source === "deterministic_fallback");
  const cohenKappa = ratersTotal >= 3 ? estimateCohenKappa(levels) : undefined;

  return {
    competency_id: input.competency.id,
    question_id: input.questionId,
    star_completeness: starCompleteness,
    bars_score: scoreMedian,
    bars_level: levelModal,
    evidence_snippets: evidenceSnippets,
    red_flags: redFlags,
    followup_recommendation: followup,
    confidence: round2(confidence),
    source: ratersAnthropic > 0 ? "anthropic" : "deterministic_fallback",
    provider_model: anthropicRun?.provider_model,
    fallback_reason: ratersAnthropic === 0 ? fallbackRun?.fallback_reason : undefined,
    human_review_required: humanReviewRequired,
    replicate_group_id: replicateGroupId,
    raters_total: ratersTotal,
    raters_anthropic: ratersAnthropic,
    raters_fallback: ratersFallback,
    score_distribution: scores,
    score_median: scoreMedian,
    score_iqr: [round2(q25), round2(q75)],
    level_modal: levelModal,
    level_agreement_ratio: levelAgreementRatio,
    ...(cohenKappa === undefined ? {} : { cohen_kappa_estimate: cohenKappa }),
    aggregation_method: ENSEMBLE_AGGREGATION_METHOD,
    individual_runs: runs,
  };
}

function variantForRater(index: number): EvaluatorSystemPromptVariant {
  const cycle: EvaluatorSystemPromptVariant[] = ["default", "evidence_first", "star_first"];
  return cycle[index % cycle.length];
}

function stripEnsembleOptions(options?: EnsembleEvaluatorOptions): BarsEvaluatorOptions | undefined {
  if (!options) {
    return undefined;
  }
  const { raters, promptJitter, ...rest } = options;
  void raters;
  void promptJitter;
  return rest;
}

function majorityStar(runs: readonly BarsEvaluation[], ratersTotal: number): StarCompleteness {
  const threshold = Math.ceil(ratersTotal / 2);
  const counts: StarCompleteness = { situation: false, task: false, action: false, result: false };
  for (const element of STAR_ELEMENTS) {
    const confirmations = runs.filter((run) => run.star_completeness[element]).length;
    counts[element] = confirmations >= threshold;
  }
  return counts;
}

function mergeRedFlags(runs: readonly BarsEvaluation[]): DetectedRedFlag[] {
  const byPattern = new Map<string, DetectedRedFlag>();
  for (const run of runs) {
    for (const flag of run.red_flags) {
      const existing = byPattern.get(flag.pattern);
      if (!existing || SEVERITY_RANK[flag.severity] > SEVERITY_RANK[existing.severity]) {
        byPattern.set(flag.pattern, {
          pattern: flag.pattern,
          severity: maxSeverity(existing?.severity, flag.severity),
          evidence_snippet: existing?.evidence_snippet || flag.evidence_snippet,
        });
      }
    }
  }
  return [...byPattern.values()];
}

function maxSeverity(a: RedFlagSeverity | undefined, b: RedFlagSeverity): RedFlagSeverity {
  if (a === undefined) {
    return b;
  }
  return SEVERITY_BY_RANK[Math.max(SEVERITY_RANK[a], SEVERITY_RANK[b])];
}

function aggregateFollowUp(
  runs: readonly BarsEvaluation[],
  star: StarCompleteness,
  target: readonly StarEvidenceElement[],
): EvaluatorFollowUpRecommendation {
  const missing = STAR_ELEMENTS.filter((element) => target.includes(element) && !star[element]);
  if (missing.length > 0) {
    const suggested = runs
      .map((run) => run.followup_recommendation.suggested_followup)
      .find((value): value is string => Boolean(value));
    return {
      action: "ask_followup",
      suggested_followup: suggested,
      missing_star_elements: missing,
    };
  }

  const actionCounts = new Map<EvaluatorFollowUpRecommendation["action"], number>();
  for (const run of runs) {
    const action = run.followup_recommendation.action;
    actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
  }
  let bestAction: EvaluatorFollowUpRecommendation["action"] = "next_question";
  let bestCount = -1;
  for (const [action, count] of actionCounts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestAction = action;
    }
  }

  return { action: bestAction, missing_star_elements: [] };
}

function estimateCohenKappa(levels: readonly BarsLevel[]): number {
  const pairs: { raterA: BarsLevel; raterB: BarsLevel }[] = [];
  for (let i = 0; i < levels.length; i += 1) {
    for (let j = i + 1; j < levels.length; j += 1) {
      pairs.push({ raterA: levels[i], raterB: levels[j] });
    }
  }
  return cohensKappa(pairs).kappa;
}

/* ------------------------------------------------------------------ *
 * Statistics + utilities
 * ------------------------------------------------------------------ */

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) {
    return 0;
  }
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  if (sorted.length === 1) {
    return sorted[0];
  }
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function modalLevel(levels: readonly BarsLevel[], medianScore: number): BarsLevel {
  const counts = new Map<BarsLevel, number>();
  for (const level of levels) {
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  let best: BarsLevel = levels[0];
  let bestCount = -1;
  let tie = false;
  for (const [level, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      best = level;
      tie = false;
    } else if (count === bestCount) {
      tie = true;
    }
  }
  // Tie-break with the level implied by the median score.
  return tie ? barsLevelForScore(medianScore) : best;
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function generateUuid(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
