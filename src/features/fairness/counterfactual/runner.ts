import { evaluateResponseEnsemble } from "../../scoring/bars/ensemble-evaluator";
import type { BarsEvaluatorOptions } from "../../scoring/bars/evaluator";
import type { BarsCompetency } from "../../scoring/bars/types";
import type { CounterfactualFixture } from "./types";

/**
 * Counterfactual fairness runner (Kusner et al. 2017). For each fixture it scores
 * the baseline and every neutral-attribute variant with the ENSEMBLE evaluator
 * (to remove intra-LLM noise from the measurement) and checks the score moved by
 * no more than COUNTERFACTUAL_DELTA_THRESHOLD. This is an empirical first defense
 * of the invariance property — not a complete bias audit.
 */

export const COUNTERFACTUAL_DELTA_THRESHOLD = 1.0; // points on the 1-10 BARS scale

export interface CounterfactualVariantResult {
  readonly varies: string;
  readonly score: number;
  readonly delta: number;
  readonly passes: boolean;
}

export interface CounterfactualResult {
  readonly fixtureId: string;
  readonly competencyId: string;
  readonly baselineScore: number;
  readonly variantResults: readonly CounterfactualVariantResult[];
  readonly overallPasses: boolean;
}

export interface CounterfactualSuiteReport {
  readonly results: readonly CounterfactualResult[];
  readonly passRate: number;
  readonly failingFixtures: readonly string[];
  readonly aggregateByVariesCategory: Record<
    string,
    { tests: number; passed: number; passRate: number }
  >;
}

export interface RunCounterfactualSuiteOptions {
  readonly evaluatorOptions: BarsEvaluatorOptions;
  readonly competencyMap: Record<string, BarsCompetency>;
  readonly raters?: number;
  readonly deltaThreshold?: number;
}

export async function runCounterfactualSuite(
  fixtures: readonly CounterfactualFixture[],
  options: RunCounterfactualSuiteOptions,
): Promise<CounterfactualSuiteReport> {
  const threshold = options.deltaThreshold ?? COUNTERFACTUAL_DELTA_THRESHOLD;
  const results: CounterfactualResult[] = [];

  for (const fixture of fixtures) {
    const competency = options.competencyMap[fixture.competency_id];
    if (!competency) {
      throw new Error(`No competency mapped for ${fixture.competency_id} (fixture ${fixture.id}).`);
    }

    const baselineScore = await scoreAnswer(competency, fixture, fixture.baseline.text, options);

    const variantResults: CounterfactualVariantResult[] = [];
    for (const variant of fixture.variants) {
      const score = await scoreAnswer(competency, fixture, variant.text, options);
      const delta = Math.abs(score - baselineScore);
      variantResults.push({
        varies: variant.varies,
        score,
        delta: round2(delta),
        passes: delta <= threshold,
      });
    }

    results.push({
      fixtureId: fixture.id,
      competencyId: fixture.competency_id,
      baselineScore,
      variantResults,
      overallPasses: variantResults.every((variant) => variant.passes),
    });
  }

  return {
    results,
    passRate: results.length === 0 ? 1 : round2(results.filter((result) => result.overallPasses).length / results.length),
    failingFixtures: results.filter((result) => !result.overallPasses).map((result) => result.fixtureId),
    aggregateByVariesCategory: aggregateByCategory(results),
  };
}

async function scoreAnswer(
  competency: BarsCompetency,
  fixture: CounterfactualFixture,
  answerText: string,
  options: RunCounterfactualSuiteOptions,
): Promise<number> {
  const evaluation = await evaluateResponseEnsemble(
    {
      competency,
      questionId: `${fixture.id}_cf`,
      questionText: "Counterfactual fairness probe.",
      targetStarElements: fixture.star_target,
      answerText,
    },
    { ...options.evaluatorOptions, raters: options.raters },
  );
  return evaluation.score_median;
}

function aggregateByCategory(
  results: readonly CounterfactualResult[],
): Record<string, { tests: number; passed: number; passRate: number }> {
  const buckets: Record<string, { tests: number; passed: number }> = {};
  for (const result of results) {
    for (const variant of result.variantResults) {
      const bucket = buckets[variant.varies] ?? { tests: 0, passed: 0 };
      bucket.tests += 1;
      if (variant.passes) {
        bucket.passed += 1;
      }
      buckets[variant.varies] = bucket;
    }
  }

  const out: Record<string, { tests: number; passed: number; passRate: number }> = {};
  for (const [category, bucket] of Object.entries(buckets)) {
    out[category] = {
      tests: bucket.tests,
      passed: bucket.passed,
      passRate: bucket.tests === 0 ? 1 : round2(bucket.passed / bucket.tests),
    };
  }
  return out;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
