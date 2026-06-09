import {
  barsLevelForScore,
  type BarsEvaluation,
  type BarsLevel,
} from "./types";

/**
 * Inter-rater reliability monitor.
 *
 * Two jobs:
 *  1. INTRA-LLM consistency: re-score the same answer N times at low temperature
 *     and measure the spread. High spread -> the anchors are ambiguous for this
 *     item -> route to human review. This is the runtime guard.
 *  2. COHEN'S KAPPA: against a panel of human raters (or AI-vs-human), the
 *     headline psychometric metric. Target K >= 0.70.
 *
 * Everything here is deterministic and unit-testable; no API calls.
 */

const BARS_LEVELS: readonly BarsLevel[] = [
  "below_standard",
  "meets_standard",
  "exceeds_standard",
  "exceptional",
];

export interface IntraLlmConsistency {
  readonly n: number;
  readonly meanScore: number;
  readonly stdDevScore: number;
  readonly modalLevel: BarsLevel;
  readonly levelAgreementRatio: number; // share of runs matching the modal level
  readonly humanReviewRecommended: boolean;
}

export interface IntraLlmConsistencyOptions {
  /** Std-dev of the 1-10 score above which we flag for review. */
  readonly stdDevThreshold?: number;
  /** Minimum share of runs that must agree on the modal level. */
  readonly minLevelAgreement?: number;
}

const DEFAULT_STD_DEV_THRESHOLD = 1.5;
const DEFAULT_MIN_LEVEL_AGREEMENT = 0.6;

export function assessIntraLlmConsistency(
  runs: readonly BarsEvaluation[],
  options: IntraLlmConsistencyOptions = {},
): IntraLlmConsistency {
  if (runs.length === 0) {
    return {
      n: 0,
      meanScore: 0,
      stdDevScore: 0,
      modalLevel: "below_standard",
      levelAgreementRatio: 0,
      humanReviewRecommended: true,
    };
  }

  const scores = runs.map((run) => run.bars_score);
  const mean = average(scores);
  const stdDev = standardDeviation(scores, mean);

  const levels = runs.map((run) => run.bars_level);
  const modalLevel = mode(levels);
  const agreement = levels.filter((level) => level === modalLevel).length / levels.length;

  const stdDevThreshold = options.stdDevThreshold ?? DEFAULT_STD_DEV_THRESHOLD;
  const minAgreement = options.minLevelAgreement ?? DEFAULT_MIN_LEVEL_AGREEMENT;

  const humanReviewRecommended =
    stdDev > stdDevThreshold ||
    agreement < minAgreement ||
    runs.some((run) => run.human_review_required);

  return {
    n: runs.length,
    meanScore: round2(mean),
    stdDevScore: round2(stdDev),
    modalLevel,
    levelAgreementRatio: round2(agreement),
    humanReviewRecommended,
  };
}

export interface KappaPair {
  readonly raterA: BarsLevel | number;
  readonly raterB: BarsLevel | number;
}

export interface CohensKappaResult {
  readonly n: number;
  readonly observedAgreement: number;
  readonly expectedAgreement: number;
  readonly kappa: number;
  readonly interpretation: KappaInterpretation;
  readonly meetsTarget: boolean; // K >= 0.70
}

export type KappaInterpretation =
  | "poor"
  | "slight"
  | "fair"
  | "moderate"
  | "substantial"
  | "almost_perfect";

const KAPPA_TARGET = 0.7;

/**
 * Cohen's Kappa on categorical BARS levels. Numeric scores are bucketed to their
 * level first, so two raters who score 7 and 9 still "agree" at exceeds_standard.
 */
export function cohensKappa(pairs: readonly KappaPair[]): CohensKappaResult {
  if (pairs.length === 0) {
    return {
      n: 0,
      observedAgreement: 0,
      expectedAgreement: 0,
      kappa: 0,
      interpretation: "poor",
      meetsTarget: false,
    };
  }

  const normalized = pairs.map((pair) => ({
    a: toLevel(pair.raterA),
    b: toLevel(pair.raterB),
  }));

  const n = normalized.length;
  const observed = normalized.filter((pair) => pair.a === pair.b).length / n;

  const marginalsA = countByLevel(normalized.map((pair) => pair.a));
  const marginalsB = countByLevel(normalized.map((pair) => pair.b));

  const expected = BARS_LEVELS.reduce((sum, level) => {
    const pA = (marginalsA[level] ?? 0) / n;
    const pB = (marginalsB[level] ?? 0) / n;
    return sum + pA * pB;
  }, 0);

  const kappa = expected === 1 ? 1 : (observed - expected) / (1 - expected);

  return {
    n,
    observedAgreement: round2(observed),
    expectedAgreement: round2(expected),
    kappa: round2(kappa),
    interpretation: interpretKappa(kappa),
    meetsTarget: kappa >= KAPPA_TARGET,
  };
}

function interpretKappa(kappa: number): KappaInterpretation {
  if (kappa < 0) return "poor";
  if (kappa <= 0.2) return "slight";
  if (kappa <= 0.4) return "fair";
  if (kappa <= 0.6) return "moderate";
  if (kappa <= 0.8) return "substantial";
  return "almost_perfect";
}

function toLevel(value: BarsLevel | number): BarsLevel {
  return typeof value === "number" ? barsLevelForScore(value) : value;
}

function countByLevel(levels: readonly BarsLevel[]): Partial<Record<BarsLevel, number>> {
  return levels.reduce<Partial<Record<BarsLevel, number>>>((counts, level) => {
    counts[level] = (counts[level] ?? 0) + 1;
    return counts;
  }, {});
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function mode(levels: readonly BarsLevel[]): BarsLevel {
  const counts = countByLevel(levels);
  let best: BarsLevel = levels[0];
  let bestCount = -1;
  for (const level of BARS_LEVELS) {
    const count = counts[level] ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = level;
    }
  }
  return best;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
