import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../..");
const cache = new Map();

function load(absPath) {
  if (cache.has(absPath)) return cache.get(absPath);
  const source = readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absPath,
  }).outputText;
  const mod = { exports: {} };
  cache.set(absPath, mod.exports);
  const dir = path.dirname(absPath);
  const requireShim = (req) => {
    let target = path.resolve(dir, req);
    if (!target.endsWith(".ts")) target += ".ts";
    return load(target);
  };
  vm.runInNewContext(
    output,
    { exports: mod.exports, module: mod, require: requireShim, process, console },
    { filename: absPath },
  );
  cache.set(absPath, mod.exports);
  return mod.exports;
}

const { evaluateResponseEnsemble } = load(
  path.join(rootDir, "src/features/scoring/bars/ensemble-evaluator.ts"),
);

const competency = {
  id: "communication",
  name: "Communication",
  tier: 1,
  description: "Communicate clearly.",
  sbiQuestions: [],
  bars: [
    { level: "below_standard", scoreRange: [1, 3], descriptors: ["vague"] },
    { level: "meets_standard", scoreRange: [4, 6], descriptors: ["concrete"] },
    { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["measurable"] },
    { level: "exceptional", scoreRange: [10, 10], descriptors: ["meta"] },
  ],
  redFlags: [],
};

const baseInput = {
  competency,
  questionId: "comm_q1",
  questionText: "Tell me about a time you explained something complex.",
  targetStarElements: ["situation", "task", "action", "result"],
  answerText:
    "At Acme in 2023 I owned the rollout. I built simple slides and verified understanding; 90% got it the first time.",
};

function levelFor(score) {
  if (score <= 3) return "below_standard";
  if (score <= 6) return "meets_standard";
  if (score <= 9) return "exceeds_standard";
  return "exceptional";
}

function okResponse(score) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            star_completeness: { situation: true, task: true, action: true, result: true },
            bars_score: score,
            bars_level: levelFor(score),
            evidence_snippets: ["built simple slides"],
            red_flags: [],
            followup_recommendation: { action: "next_question", missing_star_elements: [] },
            confidence: 0.8,
          }),
        },
      ],
    }),
  };
}

function fetchReturningScores(scores) {
  let index = 0;
  const calls = { count: 0 };
  const fetchImpl = async () => {
    calls.count += 1;
    const score = scores[index % scores.length];
    index += 1;
    return okResponse(score);
  };
  return { fetchImpl, calls };
}

test("concordant raters yield a clean median with full agreement", async () => {
  const { fetchImpl, calls } = fetchReturningScores([7, 7, 8]);
  const result = await evaluateResponseEnsemble(baseInput, { apiKey: "k", fetchImpl, raters: 3 });

  assert.equal(result.score_median, 7);
  assert.equal(result.level_agreement_ratio, 1);
  assert.equal(result.human_review_required, false);
  assert.equal(calls.count, 3); // exactly N network calls
  assert.equal(result.raters_anthropic, 3);
  assert.equal(result.aggregation_method, "ensemble_median_v0");
});

test("discordant raters route to human review", async () => {
  const { fetchImpl } = fetchReturningScores([2, 6, 10]);
  const result = await evaluateResponseEnsemble(baseInput, { apiKey: "k", fetchImpl, raters: 3 });

  assert.ok(result.level_agreement_ratio < 0.5);
  assert.equal(result.human_review_required, true);
});

test("mixed anthropic + fallback raters are counted correctly", async () => {
  let call = 0;
  const fetchImpl = async () => {
    const current = call;
    call += 1;
    return current < 2 ? okResponse(7) : { ok: false, status: 500, json: async () => ({}) };
  };

  const result = await evaluateResponseEnsemble(baseInput, { apiKey: "k", fetchImpl, raters: 3 });
  assert.equal(result.raters_total, 3);
  assert.equal(result.raters_anthropic, 2);
  assert.equal(result.raters_fallback, 1);
});

test("every individual run is a valid BarsEvaluation", async () => {
  const { fetchImpl } = fetchReturningScores([7, 8, 7]);
  const result = await evaluateResponseEnsemble(baseInput, { apiKey: "k", fetchImpl, raters: 3 });

  assert.equal(result.individual_runs.length, 3);
  for (const run of result.individual_runs) {
    assert.equal(run.competency_id, "communication");
    assert.equal(run.question_id, "comm_q1");
    assert.ok(run.bars_score >= 1 && run.bars_score <= 10);
    assert.ok(["below_standard", "meets_standard", "exceeds_standard", "exceptional"].includes(run.bars_level));
    assert.equal(typeof run.star_completeness.situation, "boolean");
    assert.ok(["anthropic", "deterministic_fallback"].includes(run.source));
  }
  assert.ok(result.score_iqr[0] <= result.score_iqr[1]);
});

test("no api key falls back deterministically for all raters", async () => {
  const result = await evaluateResponseEnsemble(baseInput, { apiKey: null, raters: 3 });
  assert.equal(result.raters_anthropic, 0);
  assert.equal(result.source, "deterministic_fallback");
  assert.equal(result.human_review_required, true);
});
