import { NextResponse, type NextRequest } from "next/server";

import {
  runRetentionJob,
  type RawCvRetentionRecord,
  type RetentionJobDeps
} from "@/features/privacy/retention-job";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SupabaseStorageProvider,
  type SupabaseStorageClientLike
} from "@/lib/storage/supabase-storage-provider";

export const runtime = "nodejs";

const MAX_ROWS_PER_RUN = 500;

/**
 * Retention enforcement cron (vercel.json schedules it daily).
 *
 * Protected by CRON_SECRET: requests must carry it as `Authorization: Bearer`
 * (what Vercel sends) or an `x-cron-secret` header. Fails closed when the
 * secret is not configured.
 */
export async function GET(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      {
        error: {
          code: "cron_secret_not_configured",
          message: "Retention cron is disabled until CRON_SECRET is configured.",
          status: 503
        }
      },
      { status: 503 }
    );
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  if (bearer !== configuredSecret && headerSecret !== configuredSecret) {
    return NextResponse.json(
      {
        error: {
          code: "cron_unauthorized",
          message: "A valid CRON_SECRET is required.",
          status: 401
        }
      },
      { status: 401 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "service_role_not_configured",
          message: "Retention requires the Supabase service role.",
          status: 503
        }
      },
      { status: 503 }
    );
  }

  const summary = await runRetentionJob({ deps: createSupabaseRetentionDeps(admin) });

  return NextResponse.json(
    {
      ran_at: summary.ranAt,
      raw_cv_deleted: summary.rawCvDeleted,
      raw_media_deleted: summary.rawMediaDeleted,
      errors: summary.errors
    },
    { status: summary.errors.length > 0 ? 207 : 200 }
  );
}

function createSupabaseRetentionDeps(admin: ReturnType<typeof createAdminClient>): RetentionJobDeps {
  const storage = new SupabaseStorageProvider({
    client: admin as unknown as SupabaseStorageClientLike
  });

  return {
    async listRawCvCandidates() {
      const { data, error } = await admin
        .from("candidate_resume_documents")
        .select("user_id,resume_document_id,uploaded_at,resume_document,raw_deleted_at")
        .is("raw_deleted_at", null)
        .order("uploaded_at", { ascending: true })
        .limit(MAX_ROWS_PER_RUN);
      if (error || !data) {
        throw new Error(error?.message ?? "candidate_resume_documents read failed");
      }

      return (data as Record<string, unknown>[]).map(rawCvRecordFromRow);
    },

    async listRawMediaObjects() {
      // No raw interview media is ever persisted today (the live-interview
      // provider stores transcripts only and deletes raw media immediately);
      // the job still enforces the policy the moment a writer appears.
      return [];
    },

    async deleteStorageObjects(paths) {
      await storage.deleteObjectPaths(paths);
    },

    async markRawCvDeleted(record, deletedAt, auditEventId) {
      const { error } = await admin
        .from("candidate_resume_documents")
        .update({ raw_deleted_at: deletedAt, raw_deleted_audit_event_id: auditEventId })
        .eq("user_id", record.userId)
        .eq("resume_document_id", record.resumeDocumentId);
      if (error) {
        throw new Error(error.message);
      }
    },

    async insertAuditEvent(event) {
      const { error } = await admin.from("candidate_audit_events").upsert(
        {
          user_id: event.userId,
          audit_event_id: event.auditEventId,
          event_type: event.eventType,
          target_type: event.targetType,
          target_id: event.targetId,
          payload: event.payload
        },
        { onConflict: "user_id,audit_event_id", ignoreDuplicates: true }
      );
      if (error) {
        throw new Error(error.message);
      }
    }
  };
}

function rawCvRecordFromRow(row: Record<string, unknown>): RawCvRetentionRecord {
  const document = isRecord(row.resume_document) ? row.resume_document : {};
  const storage = isRecord(document.storage) ? document.storage : {};
  const userId = String(row.user_id ?? "");

  return {
    userId,
    candidateId:
      typeof document.candidateId === "string" && document.candidateId.length > 0
        ? document.candidateId
        : userId,
    resumeDocumentId: String(row.resume_document_id ?? ""),
    uploadedAt: String(row.uploaded_at ?? ""),
    objectKey: typeof storage.objectKey === "string" ? storage.objectKey : null,
    storageProvider: typeof storage.provider === "string" ? storage.provider : null,
    rawDeletedAt:
      typeof row.raw_deleted_at === "string" && row.raw_deleted_at.length > 0
        ? row.raw_deleted_at
        : null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
