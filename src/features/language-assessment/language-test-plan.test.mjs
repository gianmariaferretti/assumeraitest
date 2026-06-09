import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const plannerPath = path.join(
  rootDir,
  "src",
  "features",
  "language-assessment",
  "language-test-plan.ts",
);

const expectedComponents = [
  "grammar_vocabulary",
  "reading_comprehension",
  "spoken_production",
];

const expectedDisallowedSignals = [
  "accent",
  "native_status",
  "nationality",
  "voice_tone",
  "emotion",
  "personality",
  "biometric",
];

function loadPlanner() {
  const source = readFileSync(plannerPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: plannerPath,
  }).outputText;
  const cjsModule = { exports: {} };

  vm.runInNewContext(
    output,
    {
      exports: cjsModule.exports,
      module: cjsModule,
    },
    {
      filename: plannerPath,
    },
  );

  return cjsModule.exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("language test planner creates calibrated plans for declared levels and role requirements", () => {
  const { createLanguageTestPlan } = loadPlanner();

  const result = createLanguageTestPlan({
    candidate_id: "candidate-1",
    languages: [
      { language: "English", declared_level: "B2", evidence: ["resume"] },
      { language: "Italian", declared_level: "A2" },
    ],
    required_languages: [
      { language: "English", minimum_level: "C1", role_essential: true },
    ],
    generated_at: "2026-05-27T09:00:00.000Z",
    audit_event_id: "audit-1",
  });

  assert.equal(result.candidate_id, "candidate-1");
  assert.equal(result.generated_at, "2026-05-27T09:00:00.000Z");
  assert.equal(result.audit_event_id, "audit-1");
  assert.equal(result.plans.length, 2);
  assert.equal(result.human_review_required, true);

  const englishPlan = result.plans.find((plan) => plan.language === "English");
  assert.ok(englishPlan);
  assert.equal(englishPlan.declared_level, "B2");
  assert.equal(englishPlan.target_level, "C1");
  assert.deepEqual(plain(englishPlan.reason), ["declared_by_candidate", "role_required"]);
  assert.deepEqual(plain(englishPlan.components), expectedComponents);
  assert.deepEqual(plain(englishPlan.disallowed_signals), expectedDisallowedSignals);
  assert.equal(englishPlan.prompt_guidance.level_band, "C1_C2");
  assert.match(
    englishPlan.prompt_guidance.guidance,
    /complex stakeholder\/abstract work discussion/,
  );
  assert.equal(englishPlan.human_review_required, true);
  assert.deepEqual(plain(englishPlan.review_reasons), [
    {
      language: "English",
      reason: "role_language_declared_below_minimum",
      declared_level: "B2",
      minimum_level: "C1",
    },
  ]);
  assert.equal(Object.hasOwn(englishPlan, "score"), false);
  assert.equal(Object.hasOwn(englishPlan, "eligibility_decision"), false);

  const italianPlan = result.plans.find((plan) => plan.language === "Italian");
  assert.ok(italianPlan);
  assert.equal(italianPlan.target_level, "A2");
  assert.deepEqual(plain(italianPlan.reason), ["declared_by_candidate"]);
  assert.equal(italianPlan.prompt_guidance.level_band, "A1_A2");
  assert.match(italianPlan.prompt_guidance.guidance, /simple daily\/work phrases/);
  assert.equal(italianPlan.human_review_required, false);
});

test("language test planner turns unknown levels and missing required languages into review reasons", () => {
  const { createLanguageTestPlan } = loadPlanner();

  const result = createLanguageTestPlan({
    candidate_id: "candidate-2",
    languages: [
      { language: "French", declared_level: "unknown" },
      { language: "German" },
    ],
    required_languages: [{ language: "Spanish", minimum_level: "B1" }],
    generated_at: "2026-05-27T09:15:00.000Z",
    audit_event_id: "audit-2",
  });

  assert.deepEqual(plain(result.plans), []);
  assert.equal(result.human_review_required, true);
  assert.deepEqual(plain(result.review_reasons), [
    {
      language: "French",
      reason: "missing_declared_language_level",
      declared_level: "unknown",
    },
    {
      language: "German",
      reason: "missing_declared_language_level",
      declared_level: "unknown",
    },
    {
      language: "Spanish",
      reason: "required_language_missing",
      minimum_level: "B1",
    },
  ]);
  assert.equal(Object.hasOwn(result, "score"), false);
  assert.equal(Object.hasOwn(result, "eligibility_decision"), false);
});

test("language test planner stays pure and excludes protected language signals", () => {
  const source = readFileSync(plannerPath, "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(XMLHttpRequest|openai|anthropic|claude|deepgram)\b/i);
  assert.doesNotMatch(source, /\beligibility/i);
  assert.match(source, /accent/);
  assert.match(source, /native_status/);
});
