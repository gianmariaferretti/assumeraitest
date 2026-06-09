import { NextResponse, type NextRequest } from "next/server";

import {
  isAuthenticatedCandidateContext,
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { persistCandidateDataWorkflow } from "@/features/candidate-persistence/supabase-candidate-store";
import { persistCandidateMatchAcceptance } from "@/features/company-workspace";
import {
  DEFAULT_MATCH_SHARING_CATEGORIES,
  EXCLUDED_MATCH_SHARING_CATEGORIES
} from "@/features/matching/candidate-match-consent";

export async function POST(request: NextRequest) {
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    return NextResponse.json(
      {
        error: {
          code: candidateContext.code,
          message: candidateContext.message,
          status: candidateContext.status
        }
      },
      { status: candidateContext.status }
    );
  }
  if (!isAuthenticatedCandidateContext(candidateContext)) {
    return NextResponse.json(
      {
        error: {
          code: "candidate_auth_required",
          message: "Sign in as a candidate before sharing a company match.",
          status: 401
        }
      },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(payload)) {
    return invalidDecision("Match decision request requires a JSON object.");
  }

  const matchId = readString(payload.matchId);
  const companyId = readString(payload.companyId);
  const roleId = readString(payload.roleId);
  const decision = payload.decision === "accepted" || payload.decision === "declined"
    ? payload.decision
    : null;
  if (!matchId || !companyId || !roleId || !decision) {
    return invalidDecision(
      "Match decision requires matchId, companyId, roleId, and accepted or declined decision."
    );
  }

  const visibleMatchResult = await candidateContext.supabase
    .from("company_candidate_matches")
    .select("*")
    .eq("candidate_user_id", candidateContext.user.id)
    .eq("match_id", matchId)
    .eq("company_id", companyId)
    .eq("role_id", roleId)
    .eq("status", "candidate_visible")
    .maybeSingle();
  const visibleMatch = visibleMatchResult.error
    ? null
    : (visibleMatchResult.data as Record<string, unknown> | null);

  if (!visibleMatch) {
    return NextResponse.json(
      {
        error: {
          code: "candidate_match_not_visible",
          message:
            "This company-role match is not available for candidate sharing.",
          status: 403
        }
      },
      { status: 403 }
    );
  }

  const serverMatch = readServerMatchPayload(visibleMatch);
  const decidedAt = new Date().toISOString();
  const workflowId = `match_decision_${sanitizeId(matchId)}_${sanitizeId(decidedAt)}`;
  const consentRecordId =
    decision === "accepted" ? `consent_${sanitizeId(matchId)}_${sanitizeId(decidedAt)}` : null;
  const sharingSnapshotId =
    decision === "accepted" ? `snapshot_${sanitizeId(matchId)}_${sanitizeId(decidedAt)}` : null;
  const dataCategories = [...DEFAULT_MATCH_SHARING_CATEGORIES];
  const excludedCategories = [...EXCLUDED_MATCH_SHARING_CATEGORIES];
  const consentPersistenceTables = [
    "company_candidate_matches",
    "candidate_sharing_snapshots"
  ] as const;
  const auditEvent = {
    audit_event_id: `audit_${workflowId}`,
    event_type: "candidate_match.decision_recorded",
    actor_type: "candidate",
    actor_id: candidateContext.candidateId,
    occurred_at: decidedAt,
    target_type: "company_match",
    target_id: matchId,
    summary:
      decision === "accepted"
        ? "Candidate accepted scoped sharing for a specific company-role match."
        : "Candidate declined a company-role match; employer visibility remains blocked.",
    details: {
      match_id: matchId,
      decision,
      company_id: companyId,
      role_id: roleId,
      consent_record_id: consentRecordId,
      sharing_snapshot_id: sharingSnapshotId,
      data_categories: dataCategories,
      excluded_categories: excludedCategories,
      persistence_tables: [...consentPersistenceTables],
      employer_visible_without_consent: false,
      raw_cv_included: false,
      raw_interview_media_included: false,
      recommendation_only: true,
      requires_meaningful_human_review: true
    },
    visibility_scope: "candidate_visible",
    correlation_id: `candidate_match_${sanitizeId(matchId)}_${sanitizeId(decidedAt)}`
  };
  const workflowPayload = {
    matchId,
    decision,
    companyId,
    roleId,
    consentRecordId,
    sharingSnapshotId,
    dataCategories,
    excludedCategories,
    decidedAt,
    auditEventId: auditEvent.audit_event_id
  };

  await persistCandidateDataWorkflow(candidateContext, {
    workflowType: "match_decision",
    workflowId,
    workflowPayload,
    auditEvent
  });
  const companyPersistence = await persistCandidateMatchAcceptance(candidateContext, {
    matchId,
    companyId,
    roleId,
    roleTitle: serverMatch.roleTitle,
    companyName: serverMatch.companyName,
    decision,
    decidedAt,
    consentRecordId,
    sharingSnapshotId,
    auditEventId: auditEvent.audit_event_id,
    matchScore: serverMatch.matchScore,
    confidence: serverMatch.confidence,
    reasons: serverMatch.reasons,
    evidence: serverMatch.evidence,
    gaps: serverMatch.gaps,
    transcriptExcerpt: serverMatch.transcriptExcerpt,
    raw_cv_included: false,
    raw_interview_media_included: false
  });

  if (companyPersistence.status === "candidate_match_not_visible") {
    return NextResponse.json(
      {
        error: {
          code: "candidate_match_not_visible",
          message: companyPersistence.detail,
          status: 403
        }
      },
      { status: 403 }
    );
  }

  if (companyPersistence.status === "supabase_unavailable") {
    const companyPersistenceDetail =
      "detail" in companyPersistence ? companyPersistence.detail : undefined;

    return NextResponse.json(
      {
        error: {
          code: "candidate_match_company_persistence_failed",
          message:
            companyPersistenceDetail ??
            "Candidate sharing consent was recorded, but the company match row could not be updated.",
          status: 503
        }
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      decision: workflowPayload,
      audit_event: auditEvent
    },
    { status: 201 }
  );
}

function invalidDecision(message: string): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "candidate_match_decision_invalid",
        message,
        status: 400
      }
    },
    { status: 400 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readServerMatchPayload(row: Record<string, unknown>) {
  const profile = isRecord(row.shared_profile_payload)
    ? row.shared_profile_payload
    : {};
  const scorecard = isRecord(row.scorecard_payload) ? row.scorecard_payload : {};
  const evidencePayload = isRecord(row.evidence_payload) ? row.evidence_payload : {};
  const explanation = isRecord(evidencePayload.matchExplanation)
    ? evidencePayload.matchExplanation
    : {};
  const transcript = isRecord(row.transcript_payload) ? row.transcript_payload : {};
  const reasons =
    readStringArray(scorecard.reasons).length > 0
      ? readStringArray(scorecard.reasons)
      : readStringArray(explanation.supporting_evidence);
  const gaps =
    readStringArray(scorecard.gaps).length > 0
      ? readStringArray(scorecard.gaps)
      : readStringArray(explanation.missing_evidence);

  return {
    roleTitle: readString(profile.roleTitle) ?? readString(row.role_id),
    companyName: readString(profile.companyName) ?? readString(row.company_id),
    matchScore: readNumber(row.match_score) ?? readNumber(scorecard.matchScore),
    confidence: readNumber(row.match_confidence) ?? readNumber(scorecard.confidence),
    reasons,
    evidence: reasons,
    gaps,
    transcriptExcerpt: readString(transcript.transcriptExcerpt)
  };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
