import type { StoredObject } from "../../lib/storage/storage-provider";

export type ResumeUploadActorType =
  | "candidate"
  | "employer_user"
  | "admin"
  | "system"
  | "reviewer";

export interface ResumeUploadActor {
  type: ResumeUploadActorType;
  id: string | null;
}

export interface ResumeUploadFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
  bytes?: Uint8Array;
}

export interface ResumeUploadConfig {
  allowedExtensions: readonly string[];
  allowedMimeTypes: readonly string[];
  maxFileBytes: number;
  rawCvRetentionDays: number;
}

export type ResumeUploadErrorCode =
  | "access_denied"
  | "file_too_large"
  | "missing_candidate"
  | "storage_failed"
  | "unsupported_file_type";

export interface SafeResumeUploadError {
  code: ResumeUploadErrorCode;
  message: string;
  status: number;
  correlationId?: string;
}

export type ResumeValidationResult =
  | { ok: true }
  | { ok: false; error: SafeResumeUploadError };

export interface ResumeDocumentMetadata {
  id: string;
  candidateId: string;
  file: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  storage: {
    provider: string;
    objectKey: string;
  };
  retention: {
    policy: "raw_cv";
    retentionDays: number;
    receivedAt: string;
    deleteAfter: string;
  };
  parsing: {
    status: "not_started";
    scoringAllowed: false;
  };
  candidateConfirmation: {
    required: true;
    status: "pending";
    handoffPath: string;
  };
  auditEventId: string;
}

export interface ResumeUploadAuditEvent {
  audit_event_id: string;
  event_type: "data.accessed";
  actor_type: ResumeUploadActorType;
  actor_id: string | null;
  occurred_at: string;
  target_type: "ResumeDocument";
  target_id: string;
  summary: string;
  details: {
    purpose: "resume_upload_ingestion";
    retention_policy: "raw_cv";
    retention_days: number;
    candidate_confirmation_required: true;
    scoring_allowed: false;
    storage_provider: string;
  };
  correlation_id: string;
}

export interface ResumeIngestionInput {
  actor: ResumeUploadActor;
  candidateId: string;
  file: Required<ResumeUploadFile>;
  config: ResumeUploadConfig;
  correlationId: string;
  now?: Date;
  idFactory?: (prefix: string) => string;
}

export type ResumeIngestionResult =
  | {
      ok: true;
      document: ResumeDocumentMetadata;
      auditEvent: ResumeUploadAuditEvent;
      storedObject: StoredObject;
    }
  | { ok: false; error: SafeResumeUploadError };
