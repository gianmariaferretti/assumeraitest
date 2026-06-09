import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const candidateTables = [
  "candidate_profiles",
  "candidate_resume_documents",
  "candidate_interview_progress",
  "candidate_interview_sessions",
  "candidate_interview_responses",
  "candidate_compliance_workflows",
  "candidate_sharing_snapshots",
];

function readAllMigrations() {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");

  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");
}

test("candidate RLS tables are explicitly exposed to authenticated users, not anon users", () => {
  const migrations = readAllMigrations();

  for (const table of candidateTables) {
    assert.match(
      migrations,
      new RegExp(`grant\\s+select\\s*,\\s*insert\\s*,\\s*update\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+authenticated`, "i"),
      `expected authenticated grant for public.${table}`,
    );
    assert.doesNotMatch(
      migrations,
      new RegExp(`grant\\s+[^;]*on\\s+table\\s+public\\.${table}\\s+to\\s+anon`, "i"),
      `did not expect anon grant for public.${table}`,
    );
  }

  assert.match(
    migrations,
    /grant\s+select\s*,\s*insert\s+on\s+table\s+public\.candidate_audit_events\s+to\s+authenticated/i,
  );
  assert.doesNotMatch(
    migrations,
    /grant\s+[^;]*update[^;]*on\s+table\s+public\.candidate_audit_events/i,
  );
  assert.doesNotMatch(
    migrations,
    /grant\s+[^;]*on\s+table\s+public\.candidate_audit_events\s+to\s+anon/i,
  );
});

test("candidate audit events are idempotent without opening immutable rows to updates", () => {
  const storeSource = readFileSync(
    path.join(
      rootDir,
      "src",
      "features",
      "candidate-persistence",
      "supabase-candidate-store.ts",
    ),
    "utf8",
  );

  assert.match(storeSource, /candidate_audit_events/);
  assert.match(storeSource, /ignoreDuplicates:\s*true/);
});
