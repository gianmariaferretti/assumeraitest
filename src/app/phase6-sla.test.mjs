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

test("match_sla carries the spec'd columns and stays service-role only", () => {
  const migration = readMigration("match_sla");

  assert.match(migration, /create table if not exists public\.match_sla/);
  assert.match(migration, /match_id text primary key/);
  assert.match(migration, /verdict_due_at timestamptz not null/);
  assert.match(migration, /reminded_at timestamptz\[\] not null default '\{\}'/);
  assert.match(migration, /escalated boolean not null default false/);
  assert.match(migration, /verdict_at timestamptz/);
  assert.match(migration, /alter table public\.match_sla enable row level security/);
  assert.match(
    migration,
    /revoke all privileges on table public\.match_sla from anon, authenticated/,
  );
  assert.doesNotMatch(migration, /create policy/);
});

test("accepting a match opens the SLA and notifies the candidate", () => {
  const workspaceSource = read(
    "src",
    "features",
    "company-workspace",
    "company-workspace.ts",
  );

  // The hook lives inside the acceptance persistence, gated on "accepted".
  assert.match(workspaceSource, /from\("match_sla"\)\.upsert/);
  assert.match(workspaceSource, /computeVerdictDueAt\(input\.decidedAt\)/);
  assert.match(workspaceSource, /sendCandidateMatchNotification/);
  assert.match(workspaceSource, /candidateMatchNotificationEmail/);
  assert.ok(
    workspaceSource.indexOf('input.decision === "accepted" && reviewDueAt') <
      workspaceSource.indexOf('from("match_sla").upsert'),
    "the SLA row opens only for accepted matches",
  );
});

test("a company decision stamps verdict_at and notifies the candidate", () => {
  const routeSource = read(
    "src",
    "app",
    "company",
    "review",
    "[matchId]",
    "decision",
    "route.ts",
  );
  const workspaceSource = read(
    "src",
    "features",
    "company-workspace",
    "company-workspace.ts",
  );

  assert.match(routeSource, /recordMatchVerdictAndNotify/);
  assert.match(workspaceSource, /update\(\{ verdict_at: input\.decidedAt/);
  assert.match(workspaceSource, /candidateVerdictNotificationEmail/);
  // Notification failures are non-fatal for the recorded decision.
  assert.match(workspaceSource, /candidate_verdict_notification_failed/);
});

test("the SLA cron is CRON_SECRET-protected and scheduled in vercel.json", () => {
  const routeSource = read("src", "app", "api", "cron", "sla", "route.ts");

  assert.match(routeSource, /process\.env\.CRON_SECRET/);
  assert.match(routeSource, /cron_unauthorized/);
  assert.match(routeSource, /runSlaJob/);
  assert.match(routeSource, /SLA_ESCALATION_EMAIL/);
  assert.match(routeSource, /is\("verdict_at", null\)/);
  assert.match(routeSource, /eq\("escalated", false\)/);

  const vercelConfig = JSON.parse(read("vercel.json"));
  const slaCron = vercelConfig.crons.find((cron) => cron.path === "/api/cron/sla");
  assert.ok(slaCron, "expected a cron entry for /api/cron/sla");
  assert.ok(slaCron.schedule);
});

test("email providers: Resend in production, in-memory for tests", () => {
  const providersSource = read("src", "lib", "email", "providers.ts");

  assert.match(providersSource, /api\.resend\.com\/emails/);
  assert.match(providersSource, /RESEND_API_KEY/);
  assert.match(providersSource, /fetchImpl/);
  assert.match(providersSource, /createInMemoryEmailProvider/);
  assert.match(providersSource, /resolveEmailProvider/);
});

test("the company dashboard shows a per-match countdown and overdue badge", () => {
  const dashboardSource = read("src", "components", "company", "CompanyDashboard.tsx");

  assert.match(dashboardSource, /formatReviewCountdown/);
  assert.match(dashboardSource, /copy\.match\.daysLeft/);
  assert.match(dashboardSource, /copy\.match\.overdueByDays/);
  assert.match(dashboardSource, /review-countdown overdue/);
  // The pre-existing overdue badge stays wired.
  assert.match(dashboardSource, /status-pill urgent/);

  const i18nSource = read("src", "lib", "i18n.tsx");
  assert.match(i18nSource, /daysLeft: "\{days\} days left"/);
  assert.match(i18nSource, /daysLeft: "Mancano \{days\} giorni"/);
  assert.match(i18nSource, /daysLeft: "\{days\} jours restants"/);
});
