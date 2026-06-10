import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  computeVerdictDueAt,
  dueReminderKind,
  isSlaBreached,
  runSlaJob,
  SLA_VERDICT_DAYS,
} = loadFromRepoRoot("src/features/matching/match-sla.ts");
const {
  candidateMatchNotificationEmail,
  candidateVerdictNotificationEmail,
  companyReminderEmail,
  resolveEmailTemplateLanguage,
  slaBreachEscalationEmail,
} = loadFromRepoRoot("src/lib/email/templates.ts");
const { createInMemoryEmailProvider } = loadFromRepoRoot("src/lib/email/providers.ts");

const ENTERED = "2026-06-01T10:00:00.000Z";
const daysAfter = (days) =>
  new Date(Date.parse(ENTERED) + days * 24 * 60 * 60 * 1000).toISOString();

function slaRow(overrides = {}) {
  return {
    matchId: "match_1",
    companyId: "company_1",
    roleId: "role_1",
    candidateUserId: "cand_1",
    enteredReviewAt: ENTERED,
    verdictDueAt: computeVerdictDueAt(ENTERED),
    remindedAt: [],
    escalated: false,
    verdictAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SLA computation
// ---------------------------------------------------------------------------

test("the verdict is due exactly 14 days after entering employer review", () => {
  assert.equal(SLA_VERDICT_DAYS, 14);
  assert.equal(computeVerdictDueAt(ENTERED), daysAfter(14));
});

test("reminders fire at day 7 and day 12, derived from how many were sent", () => {
  const fresh = slaRow();
  assert.equal(dueReminderKind(fresh, daysAfter(6)), undefined);
  assert.equal(dueReminderKind(fresh, daysAfter(7)), "day7");
  assert.equal(dueReminderKind(fresh, daysAfter(11)), "day7", "missed day-7 still goes out");

  const afterFirst = slaRow({ remindedAt: [daysAfter(7)] });
  assert.equal(dueReminderKind(afterFirst, daysAfter(11)), undefined);
  assert.equal(dueReminderKind(afterFirst, daysAfter(12)), "day12");

  const afterBoth = slaRow({ remindedAt: [daysAfter(7), daysAfter(12)] });
  assert.equal(dueReminderKind(afterBoth, daysAfter(13)), undefined);
});

test("no reminders after a verdict, an escalation, or a breach", () => {
  assert.equal(dueReminderKind(slaRow({ verdictAt: daysAfter(8) }), daysAfter(9)), undefined);
  assert.equal(dueReminderKind(slaRow({ escalated: true }), daysAfter(8)), undefined);
  assert.equal(dueReminderKind(slaRow(), daysAfter(15)), undefined, "breach path takes over");
});

test("a breach is past the due date with no verdict", () => {
  assert.equal(isSlaBreached(slaRow(), daysAfter(14)), false);
  assert.equal(isSlaBreached(slaRow(), daysAfter(15)), true);
  assert.equal(isSlaBreached(slaRow({ verdictAt: daysAfter(10) }), daysAfter(15)), false);
});

// ---------------------------------------------------------------------------
// Job behavior + idempotency (no duplicate emails)
// ---------------------------------------------------------------------------

function createJobHarness(initialRows) {
  // Simulates the match_sla table so re-runs observe previous marks.
  const table = new Map(initialRows.map((row) => [row.matchId, row]));
  const outbox = [];
  const provider = createInMemoryEmailProvider(outbox);

  const deps = {
    async listOpenSlas() {
      return [...table.values()].filter((row) => !row.verdictAt && !row.escalated);
    },
    async getMatchContext() {
      return {
        companyEmail: "reviewer@company.example",
        companyName: "Acme",
        roleTitle: "SDR",
        candidateName: "Jordan",
        language: "en",
      };
    },
    async sendEmail(message) {
      return provider.send(message);
    },
    async markReminded(matchId, at) {
      const row = table.get(matchId);
      table.set(matchId, { ...row, remindedAt: [...row.remindedAt, at] });
    },
    async markEscalated(matchId, at) {
      const row = table.get(matchId);
      table.set(matchId, { ...row, escalated: true, escalatedAt: at });
    },
  };

  return { deps, outbox, table };
}

test("the day-7 reminder is sent once: a re-run never duplicates it", async () => {
  const { deps, outbox } = createJobHarness([slaRow()]);

  const first = await runSlaJob({ deps, now: daysAfter(7), escalationEmail: "ops@internal" });
  assert.equal(first.remindersSent, 1);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "reviewer@company.example");
  assert.match(outbox[0].subject, /Jordan/);

  const rerun = await runSlaJob({ deps, now: daysAfter(7), escalationEmail: "ops@internal" });
  assert.equal(rerun.remindersSent, 0);
  assert.equal(outbox.length, 1, "idempotent: no duplicate day-7 email");

  const day12 = await runSlaJob({ deps, now: daysAfter(12), escalationEmail: "ops@internal" });
  assert.equal(day12.remindersSent, 1);
  assert.equal(outbox.length, 2);

  const rerun12 = await runSlaJob({ deps, now: daysAfter(13), escalationEmail: "ops@internal" });
  assert.equal(rerun12.remindersSent, 0);
  assert.equal(outbox.length, 2, "idempotent: no duplicate day-12 email");
});

test("a breach escalates once to the internal address and is flagged", async () => {
  const { deps, outbox, table } = createJobHarness([
    slaRow({ remindedAt: [daysAfter(7), daysAfter(12)] }),
  ]);

  const run = await runSlaJob({ deps, now: daysAfter(15), escalationEmail: "ops@internal" });
  assert.equal(run.breachesEscalated, 1);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "ops@internal");
  assert.match(outbox[0].subject, /SLA/i);
  assert.equal(table.get("match_1").escalated, true);

  const rerun = await runSlaJob({ deps, now: daysAfter(16), escalationEmail: "ops@internal" });
  assert.equal(rerun.breachesEscalated, 0);
  assert.equal(outbox.length, 1, "idempotent: escalated rows leave the open set");
});

test("a failed send is not marked, so it retries on the next run", async () => {
  const { deps, outbox, table } = createJobHarness([slaRow()]);
  let failNext = true;
  const flakyDeps = {
    ...deps,
    async sendEmail(message) {
      if (failNext) {
        failNext = false;
        return { ok: false, error: "smtp_down" };
      }
      return deps.sendEmail(message);
    },
  };

  const failed = await runSlaJob({ deps: flakyDeps, now: daysAfter(7), escalationEmail: "ops@x" });
  assert.equal(failed.remindersSent, 0);
  assert.equal(failed.errors.length, 1);
  assert.equal(table.get("match_1").remindedAt.length, 0, "not marked on failure");

  const retried = await runSlaJob({ deps: flakyDeps, now: daysAfter(7), escalationEmail: "ops@x" });
  assert.equal(retried.remindersSent, 1);
  assert.equal(outbox.length, 1);
});

test("a missing escalation address is reported, never silently dropped", async () => {
  const { deps, outbox } = createJobHarness([slaRow()]);

  const run = await runSlaJob({ deps, now: daysAfter(15) });
  assert.equal(run.breachesEscalated, 0);
  assert.equal(outbox.length, 0);
  assert.match(run.errors[0], /SLA_ESCALATION_EMAIL/);
});

// ---------------------------------------------------------------------------
// Template language selection (i18n codes: en / it / fr, fallback en)
// ---------------------------------------------------------------------------

test("templates localize by i18n language code and fall back to English", () => {
  assert.equal(resolveEmailTemplateLanguage("it"), "it");
  assert.equal(resolveEmailTemplateLanguage("fr"), "fr");
  assert.equal(resolveEmailTemplateLanguage("de"), "en");
  assert.equal(resolveEmailTemplateLanguage(undefined), "en");

  const base = { companyName: "Acme", roleTitle: "SDR", verdictDueAt: daysAfter(14) };
  assert.match(candidateMatchNotificationEmail({ ...base, language: "it" }).subject, /in revisione/);
  assert.match(candidateMatchNotificationEmail({ ...base, language: "en" }).subject, /under review/);
  assert.match(candidateMatchNotificationEmail({ ...base, language: "fr" }).subject, /en cours d'examen/);
  assert.match(
    candidateMatchNotificationEmail({ ...base, language: "es" }).subject,
    /under review/,
    "unknown codes fall back to English",
  );

  const reminder = { candidateName: "Jordan", roleTitle: "SDR", verdictDueAt: daysAfter(14) };
  assert.match(companyReminderEmail({ ...reminder, language: "it", kind: "day7" }).subject, /Promemoria/);
  assert.match(companyReminderEmail({ ...reminder, language: "it", kind: "day12" }).subject, /Ultimo promemoria/);
  assert.match(companyReminderEmail({ ...reminder, language: "en", kind: "day12" }).subject, /Final reminder/);

  const verdict = { companyName: "Acme", roleTitle: "SDR" };
  assert.match(
    candidateVerdictNotificationEmail({ ...verdict, language: "it", verdict: "advanced" }).text,
    /avanzata/,
  );
  assert.match(
    candidateVerdictNotificationEmail({ ...verdict, language: "en", verdict: "declined" }).text,
    /declined/,
  );
  // The verdict email never frames the outcome as automated.
  assert.match(
    candidateVerdictNotificationEmail({ ...verdict, language: "en", verdict: "declined" }).text,
    /human-reviewed recommendation/,
  );

  assert.match(
    slaBreachEscalationEmail({
      language: "en",
      matchId: "match_1",
      companyName: "Acme",
      roleTitle: "SDR",
      verdictDueAt: daysAfter(14),
    }).subject,
    /SLA breached/,
  );
});
