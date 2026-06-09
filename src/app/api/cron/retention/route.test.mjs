import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

function readMigration(namePart) {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) => name.includes(namePart));
  assert.ok(migrationName, `expected migration including ${namePart}`);
  return readFileSync(path.join(migrationsDir, migrationName), "utf8");
}

test("the retention cron is protected by CRON_SECRET and fails closed", () => {
  const routeSource = read("src", "app", "api", "cron", "retention", "route.ts");

  assert.match(routeSource, /process\.env\.CRON_SECRET/);
  assert.match(routeSource, /cron_secret_not_configured/);
  assert.match(routeSource, /status: 503/);
  assert.match(routeSource, /cron_unauthorized/);
  assert.match(routeSource, /status: 401/);
  assert.match(routeSource, /Authorization|authorization/);
  assert.match(routeSource, /x-cron-secret/);
  // The unauthorized check happens before any admin client or job work.
  assert.ok(
    routeSource.indexOf("cron_unauthorized") < routeSource.indexOf("await runRetentionJob("),
    "auth must precede the retention job",
  );
});

test("the retention cron enforces both retention windows and audits deletions", () => {
  const routeSource = read("src", "app", "api", "cron", "retention", "route.ts");
  const jobSource = read("src", "features", "privacy", "retention-job.ts");

  assert.match(routeSource, /runRetentionJob/);
  assert.match(routeSource, /candidate_resume_documents/);
  assert.match(routeSource, /raw_deleted_at/);
  assert.match(routeSource, /candidate_audit_events/);
  assert.match(jobSource, /RETENTION_DAYS_RAW_CV|rawCvDays/);
  assert.match(jobSource, /rawMediaHours/);
  assert.match(jobSource, /retention\.raw_cv_deleted/);
  assert.match(jobSource, /retention\.raw_media_deleted/);
  // Reuses the existing retention policy instead of re-deriving deadlines.
  assert.match(jobSource, /isRetentionDeletionDue/);
});

test("vercel.json schedules the retention cron", () => {
  const vercelConfig = JSON.parse(read("vercel.json"));

  assert.ok(Array.isArray(vercelConfig.crons));
  const retention = vercelConfig.crons.find((cron) => cron.path === "/api/cron/retention");
  assert.ok(retention, "expected a cron entry for /api/cron/retention");
  assert.ok(retention.schedule);
});

test("the candidate-documents bucket is private with owner-read storage RLS", () => {
  const migration = readMigration("candidate_documents_storage_and_retention");

  assert.match(migration, /insert into storage\.buckets/);
  assert.match(migration, /'candidate-documents', 'candidate-documents', false/);
  assert.match(migration, /create policy candidate_documents_owner_select on storage\.objects/);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  // No candidate write policies: uploads and deletions stay service-role only.
  assert.doesNotMatch(migration, /for insert/);
  assert.doesNotMatch(migration, /for update/);
  assert.doesNotMatch(migration, /for delete/);
  assert.match(migration, /add column if not exists raw_deleted_at timestamptz/);
  assert.match(migration, /add column if not exists raw_deleted_audit_event_id text/);
});

test("the resume pipeline defaults to Supabase storage in production, in-memory only for tests", () => {
  const pipelineSource = read(
    "src",
    "features",
    "candidate-flow",
    "resume-profile-pipeline.ts",
  );

  assert.match(pipelineSource, /createDefaultStorageProvider/);
  assert.match(pipelineSource, /NODE_ENV === "test"/);
  assert.match(pipelineSource, /new SupabaseStorageProvider\(\)/);
  assert.doesNotMatch(
    pipelineSource,
    /options\.storage \?\? new InMemoryStorageProvider\(\)/,
    "the bare in-memory default must be gone",
  );

  const providerSource = read("src", "lib", "storage", "supabase-storage-provider.ts");
  assert.match(providerSource, /CANDIDATE_DOCUMENTS_BUCKET = "candidate-documents"/);
  assert.match(providerSource, /createSignedUrl/);
  // Server-only admin client is imported lazily and is injectable for tests.
  assert.match(providerSource, /await import\("\.\.\/supabase\/admin"\)/);
});
