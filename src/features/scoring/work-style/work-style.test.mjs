import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const {
  clampWorkStylePosition,
  readWorkStyleKey,
  readWorkStyleProfile,
  WORK_STYLE_DIMENSIONS,
  WORK_STYLE_PROFILE_VERSION,
} = loadFromRepoRoot("src/features/scoring/work-style/types.ts");
const { evaluateWorkStyle, mergeWorkStyleProfiles, WORK_STYLE_ENSEMBLE_SIZE } =
  loadFromRepoRoot("src/features/scoring/work-style/evaluator.ts");
const { readWorkStyleKeyFromFormData } = loadFromRepoRoot(
  "src/features/scoring/work-style/form.ts",
);
const { getValuesAlignmentFit } = loadFromRepoRoot(
  "src/features/matching/dimensions/values-alignment-fit.ts",
);

function anthropicResponse(classifications) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify({ classifications }) }],
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
  };
}

// ---------------------------------------------------------------------------
// Descriptive-only evaluator: the prompt forbids normative judgment
// ---------------------------------------------------------------------------

test("the work-style prompt is descriptive only — no right answer, no quality score", async () => {
  const systemPrompts = [];
  const profile = await evaluateWorkStyle({
    questionId: "canonical_workstyle_autonomy_speed",
    questionText: "dilemma",
    answerText: "I shipped the fix and told my manager afterwards.",
    options: {
      apiKey: "test-key",
      recordUsage: () => {},
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(init.body);
        systemPrompts.push(body.system);
        return anthropicResponse([
          { dimension: "autonomy_escalation", position: -60, confidence: 0.8, evidence: ["I shipped the fix"] },
        ]);
      },
    },
  });

  assert.equal(systemPrompts.length, WORK_STYLE_ENSEMBLE_SIZE, "one prompt per rater");
  for (const prompt of systemPrompts) {
    assert.match(prompt, /DO NOT assess whether the behavior is right/);
    assert.match(prompt, /classify the STYLE only/);
    assert.match(prompt, /There is no correct answer/);
    assert.match(prompt, /Neither pole is better/);
    assert.match(prompt, /Never infer or use protected attributes/);
  }
  // Prompt jitter: the raters do not all see the identical prompt.
  assert.ok(new Set(systemPrompts).size > 1, "ensemble prompts are jittered");

  assert.equal(profile.source, "anthropic");
  assert.equal(profile.version, WORK_STYLE_PROFILE_VERSION);
  assert.deepEqual(
    profile.classifications.map((c) => c.dimension),
    ["autonomy_escalation"],
  );
});

test("ensemble merge: median position, majority filter, disagreement shrinks confidence", async () => {
  // Rater payloads differ per call: positions 20/40/60 on one dimension and a
  // single-rater sighting of another, which the majority filter must drop.
  const perRater = [
    [
      { dimension: "speed_thoroughness", position: 20, confidence: 0.8, evidence: ["a"] },
      { dimension: "risk_caution", position: 90, confidence: 0.9, evidence: ["once"] },
    ],
    [{ dimension: "speed_thoroughness", position: 60, confidence: 0.8, evidence: ["b"] }],
    [{ dimension: "speed_thoroughness", position: 40, confidence: 0.8, evidence: ["a"] }],
  ];
  let call = 0;
  const profile = await evaluateWorkStyle({
    questionId: "q",
    questionText: "dilemma",
    answerText: "answer",
    options: {
      apiKey: "test-key",
      recordUsage: () => {},
      fetchImpl: async () => anthropicResponse(perRater[call++]),
    },
  });

  assert.equal(profile.classifications.length, 1, "minority dimension dropped");
  const merged = profile.classifications[0];
  assert.equal(merged.dimension, "speed_thoroughness");
  assert.equal(merged.position, 40, "median of 20/40/60");
  // spread 40 -> confidence = 0.8 * (1 - 40/400) = 0.72
  assert.equal(merged.confidence, 0.72);
  assert.deepEqual(merged.evidence, ["a", "b"], "evidence deduped across raters");
});

test("without an API key the deterministic fallback classifies descriptively and stays silent on ambiguity", async () => {
  const profile = await evaluateWorkStyle({
    questionId: "q",
    questionText: "dilemma",
    answerText:
      "I decided on my own to fix it right away. I also double-check everything before shipping.",
    options: { apiKey: null, recordUsage: () => {} },
  });

  assert.equal(profile.source, "deterministic_fallback");
  const byDimension = new Map(profile.classifications.map((c) => [c.dimension, c]));

  // "decided on my own" matches only the autonomy pole -> -40 at low confidence.
  const autonomy = byDimension.get("autonomy_escalation");
  assert.equal(autonomy.position, -40);
  assert.equal(autonomy.confidence, 0.3);
  assert.ok(autonomy.evidence[0].length > 0, "fallback cites a verbatim sentence");

  // "right away" (fast) AND "double-check" (thorough) both match -> silent,
  // the fallback never invents a lean.
  assert.equal(byDimension.has("speed_thoroughness"), false);
});

test("merging profiles keeps the higher-confidence classification per dimension", () => {
  const older = {
    version: WORK_STYLE_PROFILE_VERSION,
    classifications: [
      { dimension: "risk_caution", position: 50, confidence: 0.9, evidence: ["kept"] },
      { dimension: "autonomy_escalation", position: -40, confidence: 0.3, evidence: ["old"] },
    ],
    generatedAt: "2026-06-01T00:00:00.000Z",
    source: "anthropic",
  };
  const newer = {
    version: WORK_STYLE_PROFILE_VERSION,
    classifications: [
      { dimension: "risk_caution", position: -10, confidence: 0.4, evidence: ["weaker"] },
      { dimension: "autonomy_escalation", position: 20, confidence: 0.8, evidence: ["new"] },
    ],
    generatedAt: "2026-06-02T00:00:00.000Z",
    source: "anthropic",
  };

  const merged = mergeWorkStyleProfiles(older, newer);
  const byDimension = new Map(merged.classifications.map((c) => [c.dimension, c]));
  assert.equal(byDimension.get("risk_caution").position, 50, "older higher-confidence wins");
  assert.equal(byDimension.get("autonomy_escalation").position, 20, "newer higher-confidence wins");
  assert.equal(merged.generatedAt, newer.generatedAt);
  assert.equal(mergeWorkStyleProfiles(undefined, newer), newer);
});

// ---------------------------------------------------------------------------
// Defensive parsing (jsonb round-trips, role-wizard form)
// ---------------------------------------------------------------------------

test("readWorkStyleKey is defensive: clamps, trims, requires statements", () => {
  assert.equal(readWorkStyleKey(null), undefined);
  assert.equal(readWorkStyleKey({ entries: "nope" }), undefined);
  assert.equal(
    readWorkStyleKey({ entries: [{ dimension: "speed_thoroughness", position: 10 }] }),
    undefined,
    "an entry without a statement does not count",
  );

  const key = readWorkStyleKey({
    entries: [
      { dimension: "speed_thoroughness", position: 250, statement: "  ship and document  " },
      { dimension: "not_a_dimension", position: 0, statement: "ignored" },
    ],
  });
  assert.equal(key.version, "work-style-key-v1");
  assert.deepEqual(key.entries, [
    { dimension: "speed_thoroughness", position: 100, statement: "ship and document" },
  ]);
});

test("readWorkStyleProfile rejects foreign versions and clamps classification fields", () => {
  assert.equal(readWorkStyleProfile({ version: "other", classifications: [] }), undefined);

  const profile = readWorkStyleProfile({
    version: WORK_STYLE_PROFILE_VERSION,
    classifications: [
      { dimension: "risk_caution", position: -300, confidence: 9, evidence: ["snippet", 5] },
      { dimension: "bogus", position: 0 },
    ],
    generatedAt: "2026-06-09T00:00:00.000Z",
    source: "anthropic",
  });
  assert.deepEqual(profile.classifications, [
    { dimension: "risk_caution", position: -100, confidence: 1, evidence: ["snippet"] },
  ]);
  assert.equal(profile.source, "anthropic");
  assert.equal(clampWorkStylePosition(-300), -100);
});

test("the role wizard key requires position AND statement per dimension", () => {
  const formData = new FormData();
  formData.set("work_style.autonomy_escalation.position", "-50");
  formData.set("work_style.autonomy_escalation.statement", "here, you'd decide and inform");
  formData.set("work_style.speed_thoroughness.position", "30"); // no statement -> dropped
  formData.set("work_style.risk_caution.statement", "careful"); // no position -> dropped

  const key = readWorkStyleKeyFromFormData(formData);
  assert.deepEqual(key, {
    version: "work-style-key-v1",
    entries: [
      {
        dimension: "autonomy_escalation",
        position: -50,
        statement: "here, you'd decide and inform",
      },
    ],
  });
  assert.equal(readWorkStyleKeyFromFormData(new FormData()), undefined);
});

// ---------------------------------------------------------------------------
// Values-alignment matching dimension (judged per-company, after the interview)
// ---------------------------------------------------------------------------

const sampleProfile = {
  version: WORK_STYLE_PROFILE_VERSION,
  classifications: [
    { dimension: "autonomy_escalation", position: 30, confidence: 0.8, evidence: ["quote"] },
  ],
  generatedAt: "2026-06-09T00:00:00.000Z",
  source: "anthropic",
};

const sampleKey = {
  version: "work-style-key-v1",
  entries: [
    { dimension: "autonomy_escalation", position: -10, statement: "here, you'd decide and inform" },
    { dimension: "speed_thoroughness", position: 60, statement: "we verify before shipping" },
  ],
};

test("values alignment stays neutral when either side is missing — never a penalty", () => {
  const noKey = getValuesAlignmentFit({ role: { calibration: {} }, workStyleProfile: sampleProfile });
  assert.equal(noKey.score, 50);
  assert.match(noKey.missing_data[0], /has not declared work-style expectations/);

  const noProfile = getValuesAlignmentFit({
    role: { calibration: { work_style_key: sampleKey } },
  });
  assert.equal(noProfile.score, 50);
  assert.match(noProfile.missing_data[0], /No work-style profile is available/);
});

test("values alignment scores distance from the company's own key with per-dimension reasoning", () => {
  const draft = getValuesAlignmentFit({
    role: { calibration: { work_style_key: sampleKey } },
    workStyleProfile: sampleProfile,
  });

  // |30 - (-10)| = 40 -> alignment = 100 - 40/2 = 80, the only scored dimension.
  assert.equal(draft.score, 80);
  // confidence = round(40 + 0.8 * 50) = 80
  assert.equal(draft.confidence, 80);
  assert.equal(
    draft.evidence[0],
    'values alignment (autonomy_escalation): candidate at 30, role declared -10 ("here, you\'d decide and inform") — 80/100.',
  );
  // The dimension the interview did not evidence routes to the human interview.
  assert.equal(draft.missing_data.length, 1);
  assert.match(
    draft.missing_data[0],
    /speed_thoroughness.*no interview evidence.*explore in the human interview/,
  );
});

test("the bipolar taxonomy is the five spec'd dimensions", () => {
  assert.deepEqual(WORK_STYLE_DIMENSIONS, [
    "autonomy_escalation",
    "speed_thoroughness",
    "individual_collaboration",
    "risk_caution",
    "structure_improvisation",
  ]);
});
