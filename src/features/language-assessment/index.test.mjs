import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const assessmentPath = path.join(rootDir, "src", "features", "language-assessment", "index.ts");

function loadAssessment() {
  const source = readFileSync(assessmentPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: assessmentPath,
  }).outputText;
  const cjsModule = { exports: {} };

  vm.runInNewContext(
    output,
    {
      exports: cjsModule.exports,
      module: cjsModule,
      require: (specifier) => {
        if (specifier === "./language-test-plan") {
          return {};
        }
        throw new Error(`Unexpected require: ${specifier}`);
      },
    },
    {
      filename: assessmentPath,
    },
  );

  return cjsModule.exports;
}

test("role language assessment produces review recommendations, not automated eligibility", () => {
  const source = readFileSync(assessmentPath, "utf8");
  const { assessRoleLanguageRequirements } = loadAssessment();

  assert.doesNotMatch(source, /not_currently_eligible_for_role/);
  assert.doesNotMatch(source, /eligibility_recommendation/);

  const result = assessRoleLanguageRequirements({
    candidate_id: "candidate-1",
    role_id: "role-1",
    assessments: [],
    required_languages: [{ language: "English", minimum_level: "C1", role_essential: true }],
    generated_at: "2026-05-27T09:00:00.000Z",
    audit_event_id: "audit-1",
  });

  assert.equal(result.review_recommendation, "role_language_gap_needs_human_review");
  assert.equal(result.human_review_required, true);
  assert.equal(Object.hasOwn(result, "eligibility_recommendation"), false);
});

test("scored CEFR language result still requires human calibration for role requirements", () => {
  const { assessLanguage } = loadAssessment();

  const result = assessLanguage({
    candidate_id: "candidate-2",
    language: "English",
    declared_level: "B2",
    transcript_quality: 95,
    role_requirement: { language: "English", minimum_level: "B2", role_essential: true },
    dimension_signals: [
      "comprehension",
      "clarity",
      "structure",
      "vocabulary",
      "role_communication",
      "grammar",
      "response_quality",
    ].map((dimension) => ({
      dimension,
      score: 80,
      confidence: 90,
      evidence: [{ source: "language_test", snippet: `${dimension} evidence`, confidence: 90 }],
    })),
    generated_at: "2026-05-27T09:00:00.000Z",
    audit_event_id: "audit-2",
  });

  assert.equal(result.role_requirement_fit.status, "meets");
  assert.equal(result.human_review_required, true);
  assert.ok(result.review_reasons.includes("cefr_level_requires_human_calibration"));
});
