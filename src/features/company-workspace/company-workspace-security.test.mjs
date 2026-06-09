import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const migrationsDir = path.join(rootDir, "supabase", "migrations");

const companyTables = [
  "company_workspaces",
  "company_memberships",
  "company_roles",
  "company_candidate_matches",
  "company_review_decisions",
  "company_audit_events",
];

function readAllMigrations() {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");
}

test("company dashboard tables are protected by RLS and explicit authenticated grants", () => {
  const migrations = readAllMigrations();

  for (const table of companyTables) {
    assert.match(
      migrations,
      new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, "i"),
      `expected public.${table} table`,
    );
    assert.match(
      migrations,
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
      `expected RLS for public.${table}`,
    );
    assert.match(
      migrations,
      new RegExp(`grant\\s+[^;]*on\\s+table\\s+public\\.${table}\\s+to\\s+authenticated`, "i"),
      `expected authenticated grant for public.${table}`,
    );
    assert.doesNotMatch(
      migrations,
      new RegExp(`grant\\s+[^;]*on\\s+table\\s+public\\.${table}\\s+to\\s+anon`, "i"),
      `did not expect anon grant for public.${table}`,
    );
  }
});

test("company authorization policies use membership rows instead of auth metadata", () => {
  const migrations = readAllMigrations();

  for (const table of [
    "company_roles",
    "company_candidate_matches",
    "company_review_decisions",
    "company_audit_events",
  ]) {
    assert.match(
      migrations,
      new RegExp(
        `create\\s+policy[\\s\\S]+on\\s+public\\.${table}[\\s\\S]+company_memberships[\\s\\S]+\\(select\\s+auth\\.uid\\(\\)\\)`,
        "i",
      ),
      `expected membership policy for public.${table}`,
    );
  }

  assert.doesNotMatch(migrations, /raw_user_meta_data/i);
  assert.doesNotMatch(migrations, /user_metadata/i);
});

test("company membership policies do not allow self-joining arbitrary workspaces", () => {
  const migrations = readAllMigrations();

  assert.doesNotMatch(
    migrations,
    /create\s+policy\s+company_memberships_self_insert[\s\S]+with\s+check\s+\(\(select\s+auth\.uid\(\)\)\s*=\s*user_id\)/i,
    "self-insert membership policy would let users join any company_id they can guess",
  );
  assert.doesNotMatch(
    migrations,
    /create\s+policy\s+company_memberships_self_update[\s\S]+with\s+check\s+\(\(select\s+auth\.uid\(\)\)\s*=\s*user_id\)/i,
    "self-update membership policy would let users reactivate or elevate their own row",
  );
  assert.match(
    migrations,
    /company_memberships_owner_bootstrap_insert[\s\S]+company_workspaces[\s\S]+owner_user_id\s*=\s*\(select\s+auth\.uid\(\)\)/i,
  );
});

test("company decisions and audit events are append-only through the Data API", () => {
  const migrations = readAllMigrations();

  assert.match(
    migrations,
    /grant\s+select\s*,\s*insert\s+on\s+table\s+public\.company_review_decisions\s+to\s+authenticated/i,
  );
  assert.match(
    migrations,
    /grant\s+select\s*,\s*insert\s+on\s+table\s+public\.company_audit_events\s+to\s+authenticated/i,
  );
  assert.doesNotMatch(
    migrations,
    /grant\s+[^;]*update[^;]*on\s+table\s+public\.company_review_decisions/i,
  );
  assert.doesNotMatch(
    migrations,
    /grant\s+[^;]*update[^;]*on\s+table\s+public\.company_audit_events/i,
  );
});

test("candidate consent creates company-visible matches without raw media exposure", () => {
  const routePath = path.join(
    rootDir,
    "src",
    "app",
    "candidate",
    "matches",
    "decision",
    "route.ts",
  );

  assert.ok(existsSync(routePath), "expected candidate match decision route");
  const routeSource = readFileSync(routePath, "utf8");

  assert.match(routeSource, /persistCandidateMatchAcceptance/);
  assert.match(routeSource, /company_candidate_matches/);
  assert.match(routeSource, /candidate_sharing_snapshots/);
  assert.match(routeSource, /raw_cv_included:\s*false/);
  assert.match(routeSource, /raw_interview_media_included:\s*false/);
});

test("candidate match rows are written by server-side helpers, not direct browser RLS", () => {
  const migrations = readAllMigrations();
  const workspaceSource = readFileSync(
    path.join(rootDir, "src", "features", "company-workspace", "company-workspace.ts"),
    "utf8",
  );

  assert.doesNotMatch(
    migrations,
    /create\s+policy\s+company_candidate_matches_candidate_insert/i,
  );
  assert.doesNotMatch(
    migrations,
    /create\s+policy\s+company_candidate_matches_candidate_update/i,
  );
  assert.match(workspaceSource, /createAdminClient/);
  assert.match(workspaceSource, /candidate_match_not_visible/);
});
