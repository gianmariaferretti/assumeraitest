export type CandidateReviewRequestTarget =
  | "candidate_profile"
  | "resume_scorecard"
  | "interview_scorecard"
  | "company_match"
  | "data_access";

export type CandidateHumanReviewRequestStatus =
  | "queued"
  | "assigned"
  | "completed"
  | "closed";

export type CandidateHumanReviewRequestInput = {
  readonly candidateId: string;
  readonly requestedByActorId: string;
  readonly requestedAt: string;
  readonly targetType: CandidateReviewRequestTarget;
  readonly targetId: string;
  readonly summary: string;
  readonly evidenceNotes?: string;
  readonly correlationId: string;
};

export type CandidateHumanReviewRequest = {
  readonly humanReviewRequestId: string;
  readonly candidateId: string;
  readonly requestedByActorId: string;
  readonly requestedAt: string;
  readonly targetType: CandidateReviewRequestTarget;
  readonly targetId: string;
  readonly reviewReason: "candidate_request";
  readonly status: CandidateHumanReviewRequestStatus;
  readonly summary: string;
  readonly evidenceNotes: string | null;
  readonly recommendationOnly: true;
  readonly auditEventId: string;
  readonly correlationId: string;
};

export type CandidateHumanReviewAuditEvent = {
  readonly audit_event_id: string;
  readonly event_type: "human_review.requested";
  readonly actor_type: "candidate";
  readonly actor_id: string;
  readonly occurred_at: string;
  readonly target_type: CandidateReviewRequestTarget;
  readonly target_id: string;
  readonly summary: string;
  readonly details: {
    readonly human_review_request_id: string;
    readonly candidate_id: string;
    readonly review_reason: "candidate_request";
    readonly evidence_notes: string | null;
    readonly recommendation_only: true;
    readonly no_automatic_rejection: true;
  };
  readonly visibility_scope: "candidate_visible";
  readonly correlation_id: string;
};

export function createCandidateHumanReviewRequest(
  input: CandidateHumanReviewRequestInput
): {
  readonly request: CandidateHumanReviewRequest;
  readonly auditEvent: CandidateHumanReviewAuditEvent;
} {
  assertRequired(input.candidateId, "candidate ID");
  assertRequired(input.requestedByActorId, "requesting actor ID");
  assertRequired(input.requestedAt, "request timestamp");
  assertRequired(input.targetId, "review target ID");
  assertRequired(input.summary, "review summary");
  assertRequired(input.correlationId, "correlation ID");

  const auditEventId = buildId("audit_human_review_requested", input);
  const humanReviewRequestId = buildId("human_review_request", input);
  const evidenceNotes = normalizeOptional(input.evidenceNotes);
  const request: CandidateHumanReviewRequest = {
    humanReviewRequestId,
    candidateId: input.candidateId,
    requestedByActorId: input.requestedByActorId,
    requestedAt: input.requestedAt,
    targetType: input.targetType,
    targetId: input.targetId,
    reviewReason: "candidate_request",
    status: "queued",
    summary: input.summary.trim(),
    evidenceNotes,
    recommendationOnly: true,
    auditEventId,
    correlationId: input.correlationId
  };

  return {
    request,
    auditEvent: {
      audit_event_id: auditEventId,
      event_type: "human_review.requested",
      actor_type: "candidate",
      actor_id: input.requestedByActorId,
      occurred_at: input.requestedAt,
      target_type: input.targetType,
      target_id: input.targetId,
      summary: "Candidate requested meaningful human review.",
      details: {
        human_review_request_id: humanReviewRequestId,
        candidate_id: input.candidateId,
        review_reason: "candidate_request",
        evidence_notes: evidenceNotes,
        recommendation_only: true,
        no_automatic_rejection: true
      },
      visibility_scope: "candidate_visible",
      correlation_id: input.correlationId
    }
  };
}

function assertRequired(value: string, label: string) {
  if (value.trim().length === 0) {
    throw new Error(`Candidate human review request requires ${label}.`);
  }
}

function normalizeOptional(value?: string): string | null {
  const normalized = value?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function buildId(
  prefix: string,
  input: {
    readonly candidateId: string;
    readonly targetId: string;
    readonly requestedAt: string;
    readonly correlationId: string;
  }
): string {
  return `${prefix}_${sanitize(input.candidateId)}_${sanitize(
    input.targetId
  )}_${sanitize(input.requestedAt)}_${sanitize(input.correlationId)}`;
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
