import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  ASR_CONFIDENCE_REVIEW_THRESHOLD_DEFAULT,
  asrConfidenceBand,
  averageAsrConfidence,
  parseAsrConfidence,
  readAsrThresholdFromEnv,
  shouldRouteForAsrReview,
  stripDisfluencies,
} = loadFromRepoRoot("src/features/interview-flow/asr-quality.ts");
const { evaluateResponseWithBars } = loadFromRepoRoot(
  "src/features/scoring/bars/evaluator.ts",
);
const { selectQuestionBankForRole } = loadFromRepoRoot(
  "src/features/interview-flow/question-bank.ts",
);

// ---------------------------------------------------------------------------
// Threshold + routing math
// ---------------------------------------------------------------------------

test("ASR confidence parsing clamps and rejects garbage", () => {
  assert.equal(parseAsrConfidence(0.85), 0.85);
  assert.equal(parseAsrConfidence(1.7), 1, "clamped to 1");
  assert.equal(parseAsrConfidence(-0.1), undefined);
  assert.equal(parseAsrConfidence("0.9"), undefined);
  assert.equal(parseAsrConfidence(Number.NaN), undefined);
});

test("the review threshold defaults to 0.80 and honors valid env overrides", () => {
  assert.equal(ASR_CONFIDENCE_REVIEW_THRESHOLD_DEFAULT, 0.8);
  assert.equal(readAsrThresholdFromEnv(undefined), 0.8);
  assert.equal(readAsrThresholdFromEnv("0.7"), 0.7);
  assert.equal(readAsrThresholdFromEnv("1.5"), 0.8);
  assert.equal(readAsrThresholdFromEnv("0"), 0.8);
  assert.equal(readAsrThresholdFromEnv("garbage"), 0.8);
});

test("module averages ignore text-mode turns (null) and route below the threshold", () => {
  // Text-mode turns carry no confidence and are excluded.
  assert.equal(averageAsrConfidence([null, undefined, null]), undefined);
  assert.equal(averageAsrConfidence([0.9, null, 0.7]), 0.8);

  assert.equal(shouldRouteForAsrReview(undefined, 0.8), false, "no voice turns -> no flag");
  assert.equal(shouldRouteForAsrReview(0.8, 0.8), false, "at the threshold is fine");
  assert.equal(shouldRouteForAsrReview(0.79, 0.8), true);
});

test("confidence bands for fairness monitoring", () => {
  assert.equal(asrConfidenceBand(undefined), "text_mode");
  assert.equal(asrConfidenceBand(0.95), "high");
  assert.equal(asrConfidenceBand(0.85), "medium");
  assert.equal(asrConfidenceBand(0.5), "low");
});

// ---------------------------------------------------------------------------
// Disfluencies never change a score
// ---------------------------------------------------------------------------

const CLEAN_ANSWER =
  "When I was at Acme in 2023 my task was to rebuild outbound for DACH. I built a three-touch sequence myself and the result was 14 meetings booked, a 30% lift.";
const DISFLUENT_ANSWER =
  "Ehm, when I was at Acme in 2023 my task was, uh, my task was to rebuild outbound for DACH. I bui— I built a three-touch sequence myself and, hmm, the result was 14 meetings booked, a 30% lift.";

test("stripDisfluencies removes fillers, repetitions, and false starts", () => {
  const cleaned = stripDisfluencies(DISFLUENT_ANSWER);
  assert.doesNotMatch(cleaned, /\behm\b|\buh\b|\bhmm\b/i);
  assert.doesNotMatch(cleaned, /\bmy task was, my task was\b/i);
  assert.doesNotMatch(cleaned, /bui—/);
});

test("a disfluency-laden transcript and its cleaned twin receive equal scores (deterministic)", async () => {
  const competency = {
    id: "communication",
    name: "Communication",
    tier: 1,
    description: "d",
    sbiQuestions: [],
    bars: [
      { level: "below_standard", scoreRange: [1, 3], descriptors: ["a"] },
      { level: "meets_standard", scoreRange: [4, 6], descriptors: ["b"] },
      { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["c"] },
      { level: "exceptional", scoreRange: [10, 10], descriptors: ["d"] },
    ],
    redFlags: [],
  };
  const base = {
    competency,
    questionId: "q1",
    questionText: "Tell me about a time you rebuilt a process.",
    targetStarElements: ["situation", "task", "action", "result"],
    options: { apiKey: null },
  };

  const clean = await evaluateResponseWithBars({ ...base, answerText: CLEAN_ANSWER });
  const disfluent = await evaluateResponseWithBars({ ...base, answerText: DISFLUENT_ANSWER });

  assert.equal(disfluent.bars_score, clean.bars_score, "scores must be identical");
  assert.equal(disfluent.bars_level, clean.bars_level);
  assert.deepEqual(disfluent.star_completeness, clean.star_completeness);
});

test("the evaluator prompt instructs content-only scoring (mock provider capture)", async () => {
  let capturedSystem = "";
  const capturingFetch = async (_url, init) => {
    capturedSystem = JSON.parse(init.body).system;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              star_completeness: { situation: true, task: true, action: true, result: true },
              bars_score: 7,
              bars_level: "exceeds_standard",
              evidence_snippets: ["rebuilt outbound"],
              red_flags: [],
              followup_recommendation: { action: "next_question", missing_star_elements: [] },
              confidence: 0.8,
            }),
          },
        ],
      }),
    };
  };

  await evaluateResponseWithBars({
    competency: {
      id: "communication",
      name: "Communication",
      tier: 1,
      description: "d",
      sbiQuestions: [],
      bars: [
        { level: "below_standard", scoreRange: [1, 3], descriptors: ["a"] },
        { level: "meets_standard", scoreRange: [4, 6], descriptors: ["b"] },
        { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["c"] },
        { level: "exceptional", scoreRange: [10, 10], descriptors: ["d"] },
      ],
      redFlags: [],
    },
    questionId: "q1",
    questionText: "Tell me about a time you rebuilt a process.",
    targetStarElements: ["situation", "task", "action", "result"],
    answerText: CLEAN_ANSWER,
    options: { apiKey: "test-key", fetchImpl: capturingFetch },
  });

  assert.match(capturedSystem, /Score CONTENT ONLY/);
  assert.match(capturedSystem, /IGNORE disfluencies/);
  assert.match(capturedSystem, /transcription artifacts/);
  assert.match(capturedSystem, /explicit, dedicated fluency competency/);
  assert.match(capturedSystem, /NEVER as an implicit penalty/);
});

// ---------------------------------------------------------------------------
// Mode equivalence: same planner, same arc, same anchors in both modes
// ---------------------------------------------------------------------------

test("text mode uses the exact same question plan as voice mode", () => {
  const role = {
    role_id: "role_sdr",
    title: "Sales Development Representative",
    role_type: "sales",
    seniority: "junior",
    requirements: { required_skills: ["outbound"] },
    calibration: {},
  };

  // The plan is a function of role + language only — the mode never enters
  // planning, anchors, or evaluation. Both modes get identical questions.
  const planA = selectQuestionBankForRole(role, undefined, "it");
  const planB = selectQuestionBankForRole(role, undefined, "it");
  assert.deepEqual(
    planA.map((q) => ({ id: q.id, prompt: q.prompt, arcStage: q.arcStage })),
    planB.map((q) => ({ id: q.id, prompt: q.prompt, arcStage: q.arcStage })),
  );
});
