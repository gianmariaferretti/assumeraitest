import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
const migrationsDir = path.join(rootDir, "supabase", "migrations");

function readWorkspaceSource() {
  assert.ok(existsSync(workspaceSourcePath), "expected company workspace domain helper");

  return readFileSync(workspaceSourcePath, "utf8");
}

function readCompanyMigrations() {
  return readdirSync(migrationsDir)
    .filter((name) => name.includes("company") && name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");
}

test("company onboarding intake validates real workspace fields without auth metadata", () => {
  const source = readWorkspaceSource();

  assert.match(source, /export function validateCompanyOnboardingIntake/);
  assert.match(source, /company_onboarding\.company_name_required/);
  assert.match(source, /company_onboarding\.website_required/);
  assert.match(source, /company_onboarding\.hiring_locations_required/);
  assert.match(source, /company_onboarding\.team_size_required/);
  assert.match(source, /company_onboarding\.primary_contact_required/);
  assert.match(source, /company_onboarding\.invalid_contact_email/);
  assert.doesNotMatch(source, /user_metadata[\s\S]{0,120}company/i);
});

test("company workspace profile helper returns onboarding completion metadata and audit shape", () => {
  const source = readWorkspaceSource();

  assert.match(source, /export async function updateCompanyWorkspaceProfile/);
  assert.match(source, /export async function readCompanyWorkspaceProfile/);
  assert.match(source, /onboardingCompleted/);
  assert.match(source, /onboarding_completed_at/);
  assert.match(source, /company_workspace\.profile_updated/);
  assert.match(source, /company_audit_events/);
  assert.match(source, /actor_user_id:\s*context\.actorId/);
});

test("role lifecycle helper validates edit pause close and reopen actions", () => {
  const source = readWorkspaceSource();

  assert.match(source, /export async function updateCompanyRoleLifecycle/);
  assert.match(source, /export async function updateCompanyRoleIntake/);
  assert.match(source, /CompanyRoleLifecycleAction\s*=\s*"edit"\s*\|\s*"pause"\s*\|\s*"close"\s*\|\s*"activate"/);
  assert.match(source, /company_role_lifecycle\.closed_role_edit_denied/);
  assert.match(source, /company_role_lifecycle\.close_reason_required/);
  assert.match(source, /company_role\.lifecycle_updated/);
  assert.match(source, /company_roles/);
  assert.match(source, /company_audit_events/);
});

test("lazy match materialization reads confirmed complete candidates and active roles only", () => {
  const source = readWorkspaceSource();

  assert.match(source, /candidate_profiles/);
  assert.match(source, /profile_status/);
  assert.match(source, /confirmed/);
  assert.match(source, /candidate_interview_progress/);
  assert.match(source, /interview_completed_at/);
  assert.match(source, /\.from\("company_roles"\)[\s\S]+\.eq\("status",\s*"active"\)/);
  assert.match(source, /createCompanyMatch/);
  assert.match(source, /status:\s*"candidate_visible"/);
  assert.match(source, /contact_visibility:\s*"hidden_until_advance"/);
  assert.match(source, /consent_record_id:\s*null/);
  assert.match(source, /sharing_snapshot_id:\s*null/);
  assert.doesNotMatch(source, /status:\s*"candidate_visible"[\s\S]{0,800}raw_cv_included:\s*true/);
  assert.doesNotMatch(source, /status:\s*"candidate_visible"[\s\S]{0,800}raw_interview_media_included:\s*true/);
});

test("company V2 migration covers onboarding fields lifecycle and append-only audit policies", () => {
  const migrations = readCompanyMigrations();

  for (const column of [
    "domain",
    "hiring_locations",
    "team_size",
    "primary_contact_name",
    "primary_contact_email",
    "onboarding_completed_at",
  ]) {
    assert.match(
      migrations,
      new RegExp(`alter\\s+table\\s+public\\.company_workspaces[\\s\\S]+${column}`, "i"),
      `expected company_workspaces ${column} migration`,
    );
  }

  assert.match(migrations, /alter\s+table\s+public\.company_roles[\s\S]+closed_at/i);
  assert.match(migrations, /alter\s+table\s+public\.company_roles[\s\S]+closed_reason/i);
  assert.match(migrations, /alter\s+table\s+public\.company_roles[\s\S]+paused_at/i);
  assert.match(migrations, /alter\s+table\s+public\.company_roles[\s\S]+activated_at/i);
  assert.match(migrations, /create\s+index\s+if\s+not\s+exists\s+company_roles_active_materialization_idx/i);
  assert.doesNotMatch(migrations, /grant\s+[^;]*update[^;]*on\s+table\s+public\.company_audit_events/i);
  assert.doesNotMatch(migrations, /raw_user_meta_data|user_metadata/i);
});
