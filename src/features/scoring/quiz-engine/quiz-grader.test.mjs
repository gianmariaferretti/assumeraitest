import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const { gradeQuiz, gradedItemsToCompetencyScores } = loadFromRepoRoot(
  "src/features/scoring/quiz-engine/grader.ts",
);
const { createDeterministicScorer } = loadFromRepoRoot(
  "src/features/scoring/quiz-engine/deterministic-scorer.ts",
);

function publicItem(overrides) {
  return {
    item_id: "i1",
    type: "single_choice",
    stem: "stem",
    competency_tag: "logic",
    difficulty: 2,
    time_limit_seconds: 60,
    ...overrides,
  };
}

function response(itemId, answer, elapsedSeconds = 5) {
  const issued = new Date("2026-06-13T10:00:00.000Z");
  const answered = new Date(issued.getTime() + elapsedSeconds * 1000);
  return { item_id: itemId, answer, issued_at: issued.toISOString(), answered_at: answered.toISOString() };
}

test("single_choice grades correct/incorrect and keeps a verbatim audit", () => {
  const bank = [
    {
      public: publicItem({ item_id: "q1", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }),
      key: { item_id: "q1", correct: { type: "single_choice", option_id: "b" }, rationale: "B is right." },
    },
  ];
  const right = gradeQuiz({ bank, responses: [response("q1", "b")] })[0];
  assert.equal(right.correct, true);
  assert.equal(right.awarded, 1);
  assert.match(right.candidate_answer_audit, /selected: b/);

  const wrong = gradeQuiz({ bank, responses: [response("q1", "a")] })[0];
  assert.equal(wrong.correct, false);
  assert.equal(wrong.awarded, 0);
});

test("multi_choice awards Jaccard-style partial credit and never below zero", () => {
  const bank = [
    {
      public: publicItem({ item_id: "q2", type: "multi_choice" }),
      key: { item_id: "q2", correct: { type: "multi_choice", option_ids: ["a", "b"] }, rationale: "" },
    },
  ];
  // one of two correct, no wrong picks -> 0.5
  assert.equal(gradeQuiz({ bank, responses: [response("q2", ["a"])] })[0].awarded, 0.5);
  // both correct -> 1
  assert.equal(gradeQuiz({ bank, responses: [response("q2", ["a", "b"])] })[0].correct, true);
  // both correct + one wrong -> (2-1)/2 = 0.5
  assert.equal(gradeQuiz({ bank, responses: [response("q2", ["a", "b", "c"])] })[0].awarded, 0.5);
  // all wrong -> clamped to 0
  assert.equal(gradeQuiz({ bank, responses: [response("q2", ["c", "d", "e"])] })[0].awarded, 0);
});

test("numeric_entry honors tolerance", () => {
  const bank = [
    {
      public: publicItem({ item_id: "q3", type: "numeric_entry" }),
      key: { item_id: "q3", correct: { type: "numeric_entry", value: 42, tolerance: 0.5 }, rationale: "" },
    },
  ];
  assert.equal(gradeQuiz({ bank, responses: [response("q3", 42.4)] })[0].correct, true);
  assert.equal(gradeQuiz({ bank, responses: [response("q3", 43)] })[0].correct, false);
  assert.equal(gradeQuiz({ bank, responses: [response("q3", "not a number")] })[0].correct, false);
});

test("ordering grades by correct positions (partial credit)", () => {
  const bank = [
    {
      public: publicItem({ item_id: "q4", type: "ordering" }),
      key: { item_id: "q4", correct: { type: "ordering", order: ["a", "b", "c"] }, rationale: "" },
    },
  ];
  assert.equal(gradeQuiz({ bank, responses: [response("q4", ["a", "b", "c"])] })[0].awarded, 1);
  // first correct, last two swapped -> 1/3
  assert.equal(
    Math.round(gradeQuiz({ bank, responses: [response("q4", ["a", "c", "b"])] })[0].awarded * 1000) / 1000,
    0.333,
  );
});

test("an unanswered item scores zero and is flagged for review, not dropped", () => {
  const bank = [
    {
      public: publicItem({ item_id: "q5" }),
      key: { item_id: "q5", correct: { type: "single_choice", option_id: "a" }, rationale: "" },
    },
  ];
  const graded = gradeQuiz({ bank, responses: [] });
  assert.equal(graded.length, 1);
  assert.equal(graded[0].awarded, 0);
  assert.equal(graded[0].within_time, false);
  assert.match(graded[0].candidate_answer_audit, /no answer submitted/);
});

test("a late answer is graded but flagged over the time limit", () => {
  const bank = [
    {
      public: publicItem({ item_id: "q6", time_limit_seconds: 10 }),
      key: { item_id: "q6", correct: { type: "single_choice", option_id: "a" }, rationale: "" },
    },
  ];
  const graded = gradeQuiz({ bank, responses: [response("q6", "a", 999)] })[0];
  assert.equal(graded.correct, true, "still graded");
  assert.equal(graded.within_time, false, "but flagged late");
});

test("competency aggregation: 0-100 score, monotonic confidence, late->review", () => {
  const items = [
    { item_id: "a", competency_tag: "logic", correct: true, awarded: 1, max_points: 1, within_time: true, candidate_answer_audit: "selected: a", rationale: "" },
    { item_id: "b", competency_tag: "logic", correct: false, awarded: 0, max_points: 1, within_time: true, candidate_answer_audit: "selected: x", rationale: "" },
    { item_id: "c", competency_tag: "numeracy", correct: true, awarded: 1, max_points: 1, within_time: false, candidate_answer_audit: "entered: 42", rationale: "" },
  ];
  const scores = gradedItemsToCompetencyScores(items);
  const logic = scores.find((s) => s.competency_id === "logic");
  const numeracy = scores.find((s) => s.competency_id === "numeracy");

  assert.equal(logic.score, 50, "1/2 correct -> 50/100");
  assert.equal(logic.needs_human_review, false);
  assert.ok(logic.confidence > 0 && logic.confidence < 1);
  assert.equal(numeracy.needs_human_review, true, "late item routes competency to review");
  assert.match(logic.reason, /Deterministic answer-key scoring/);
});

test("the deterministic scorer falls back without ever claiming high confidence", async () => {
  const scorer = createDeterministicScorer();
  const result = await scorer.scoreModule({
    module_id: "m1",
    candidate_id: "c1",
    interview_session_id: "s1",
    payload: { malformed: true },
    now: "2026-06-13T10:00:00.000Z",
  });
  assert.equal(result.used_fallback, true);
  assert.equal(result.needs_human_review, true);
  assert.ok(result.confidence <= 0.4, "fallback confidence is capped");
  assert.equal(result.scorer_type, "deterministic");
});

test("the deterministic scorer is fully deterministic (fairness: same in, same out)", async () => {
  const scorer = createDeterministicScorer();
  const payload = {
    bankEntries: [
      {
        public: publicItem({ item_id: "q1", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }),
        key: { item_id: "q1", correct: { type: "single_choice", option_id: "b" }, rationale: "B." },
      },
    ],
    responses: [response("q1", "b")],
  };
  const input = {
    module_id: "m1",
    candidate_id: "c1",
    interview_session_id: "s1",
    payload,
    now: "2026-06-13T10:00:00.000Z",
  };
  const first = await scorer.scoreModule(input);
  const second = await scorer.scoreModule({ ...input, candidate_id: "DIFFERENT_CANDIDATE" });

  // Identical answers must yield identical scores regardless of who answered:
  // no candidate identity enters deterministic grading.
  assert.equal(first.module_score, second.module_score);
  assert.equal(first.module_score, 100);
  assert.deepEqual(
    first.competency_scores.map((c) => [c.competency_id, c.score]),
    second.competency_scores.map((c) => [c.competency_id, c.score]),
  );
});
