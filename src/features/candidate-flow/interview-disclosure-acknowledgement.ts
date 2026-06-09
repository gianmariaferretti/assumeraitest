export const INTERVIEW_AI_DISCLOSURE_VERSION = "interview-ai-disclosure-v1";

export const interviewDisclosureFieldNames = {
  acknowledged: "ai_interview_disclosure_acknowledged",
  candidateId: "candidate_id"
} as const;

export type InterviewDisclosureAcknowledgementInput = {
  readonly candidateId: string;
  readonly actorId: string;
  readonly acknowledgedAt: string;
  readonly correlationId: string;
  readonly disclosureVersion?: string;
};

export type InterviewDisclosureAcknowledgement = {
  readonly acknowledgementId: string;
  readonly candidateId: string;
  readonly actorId: string;
  readonly acknowledgedAt: string;
  readonly disclosureVersion: string;
  readonly auditEventId: string;
  readonly correlationId: string;
};

export type InterviewDisclosureAuditEvent = {
  readonly audit_event_id: string;
  readonly event_type: "consent.changed";
  readonly actor_type: "candidate";
  readonly actor_id: string;
  readonly occurred_at: string;
  readonly target_type: "interview_ai_disclosure";
  readonly target_id: string;
  readonly summary: string;
  readonly details: {
    readonly candidate_id: string;
    readonly disclosure_version: string;
    readonly ai_interview_acknowledged: true;
    readonly recommendation_only: true;
    readonly no_automatic_rejection: true;
    readonly no_biometric_emotion_personality_or_accent_scoring: true;
  };
  readonly visibility_scope: "candidate_visible";
  readonly correlation_id: string;
};

export function createInterviewDisclosureAcknowledgement(
  input: InterviewDisclosureAcknowledgementInput
): {
  readonly acknowledgement: InterviewDisclosureAcknowledgement;
  readonly auditEvent: InterviewDisclosureAuditEvent;
} {
  assertRequired(input.candidateId, "candidate ID");
  assertRequired(input.actorId, "actor ID");
  assertRequired(input.acknowledgedAt, "acknowledgement timestamp");
  assertRequired(input.correlationId, "correlation ID");

  const disclosureVersion =
    input.disclosureVersion ?? INTERVIEW_AI_DISCLOSURE_VERSION;
  const acknowledgementId = buildId("interview_ai_ack", input);
  const auditEventId = buildId("audit_interview_ai_ack", input);

  return {
    acknowledgement: {
      acknowledgementId,
      candidateId: input.candidateId,
      actorId: input.actorId,
      acknowledgedAt: input.acknowledgedAt,
      disclosureVersion,
      auditEventId,
      correlationId: input.correlationId
    },
    auditEvent: {
      audit_event_id: auditEventId,
      event_type: "consent.changed",
      actor_type: "candidate",
      actor_id: input.actorId,
      occurred_at: input.acknowledgedAt,
      target_type: "interview_ai_disclosure",
      target_id: acknowledgementId,
      summary: "Candidate acknowledged AI interview disclosure before starting.",
      details: {
        candidate_id: input.candidateId,
        disclosure_version: disclosureVersion,
        ai_interview_acknowledged: true,
        recommendation_only: true,
        no_automatic_rejection: true,
        no_biometric_emotion_personality_or_accent_scoring: true
      },
      visibility_scope: "candidate_visible",
      correlation_id: input.correlationId
    }
  };
}

export function readInterviewDisclosureAcknowledgementFromFormData(
  formData: FormData
): boolean {
  const value = formData.get(interviewDisclosureFieldNames.acknowledged);

  return (
    typeof value === "string" &&
    ["1", "accepted", "on", "true"].includes(value.trim().toLowerCase())
  );
}

function assertRequired(value: string, label: string) {
  if (value.trim().length === 0) {
    throw new Error(`Interview disclosure acknowledgement requires ${label}.`);
  }
}

function buildId(
  prefix: string,
  input: {
    readonly candidateId: string;
    readonly acknowledgedAt: string;
    readonly correlationId: string;
  }
): string {
  return `${prefix}_${sanitize(input.candidateId)}_${sanitize(
    input.acknowledgedAt
  )}_${sanitize(input.correlationId)}`;
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
