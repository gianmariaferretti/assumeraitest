import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const workspaceSourcePath = path.join(
  rootDir,
  "src",
  "features",
  "company-workspace",
  "company-workspace.ts",
);
const contextSourcePath = path.join(
  rootDir,
  "src",
  "features",
  "company-workspace",
  "company-route-context.ts",
);

function readWorkspaceSource() {
  assert.ok(existsSync(workspaceSourcePath), "expected company workspace domain helper");

  return readFileSync(workspaceSourcePath, "utf8");
}

test("company role intake is structured and rejects protected requirement signals", () => {
  const source = readWorkspaceSource();

  assert.match(source, /export function validateCompanyRoleIntake/);
  assert.match(source, /daily_work_reality/);
  assert.match(source, /client_facing_percentage/);
  assert.match(source, /meeting_load/);
  assert.match(source, /delivery_pace/);
  assert.match(source, /findProtectedRequirementSignals/);
  assert.match(source, /company_role\.protected_attribute/);
  assert.doesNotMatch(source, /native\s+speaker/i);
  assert.doesNotMatch(source, /personality\s+fit/i);
});

test("company match decisions enforce advance hold decline rules", () => {
  const source = readWorkspaceSource();

  assert.match(source, /export function recordCompanyMatchDecision/);
  assert.match(source, /CompanyMatchDecisionAction\s*=\s*"advance"\s*\|\s*"hold"\s*\|\s*"decline"/);
  assert.match(source, /company_advanced/);
  assert.match(source, /company_hold/);
  assert.match(source, /company_declined/);
  assert.match(source, /hold[\s\S]*followUpAt/);
  assert.match(source, /advance[\s\S]*nextStep/);
  assert.match(source, /decline[\s\S]*reason/);
  assert.match(source, /contactVisibility:\s*"visible_after_advance"/);
});

test("company dashboard helpers expose only consent-approved evidence and candidate feedback", () => {
  const source = readWorkspaceSource();

  assert.match(source, /export async function materializeCandidateMatchesForCandidate/);
  assert.match(source, /export async function readCompanyDashboard/);
  assert.match(source, /export async function readCandidateMatchFeedback/);
  assert.match(source, /raw_cv_included:\s*false/);
  assert.match(source, /raw_interview_media_included:\s*false/);
  assert.match(source, /transcriptExcerpt/);
  assert.match(source, /reviewDueAt/);
});

test("company route context authorizes through membership rows", () => {
  assert.ok(existsSync(contextSourcePath), "expected company route context helper");
  const source = readFileSync(contextSourcePath, "utf8");

  assert.match(source, /export async function resolveCompanyRouteContext/);
  assert.match(source, /company_memberships/);
  assert.match(source, /getUserAccountRole\(user\)\s*!==\s*"company"/);
  assert.doesNotMatch(source, /user_metadata[\s\S]*company_id/);
});
