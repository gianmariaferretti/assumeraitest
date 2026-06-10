import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

function readMigration(namePart) {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) => name.includes(namePart));
  assert.ok(migrationName, `expected migration including ${namePart}`);
  return readFileSync(path.join(migrationsDir, migrationName), "utf8");
}

test("human_review_requests: owner create/read, service-role outcomes, reasons enforced", () => {
  const migration = readMigration("human_review_requests");

  assert.match(migration, /create table if not exists public\.human_review_requests/);
  assert.match(migration, /status in \('open', 'upheld', 'adjusted'\)/);
  assert.match(
    migration,
    /create policy human_review_requests_owner_select on public\.human_review_requests/,
  );
  assert.match(
    migration,
    /create policy human_review_requests_owner_insert on public\.human_review_requests/,
  );
  // No owner update/delete: outcomes are final, written via service role.
  assert.doesNotMatch(migration, /for update/);
  assert.doesNotMatch(migration, /for delete/);
  assert.match(migration, /grant select, insert on table public\.human_review_requests/);
  // Schema-level guarantee: an adjustment always carries its reason.
  assert.match(migration, /check \(status <> 'adjusted' or outcome_reason is not null\)/);
  assert.match(migration, /unique \(user_id, request_id\)/);
});

test("the candidate request action persists to the dedicated table", () => {
  const routeSource = read("src", "app", "candidate", "data", "request", "route.ts");

  assert.match(routeSource, /persistHumanReviewRequest/);
  // The existing workflow record is kept alongside the new table.
  assert.match(routeSource, /persistCandidateDataWorkflow/);

  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "supabase-candidate-store.ts",
  );
  assert.match(storeSource, /from\("human_review_requests"\)\.upsert/);
  assert.match(storeSource, /readCandidateHumanReviewRequests/);
});

test("the candidate sees persistent request status on the results page", () => {
  const pageSource = read("src", "app", "candidate", "results", "page.tsx");
  const componentSource = read(
    "src",
    "components",
    "candidate",
    "CandidateResultsReview.tsx",
  );
  const copySource = read("src", "features", "interview-flow", "candidate-flow-copy.ts");

  assert.match(pageSource, /readCandidateHumanReviewRequests/);
  assert.match(pageSource, /initialReviewRequests=\{reviewRequests\}/);
  assert.match(componentSource, /initialReviewRequests/);
  assert.match(componentSource, /copy\.reviewStatusOpen/);
  assert.match(componentSource, /copy\.reviewStatusUpheld/);
  assert.match(componentSource, /copy\.reviewStatusAdjusted/);
  assert.match(componentSource, /copy\.reviewOutcomeReason/);
  // Copy exists in all three languages.
  assert.match(copySource, /reviewStatusUpheld: "Reviewed: original evaluation upheld"/);
  assert.match(copySource, /reviewStatusUpheld: "Rivisto: valutazione originale confermata"/);
  assert.match(copySource, /reviewStatusUpheld: "Revu : evaluation d'origine confirmee"/);
});

test("the admin queue is company-context-gated and shows evaluator runs read-only", () => {
  const pageSource = read("src", "app", "admin", "review-queue", "page.tsx");

  assert.match(pageSource, /resolveCompanyRouteContext\("\/admin\/review-queue"\)/);
  assert.match(pageSource, /isCompanyContextError/);
  assert.match(pageSource, /eq\("status", "open"\)/);
  assert.match(pageSource, /from\("interview_evaluator_runs"\)/);
  // Reads only: the page never writes evaluator runs.
  assert.doesNotMatch(pageSource, /interview_evaluator_runs"\)\s*\.\s*(insert|update|upsert|delete)/);
  assert.match(pageSource, /action=\{`\/admin\/review-queue\//);
});

test("the decision route records uphold|adjust as a new audit record, never touching evaluator runs", () => {
  const routeSource = read(
    "src",
    "app",
    "admin",
    "review-queue",
    "[requestId]",
    "decision",
    "route.ts",
  );

  assert.match(routeSource, /resolveCompanyRouteContext/);
  assert.match(routeSource, /buildReviewOutcome/);
  assert.match(routeSource, /from\("human_review_requests"\)/);
  assert.match(routeSource, /\.eq\("status", "open"\)/);
  assert.match(routeSource, /from\("candidate_audit_events"\)\.upsert/);
  assert.match(routeSource, /resolution_audit_event_id/);
  // The hard rule: this route never queries or writes evaluator runs.
  assert.doesNotMatch(routeSource, /from\("interview_evaluator_runs"\)/);
});
