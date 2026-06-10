import { NextResponse, type NextRequest } from "next/server";

import {
  runSlaJob,
  type MatchSlaRow,
  type SlaJobDeps
} from "@/features/matching/match-sla";
import { resolveEmailProvider } from "@/lib/email";
import { logError, logInfo } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_ROWS_PER_RUN = 500;

/**
 * 14-day verdict SLA cron (vercel.json schedules it daily): sends the day-7
 * and day-12 company reminders and escalates breaches to
 * SLA_ESCALATION_EMAIL. Protected by CRON_SECRET like /api/cron/retention.
 */
export async function GET(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      {
        error: {
          code: "cron_secret_not_configured",
          message: "SLA cron is disabled until CRON_SECRET is configured.",
          status: 503
        }
      },
      { status: 503 }
    );
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  if (bearer !== configuredSecret && headerSecret !== configuredSecret) {
    return NextResponse.json(
      {
        error: {
          code: "cron_unauthorized",
          message: "A valid CRON_SECRET is required.",
          status: 401
        }
      },
      { status: 401 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "service_role_not_configured",
          message: "The SLA job requires the Supabase service role.",
          status: 503
        }
      },
      { status: 503 }
    );
  }

  const summary = await runSlaJob({
    deps: createSupabaseSlaDeps(admin),
    escalationEmail: process.env.SLA_ESCALATION_EMAIL?.trim() || undefined
  });

  const logFields = {
    route: "/api/cron/sla",
    reminders_sent: summary.remindersSent,
    breaches_escalated: summary.breachesEscalated,
    errors: summary.errors
  };
  if (summary.errors.length > 0) {
    logError("sla_run_completed_with_errors", logFields);
  } else {
    logInfo("sla_run_completed", logFields);
  }

  return NextResponse.json(
    {
      ran_at: summary.ranAt,
      reminders_sent: summary.remindersSent,
      breaches_escalated: summary.breachesEscalated,
      errors: summary.errors
    },
    { status: summary.errors.length > 0 ? 207 : 200 }
  );
}

function createSupabaseSlaDeps(admin: ReturnType<typeof createAdminClient>): SlaJobDeps {
  const emailProvider = resolveEmailProvider();

  return {
    async listOpenSlas() {
      const { data, error } = await admin
        .from("match_sla")
        .select(
          "match_id,company_id,role_id,candidate_user_id,entered_review_at,verdict_due_at,reminded_at,escalated,verdict_at"
        )
        .is("verdict_at", null)
        .eq("escalated", false)
        .order("verdict_due_at", { ascending: true })
        .limit(MAX_ROWS_PER_RUN);
      if (error || !data) {
        throw new Error(error?.message ?? "match_sla read failed");
      }

      return (data as Record<string, unknown>[]).map(slaRowFromSupabase);
    },

    async getMatchContext(row: MatchSlaRow) {
      const [matchResult, workspaceResult] = await Promise.all([
        admin
          .from("company_candidate_matches")
          .select("shared_profile_payload")
          .eq("match_id", row.matchId)
          .maybeSingle(),
        admin
          .from("company_workspaces")
          .select("name,primary_contact_email")
          .eq("company_id", row.companyId)
          .maybeSingle()
      ]);

      const profilePayload = isRecord(
        (matchResult.data as Record<string, unknown> | null)?.shared_profile_payload
      )
        ? ((matchResult.data as Record<string, unknown>).shared_profile_payload as Record<
            string,
            unknown
          >)
        : {};
      const workspaceRow = workspaceResult.error
        ? null
        : (workspaceResult.data as Record<string, unknown> | null);

      return {
        companyEmail: readString(workspaceRow?.primary_contact_email) ?? null,
        companyName:
          readString(profilePayload.companyName) ??
          readString(workspaceRow?.name) ??
          row.companyId,
        roleTitle: readString(profilePayload.roleTitle) ?? row.roleId,
        candidateName: readString(profilePayload.candidateName) ?? "Candidate",
        language: "en"
      };
    },

    async sendEmail(message) {
      return emailProvider.send(message);
    },

    async markReminded(matchId, remindedAtIso) {
      // Append to reminded_at[] atomically via array concatenation.
      const { data, error } = await admin
        .from("match_sla")
        .select("reminded_at")
        .eq("match_id", matchId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      const current = Array.isArray((data as Record<string, unknown> | null)?.reminded_at)
        ? ((data as Record<string, unknown>).reminded_at as string[])
        : [];

      const update = await admin
        .from("match_sla")
        .update({ reminded_at: [...current, remindedAtIso], updated_at: remindedAtIso })
        .eq("match_id", matchId);
      if (update.error) {
        throw new Error(update.error.message);
      }
    },

    async markEscalated(matchId, escalatedAtIso) {
      const { error } = await admin
        .from("match_sla")
        .update({ escalated: true, escalated_at: escalatedAtIso, updated_at: escalatedAtIso })
        .eq("match_id", matchId);
      if (error) {
        throw new Error(error.message);
      }
    }
  };
}

function slaRowFromSupabase(row: Record<string, unknown>): MatchSlaRow {
  return {
    matchId: String(row.match_id ?? ""),
    companyId: String(row.company_id ?? ""),
    roleId: String(row.role_id ?? ""),
    candidateUserId: String(row.candidate_user_id ?? ""),
    enteredReviewAt: String(row.entered_review_at ?? ""),
    verdictDueAt: String(row.verdict_due_at ?? ""),
    remindedAt: Array.isArray(row.reminded_at) ? (row.reminded_at as string[]) : [],
    escalated: Boolean(row.escalated),
    verdictAt: readString(row.verdict_at) ?? null
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
