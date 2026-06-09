import {
  isRetentionDeletionDue,
  parseRetentionConfig,
  type RetentionConfig
} from "./retention";

/**
 * Retention enforcement job (run by /api/cron/retention).
 *
 * Deletes raw CV bytes older than RETENTION_DAYS_RAW_CV and raw interview
 * media older than RETENTION_HOURS_RAW_MEDIA, writing one
 * candidate_audit_events record per deletion. Only the raw bytes are removed:
 * parsed profiles, transcripts, and scores keep their own retention clocks.
 *
 * All effects are injected so the job is fully unit-testable with a mocked
 * storage client; the production wiring lives in the cron route.
 */

export interface RawCvRetentionRecord {
  readonly userId: string;
  readonly candidateId: string;
  readonly resumeDocumentId: string;
  readonly uploadedAt: string;
  /** Bucket object key recorded at upload time (null for pasted text, etc.). */
  readonly objectKey: string | null;
  /** Storage provider that held the raw bytes (e.g. supabase_storage, in_memory). */
  readonly storageProvider: string | null;
  readonly rawDeletedAt: string | null;
  readonly legalHold?: boolean;
}

export interface RawMediaRetentionObject {
  readonly userId: string;
  /** Full bucket path of the media object. */
  readonly path: string;
  readonly createdAt: string;
  /** Retention anchor: latest processing timestamp when available. */
  readonly processedAt?: string;
}

export interface RetentionAuditEvent {
  readonly userId: string;
  readonly auditEventId: string;
  readonly eventType: "retention.raw_cv_deleted" | "retention.raw_media_deleted";
  readonly targetType: "ResumeDocument" | "RawInterviewMedia";
  readonly targetId: string;
  readonly payload: Record<string, unknown>;
}

export interface RetentionJobDeps {
  /** Raw CV rows not yet purged (the job re-checks due-ness itself). */
  listRawCvCandidates(): Promise<RawCvRetentionRecord[]>;
  /** Raw media objects currently in storage (empty when none are ever stored). */
  listRawMediaObjects(): Promise<RawMediaRetentionObject[]>;
  /** Delete bucket paths from the candidate-documents bucket. */
  deleteStorageObjects(paths: readonly string[]): Promise<void>;
  /** Mark the resume document row so the job never re-processes it. */
  markRawCvDeleted(
    record: RawCvRetentionRecord,
    deletedAt: string,
    auditEventId: string
  ): Promise<void>;
  insertAuditEvent(event: RetentionAuditEvent): Promise<void>;
}

export interface RunRetentionJobInput {
  readonly deps: RetentionJobDeps;
  readonly now?: string;
  readonly config?: RetentionConfig;
  readonly env?: Partial<Record<string, string | undefined>>;
}

export interface RetentionJobSummary {
  readonly ranAt: string;
  readonly rawCvDeleted: number;
  readonly rawMediaDeleted: number;
  readonly errors: string[];
}

/** Bucket path of a stored raw CV: {candidate_id}/{objectKey} (Phase 3 layout). */
export function rawCvBucketPath(record: RawCvRetentionRecord): string | null {
  if (!record.objectKey) {
    return null;
  }
  const candidateSegment = record.candidateId.replace(/[^a-zA-Z0-9_-]/g, "_") || "unknown";

  return `${candidateSegment}/${record.objectKey.replace(/^\/+/, "")}`;
}

export function isRawCvDeletionDue(
  record: RawCvRetentionRecord,
  now: string,
  config: RetentionConfig
): boolean {
  return isRetentionDeletionDue(
    {
      dataCategory: "raw_cv",
      createdAt: record.uploadedAt,
      deletedAt: record.rawDeletedAt,
      legalHold: record.legalHold
    },
    now,
    config
  );
}

export function isRawMediaDeletionDue(
  object: RawMediaRetentionObject,
  now: string,
  config: RetentionConfig
): boolean {
  return isRetentionDeletionDue(
    {
      dataCategory: "raw_interview_media",
      createdAt: object.createdAt,
      processedAt: object.processedAt
    },
    now,
    config
  );
}

function rawCvAuditEvent(
  record: RawCvRetentionRecord,
  deletedAt: string,
  config: RetentionConfig
): RetentionAuditEvent {
  return {
    userId: record.userId,
    auditEventId: `audit_retention_raw_cv_${sanitizeId(record.resumeDocumentId)}`,
    eventType: "retention.raw_cv_deleted",
    targetType: "ResumeDocument",
    targetId: record.resumeDocumentId,
    payload: {
      retention_policy: "raw_cv",
      retention_days: config.rawCvDays,
      uploaded_at: record.uploadedAt,
      deleted_at: deletedAt,
      object_path: rawCvBucketPath(record),
      storage_provider: record.storageProvider,
      parsed_profile_unaffected: true
    }
  };
}

function rawMediaAuditEvent(
  object: RawMediaRetentionObject,
  deletedAt: string,
  config: RetentionConfig
): RetentionAuditEvent {
  return {
    userId: object.userId,
    auditEventId: `audit_retention_raw_media_${sanitizeId(object.path)}`,
    eventType: "retention.raw_media_deleted",
    targetType: "RawInterviewMedia",
    targetId: object.path,
    payload: {
      retention_policy: "raw_interview_media",
      retention_hours: config.rawMediaHours,
      created_at: object.createdAt,
      deleted_at: deletedAt,
      object_path: object.path
    }
  };
}

export async function runRetentionJob(input: RunRetentionJobInput): Promise<RetentionJobSummary> {
  const now = input.now ?? new Date().toISOString();
  const config = input.config ?? parseRetentionConfig(input.env ?? process.env);
  const errors: string[] = [];
  let rawCvDeleted = 0;
  let rawMediaDeleted = 0;

  // --- Raw CVs ---------------------------------------------------------------
  let cvRecords: RawCvRetentionRecord[] = [];
  try {
    cvRecords = await input.deps.listRawCvCandidates();
  } catch (error) {
    errors.push(`list_raw_cv_failed: ${messageOf(error)}`);
  }

  for (const record of cvRecords) {
    if (!isRawCvDeletionDue(record, now, config)) {
      continue;
    }

    try {
      // Bytes live in the bucket only when the Supabase provider stored them;
      // in-memory uploads still get marked + audited so the row is settled.
      const path = record.storageProvider === "supabase_storage" ? rawCvBucketPath(record) : null;
      if (path) {
        await input.deps.deleteStorageObjects([path]);
      }

      const auditEvent = rawCvAuditEvent(record, now, config);
      await input.deps.markRawCvDeleted(record, now, auditEvent.auditEventId);
      await input.deps.insertAuditEvent(auditEvent);
      rawCvDeleted += 1;
    } catch (error) {
      errors.push(`raw_cv_${record.resumeDocumentId}: ${messageOf(error)}`);
    }
  }

  // --- Raw interview media -----------------------------------------------------
  let mediaObjects: RawMediaRetentionObject[] = [];
  try {
    mediaObjects = await input.deps.listRawMediaObjects();
  } catch (error) {
    errors.push(`list_raw_media_failed: ${messageOf(error)}`);
  }

  for (const object of mediaObjects) {
    if (!isRawMediaDeletionDue(object, now, config)) {
      continue;
    }

    try {
      await input.deps.deleteStorageObjects([object.path]);
      await input.deps.insertAuditEvent(rawMediaAuditEvent(object, now, config));
      rawMediaDeleted += 1;
    } catch (error) {
      errors.push(`raw_media_${object.path}: ${messageOf(error)}`);
    }
  }

  return { ranAt: now, rawCvDeleted, rawMediaDeleted, errors };
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}
