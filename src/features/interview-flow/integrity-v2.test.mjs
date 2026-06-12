import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  accumulateIntegritySummary,
  integritySummaryHighlights,
  parseTurnIntegritySignals,
  readModuleIntegritySummary,
} = loadFromRepoRoot("src/features/interview-flow/integrity-signals.ts");
const { isHighFluencyAnswer, measureTextDisfluency } = loadFromRepoRoot(
  "src/features/interview-flow/text-disfluency.ts",
);

function accumulateAll(turns, options) {
  let summary;
  for (const turn of turns) {
    summary = accumulateIntegritySummary(summary, turn, options);
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Intervention 2: uniform response onset (low variance, never a long-latency rule)
// ---------------------------------------------------------------------------

test("near-constant onsets in the LLM round-trip band raise uniform_response_onset", () => {
  const summary = accumulateAll(
    [12.1, 11.8, 12.4, 12.0, 11.9].map((latency) => ({ responseLatencySeconds: latency })),
  );
  assert.ok(summary.anomalyFlags.includes("uniform_response_onset"));
});

test("irregular human onsets never flag, even with slow turns among them", () => {
  const summary = accumulateAll(
    [3, 41, 12, 88, 7].map((latency) => ({ responseLatencySeconds: latency })),
  );
  assert.ok(!summary.anomalyFlags.includes("uniform_response_onset"));
});

test("too few turns means insufficient data: no flag on noise", () => {
  const summary = accumulateAll(
    [12, 12, 12].map((latency) => ({ responseLatencySeconds: latency })),
  );
  assert.ok(!summary.anomalyFlags.includes("uniform_response_onset"));
});

test("uniform but FAST onsets (instinctive answerers) never flag", () => {
  // Mean below the plausible LLM-read minimum: uniformity alone is not enough.
  const summary = accumulateAll(
    [2.0, 2.2, 1.9, 2.1, 2.0].map((latency) => ({ responseLatencySeconds: latency })),
  );
  assert.ok(!summary.anomalyFlags.includes("uniform_response_onset"));
});

test("onset thresholds are configurable", () => {
  const turns = [5, 5.1, 4.9, 5].map((latency) => ({ responseLatencySeconds: latency }));
  const defaults = accumulateAll(turns);
  assert.ok(!defaults.anomalyFlags.includes("uniform_response_onset"), "mean 5 < default 8");

  const tuned = accumulateAll(turns, { uniformOnsetMinMeanSeconds: 4 });
  assert.ok(tuned.anomalyFlags.includes("uniform_response_onset"));
});

// ---------------------------------------------------------------------------
// Intervention 3: low-disfluency text (transcript TEXT only, voice mode only)
// ---------------------------------------------------------------------------

const READ_PERFECT =
  "Our migration strategy comprised three sequential phases designed to minimize operational risk. " +
  "First we established a parallel write path, validating consistency across both stores. " +
  "Subsequently we shifted read traffic incrementally, monitoring latency percentiles at each step. " +
  "Finally we decommissioned the legacy cluster, which reduced infrastructure spend considerably.";

const NATURAL_HESITANT =
  "So, ehm, we had this migration thing — I mean, the database one. We... we started with, tipo, " +
  "a parallel write path, anzi no aspetta, first we validated the data. Then we, uh, moved reads " +
  "over slowly and kept watching the metrics, you know, until the old cluster could go away.";

test("the disfluency measure counts written markers, not voice features", () => {
  assert.equal(measureTextDisfluency("").markerCount, 0);
  assert.ok(measureTextDisfluency(NATURAL_HESITANT).markerCount >= 4);
  assert.equal(measureTextDisfluency(READ_PERFECT).markerCount, 0);
  assert.ok(isHighFluencyAnswer(READ_PERFECT));
  assert.ok(!isHighFluencyAnswer(NATURAL_HESITANT));
  assert.ok(!isHighFluencyAnswer("Short and clean."), "short answers never count");
});

test("a streak of read-perfect voice answers raises low_disfluency_text", () => {
  const summary = accumulateAll([
    { responseLatencySeconds: 20, answerText: READ_PERFECT, interviewMode: "voice" },
    { responseLatencySeconds: 35, answerText: READ_PERFECT, interviewMode: "voice" },
    { responseLatencySeconds: 15, answerText: READ_PERFECT, interviewMode: "voice" },
  ]);
  assert.ok(summary.anomalyFlags.includes("low_disfluency_text"));
});

test("natural hesitations break the streak: no flag", () => {
  const summary = accumulateAll([
    { responseLatencySeconds: 20, answerText: READ_PERFECT, interviewMode: "voice" },
    { responseLatencySeconds: 35, answerText: NATURAL_HESITANT, interviewMode: "voice" },
    { responseLatencySeconds: 15, answerText: READ_PERFECT, interviewMode: "voice" },
  ]);
  assert.ok(!summary.anomalyFlags.includes("low_disfluency_text"));
  assert.equal(summary.lowDisfluencyStreak, 1);
});

test("text-mode turns are exempt from the fluency analysis (Phase 12 fairness)", () => {
  // Typed answers are legitimately marker-free: they must neither extend nor
  // reset the streak, and an all-text module can never flag.
  const summary = accumulateAll([
    { responseLatencySeconds: 20, answerText: READ_PERFECT, interviewMode: "text" },
    { responseLatencySeconds: 35, answerText: READ_PERFECT, interviewMode: "text" },
    { responseLatencySeconds: 15, answerText: READ_PERFECT, interviewMode: "text" },
    { responseLatencySeconds: 25, answerText: READ_PERFECT, interviewMode: "text" },
  ]);
  assert.ok(!summary.anomalyFlags.includes("low_disfluency_text"));
  assert.equal(summary.lowDisfluencyStreak, 0);
});

// ---------------------------------------------------------------------------
// Intervention 4: paste burst on code-capable modules
// ---------------------------------------------------------------------------

const cleanSignals = {
  tabHiddenCount: 0,
  windowBlurCount: 0,
  audioGapCount: 0,
  maxAudioGapSeconds: 0,
};

test("a single solution-sized paste on work_sample raises large_paste_burst", () => {
  const summary = accumulateAll([
    {
      responseLatencySeconds: 30,
      moduleId: "work_sample",
      signals: { ...cleanSignals, pasteCount: 1, largestPasteChars: 5000, pasteBurstCount: 1 },
    },
  ]);
  assert.ok(summary.anomalyFlags.includes("large_paste_burst"));
  assert.ok(summary.anomalyFlags.includes("paste_detected"), "v1 flag still present");
});

test("incremental small pastes on work_sample do not flag", () => {
  const summary = accumulateAll(
    Array.from({ length: 3 }, () => ({
      responseLatencySeconds: 30,
      moduleId: "work_sample",
      signals: { ...cleanSignals, pasteCount: 1, largestPasteChars: 80, pasteBurstCount: 1 },
    })),
  );
  assert.ok(!summary.anomalyFlags.includes("large_paste_burst"));
});

test("a paste spike within seconds flags even when each paste is small", () => {
  const summary = accumulateAll([
    {
      responseLatencySeconds: 30,
      moduleId: "case",
      signals: { ...cleanSignals, pasteCount: 4, largestPasteChars: 90, pasteBurstCount: 4 },
    },
  ]);
  assert.ok(summary.anomalyFlags.includes("large_paste_burst"));
});

test("the same large paste outside code-capable modules never flags", () => {
  const summary = accumulateAll([
    {
      responseLatencySeconds: 30,
      moduleId: "motivation",
      signals: { ...cleanSignals, pasteCount: 1, largestPasteChars: 5000, pasteBurstCount: 1 },
    },
  ]);
  assert.ok(!summary.anomalyFlags.includes("large_paste_burst"));
});

// ---------------------------------------------------------------------------
// Validation, persistence round-trip, reviewer wording
// ---------------------------------------------------------------------------

test("the new paste-shape fields are validated and clamped server-side", () => {
  const valid = parseTurnIntegritySignals({
    ...cleanSignals,
    pasteCount: 1,
    largestPasteChars: 999999999,
    pasteBurstCount: 5000,
  });
  assert.equal(valid.largestPasteChars, 200000, "chars clamped");
  assert.equal(valid.pasteBurstCount, 1000, "burst clamped to MAX_SIGNAL_COUNT");

  // Old clients that do not send the new fields stay valid.
  const legacy = parseTurnIntegritySignals({ ...cleanSignals, pasteCount: 0 });
  assert.ok(legacy);
  assert.equal(legacy.largestPasteChars, undefined);

  // Malformed values invalidate the whole report; unknown keys still rejected.
  assert.equal(
    parseTurnIntegritySignals({ ...cleanSignals, pasteCount: 0, largestPasteChars: -5 }),
    undefined,
  );
  assert.equal(
    parseTurnIntegritySignals({ ...cleanSignals, pasteCount: 0, keystrokes: [1, 2] }),
    undefined,
  );
});

test("summaries persisted before v2 read back with safe defaults", () => {
  const legacy = {
    version: "integrity-summary-v1",
    turnsObserved: 3,
    tabHiddenCount: 1,
    windowBlurCount: 0,
    pasteCount: 0,
    audioGapCount: 0,
    maxAudioGapSeconds: 0,
    maxResponseLatencySeconds: 90,
    anomalyFlags: ["frequent_tab_switching"],
  };
  const summary = readModuleIntegritySummary(legacy);
  assert.deepEqual(summary.responseOnsetsSeconds, []);
  assert.equal(summary.lowDisfluencyStreak, 0);
  assert.equal(summary.largestPasteChars, 0);

  // v2 summaries round-trip including the new flags.
  const v2 = accumulateAll(
    [12, 12, 12, 12].map((latency) => ({ responseLatencySeconds: latency })),
  );
  const reread = readModuleIntegritySummary(JSON.parse(JSON.stringify(v2)));
  assert.deepEqual(reread.anomalyFlags, v2.anomalyFlags);
  assert.deepEqual(reread.responseOnsetsSeconds, v2.responseOnsetsSeconds);
});

test("reviewer highlights stay neutral and factual for the v2 flags", () => {
  const summary = accumulateAll([
    { responseLatencySeconds: 12, answerText: READ_PERFECT, interviewMode: "voice" },
    { responseLatencySeconds: 12, answerText: READ_PERFECT, interviewMode: "voice" },
    {
      responseLatencySeconds: 12,
      answerText: READ_PERFECT,
      interviewMode: "voice",
      moduleId: "work_sample",
      signals: { ...cleanSignals, pasteCount: 1, largestPasteChars: 2000, pasteBurstCount: 1 },
    },
    { responseLatencySeconds: 12, answerText: READ_PERFECT, interviewMode: "voice" },
  ]);

  const highlights = integritySummaryHighlights(summary).join(" | ");
  assert.match(highlights, /uniform response onset across \d+ turns/);
  assert.match(highlights, /\d+ consecutive answers with near-zero written disfluency/);
  // Factual descriptions only — never accusatory wording.
  assert.doesNotMatch(highlights, /cheat|fraud|suspicious|dishonest/i);
});
