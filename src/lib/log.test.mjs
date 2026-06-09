import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../test-helpers/ts-loader.mjs";

const { log, logLlmTelemetry, logWarn } = loadFromRepoRoot("src/lib/log.ts");
const { evaluateResponseWithBars } = loadFromRepoRoot(
  "src/features/scoring/bars/evaluator.ts",
);

/** Capture stdout/stderr JSON lines emitted by the logger. */
function withCapturedLogs(fn) {
  const stdout = [];
  const stderr = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalEnv = process.env.ASSUMERAI_LOG_IN_TESTS;
  console.log = (line) => stdout.push(line);
  console.error = (line) => stderr.push(line);
  process.env.ASSUMERAI_LOG_IN_TESTS = "true";
  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
    if (originalEnv === undefined) {
      delete process.env.ASSUMERAI_LOG_IN_TESTS;
    } else {
      process.env.ASSUMERAI_LOG_IN_TESTS = originalEnv;
    }
  }
  return { stdout, stderr };
}

test("log lines are single JSON objects with level, msg, time, and context fields", () => {
  const { stdout } = withCapturedLogs(() => {
    log("info", "hello", {
      correlationId: "corr_1",
      route: "/candidate/interview/turn",
      candidateId: "cand_1",
    });
  });

  assert.equal(stdout.length, 1);
  const parsed = JSON.parse(stdout[0]);
  assert.equal(parsed.level, "info");
  assert.equal(parsed.msg, "hello");
  assert.equal(parsed.correlationId, "corr_1");
  assert.equal(parsed.route, "/candidate/interview/turn");
  assert.equal(parsed.candidateId, "cand_1");
  assert.ok(Number.isFinite(Date.parse(parsed.time)));
});

test("warn and error go to stderr; LOG_LEVEL filters lower levels", () => {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "warn";
  try {
    const { stdout, stderr } = withCapturedLogs(() => {
      log("info", "filtered out");
      logWarn("kept");
    });
    assert.equal(stdout.length, 0);
    assert.equal(stderr.length, 1);
    assert.equal(JSON.parse(stderr[0]).msg, "kept");
  } finally {
    if (originalLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLevel;
    }
  }
});

test("the logger stays silent during test runs unless explicitly enabled", () => {
  const stdout = [];
  const originalLog = console.log;
  console.log = (line) => stdout.push(line);
  try {
    // NODE_TEST_CONTEXT is set by node --test; ASSUMERAI_LOG_IN_TESTS is not.
    log("info", "should be silenced");
  } finally {
    console.log = originalLog;
  }
  assert.equal(stdout.length, 0);
});

test("LLM telemetry logs ok calls as info with model, latency, and tokens", () => {
  const { stdout } = withCapturedLogs(() => {
    logLlmTelemetry({
      site: "bars_evaluator",
      provider: "anthropic",
      model: "claude-sonnet-4",
      latencyMs: 812.4,
      inputTokens: 1200,
      outputTokens: 240,
      outcome: "ok",
    });
  });

  const parsed = JSON.parse(stdout[0]);
  assert.equal(parsed.msg, "llm_call");
  assert.equal(parsed.level, "info");
  assert.equal(parsed.model, "claude-sonnet-4");
  assert.equal(parsed.latency_ms, 812);
  assert.equal(parsed.input_tokens, 1200);
  assert.equal(parsed.output_tokens, 240);
  assert.equal(parsed.outcome, "ok");
  assert.equal(parsed.fallback_used, false);
});

test("a fallback always emits a WARN line — silent degradation is visible", () => {
  const { stderr } = withCapturedLogs(() => {
    logLlmTelemetry({
      site: "interviewer_agent",
      provider: "anthropic",
      outcome: "fallback",
      fallbackReason: "anthropic_api_key_missing",
    });
  });

  const parsed = JSON.parse(stderr[0]);
  assert.equal(parsed.level, "warn");
  assert.equal(parsed.msg, "llm_fallback");
  assert.equal(parsed.fallback_used, true);
  assert.equal(parsed.fallback_reason, "anthropic_api_key_missing");
});

test("the BARS evaluator emits the fallback WARN when it degrades deterministically", async () => {
  const competency = {
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
  };

  let evaluation;
  const captured = [];
  const originalError = console.error;
  const originalEnv = process.env.ASSUMERAI_LOG_IN_TESTS;
  console.error = (line) => captured.push(line);
  process.env.ASSUMERAI_LOG_IN_TESTS = "true";
  try {
    evaluation = await evaluateResponseWithBars({
      competency,
      questionId: "q1",
      questionText: "Tell me about a rollout you owned.",
      targetStarElements: ["situation", "task", "action", "result"],
      answerText: "At Acme I owned the rollout and shipped it.",
      options: { apiKey: null },
    });
  } finally {
    console.error = originalError;
    if (originalEnv === undefined) {
      delete process.env.ASSUMERAI_LOG_IN_TESTS;
    } else {
      process.env.ASSUMERAI_LOG_IN_TESTS = originalEnv;
    }
  }

  assert.equal(evaluation.source, "deterministic_fallback");
  const fallbackLine = captured
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed?.msg === "llm_fallback");
  assert.ok(fallbackLine, "expected a WARN llm_fallback line");
  assert.equal(fallbackLine.site, "bars_evaluator");
  assert.equal(fallbackLine.fallback_reason, "anthropic_api_key_missing");
});
