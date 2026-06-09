import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  clearInMemoryLlmUsage,
  createInMemoryLlmUsageStore,
  decideLlmBudget,
  estimateDailyCostEur,
  estimateLlmCostEur,
  LLM_DAILY_BUDGET_EUR_DEFAULT,
  readInMemoryDailyTotals,
  readLlmDailyBudgetEurFromEnv,
  recordLlmUsage,
  secondsUntilUtcMidnight,
  usageDateFor,
} = loadFromRepoRoot("src/lib/llm-budget/core.ts");
const { evaluateResponseWithBars } = loadFromRepoRoot(
  "src/features/scoring/bars/evaluator.ts",
);

// ---------------------------------------------------------------------------
// Cost estimation math
// ---------------------------------------------------------------------------

test("cost estimation prices model families and defaults unknown models", () => {
  // Sonnet: 3 EUR/MTok in, 15 EUR/MTok out.
  assert.equal(estimateLlmCostEur("claude-sonnet-4-20250514", 1_000_000, 1_000_000), 18);
  // Haiku: 1 EUR/MTok in, 5 EUR/MTok out.
  assert.equal(estimateLlmCostEur("claude-3-5-haiku-20241022", 2_000_000, 0), 2);
  // Opus: 15 EUR/MTok in, 75 EUR/MTok out.
  assert.equal(estimateLlmCostEur("claude-opus-x", 0, 100_000), 7.5);
  // Unknown models use the conservative (Sonnet-priced) default.
  assert.equal(estimateLlmCostEur("mystery-model", 1_000_000, 0), 3);
  // Negative counts never produce negative cost.
  assert.equal(estimateLlmCostEur("claude-sonnet-4", -5, -5), 0);
});

test("daily cost sums across models", () => {
  const rows = [
    { model: "claude-sonnet-4", inputTokens: 1_000_000, outputTokens: 0, calls: 3 },
    { model: "claude-3-5-haiku", inputTokens: 0, outputTokens: 1_000_000, calls: 2 },
  ];
  assert.equal(estimateDailyCostEur(rows), 8);
});

// ---------------------------------------------------------------------------
// Budget cutoff
// ---------------------------------------------------------------------------

test("the budget allows spend strictly below the limit and cuts off at the limit", () => {
  const rows = [{ model: "claude-sonnet-4", inputTokens: 1_000_000, outputTokens: 0, calls: 1 }];

  const under = decideLlmBudget(rows, 3.01);
  assert.equal(under.allowed, true);
  assert.equal(under.estimatedCostEur, 3);

  const atLimit = decideLlmBudget(rows, 3);
  assert.equal(atLimit.allowed, false);

  const over = decideLlmBudget(rows, 2);
  assert.equal(over.allowed, false);
  assert.equal(over.budgetEur, 2);
});

test("budget env parsing falls back to the safe default", () => {
  assert.equal(readLlmDailyBudgetEurFromEnv(undefined), LLM_DAILY_BUDGET_EUR_DEFAULT);
  assert.equal(readLlmDailyBudgetEurFromEnv("12.5"), 12.5);
  assert.equal(readLlmDailyBudgetEurFromEnv("0"), LLM_DAILY_BUDGET_EUR_DEFAULT);
  assert.equal(readLlmDailyBudgetEurFromEnv("-3"), LLM_DAILY_BUDGET_EUR_DEFAULT);
  assert.equal(readLlmDailyBudgetEurFromEnv("nope"), LLM_DAILY_BUDGET_EUR_DEFAULT);
});

test("Retry-After points at the next UTC midnight (budget window reset)", () => {
  assert.equal(secondsUntilUtcMidnight("2026-06-09T23:59:30.000Z"), 30);
  assert.equal(secondsUntilUtcMidnight("2026-06-09T00:00:00.000Z"), 86_400);
  assert.equal(usageDateFor("2026-06-09T23:59:30.000Z"), "2026-06-09");
});

// ---------------------------------------------------------------------------
// Usage accounting
// ---------------------------------------------------------------------------

test("the in-memory store accumulates per-day, per-model counters", async () => {
  clearInMemoryLlmUsage();
  const store = createInMemoryLlmUsageStore();

  await store.recordUsage("2026-06-09", { model: "m1", inputTokens: 100, outputTokens: 10 });
  await store.recordUsage("2026-06-09", { model: "m1", inputTokens: 50, outputTokens: 5 });
  await store.recordUsage("2026-06-09", { model: "m2", inputTokens: 7, outputTokens: 3 });
  await store.recordUsage("2026-06-10", { model: "m1", inputTokens: 1, outputTokens: 1 });

  const day = await store.readDailyTotals("2026-06-09");
  const m1 = day.find((row) => row.model === "m1");
  assert.deepEqual(
    { ...m1 },
    { model: "m1", inputTokens: 150, outputTokens: 15, calls: 2 },
  );
  assert.equal(day.length, 2);
  assert.equal((await store.readDailyTotals("2026-06-10")).length, 1);
});

test("the BARS evaluator reports token usage through the recordUsage hook", async () => {
  const recorded = [];
  const usageFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      usage: { input_tokens: 1200, output_tokens: 240 },
      content: [
        {
          type: "text",
          text: JSON.stringify({
            star_completeness: { situation: true, task: true, action: true, result: true },
            bars_score: 7,
            bars_level: "exceeds_standard",
            evidence_snippets: ["shipped the rollout"],
            red_flags: [],
            followup_recommendation: { action: "next_question", missing_star_elements: [] },
            confidence: 0.8,
          }),
        },
      ],
    }),
  });

  const evaluation = await evaluateResponseWithBars({
    competency: {
      id: "communication",
      name: "Communication",
      tier: 1,
      description: "Communicate clearly.",
      sbiQuestions: [],
      bars: [
        { level: "below_standard", scoreRange: [1, 3], descriptors: ["vague"] },
        { level: "meets_standard", scoreRange: [4, 6], descriptors: ["concrete"] },
        { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["measured"] },
        { level: "exceptional", scoreRange: [10, 10], descriptors: ["meta"] },
      ],
      redFlags: [],
    },
    questionId: "q1",
    questionText: "Tell me about a rollout you owned.",
    targetStarElements: ["situation", "task", "action", "result"],
    answerText: "At Acme I owned the rollout and shipped it with a 20% lift.",
    options: {
      apiKey: "test-key",
      fetchImpl: usageFetch,
      recordUsage: (usage) => recorded.push(usage),
    },
  });

  assert.equal(evaluation.source, "anthropic");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].inputTokens, 1200);
  assert.equal(recorded[0].outputTokens, 240);
  assert.ok(recorded[0].model.length > 0);
});

test("the default global recorder lands usage in the in-memory store", async () => {
  clearInMemoryLlmUsage();
  recordLlmUsage({ model: "claude-sonnet-4", inputTokens: 10, outputTokens: 2 });
  // The recorder is fire-and-forget; give the microtask a tick.
  await new Promise((resolve) => setImmediate(resolve));

  const totals = await readInMemoryDailyTotals(usageDateFor());
  const row = totals.find((entry) => entry.model === "claude-sonnet-4");
  assert.ok(row);
  assert.equal(row.inputTokens, 10);
  assert.equal(row.outputTokens, 2);
  assert.equal(row.calls, 1);
});

test("usage with no tokens or no model is ignored, and recorder errors never throw", async () => {
  clearInMemoryLlmUsage();
  recordLlmUsage({ model: "", inputTokens: 100, outputTokens: 100 });
  recordLlmUsage({ model: "m", inputTokens: 0, outputTokens: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await readInMemoryDailyTotals(usageDateFor())).length, 0);
});
