import { NextResponse, type NextRequest } from "next/server";

import {
  isCompanyContextError,
  recordCompanyMatchDecision,
  resolveCompanyRouteContext
} from "@/features/company-workspace";

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ readonly matchId: string }> }
) {
  const { matchId } = await params;
  const companyContext = await resolveCompanyRouteContext(`/company/review/${matchId}`);
  if (isCompanyContextError(companyContext)) {
    return respondToDecisionRequest(request, {
      redirectPath: decisionErrorPath(matchId, companyContext.code),
      status: companyContext.status,
      payload: {
        error: {
          code: companyContext.code,
          message: companyContext.message,
          status: companyContext.status
        }
      }
    });
  }

  const payload = await readDecisionPayload(request);
  const action = readAction(payload.action);
  if (!action) {
    return respondToDecisionRequest(request, {
      redirectPath: decisionErrorPath(matchId, "company_decision_invalid_action"),
      status: 400,
      payload: {
        error: {
          code: "company_decision_invalid_action",
          message: "Choose advance, hold, or decline.",
          status: 400
        }
      }
    });
  }

  const matchResult = await companyContext.supabase
    .from("company_candidate_matches")
    .select("match_id,company_id,role_id,status,review_due_at")
    .eq("company_id", companyContext.companyId)
    .eq("match_id", matchId)
    .maybeSingle();
  const matchRow = matchResult.error
    ? null
    : (matchResult.data as Record<string, unknown> | null);

  if (!matchRow) {
    return respondToDecisionRequest(request, {
      redirectPath: decisionErrorPath(matchId, "company_match_not_found"),
      status: 404,
      payload: {
        error: {
          code: "company_match_not_found",
          message: "No consent-approved candidate match was found for this company.",
          status: 404
        }
      }
    });
  }

  const decisionResult = recordCompanyMatchDecision({
    action,
    matchId,
    companyId: companyContext.companyId,
    roleId: readString(matchRow.role_id) ?? "",
    reviewerUserId: companyContext.user.id,
    reason: readString(payload.reason),
    nextStep: readString(payload.nextStep),
    followUpAt: normalizeFollowUp(payload.followUpAt),
    currentStatus: readString(matchRow.status) as never,
    reviewDueAt: readString(matchRow.review_due_at) ?? null
  });

  if (!decisionResult.ok) {
    return respondToDecisionRequest(request, {
      redirectPath: decisionErrorPath(matchId, "company_decision_invalid"),
      status: 400,
      payload: {
        error: {
          code: "company_decision_invalid",
          message: decisionResult.issues.map((issue) => issue.message).join(" "),
          status: 400
        }
      }
    });
  }

  const decision = decisionResult.value;
  const decisionInsert = await companyContext.supabase
    .from("company_review_decisions")
    .insert(decision.decisionRecord);
  if (decisionInsert.error) {
    return respondToDecisionRequest(request, {
      redirectPath: decisionErrorPath(matchId, "company_decision_insert_failed"),
      status: 503,
      payload: {
        error: {
          code: "company_decision_insert_failed",
          message: decisionInsert.error.message,
          status: 503
        }
      }
    });
  }

  const auditInsert = await companyContext.supabase.from("company_audit_events").insert({
    company_id: companyContext.companyId,
    actor_user_id: companyContext.user.id,
    audit_event_id: decision.auditEvent.audit_event_id,
    event_type: decision.auditEvent.event_type,
    target_type: "company_candidate_match",
    target_id: matchId,
    payload: decision.auditEvent
  });
  if (auditInsert.error) {
    return respondToDecisionRequest(request, {
      redirectPath: decisionErrorPath(matchId, "company_audit_event_insert_failed"),
      status: 503,
      payload: {
        error: {
          code: "company_audit_event_insert_failed",
          message: auditInsert.error.message,
          status: 503
        }
      }
    });
  }

  const updateResult = await companyContext.supabase
    .from("company_candidate_matches")
    .update({
      status: decision.status,
      company_decision_reason: decision.reason,
      company_next_step: decision.nextStep,
      company_follow_up_at: decision.followUpAt,
      company_decision_at: decision.decidedAt,
      company_decided_by: companyContext.user.id,
      contact_visibility: decision.contactVisibility,
      updated_at: decision.decidedAt
    })
    .eq("company_id", companyContext.companyId)
    .eq("match_id", matchId);

  if (updateResult.error) {
    return respondToDecisionRequest(request, {
      redirectPath: decisionErrorPath(matchId, "company_match_update_failed"),
      status: 503,
      payload: {
        error: {
          code: "company_match_update_failed",
          message: updateResult.error.message,
          status: 503
        }
      }
    });
  }

  return respondToDecisionRequest(request, {
    status: 201,
    payload: {
      decision,
      audit_event: decision.auditEvent
    },
    redirectPath: `/company/review/${matchId}`
  });
}

async function readDecisionPayload(
  request: NextRequest
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => null)) as unknown;
    return isRecord(payload) ? payload : {};
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

function respondToDecisionRequest(
  request: NextRequest,
  input: {
    readonly status: number;
    readonly payload: Record<string, unknown>;
    readonly redirectPath?: string;
  }
) {
  const acceptsJson = request.headers.get("accept")?.includes("application/json");
  if (!acceptsJson && input.redirectPath) {
    return NextResponse.redirect(new URL(input.redirectPath, request.url), 303);
  }

  return NextResponse.json(input.payload, { status: input.status });
}

function decisionErrorPath(matchId: string, code: string): string {
  return `/company/review/${matchId}?error=${encodeURIComponent(code)}`;
}

function readAction(value: unknown) {
  return value === "advance" || value === "hold" || value === "decline"
    ? value
    : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeFollowUp(value: unknown): string | undefined {
  const text = readString(value);
  if (!text) {
    return undefined;
  }

  return text.includes("T") ? text : `${text}T09:00:00.000Z`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
