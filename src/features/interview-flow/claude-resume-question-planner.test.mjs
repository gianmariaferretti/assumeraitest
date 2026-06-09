import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const plannerSource = readFileSync(
  path.join(rootDir, "src", "features", "interview-flow", "claude-resume-question-planner.ts"),
  "utf8"
);

test("Claude system prompt enforces structured behavioral interview rules", () => {
  assert.match(plannerSource, /structured behavioral interview/i);
  assert.match(plannerSource, /not generic HR prompts/i);
  assert.match(plannerSource, /SBI/i);
  assert.match(plannerSource, /specific past behavior/i);
  assert.match(plannerSource, /one competency per question/i);
  assert.match(plannerSource, /one question at a time/i);
  assert.match(plannerSource, /Situation, Task, Action, Result/i);
  assert.match(plannerSource, /targeted follow-up/i);
  assert.match(plannerSource, /missing STAR elements/i);
  assert.match(plannerSource, /before moving on/i);
  assert.match(plannerSource, /BARS/i);
  assert.match(plannerSource, /behavioral anchors/i);
  assert.match(plannerSource, /no impressionistic scoring/i);
  assert.match(plannerSource, /opening, exploration, challenge, and closing/i);
  assert.match(plannerSource, /Do not place challenge questions in opening/i);
  assert.match(plannerSource, /Do not use hypotheticals for core behavioral questions/i);
});

test("Claude payload separates CEFR language assessment from delivery language", () => {
  assert.match(plannerSource, /language_assessment_plan/);
  assert.match(plannerSource, /buildLanguageAssessmentPlan/);
  assert.match(plannerSource, /candidate_resume\.languages/);
  assert.match(plannerSource, /role\.required_languages/);
  assert.match(plannerSource, /CEFR/);
  assert.match(plannerSource, /delivery context only/i);
  assert.match(plannerSource, /Do not use interview_language as CEFR evidence/i);
});

test("Claude output contract keeps hiring outcomes and final scores out of scope", () => {
  const outputContractStart = plannerSource.indexOf("output_contract:");
  const roleStart = plannerSource.indexOf("role:", outputContractStart);
  const outputContractSource = plannerSource.slice(outputContractStart, roleStart);

  assert.ok(outputContractStart > -1, "output_contract block should exist");
  assert.ok(roleStart > outputContractStart, "role block should follow output_contract block");
  assert.match(plannerSource, /Do not score final hiring outcomes/i);
  assert.doesNotMatch(outputContractSource, /final[_\s-]?(score|rating)/i);
  assert.doesNotMatch(outputContractSource, /hiring[_\s-]?outcome/i);
  assert.doesNotMatch(outputContractSource, /accept|reject|recommend/i);
});
