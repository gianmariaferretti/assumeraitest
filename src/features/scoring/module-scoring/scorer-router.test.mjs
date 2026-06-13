import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const { resolveModuleScorer, resolveModuleScorerType, hasLiveScorer } = loadFromRepoRoot(
  "src/features/scoring/module-scoring/scorer-router.ts",
);
const { buildModuleScoreResult, FALLBACK_MAX_CONFIDENCE } = loadFromRepoRoot(
  "src/features/scoring/module-scoring/scorer-types.ts",
);
const { moduleScoreToResult } = loadFromRepoRoot(
  "src/features/scoring/module-scoring/behavioral-scorer-adapter.ts",
);
const { modulesToInterviewScorecard } = loadFromRepoRoot(
  "src/features/scoring/module-scoring/to-matching-scorecard.ts",
);

test("modules default to behavioral; the router only serves NEW scorer types", () => {
  assert.equal(resolveModuleScorerType("motivation"), "behavioral");
  assert.equal(resolveModuleScorerType("some_unregistered_module"), "behavioral");

  // behavioral is scored by the existing pipeline, not a router scorer.
  assert.equal(resolveModuleScorer("behavioral"), undefined);
  assert.equal(hasLiveScorer("behavioral"), false);

  const deterministic = resolveModuleScorer("deterministic");
  assert.ok(deterministic);
  assert.equal(deterministic.type, "deterministic");
  assert.equal(hasLiveScorer("deterministic"), true);
});

test("buildModuleScoreResult: confidence-weighted module score + review rules", () => {
  const result = buildModuleScoreResult({
    module_id: "m1",
    scorer_type: "deterministic",
    scorer_version: "v1",
    competency_scores: [
      { competency_id: "a", score: 80, confidence: 0.9, evidence: [], reason: "", needs_human_review: false },
      { competency_id: "b", score: 40, confidence: 0.9, evidence: [], reason: "", needs_human_review: false },
    ],
    used_fallback: false,
    now: "2026-06-13T10:00:00.000Z",
  });
  assert.equal(result.module_score, 60, "equal weights -> mean of 80 and 40");
  assert.equal(result.needs_human_review, false);
  assert.equal(result.used_fallback, false);
});

test("a fallback result can never claim more than the fallback confidence cap", () => {
  const result = buildModuleScoreResult({
    module_id: "m1",
    scorer_type: "deterministic",
    scorer_version: "v1",
    competency_scores: [
      { competency_id: "a", score: 90, confidence: 0.99, evidence: [], reason: "", needs_human_review: false },
    ],
    used_fallback: true,
  });
  assert.ok(result.confidence <= FALLBACK_MAX_CONFIDENCE);
  assert.equal(result.needs_human_review, true);
});

test("a low-confidence module always routes to human review", () => {
  const result = buildModuleScoreResult({
    module_id: "m1",
    scorer_type: "deterministic",
    scorer_version: "v1",
    competency_scores: [
      { competency_id: "a", score: 70, confidence: 0.3, evidence: [], reason: "", needs_human_review: false },
    ],
    used_fallback: false,
  });
  assert.equal(result.needs_human_review, true);
});

test("behavioral adapter maps the 1-10 BARS module score onto 0-100", () => {
  const moduleScore = {
    module_id: "motivation",
    bars_score: 7,
    bars_level: "exceeds_standard",
    confidence: 0.8,
    red_flag_count: 0,
    high_severity_red_flag_count: 0,
    human_review_required: false,
    competencies: [
      {
        competency_id: "motivation_role_fit",
        bars_score: 8,
        bars_level: "exceeds_standard",
        answers_evaluated: 2,
        mean_star_completeness: 3,
        confidence: 0.8,
        evidence_snippets: ["built a three-touch sequence"],
        red_flags: [],
        human_review_required: false,
      },
    ],
  };
  const result = moduleScoreToResult(moduleScore);
  assert.equal(result.scorer_type, "behavioral");
  assert.equal(result.competency_scores[0].score, 80, "BARS 8/10 -> 80/100");
  assert.deepEqual(result.competency_scores[0].evidence, ["built a three-touch sequence"]);
  assert.match(result.competency_scores[0].reason, /BARS 8\/10/);
});

test("to-matching-scorecard bridges results into the matching InterviewScorecard", () => {
  const results = [
    buildModuleScoreResult({
      module_id: "logic",
      scorer_type: "deterministic",
      scorer_version: "v1",
      competency_scores: [
        { competency_id: "logic", score: 80, confidence: 0.9, evidence: ["q1: correct"], reason: "", needs_human_review: false },
      ],
      used_fallback: false,
    }),
    buildModuleScoreResult({
      module_id: "writing",
      scorer_type: "language",
      scorer_version: "v1",
      competency_scores: [
        { competency_id: "writing", score: 50, confidence: 0.3, evidence: [], reason: "", needs_human_review: true },
      ],
      used_fallback: false,
    }),
  ];
  const scorecard = modulesToInterviewScorecard(results);

  assert.equal(scorecard.module_scores.logic.score, 80);
  assert.equal(scorecard.module_scores.writing.score, 50);
  assert.equal(scorecard.overall_interview_score, 65, "mean of 80 and 50");
  assert.deepEqual(scorecard.manual_review_flags, ["writing"]);
  // The flagged module carries a missing_data note matching the existing
  // matching review semantics.
  assert.ok(scorecard.module_scores.writing.missing_data.length > 0);
});
