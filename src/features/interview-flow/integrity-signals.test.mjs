import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  accumulateIntegritySummary,
  integritySummaryHighlights,
  MAX_SIGNAL_COUNT,
  parseTurnIntegritySignals,
  readModuleIntegritySummary,
} = loadFromRepoRoot("src/features/interview-flow/integrity-signals.ts");
const {
  conductServerTurn,
  issueTurnForModule,
  parseServerTurnRequestBody,
  startModule,
  buildModuleSessionEnvelope,
} = loadFromRepoRoot("src/features/interview-flow/server-turn.ts");
const { createInterviewSession } = loadFromRepoRoot(
  "src/features/interview-flow/session-state.ts",
);

const SIGNALS = {
  tabHiddenCount: 2,
  windowBlurCount: 1,
  pasteCount: 0,
  audioGapCount: 1,
  maxAudioGapSeconds: 18.5,
};

// ---------------------------------------------------------------------------
// Parsing and clamping
// ---------------------------------------------------------------------------

test("well-formed signals parse; malformed or padded ones are dropped entirely", () => {
  assert.deepEqual(parseTurnIntegritySignals(SIGNALS), SIGNALS);

  assert.equal(parseTurnIntegritySignals(undefined), undefined);
  assert.equal(parseTurnIntegritySignals("3 switches"), undefined);
  assert.equal(
    parseTurnIntegritySignals({ ...SIGNALS, keystrokes: "qwerty" }),
    undefined,
    "unknown fields are rejected — the contract stays strict",
  );
  assert.equal(parseTurnIntegritySignals({ ...SIGNALS, tabHiddenCount: -1 }), undefined);
  assert.equal(parseTurnIntegritySignals({ ...SIGNALS, pasteCount: "2" }), undefined);
});

test("counts are clamped to a sane ceiling", () => {
  const parsed = parseTurnIntegritySignals({
    ...SIGNALS,
    tabHiddenCount: 10_000_000,
    maxAudioGapSeconds: 999_999,
  });
  assert.equal(parsed.tabHiddenCount, MAX_SIGNAL_COUNT);
  assert.equal(parsed.maxAudioGapSeconds, 3600);
});

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

test("the module summary accumulates counts, maxima, and anomaly flags", () => {
  let summary = accumulateIntegritySummary(undefined, {
    signals: SIGNALS,
    responseLatencySeconds: 42,
  });
  summary = accumulateIntegritySummary(summary, {
    signals: { tabHiddenCount: 1, windowBlurCount: 0, pasteCount: 1, audioGapCount: 1, maxAudioGapSeconds: 35 },
    responseLatencySeconds: 250,
  });

  assert.equal(summary.turnsObserved, 2);
  assert.equal(summary.tabHiddenCount, 3);
  assert.equal(summary.windowBlurCount, 1);
  assert.equal(summary.pasteCount, 1);
  assert.equal(summary.audioGapCount, 2);
  assert.equal(summary.maxAudioGapSeconds, 35);
  assert.equal(summary.maxResponseLatencySeconds, 250);
  assert.deepEqual(
    [...summary.anomalyFlags].sort(),
    ["frequent_tab_switching", "long_audio_gap", "long_response_latency", "paste_detected"],
  );
});

test("a quiet module produces no anomaly flags and a neutral highlight", () => {
  const summary = accumulateIntegritySummary(undefined, {
    signals: { tabHiddenCount: 0, windowBlurCount: 0, pasteCount: 0, audioGapCount: 0, maxAudioGapSeconds: 0 },
    responseLatencySeconds: 30,
  });

  assert.deepEqual(summary.anomalyFlags, []);
  assert.deepEqual(integritySummaryHighlights(summary), ["No notable signals"]);
});

test("highlights use neutral factual wording, never judgments", () => {
  const summary = accumulateIntegritySummary(undefined, {
    signals: { tabHiddenCount: 3, windowBlurCount: 0, pasteCount: 0, audioGapCount: 1, maxAudioGapSeconds: 45 },
    responseLatencySeconds: 20,
  });
  const highlights = integritySummaryHighlights(summary);

  assert.deepEqual(highlights, ["3 tab switches", "1 long pause (up to 45s)"]);
  const text = highlights.join(" ").toLowerCase();
  for (const judgment of ["cheat", "fraud", "suspicious", "dishonest", "penalty"]) {
    assert.ok(!text.includes(judgment), `neutral wording must not contain "${judgment}"`);
  }
});

test("persisted summaries round-trip defensively", () => {
  const summary = accumulateIntegritySummary(undefined, {
    signals: SIGNALS,
    responseLatencySeconds: 42,
  });
  const restored = readModuleIntegritySummary(JSON.parse(JSON.stringify(summary)));
  assert.deepEqual(restored, summary);

  assert.equal(readModuleIntegritySummary({ version: "other" }), undefined);
  assert.equal(readModuleIntegritySummary(null), undefined);
});

// ---------------------------------------------------------------------------
// End-to-end: turn contract, persistence on the module session, score isolation
// ---------------------------------------------------------------------------

const roleProfile = {
  role_id: "role_sdr",
  title: "Sales Development Representative",
  role_type: "sales",
  requirements: { required_skills: ["outbound"] },
  calibration: {},
};

const offlineOptions = {
  evaluatorOptions: { apiKey: null },
  interviewerOptions: { apiKey: null },
};

function newStartedSession(sessionId) {
  return startModule(
    createInterviewSession({
      candidateId: "cand_1",
      interviewLanguage: "en",
      roleProfile,
      now: "2026-06-09T10:00:00.000Z",
      sessionId,
    }),
    "motivation",
    "2026-06-09T10:00:00.000Z",
  );
}

async function runTurn(session, integritySignals) {
  const turn = issueTurnForModule(session, "motivation", "2026-06-09T10:00:00.000Z");
  return conductServerTurn({
    session,
    moduleId: "motivation",
    turnId: turn.turnId,
    answerText:
      "At Acme in 2023 I owned DACH outbound. I built a three-touch sequence and booked 14 meetings, a 30% lift.",
    activeTurnId: turn.turnId,
    turnStartedAt: turn.issuedAt,
    turnCount: 0,
    integritySignals,
    now: "2026-06-09T10:01:00.000Z",
    ...offlineOptions,
  });
}

test("turn bodies may carry integritySignals; tampered shapes are dropped not fatal", () => {
  const withSignals = parseServerTurnRequestBody({
    moduleId: "motivation",
    turnId: "turn_x",
    candidateAnswer: { answerText: "hello" },
    integritySignals: SIGNALS,
  });
  assert.equal(withSignals.ok, true);
  assert.deepEqual(withSignals.value.integritySignals, SIGNALS);

  const malformed = parseServerTurnRequestBody({
    moduleId: "motivation",
    turnId: "turn_x",
    candidateAnswer: { answerText: "hello" },
    integritySignals: { keylog: "abc" },
  });
  assert.equal(malformed.ok, true, "bad telemetry never blocks the turn");
  assert.equal(malformed.value.integritySignals, undefined);
});

test("the integrity summary lands on the module session and its envelope", async () => {
  const result = await runTurn(newStartedSession("sess_integrity"), SIGNALS);

  assert.equal(result.kind, "turn_completed");
  const summary = result.session.module_sessions.motivation.integritySummary;
  assert.ok(summary);
  assert.equal(summary.turnsObserved, 1);
  assert.equal(summary.tabHiddenCount, 2);
  assert.equal(summary.maxResponseLatencySeconds, 60, "latency is the server-derived elapsed time");
  assert.deepEqual(result.integritySignals, SIGNALS);
  assert.equal(result.responseLatencySeconds, 60);

  const envelope = buildModuleSessionEnvelope(result.session, "motivation");
  assert.ok(envelope.module.integritySummary, "summary persists with the module payload");
});

test("integrity signals NEVER change any score computation", async () => {
  const noisy = {
    tabHiddenCount: 50,
    windowBlurCount: 50,
    pasteCount: 50,
    audioGapCount: 50,
    maxAudioGapSeconds: 600,
  };
  const [clean, flagged] = await Promise.all([
    runTurn(newStartedSession("sess_score_a"), undefined),
    runTurn(newStartedSession("sess_score_b"), noisy),
  ]);

  assert.equal(clean.kind, "turn_completed");
  assert.equal(flagged.kind, "turn_completed");
  assert.equal(flagged.evaluation.bars_score, clean.evaluation.bars_score);
  assert.equal(flagged.evaluation.bars_level, clean.evaluation.bars_level);
  assert.equal(flagged.evaluation.confidence, clean.evaluation.confidence);
  assert.deepEqual(flagged.evaluation.star_completeness, clean.evaluation.star_completeness);
  assert.equal(flagged.nextAction, clean.nextAction);
  assert.equal(
    flagged.evaluatorRun.bars_score,
    clean.evaluatorRun.bars_score,
    "the audit record is identical regardless of signals",
  );
});
