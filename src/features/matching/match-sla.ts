import {
  companyReminderEmail,
  slaBreachEscalationEmail,
  type CompanyReminderKind
} from "../../lib/email/templates";
import type { EmailMessage, EmailSendResult } from "../../lib/email/types";

/**
 * 14-day verdict SLA for employer review.
 *
 * A row enters match_sla when the candidate accepts a match (the moment the
 * employer review clock starts). The cron-driven job sends a company reminder
 * at day 7 and day 12 and escalates breaches past day 14 to an internal
 * address. Idempotency is structural: reminders derive from how many were
 * already sent (first = day 7, second = day 12) and escalation flips a flag,
 * so re-running the job never duplicates an email.
 */

export const SLA_VERDICT_DAYS = 14;
export const SLA_REMINDER_DAY_7 = 7;
export const SLA_REMINDER_DAY_12 = 12;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface MatchSlaRow {
  readonly matchId: string;
  readonly companyId: string;
  readonly roleId: string;
  readonly candidateUserId: string;
  readonly enteredReviewAt: string;
  readonly verdictDueAt: string;
  /** Timestamps of reminders already sent (first = day 7, second = day 12). */
  readonly remindedAt: readonly string[];
  readonly escalated: boolean;
  readonly verdictAt: string | null;
}

export function computeVerdictDueAt(enteredReviewAtIso: string): string {
  return new Date(Date.parse(enteredReviewAtIso) + SLA_VERDICT_DAYS * DAY_IN_MS).toISOString();
}

export function isSlaBreached(row: MatchSlaRow, nowIso: string): boolean {
  if (row.verdictAt) {
    return false;
  }
  const dueMs = Date.parse(row.verdictDueAt);
  const nowMs = Date.parse(nowIso);

  return Number.isFinite(dueMs) && Number.isFinite(nowMs) && nowMs > dueMs;
}

/**
 * Which reminder (if any) is due right now. Derived from the count of
 * reminders already sent, so the job is idempotent across runs and catches up
 * (a missed day-7 reminder still goes out first, day-12 on the next run).
 */
export function dueReminderKind(row: MatchSlaRow, nowIso: string): CompanyReminderKind | undefined {
  if (row.verdictAt || row.escalated || isSlaBreached(row, nowIso)) {
    return undefined;
  }

  const enteredMs = Date.parse(row.enteredReviewAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(enteredMs) || !Number.isFinite(nowMs)) {
    return undefined;
  }

  const sent = row.remindedAt.length;
  if (sent === 0 && nowMs >= enteredMs + SLA_REMINDER_DAY_7 * DAY_IN_MS) {
    return "day7";
  }
  if (sent === 1 && nowMs >= enteredMs + SLA_REMINDER_DAY_12 * DAY_IN_MS) {
    return "day12";
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// SLA job (effects injected; production wiring lives in /api/cron/sla)
// ---------------------------------------------------------------------------

export interface MatchSlaContext {
  readonly companyEmail: string | null;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly candidateName: string;
  /** i18n language code for the company-facing emails. */
  readonly language: string;
}

export interface SlaJobDeps {
  /** Rows with verdict_at null and escalated false. */
  listOpenSlas(): Promise<MatchSlaRow[]>;
  /** Display/contact context for one match (company contact, names, language). */
  getMatchContext(row: MatchSlaRow): Promise<MatchSlaContext>;
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
  markReminded(matchId: string, remindedAtIso: string): Promise<void>;
  markEscalated(matchId: string, escalatedAtIso: string): Promise<void>;
}

export interface RunSlaJobInput {
  readonly deps: SlaJobDeps;
  /** Internal address for breach escalations (SLA_ESCALATION_EMAIL). */
  readonly escalationEmail?: string;
  readonly now?: string;
}

export interface SlaJobSummary {
  readonly ranAt: string;
  readonly remindersSent: number;
  readonly breachesEscalated: number;
  readonly errors: string[];
}

export async function runSlaJob(input: RunSlaJobInput): Promise<SlaJobSummary> {
  const now = input.now ?? new Date().toISOString();
  const errors: string[] = [];
  let remindersSent = 0;
  let breachesEscalated = 0;

  let rows: MatchSlaRow[] = [];
  try {
    rows = await input.deps.listOpenSlas();
  } catch (error) {
    errors.push(`list_open_slas_failed: ${messageOf(error)}`);
  }

  for (const row of rows) {
    try {
      if (isSlaBreached(row, now)) {
        if (!input.escalationEmail) {
          errors.push(`escalation_skipped_${row.matchId}: SLA_ESCALATION_EMAIL is not configured`);
          continue;
        }

        const context = await input.deps.getMatchContext(row);
        const rendered = slaBreachEscalationEmail({
          language: context.language,
          matchId: row.matchId,
          companyName: context.companyName,
          roleTitle: context.roleTitle,
          verdictDueAt: row.verdictDueAt
        });
        const sent = await input.deps.sendEmail({
          to: input.escalationEmail,
          subject: rendered.subject,
          text: rendered.text
        });
        if (!sent.ok) {
          errors.push(`escalation_send_failed_${row.matchId}: ${sent.error}`);
          continue;
        }

        // Flag only after the email went out, so a failed send retries next run.
        await input.deps.markEscalated(row.matchId, now);
        breachesEscalated += 1;
        continue;
      }

      const kind = dueReminderKind(row, now);
      if (!kind) {
        continue;
      }

      const context = await input.deps.getMatchContext(row);
      if (!context.companyEmail) {
        errors.push(`reminder_skipped_${row.matchId}: company contact email is missing`);
        continue;
      }

      const rendered = companyReminderEmail({
        language: context.language,
        kind,
        candidateName: context.candidateName,
        roleTitle: context.roleTitle,
        verdictDueAt: row.verdictDueAt
      });
      const sent = await input.deps.sendEmail({
        to: context.companyEmail,
        subject: rendered.subject,
        text: rendered.text
      });
      if (!sent.ok) {
        errors.push(`reminder_send_failed_${row.matchId}: ${sent.error}`);
        continue;
      }

      // Record only after the email went out: the reminder count is the
      // idempotency key, so a recorded send is never repeated.
      await input.deps.markReminded(row.matchId, now);
      remindersSent += 1;
    } catch (error) {
      errors.push(`sla_${row.matchId}: ${messageOf(error)}`);
    }
  }

  return { ranAt: now, remindersSent, breachesEscalated, errors };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}
