import { NextResponse, type NextRequest } from "next/server";

import {
  isCompanyContextError,
  resolveCompanyRouteContext,
} from "@/features/company-workspace";
import {
  computeAdverseImpact,
  type CohortDimension,
  type DecisionRecord,
} from "@/features/audit/adverse-impact-monitor";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const WINDOW_DAYS = 30;

/**
 * GET /admin/adverse-impact
 *
 * Auth-gated (company workspace). Reads the last 30 days of review decisions for
 * the workspace, derives NEUTRAL cohort proxies (role family + seniority, from
 * role data the company already owns — never protected attributes), runs the
 * four-fifths-rule monitor, persists a snapshot via the service role, and returns
 * the JSON. No scheduler — invoke on demand.
 */
export async function GET(request: NextRequest) {
  const companyContext = await resolveCompanyRouteContext("/admin/adverse-impact");
  if (isCompanyContextError(companyContext)) {
    return NextResponse.json(
      {
        error: {
          code: companyContext.status === 401 ? "auth_required" : "company_account_required",
          message:
            companyContext.status === 401
              ? "Sign in to view adverse impact monitoring."
              : "A company workspace is required for adverse impact monitoring.",
          status: companyContext.status,
        },
      },
      { status: companyContext.status },
    );
  }

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const decisionsResult = await companyContext.supabase
    .from("company_review_decisions")
    .select("match_id, role_id, decision, created_at")
    .eq("company_id", companyContext.companyId)
    .gte("created_at", windowStart.toISOString());

  if (decisionsResult.error) {
    return NextResponse.json(
      {
        error: {
          code: "adverse_impact_read_failed",
          message: decisionsResult.error.message,
          status: 503,
        },
      },
      { status: 503 },
    );
  }

  const rolesResult = await companyContext.supabase
    .from("company_roles")
    .select("role_id, role_payload")
    .eq("company_id", companyContext.companyId);
  const roleCohorts = buildRoleCohorts(rolesResult.error ? [] : rolesResult.data ?? []);

  const decisions: DecisionRecord[] = (decisionsResult.data ?? []).map((row) => {
    const cohort = roleCohorts.get(String(row.role_id)) ?? {};
    const cohortValues: Partial<Record<CohortDimension, string>> = {};
    if (cohort.role_family) {
      cohortValues.role_family = cohort.role_family;
    }
    if (cohort.seniority) {
      cohortValues.seniority = cohort.seniority;
    }
    return {
      candidateId: String(row.match_id),
      decision: normalizeDecision(row.decision),
      cohortValues,
      decidedAt: String(row.created_at),
    };
  });

  const { rows, computedAt } = computeAdverseImpact(decisions);

  const persistence = await persistSnapshots(rows, windowStart.toISOString(), windowEnd.toISOString());

  return NextResponse.json({
    computedAt,
    window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
    decisionsCount: decisions.length,
    rows,
    persistence,
  });
}

function normalizeDecision(value: unknown): DecisionRecord["decision"] {
  return value === "advance" || value === "hold" || value === "decline" ? value : "hold";
}

function buildRoleCohorts(
  roles: ReadonlyArray<{ role_id?: unknown; role_payload?: unknown }>,
): Map<string, { role_family?: string; seniority?: string }> {
  const map = new Map<string, { role_family?: string; seniority?: string }>();
  for (const role of roles) {
    const roleId = typeof role.role_id === "string" ? role.role_id : undefined;
    if (!roleId) {
      continue;
    }
    const payload = isRecord(role.role_payload) ? role.role_payload : {};
    map.set(roleId, {
      role_family: readString(payload.role_type),
      seniority: readString(payload.seniority),
    });
  }
  return map;
}

async function persistSnapshots(
  rows: ReadonlyArray<{
    cohortDimension: string;
    cohortValue: string;
    referenceValue: string;
    nApplied: number;
    nSelected: number;
    selectionRate: number;
    ratioVsReference: number;
    status: string;
  }>,
  windowStart: string,
  windowEnd: string,
): Promise<{ status: "persisted" | "skipped"; detail?: string }> {
  if (rows.length === 0) {
    return { status: "skipped", detail: "No cohorts to persist." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { status: "skipped", detail: "Service role not configured." };
  }

  const { error } = await admin.from("adverse_impact_snapshots").insert(
    rows.map((row) => ({
      window_start: windowStart,
      window_end: windowEnd,
      cohort_dimension: row.cohortDimension,
      cohort_value: row.cohortValue,
      reference_value: row.referenceValue,
      n_applied: row.nApplied,
      n_selected: row.nSelected,
      selection_rate: row.selectionRate,
      ratio_vs_reference: row.ratioVsReference,
      status: row.status,
    })),
  );

  return error ? { status: "skipped", detail: error.message } : { status: "persisted" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
