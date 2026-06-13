import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const { scoreWorkSample } = loadFromRepoRoot(
  "src/features/scoring/work-sample-scoring/work-sample-scorer.ts",
);

test("correctness is graded deterministically from automated test results", () => {
  const result = scoreWorkSample({
    module_id: "coding_with_ai",
    correctness_competency_id: "coding_correctness",
    test_results: [
      { test_id: "t1", passed: true },
      { test_id: "t2", passed: true },
      { test_id: "t3", passed: false },
    ],
  });
  assert.equal(result.scorer_type, "work_sample");
  const correctness = result.competency_scores[0];
  assert.equal(correctness.competency_id, "coding_correctness");
  assert.equal(correctness.score, 67, "2/3 tests passed");
  assert.match(correctness.reason, /2\/3 automated tests passed/);
});

test("weighted tests are honored", () => {
  const result = scoreWorkSample({
    module_id: "coding_with_ai",
    correctness_competency_id: "coding_correctness",
    test_results: [
      { test_id: "core", passed: true, weight: 3 },
      { test_id: "edge", passed: false, weight: 1 },
    ],
  });
  assert.equal(result.competency_scores[0].score, 75, "3 of 4 weighted points");
});

test("AI collaboration is captured as evidence for review, never auto-scored or penalized", () => {
  const result = scoreWorkSample({
    module_id: "coding_with_ai",
    correctness_competency_id: "coding_correctness",
    collaboration_competency_id: "ai_collaboration",
    test_results: [{ test_id: "t1", passed: true }],
    ai_transcript: [
      { role: "candidate", text: "How should I structure the parser?" },
      { role: "assistant", text: "Consider a tokenizer then a recursive descent parser." },
      { role: "candidate", text: "I'll adapt that but handle errors differently." },
    ],
  });
  const collaboration = result.competency_scores.find((c) => c.competency_id === "ai_collaboration");
  assert.ok(collaboration);
  assert.equal(collaboration.needs_human_review, true);
  assert.match(collaboration.reason, /captured for human review, never auto-scored or penalized/);
  assert.ok(collaboration.evidence.length >= 3, "transcript surfaced as evidence");
});

test("no test results falls back to human review without claiming correctness", () => {
  const result = scoreWorkSample({
    module_id: "coding_with_ai",
    correctness_competency_id: "coding_correctness",
    test_results: [],
  });
  assert.equal(result.used_fallback, true);
  assert.equal(result.needs_human_review, true);
});
