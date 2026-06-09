import type {
  ResumeDocumentMetadata,
  ResumeUploadActor,
  ResumeUploadAuditEvent
} from "./types";

interface CreateResumeUploadAuditEventInput {
  actor: ResumeUploadActor;
  document: ResumeDocumentMetadata;
  correlationId: string;
  occurredAt: string;
  auditEventId: string;
}

export function createResumeUploadAuditEvent({
  actor,
  document,
  correlationId,
  occurredAt,
  auditEventId
}: CreateResumeUploadAuditEventInput): ResumeUploadAuditEvent {
  return {
    audit_event_id: auditEventId,
    event_type: "data.accessed",
    actor_type: actor.type,
    actor_id: actor.id,
    occurred_at: occurredAt,
    target_type: "ResumeDocument",
    target_id: document.id,
    summary:
      "Candidate uploaded a raw resume document for retention-limited ingestion.",
    details: {
      purpose: "resume_upload_ingestion",
      retention_policy: "raw_cv",
      retention_days: document.retention.retentionDays,
      candidate_confirmation_required: true,
      scoring_allowed: false,
      storage_provider: document.storage.provider
    },
    correlation_id: correlationId
  };
}
