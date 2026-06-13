import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const { scoreInteractive } = loadFromRepoRoot(
  "src/features/scoring/interactive/interactive-scorer.ts",
);

test("SQL result-set equality grades a matching query correct", () => {
  const result = scoreInteractive({
    module_id: "sql_query",
    tasks: [
      {
        kind: "result_set",
        competency_id: "sql_correctness",
        expected: [["alice", 3], ["bob", 5]],
        actual: [["alice", 3], ["bob", 5]],
      },
    ],
  });
  assert.equal(result.scorer_type, "interactive");
  assert.equal(result.module_score, 100);
  assert.equal(result.competency_scores[0].needs_human_review, false);
});

test("row order matters unless orderInsensitive is set", () => {
  const ordered = scoreInteractive({
    module_id: "sql_query",
    tasks: [
      {
        kind: "result_set",
        competency_id: "sql_correctness",
        expected: [["a"], ["b"]],
        actual: [["b"], ["a"]],
      },
    ],
  });
  assert.equal(ordered.module_score, 0, "order-sensitive mismatch");

  const insensitive = scoreInteractive({
    module_id: "sql_query",
    tasks: [
      {
        kind: "result_set",
        competency_id: "sql_correctness",
        expected: [["a"], ["b"]],
        actual: [["b"], ["a"]],
        orderInsensitive: true,
      },
    ],
  });
  assert.equal(insensitive.module_score, 100, "order-insensitive match");
});

test("cell/chart end-state grades the fraction of correct properties", () => {
  const result = scoreInteractive({
    module_id: "data_literacy",
    tasks: [
      {
        kind: "cell_state",
        competency_id: "data_reading",
        expected: { B2: 100, C2: 0.25 },
        actual: { B2: 100, C2: 0.5 },
      },
    ],
  });
  assert.equal(result.module_score, 50, "1 of 2 properties correct");
  assert.equal(result.competency_scores[0].needs_human_review, true);
});

test("no tasks falls back without claiming confidence", () => {
  const result = scoreInteractive({ module_id: "sql_query", tasks: [] });
  assert.equal(result.used_fallback, true);
  assert.equal(result.needs_human_review, true);
  assert.ok(result.confidence <= 0.4);
});
