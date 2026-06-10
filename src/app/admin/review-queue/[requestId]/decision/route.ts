import { NextResponse, type NextRequest } from "next/server";

import {
  isCompanyContextError,
  resolveCompanyRouteContext
} from "@/features/company-workspace";
import {
  buildReviewOutcome,
  type HumanReviewOutcomeAction
} from "@/features/human-review/review-outcome";
import { logWarn } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Record a reviewer outcome (uphold | adjust with reason) for a candidate
 * human-review request. The outcome updates human_review_requests and writes
 * a NEW candidate audit record. interview_evaluator_runs is never touched:
 * the original evaluation stays immutable.
 */
export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ readonly requestId: string }> }
) {
  const { requestId } = await params;
  const companyContext = await resolveCompanyRouteContext("/admin/review-queue");
  if (isCompanyContextError(companyContext)) {
    return NextResponse.redirect(
      new URL(
        companyContext.status === 401
          ? "/login?next=/admin/review-queue"
          : "/profile?error=company_account_required",
        request.url
      ),
      303
    );
  }

  const formData = await request.formData();
  const action = readAction(formData.get("action"));
  const reason = readFormString(formData, "reason");
  if (!action) {
    return redirectWithError(request, "review_outcome_invalid_action");
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return redirectWithError(request, "service_role_not_configured");
  }

  const requestResult = await admin
    .from("human_review_requests")
    .select("request_id,user_id,target_type,target_id,status,requested_at")
    .eq("request_id", requestId)
    .maybeSingle();
  const row = requestResult.error
    ? null
    : (requestResult.data as Record<string, unknown> | null);
  if (!row) {
    return redirectWithError(request, "review_request_not_found");
  }

  const resolvedAt = new Date().toISOString();
  const outcome = buildReviewOutcome({
    request: {
      userId: String(row.user_id ?? ""),
      requestId: String(row.request_id ?? ""),
      targetType: String(row.target_type ?? ""),
      targetId: String(row.target_id ?? ""),
      status: readStatus(row.status),
      requestedAt: String(row.requested_at ?? "")
    },
    action,
    reason: action === "adjust" ? reason : undefined,
    note: action === "uphold" ? reason : undefined,
    reviewerUserId: companyContext.user.id,
    resolvedAt
  });
  if (!outcome.ok) {
    return redirectWithError(request, outcome.code);
  }

  // 1. Record the outcome on the request row (status stays final afterwards).
  const update = await admin
    .from("human_review_requests")
    .update({
      status: outcome.status,
      outcome_reason: outcome.outcomeReason,
      outcome_payload: outcome.auditEvent.details,
      resolution_audit_event_id: outcome.auditEvent.audit_event_id,
      resolved_by: companyContext.user.id,
      resolved_at: resolvedAt,
      updated_at: resolvedAt
    })
    .eq("request_id", requestId)
    .eq("status", "open");
  if (update.error) {
    return redirectWithError(request, "review_outcome_update_failed");
  }

  // 2. A NEW audit record documents the human judgment. The original
  //    evaluator runs are intentionally never modified by this route.
  const auditInsert = await admin.from("candidate_audit_events").upsert(
    {
      user_id: String(row.user_id ?? ""),
      audit_event_id: outcome.auditEvent.audit_event_id,
      event_type: outcome.auditEvent.event_type,
      target_type: outcome.auditEvent.target_type,
      target_id: outcome.auditEvent.target_id,
      payload: outcome.auditEvent
    },
    { onConflict: "user_id,audit_event_id", ignoreDuplicates: true }
  );
  if (auditInsert.error) {
    logWarn("human_review_audit_insert_failed", {
      route: "/admin/review-queue",
      requestId,
      detail: auditInsert.error.message
    });
  }

  return NextResponse.redirect(
    new URL(`/admin/review-queue?resolved=${encodeURIComponent(requestId)}`, request.url),
    303
  );
}

function redirectWithError(request: NextRequest, code: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/admin/review-queue?error=${encodeURIComponent(code)}`, request.url),
    303
  );
}

function readAction(value: FormDataEntryValue | null): HumanReviewOutcomeAction | null {
  return value === "uphold" || value === "adjust" ? value : null;
}

function readStatus(value: unknown): "open" | "upheld" | "adjusted" {
  return value === "upheld" || value === "adjusted" ? value : "open";
}

function readFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}
