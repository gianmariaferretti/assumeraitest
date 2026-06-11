import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const {
  clampDriverStrength,
  DRIVER_PROFILE_VERSION,
  FLAG_ONLY_NEVER_COMPARED,
  JOB_DRIVERS,
  LIFESTYLE_DRIVER,
  readDriverProfile,
  readRoleDriverContext,
} = loadFromRepoRoot("src/features/scoring/job-drivers/types.ts");
const { evaluateJobDrivers, mergeDriverProfiles } = loadFromRepoRoot(
  "src/features/scoring/job-drivers/evaluator.ts",
);
const { readDriverContextFromFormData } = loadFromRepoRoot(
  "src/features/scoring/job-drivers/form.ts",
);
const { buildDriverInsights, DRIVER_FLAG_GAP } = loadFromRepoRoot(
  "src/features/scoring/job-drivers/insights.ts",
);

function anthropicResponse(signals) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify({ signals }) }],
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
  };
}

// ---------------------------------------------------------------------------
// Taxonomy + hard-coded anti-proxy guardrail
// ---------------------------------------------------------------------------

test("the Schein-inspired taxonomy has eight drivers and lifestyle is hard-coded never-compared", () => {
  assert.deepEqual(JOB_DRIVERS, [
    "technical_mastery",
    "leadership_track",
    "autonomy_independence",
    "security_stability",
    "entrepreneurial_creation",
    "service_impact",
    "pure_challenge",
    "lifestyle_balance",
  ]);
  assert.equal(LIFESTYLE_DRIVER, "lifestyle_balance");
  assert.ok(FLAG_ONLY_NEVER_COMPARED.includes("lifestyle_balance"));
  assert.ok(Object.isFrozen(FLAG_ONLY_NEVER_COMPARED), "the guardrail is a frozen constant");
});

// ---------------------------------------------------------------------------
// Descriptive-only evaluator: revealed preference, no judgment, anti-proxy
// ---------------------------------------------------------------------------

test("the drivers prompt is descriptive only: revealed preference, no correct set, anti-proxy", async () => {
  let systemPrompt;
  const profile = await evaluateJobDrivers({
    questionId: "canonical_drivers_star",
    questionText: "fork in the path",
    answerText: "I turned down a manager track to stay hands-on with the hardest problems.",
    options: {
      apiKey: "test-key",
      recordUsage: () => {},
      fetchImpl: async (_url, init) => {
        systemPrompt = JSON.parse(init.body).system;
        return anthropicResponse([
          { driver: "pure_challenge", strength: 80, confidence: 0.8, evidence: ["hardest problems"] },
          { driver: "not_a_driver", strength: 50 },
        ]);
      },
    },
  });

  assert.match(systemPrompt, /DO NOT judge whether the drivers are good/);
  assert.match(systemPrompt, /There is no correct set of drivers/);
  assert.match(systemPrompt, /revealed preference/);
  assert.match(systemPrompt, /flag-only by design/);
  assert.match(systemPrompt, /Never infer any driver from protected attributes/);
  assert.match(
    systemPrompt,
    /lifestyle_balance, which must come ONLY from what the candidate explicitly says/,
  );

  assert.equal(profile.source, "anthropic");
  assert.equal(profile.version, DRIVER_PROFILE_VERSION);
  assert.deepEqual(profile.signals, [
    { driver: "pure_challenge", strength: 80, confidence: 0.8, evidence: ["hardest problems"] },
  ]);
});

test("without an API key the deterministic fallback extracts only explicit signals", async () => {
  const profile = await evaluateJobDrivers({
    questionId: "q",
    questionText: "trade-off",
    answerText: "I value autonomy above everything. I want to decide my own way of working.",
    options: { apiKey: null, recordUsage: () => {} },
  });

  assert.equal(profile.source, "deterministic_fallback");
  const drivers = profile.signals.map((signal) => signal.driver);
  assert.ok(drivers.includes("autonomy_independence"));
  for (const signal of profile.signals) {
    assert.equal(signal.strength, 60, "coarse fallback strength");
    assert.equal(signal.confidence, 0.3, "low fallback confidence");
    assert.ok(signal.evidence[0].length > 0, "fallback cites a verbatim sentence");
  }

  const silent = await evaluateJobDrivers({
    questionId: "q",
    questionText: "trade-off",
    answerText: "The weather was nice that day.",
    options: { apiKey: null, recordUsage: () => {} },
  });
  assert.deepEqual(silent.signals, [], "no explicit evidence -> no invented drivers");
});

test("merging driver profiles keeps the higher-confidence signal per driver", () => {
  const older = {
    version: DRIVER_PROFILE_VERSION,
    signals: [
      { driver: "security_stability", strength: 70, confidence: 0.9, evidence: ["kept"] },
      { driver: "pure_challenge", strength: 40, confidence: 0.3, evidence: ["old"] },
    ],
    generatedAt: "2026-06-01T00:00:00.000Z",
    source: "anthropic",
  };
  const newer = {
    version: DRIVER_PROFILE_VERSION,
    signals: [
      { driver: "security_stability", strength: 20, confidence: 0.4, evidence: ["weaker"] },
      { driver: "pure_challenge", strength: 85, confidence: 0.8, evidence: ["new"] },
    ],
    generatedAt: "2026-06-02T00:00:00.000Z",
    source: "anthropic",
  };

  const merged = mergeDriverProfiles(older, newer);
  const byDriver = new Map(merged.signals.map((signal) => [signal.driver, signal]));
  assert.equal(byDriver.get("security_stability").strength, 70, "older higher-confidence wins");
  assert.equal(byDriver.get("pure_challenge").strength, 85, "newer higher-confidence wins");
  assert.equal(mergeDriverProfiles(undefined, newer), newer);
});

// ---------------------------------------------------------------------------
// Defensive parsing (jsonb round-trips, role-wizard form)
// ---------------------------------------------------------------------------

test("readDriverProfile rejects foreign versions and clamps signal fields", () => {
  assert.equal(readDriverProfile({ version: "other", signals: [] }), undefined);

  const profile = readDriverProfile({
    version: DRIVER_PROFILE_VERSION,
    signals: [
      { driver: "technical_mastery", strength: 250, confidence: 9, evidence: ["snippet", 5] },
      { driver: "bogus", strength: 10 },
    ],
    generatedAt: "2026-06-11T00:00:00.000Z",
    source: "anthropic",
  });
  assert.deepEqual(profile.signals, [
    { driver: "technical_mastery", strength: 100, confidence: 1, evidence: ["snippet"] },
  ]);
  assert.equal(clampDriverStrength(-5), 0);
});

test("readRoleDriverContext requires a concrete note per entry", () => {
  assert.equal(readRoleDriverContext(null), undefined);
  assert.equal(
    readRoleDriverContext({ entries: [{ driver: "pure_challenge", level: 50 }] }),
    undefined,
    "an entry without a note does not count",
  );

  const context = readRoleDriverContext({
    entries: [
      { driver: "autonomy_independence", level: 130, note: "  you own your roadmap  " },
      { driver: "nope", level: 10, note: "ignored" },
    ],
  });
  assert.equal(context.version, "driver-context-v1");
  assert.deepEqual(context.entries, [
    { driver: "autonomy_independence", level: 100, note: "you own your roadmap" },
  ]);
});

test("the role wizard context requires level AND note per driver", () => {
  const formData = new FormData();
  formData.set("driver_context.security_stability.level", "80");
  formData.set("driver_context.security_stability.note", "permanent contracts, steady scope");
  formData.set("driver_context.pure_challenge.level", "90"); // no note -> dropped
  formData.set("driver_context.service_impact.note", "n/a"); // no level -> dropped

  const context = readDriverContextFromFormData(formData);
  assert.deepEqual(context, {
    version: "driver-context-v1",
    entries: [
      {
        driver: "security_stability",
        level: 80,
        note: "permanent contracts, steady scope",
      },
    ],
  });
  assert.equal(readDriverContextFromFormData(new FormData()), undefined);
});

// ---------------------------------------------------------------------------
// Flag-only insights + realistic job preview (the lifestyle guardrail bites)
// ---------------------------------------------------------------------------

const sampleProfile = {
  version: DRIVER_PROFILE_VERSION,
  signals: [
    { driver: "autonomy_independence", strength: 90, confidence: 0.8, evidence: ["quote"] },
    { driver: "security_stability", strength: 75, confidence: 0.7, evidence: ["quote"] },
    { driver: "lifestyle_balance", strength: 95, confidence: 0.9, evidence: ["quote"] },
  ],
  generatedAt: "2026-06-11T00:00:00.000Z",
  source: "anthropic",
};

const sampleContext = {
  version: "driver-context-v1",
  entries: [
    { driver: "autonomy_independence", level: 30, note: "tight process, weekly sign-offs" },
    { driver: "security_stability", level: 70, note: "stable long-term funding" },
    { driver: "lifestyle_balance", level: 10, note: "frequent travel and on-call weeks" },
  ],
};

test("driver insights are flag-only: realistic preview + discussion flags, no score anywhere", () => {
  const insights = buildDriverInsights({ profile: sampleProfile, context: sampleContext });

  assert.equal(insights.flag_only, true);
  assert.equal(insights.version, "driver-insights-v1");
  assert.ok(!("score" in insights), "insights carry no score field");

  // Every declared context entry reaches the candidate as honest preview.
  assert.equal(insights.realistic_preview.length, 3);
  assert.match(insights.realistic_preview[0], /realistic preview \(autonomy_independence\)/);
  assert.match(insights.realistic_preview[0], /"tight process, weekly sign-offs"/);
  assert.match(insights.realistic_preview[2], /frequent travel and on-call weeks/);

  // |90-30| = 60 >= gap -> flag; |75-70| = 5 -> no flag.
  assert.equal(DRIVER_FLAG_GAP, 40);
  assert.equal(insights.flags.length, 1);
  assert.match(insights.flags[0], /driver flag \(autonomy_independence\)/);
  assert.match(insights.flags[0], /flag only, never a score input/);
});

test("the lifestyle driver is NEVER compared, even with a maximal gap on both sides", () => {
  // Candidate 95 vs role 10 would be the widest gap of all — and must
  // still produce no flag and never expose the candidate-side signal.
  const insights = buildDriverInsights({ profile: sampleProfile, context: sampleContext });

  assert.ok(
    !insights.flags.some((flag) => flag.includes("lifestyle")),
    "no lifestyle comparison flag",
  );
  for (const line of [...insights.flags, ...insights.realistic_preview]) {
    assert.ok(!line.includes("95/100"), "the candidate-side lifestyle signal never surfaces");
  }
  // The role-side reality still reaches the candidate as preview.
  assert.ok(
    insights.realistic_preview.some((line) => line.includes("lifestyle_balance")),
    "role-side lifestyle preview present",
  );
});

test("insights are undefined without a declared context, and flags need a candidate signal", () => {
  assert.equal(buildDriverInsights({ profile: sampleProfile }), undefined);
  assert.equal(buildDriverInsights({}), undefined);

  const previewOnly = buildDriverInsights({ context: sampleContext });
  assert.equal(previewOnly.realistic_preview.length, 3, "preview works without a profile");
  assert.deepEqual(previewOnly.flags, [], "no signals -> no flags");
});
