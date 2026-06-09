import type { StorageProvider } from "../../lib/storage/storage-provider";

import { validateCandidateUploadAccess } from "./access";
import { createResumeUploadAuditEvent } from "./audit";
import { createSafeResumeUploadError } from "./errors";
import type {
  ResumeDocumentMetadata,
  ResumeIngestionInput,
  ResumeIngestionResult
} from "./types";
import { validateResumeFile } from "./validation";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function ingestResumeDocument(
  input: ResumeIngestionInput,
  storage: StorageProvider
): Promise<ResumeIngestionResult> {
  const accessError = validateCandidateUploadAccess(
    input.actor,
    input.candidateId,
    input.correlationId
  );
  if (accessError) {
    return { ok: false, error: accessError };
  }

  const validation = validateResumeFile(input.file, input.config);
  if (!validation.ok) {
    return {
      ok: false,
      error: {
        ...validation.error,
        correlationId: input.correlationId
      }
    };
  }

  const now = input.now ?? new Date();
  const receivedAt = now.toISOString();
  const deleteAfter = new Date(
    now.getTime() + input.config.rawCvRetentionDays * DAY_IN_MS
  ).toISOString();
  const documentId = createId("resume_doc", input.idFactory);
  const objectKey = createRawResumeObjectKey(input.candidateId, documentId);

  try {
    const storedObject = await storage.putObject({
      objectKey,
      bytes: input.file.bytes,
      contentType: input.file.mimeType,
      metadata: {
        candidate_id: input.candidateId,
        document_id: documentId,
        retention_policy: "raw_cv",
        delete_after: deleteAfter,
        candidate_confirmation_required: true,
        scoring_allowed: false
      }
    });

    const auditEventId = createId("audit_evt", input.idFactory);
    const document: ResumeDocumentMetadata = {
      id: documentId,
      candidateId: input.candidateId,
      file: {
        originalName: input.file.name,
        mimeType: input.file.mimeType,
        sizeBytes: input.file.sizeBytes
      },
      storage: {
        provider: storedObject.provider,
        objectKey
      },
      retention: {
        policy: "raw_cv",
        retentionDays: input.config.rawCvRetentionDays,
        receivedAt,
        deleteAfter
      },
      parsing: {
        status: "not_started",
        scoringAllowed: false
      },
      candidateConfirmation: {
        required: true,
        status: "pending",
        handoffPath: `/candidate/profile/confirm?resumeDocumentId=${encodeURIComponent(
          documentId
        )}`
      },
      auditEventId
    };
    const auditEvent = createResumeUploadAuditEvent({
      actor: input.actor,
      document,
      correlationId: input.correlationId,
      occurredAt: receivedAt,
      auditEventId
    });

    return { ok: true, document, auditEvent, storedObject };
  } catch {
    return {
      ok: false,
      error: createSafeResumeUploadError("storage_failed", input.correlationId)
    };
  }
}

function createRawResumeObjectKey(candidateId: string, documentId: string): string {
  return [
    "candidates",
    sanitizeObjectKeySegment(candidateId),
    "raw-resumes",
    sanitizeObjectKeySegment(documentId),
    "raw"
  ].join("/");
}

function sanitizeObjectKeySegment(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, "_");
  return sanitized.length > 0 ? sanitized : "unknown";
}

function createId(prefix: string, idFactory?: (prefix: string) => string): string {
  if (idFactory) {
    return idFactory(prefix);
  }

  return `${prefix}_${randomUuid()}`;
}

function randomUuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
}
