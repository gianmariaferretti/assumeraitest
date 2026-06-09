import type { PrivacyDataCategory } from "./consent";

export type AuditEventType =
  | "data_export.requested"
  | "data_deletion.requested";

export type PrivacyAuditEvent = {
  audit_event_id: string;
  event_type: AuditEventType;
  actor_type: "candidate" | "admin" | "system";
  actor_id: string | null;
  occurred_at: string;
  target_type: "candidate";
  target_id: string;
  summary: string;
  details: Record<string, unknown>;
  correlation_id: string;
};

export type DataRightsStatus = "queued" | "processing" | "completed" | "rejected";

export type CandidateDataExportRequest = {
  exportRequestId: string;
  candidateId: string;
  requestedAt: string;
  requestedByActorId: string;
  status: DataRightsStatus;
  dataCategories: PrivacyDataCategory[];
  auditEventId: string;
  correlationId: string;
};

export type CandidateDataDeletionRequest = {
  deletionRequestId: string;
  candidateId: string;
  requestedAt: string;
  requestedByActorId: string;
  status: DataRightsStatus;
  deletionTargets: PrivacyDataCategory[];
  auditRetention: "preserve_minimal_audit_record";
  auditEventId: string;
  correlationId: string;
};

export type CandidateDataExportInput = {
  candidateId: string;
  requestedByActorId: string;
  requestedAt: string;
  correlationId: string;
  dataCategories?: PrivacyDataCategory[];
};

export type CandidateDataDeletionInput = {
  candidateId: string;
  requestedByActorId: string;
  requestedAt: string;
  correlationId: string;
  deletionTargets?: PrivacyDataCategory[];
};

export const DEFAULT_EXPORT_DATA_CATEGORIES: PrivacyDataCategory[] = [
  "candidate_profile",
  "raw_cv",
  "resume_parse",
  "scorecard",
  "interview_transcript",
  "match_explanation",
  "company_match",
  "human_review",
  "consent_records",
  "audit_metadata",
];

export const DEFAULT_DELETION_TARGETS: PrivacyDataCategory[] = [
  "candidate_profile",
  "raw_cv",
  "resume_parse",
  "scorecard",
  "interview_transcript",
  "raw_interview_media",
  "match_explanation",
  "company_match",
  "human_review",
  "consent_records",
];

export function createCandidateDataExportRequest(
  input: CandidateDataExportInput,
): {
  request: CandidateDataExportRequest;
  auditEvent: PrivacyAuditEvent;
} {
  const auditEventId = buildId("audit_export", input);
  const request: CandidateDataExportRequest = {
    exportRequestId: buildId("export", input),
    candidateId: input.candidateId,
    requestedAt: input.requestedAt,
    requestedByActorId: input.requestedByActorId,
    status: "queued",
    dataCategories: input.dataCategories ?? DEFAULT_EXPORT_DATA_CATEGORIES,
    auditEventId,
    correlationId: input.correlationId,
  };

  return {
    request,
    auditEvent: {
      audit_event_id: auditEventId,
      event_type: "data_export.requested",
      actor_type: "candidate",
      actor_id: input.requestedByActorId,
      occurred_at: input.requestedAt,
      target_type: "candidate",
      target_id: input.candidateId,
      summary: "Candidate data export requested.",
      details: {
        export_request_id: request.exportRequestId,
        data_categories: request.dataCategories,
      },
      correlation_id: input.correlationId,
    },
  };
}

export function createCandidateDataDeletionRequest(
  input: CandidateDataDeletionInput,
): {
  request: CandidateDataDeletionRequest;
  auditEvent: PrivacyAuditEvent;
} {
  const auditEventId = buildId("audit_delete", input);
  const request: CandidateDataDeletionRequest = {
    deletionRequestId: buildId("delete", input),
    candidateId: input.candidateId,
    requestedAt: input.requestedAt,
    requestedByActorId: input.requestedByActorId,
    status: "queued",
    deletionTargets: input.deletionTargets ?? DEFAULT_DELETION_TARGETS,
    auditRetention: "preserve_minimal_audit_record",
    auditEventId,
    correlationId: input.correlationId,
  };

  return {
    request,
    auditEvent: {
      audit_event_id: auditEventId,
      event_type: "data_deletion.requested",
      actor_type: "candidate",
      actor_id: input.requestedByActorId,
      occurred_at: input.requestedAt,
      target_type: "candidate",
      target_id: input.candidateId,
      summary: "Candidate data deletion requested.",
      details: {
        deletion_request_id: request.deletionRequestId,
        deletion_targets: request.deletionTargets,
        audit_retention: request.auditRetention,
      },
      correlation_id: input.correlationId,
    },
  };
}

function buildId(
  prefix: string,
  input: {
    candidateId: string;
    requestedAt: string;
    correlationId: string;
  },
): string {
  return `${prefix}_${sanitize(input.candidateId)}_${sanitize(
    input.requestedAt,
  )}_${sanitize(input.correlationId)}`;
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
