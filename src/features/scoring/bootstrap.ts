/**
 * Percentile bootstrap confidence intervals (Efron 1979; Efron & Tibshirani 1993).
 *
 * Turns a point score into "7.5 [6.8, 8.1]" so decision makers can tell signal
 * from noise. Non-parametric and robust; 1000 resamples give stable 95% CIs.
 * The RNG is seedable (and defaults to a fixed seed) so results are reproducible
 * — never uses Math.random.
 *
 * This is an INTERNAL RELIABILITY indicator (how stable the score is given the
 * evidence), not predictive validity. Do not present it as "95% accurate".
 */

export interface BootstrapOptions {
  readonly iterations?: number;
  readonly confidence?: number;
  readonly seed?: number;
}

export interface BootstrapInterval {
  readonly point: number;
  readonly lower: number;
  readonly upper: number;
  readonly iterations: number;
  readonly confidence: number;
  readonly se_estimate: number;
  readonly method: "percentile_bootstrap_v0";
}

export const BOOTSTRAP_DEFAULT_ITERATIONS = 1000;
export const BOOTSTRAP_MIN_ITERATIONS = 200;
export const BOOTSTRAP_DEFAULT_CONFIDENCE = 0.95;
export const BOOTSTRAP_DEFAULT_SEED = 0x9e3779b9;
/** BARS presentation scale; clamping is applied to the reported bounds only. */
export const BARS_SCALE_MIN = 1;
export const BARS_SCALE_MAX = 10;

const METHOD = "percentile_bootstrap_v0" as const;

export function bootstrapWeightedMean(
  samples: ReadonlyArray<{ value: number; weight: number }>,
  options?: BootstrapOptions,
): BootstrapInterval {
  const iterations = Math.max(
    BOOTSTRAP_MIN_ITERATIONS,
    Math.round(options?.iterations ?? BOOTSTRAP_DEFAULT_ITERATIONS),
  );
  const confidence = options?.confidence ?? BOOTSTRAP_DEFAULT_CONFIDENCE;

  const valid = samples.filter((sample) => sample.weight > 0 && Number.isFinite(sample.value));

  if (valid.length === 0) {
    return { point: 0, lower: 0, upper: 0, iterations: 0, confidence, se_estimate: 0, method: METHOD };
  }

  const point = weightedMean(valid);

  if (valid.length === 1) {
    const value = valid[0].value;
    return { point: round2(value), lower: round2(value), upper: round2(value), iterations, confidence, se_estimate: 0, method: METHOD };
  }

  const rng = splitmix32(options?.seed ?? BOOTSTRAP_DEFAULT_SEED);
  const stats: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let sumWeight = 0;
    let sumWeighted = 0;
    for (let draw = 0; draw < valid.length; draw += 1) {
      const sample = valid[Math.floor(rng() * valid.length)];
      sumWeight += sample.weight;
      sumWeighted += sample.weight * sample.value;
    }
    stats.push(sumWeight > 0 ? sumWeighted / sumWeight : 0);
  }
  stats.sort((a, b) => a - b);

  const alpha = (1 - confidence) / 2;
  // Clamp the REPORTED bounds to the BARS scale (presentation only); the spread
  // and SE are computed on the raw, unclamped statistics.
  const lower = clampBars(quantile(stats, alpha));
  const upper = clampBars(quantile(stats, 1 - alpha));

  return {
    point: round2(point),
    lower: round2(lower),
    upper: round2(upper),
    iterations,
    confidence,
    se_estimate: round2(standardDeviation(stats)),
    method: METHOD,
  };
}

/** True only when the two intervals do not overlap. */
export function intervalsDistinguishable(a: BootstrapInterval, b: BootstrapInterval): boolean {
  return a.upper < b.lower || b.upper < a.lower;
}

function weightedMean(samples: ReadonlyArray<{ value: number; weight: number }>): number {
  const totalWeight = samples.reduce((sum, sample) => sum + sample.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }
  return samples.reduce((sum, sample) => sum + sample.value * sample.weight, 0) / totalWeight;
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

function standardDeviation(values: readonly number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clampBars(value: number): number {
  return Math.max(BARS_SCALE_MIN, Math.min(BARS_SCALE_MAX, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Deterministic, seedable PRNG — splitmix32. Returns floats in [0, 1). */
function splitmix32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) | 0;
    let t = state ^ (state >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}
