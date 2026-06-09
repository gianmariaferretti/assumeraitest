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

const { evaluateResponseWithBars } = load(
  path.join(rootDir, "src/features/scoring/bars/evaluator.ts"),
);
const monitor = load(path.join(rootDir, "src/features/scoring/bars/inter-rater-monitor.ts"));

const competency = {
  id: "communication",
  name: "Comunicazione",
  tier: 1,
  description: "Trasmettere informazioni in modo chiaro e ascoltare attivamente.",
  sbiQuestions: [],
  bars: [
    { level: "below_standard", scoreRange: [1, 3], descriptors: ["vago", "nessun esito"] },
    { level: "meets_standard", scoreRange: [4, 6], descriptors: ["contesto concreto"] },
    { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["esito misurabile"] },
    { level: "exceptional", scoreRange: [10, 10], descriptors: ["meta-comunicazione"] },
  ],
  redFlags: [{ pattern: "incolpa altri", severity: "high" }],
};

test("evaluator falls back deterministically when no API key is present", async () => {
  const result = await evaluateResponseWithBars({
    competency,
    questionId: "comm_q1",
    questionText: "Parlami di una volta in cui hai spiegato qualcosa di complesso.",
    targetStarElements: ["situation", "task", "action", "result"],
    answerText:
      "Quando ero in Acme nel 2023 dovevo spiegare la nuova policy ai venditori. Ho preparato slide semplici e ho fatto domande per verificare. Alla fine il 90% ha capito al primo colpo.",
    options: { apiKey: null },
  });

  assert.equal(result.source, "deterministic_fallback");
  assert.equal(result.competency_id, "communication");
  assert.ok(result.bars_score >= 1 && result.bars_score <= 10);
  // rich STAR answer should detect multiple elements
  const completed = ["situation", "task", "action", "result"].filter(
    (element) => result.star_completeness[element],
  ).length;
  assert.ok(completed >= 3, `expected >=3 STAR elements, got ${completed}`);
  // fallback always routes to human review (never claims high confidence)
  assert.equal(result.human_review_required, true);
});

test("evaluator recommends a follow-up when STAR is incomplete", async () => {
  const result = await evaluateResponseWithBars({
    competency,
    questionId: "comm_q1",
    questionText: "Parlami di una volta in cui hai spiegato qualcosa di complesso.",
    targetStarElements: ["situation", "task", "action", "result"],
    answerText: "Sono bravo a comunicare, lo faccio sempre bene.",
    options: { apiKey: null },
  });

  assert.equal(result.followup_recommendation.action, "ask_followup");
  assert.ok(result.followup_recommendation.missing_star_elements.length > 0);
});

test("evaluator uses an injected fetch when an API key is provided", async () => {
  const fakeResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            star_completeness: { situation: true, task: true, action: true, result: true },
            bars_score: 8,
            bars_level: "exceeds_standard",
            evidence_snippets: ["ho preparato slide semplici"],
            red_flags: [],
            followup_recommendation: { action: "next_question", missing_star_elements: [] },
            confidence: 0.82,
          }),
        },
      ],
    }),
  };
  const fetchImpl = async () => fakeResponse;

  const result = await evaluateResponseWithBars({
    competency,
    questionId: "comm_q1",
    questionText: "Domanda.",
    targetStarElements: ["situation", "task", "action", "result"],
    answerText: "Risposta ricca con contesto, compito, azione e risultato quantificato.",
    options: { apiKey: "test-key", fetchImpl },
  });

  assert.equal(result.source, "anthropic");
  assert.equal(result.bars_score, 8);
  assert.equal(result.bars_level, "exceeds_standard");
  assert.equal(result.human_review_required, false);
});

test("provider score is authoritative when the level label disagrees", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            star_completeness: { situation: true, task: true, action: true, result: true },
            bars_score: 3,
            bars_level: "exceptional", // contradicts the score
            evidence_snippets: [],
            red_flags: [],
            followup_recommendation: { action: "next_question", missing_star_elements: [] },
            confidence: 0.7,
          }),
        },
      ],
    }),
  });

  const result = await evaluateResponseWithBars({
    competency,
    questionId: "q",
    questionText: "Q",
    targetStarElements: [],
    answerText: "x",
    options: { apiKey: "k", fetchImpl },
  });

  assert.equal(result.bars_score, 3);
  assert.equal(result.bars_level, "below_standard");
});

test("Cohen's kappa returns 1 for perfect agreement and flags target", () => {
  const pairs = [
    { raterA: 8, raterB: 9 }, // both exceeds_standard
    { raterA: 5, raterB: 4 }, // both meets_standard
    { raterA: 2, raterB: 1 }, // both below_standard
    { raterA: 10, raterB: 10 }, // both exceptional
  ];
  const result = monitor.cohensKappa(pairs);
  assert.equal(result.kappa, 1);
  assert.equal(result.meetsTarget, true);
  assert.equal(result.interpretation, "almost_perfect");
});

test("intra-LLM consistency flags high variance for review", () => {
  const runs = [3, 9, 4, 8].map((score) => ({
    bars_score: score,
    bars_level: score <= 3 ? "below_standard" : score <= 6 ? "meets_standard" : "exceeds_standard",
    human_review_required: false,
  }));
  const consistency = monitor.assessIntraLlmConsistency(runs);
  assert.equal(consistency.humanReviewRecommended, true);
  assert.ok(consistency.stdDevScore > 1.5);
});

test("intra-LLM consistency passes for tight clustering", () => {
  const runs = [7, 8, 7, 8].map((score) => ({
    bars_score: score,
    bars_level: "exceeds_standard",
    human_review_required: false,
  }));
  const consistency = monitor.assessIntraLlmConsistency(runs);
  assert.equal(consistency.humanReviewRecommended, false);
  assert.equal(consistency.modalLevel, "exceeds_standard");
});
