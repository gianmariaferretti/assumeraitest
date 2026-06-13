import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const { evaluateItemTiming, evaluateModuleTiming, TIMING_GRACE_SECONDS } = loadFromRepoRoot(
  "src/features/scoring/quiz-engine/timing.ts",
);

function item(itemId, timeLimit) {
  return {
    item_id: itemId,
    type: "single_choice",
    stem: "stem",
    competency_tag: "logic",
    difficulty: 2,
    time_limit_seconds: timeLimit,
  };
}

function response(itemId, issuedMs, elapsedSeconds) {
  const issued = new Date(issuedMs);
  return {
    item_id: itemId,
    answer: "a",
    issued_at: issued.toISOString(),
    answered_at: new Date(issuedMs + elapsedSeconds * 1000).toISOString(),
  };
}

test("an answer inside the limit (plus grace) is within time", () => {
  const verdict = evaluateItemTiming(item("q1", 30), response("q1", 0, 31));
  assert.equal(verdict.within_time, true, "31s with a 30s limit + grace");
  assert.equal(verdict.elapsed_seconds, 31);
});

test("an answer clearly past the limit is flagged late", () => {
  const verdict = evaluateItemTiming(item("q1", 30), response("q1", 0, 120));
  assert.equal(verdict.within_time, false);
});

test("unparseable timestamps can never be vouched as within time", () => {
  const verdict = evaluateItemTiming(item("q1", 30), {
    item_id: "q1",
    answer: "a",
    issued_at: "not-a-date",
    answered_at: "also-not-a-date",
  });
  assert.equal(verdict.within_time, false);
});

test("module timing measures the earliest-issue to latest-answer window", () => {
  const form = {
    form_id: "f1",
    module_id: "m1",
    version: "v1",
    mode: "fixed",
    items: [item("q1", 60), item("q2", 60)],
    module_time_limit_seconds: 120,
  };
  // q1 issued at t=0 answered +30s; q2 issued at t=40s answered +30s (=t70s).
  // Window = 70s <= 120s -> within module limit, both items within their own limit.
  const within = evaluateModuleTiming(form, [response("q1", 0, 30), response("q2", 40_000, 30)]);
  assert.equal(within.within_module_limit, true);
  assert.equal(within.items.length, 2);
  assert.ok(within.items.every((verdict) => verdict.within_time));

  // Same per-item pace but a long idle gap pushes the module window over 120s.
  const overModule = evaluateModuleTiming(form, [response("q1", 0, 30), response("q2", 200_000, 30)]);
  assert.equal(overModule.within_module_limit, false, "idle between items still counts");
});

test("the grace window is small and explicit", () => {
  assert.equal(TIMING_GRACE_SECONDS, 2);
});
