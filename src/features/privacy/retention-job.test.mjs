import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  isRawCvDeletionDue,
  isRawMediaDeletionDue,
  rawCvBucketPath,
  runRetentionJob,
} = loadFromRepoRoot("src/features/privacy/retention-job.ts");
const { DEFAULT_RETENTION_CONFIG } = loadFromRepoRoot("src/features/privacy/retention.ts");

const NOW = "2026-06-09T12:00:00.000Z";
const daysAgo = (days) =>
  new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (hours) => new Date(Date.parse(NOW) - hours * 60 * 60 * 1000).toISOString();

function cvRecord(overrides = {}) {
  return {
    userId: "user_1",
    candidateId: "cand_1",
    resumeDocumentId: "doc_1",
    uploadedAt: daysAgo(31),
    objectKey: "candidates/cand_1/raw-resumes/doc_1/raw",
    storageProvider: "supabase_storage",
    rawDeletedAt: null,
    ...overrides,
  };
}

function createDeps({ cvs = [], media = [] } = {}) {
  const calls = { deleted: [], marked: [], audits: [] };
  const deps = {
    async listRawCvCandidates() {
      return cvs;
    },
    async listRawMediaObjects() {
      return media;
    },
    async deleteStorageObjects(paths) {
      calls.deleted.push(...paths);
    },
    async markRawCvDeleted(record, deletedAt, auditEventId) {
      calls.marked.push({ resumeDocumentId: record.resumeDocumentId, deletedAt, auditEventId });
    },
    async insertAuditEvent(event) {
      calls.audits.push(event);
    },
  };

  return { deps, calls };
}

// ---------------------------------------------------------------------------
// Selection logic
// ---------------------------------------------------------------------------

test("raw CVs are due exactly after RETENTION_DAYS_RAW_CV, and never twice", () => {
  const config = DEFAULT_RETENTION_CONFIG; // 30 days
  assert.equal(isRawCvDeletionDue(cvRecord({ uploadedAt: daysAgo(31) }), NOW, config), true);
  assert.equal(isRawCvDeletionDue(cvRecord({ uploadedAt: daysAgo(30) }), NOW, config), true);
  assert.equal(isRawCvDeletionDue(cvRecord({ uploadedAt: daysAgo(29) }), NOW, config), false);
  assert.equal(
    isRawCvDeletionDue(cvRecord({ rawDeletedAt: daysAgo(1) }), NOW, config),
    false,
    "already-purged rows are never re-processed",
  );
  assert.equal(
    isRawCvDeletionDue(cvRecord({ legalHold: true }), NOW, config),
    false,
    "legal hold blocks deletion",
  );
});

test("raw media is due after RETENTION_HOURS_RAW_MEDIA from processing", () => {
  const config = DEFAULT_RETENTION_CONFIG; // 24 hours
  const fresh = { userId: "u", path: "u/media/1", createdAt: hoursAgo(2) };
  const stale = { userId: "u", path: "u/media/2", createdAt: hoursAgo(25) };
  const reprocessed = {
    userId: "u",
    path: "u/media/3",
    createdAt: hoursAgo(48),
    processedAt: hoursAgo(3),
  };

  assert.equal(isRawMediaDeletionDue(fresh, NOW, config), false);
  assert.equal(isRawMediaDeletionDue(stale, NOW, config), true);
  assert.equal(
    isRawMediaDeletionDue(reprocessed, NOW, config),
    false,
    "the retention clock anchors on the latest processing timestamp",
  );
});

test("the bucket path mirrors the Phase 3 layout {candidate_id}/{objectKey}", () => {
  assert.equal(
    rawCvBucketPath(cvRecord()),
    "cand_1/candidates/cand_1/raw-resumes/doc_1/raw",
  );
  assert.equal(rawCvBucketPath(cvRecord({ objectKey: null })), null);
});

// ---------------------------------------------------------------------------
// Job behavior with mocked storage
// ---------------------------------------------------------------------------

test("expired raw CVs are deleted from storage, marked, and audited", async () => {
  const { deps, calls } = createDeps({
    cvs: [
      cvRecord({ resumeDocumentId: "doc_old", uploadedAt: daysAgo(40) }),
      cvRecord({ resumeDocumentId: "doc_fresh", uploadedAt: daysAgo(3) }),
    ],
  });

  const summary = await runRetentionJob({ deps, now: NOW });

  assert.equal(summary.rawCvDeleted, 1);
  assert.deepEqual(summary.errors, []);
  assert.deepEqual(calls.deleted, ["cand_1/candidates/cand_1/raw-resumes/doc_1/raw"]);
  assert.equal(calls.marked.length, 1);
  assert.equal(calls.marked[0].resumeDocumentId, "doc_old");
  assert.equal(calls.marked[0].deletedAt, NOW);

  assert.equal(calls.audits.length, 1);
  const audit = calls.audits[0];
  assert.equal(audit.eventType, "retention.raw_cv_deleted");
  assert.equal(audit.targetType, "ResumeDocument");
  assert.equal(audit.targetId, "doc_old");
  assert.equal(audit.userId, "user_1");
  assert.equal(audit.auditEventId, calls.marked[0].auditEventId);
  assert.equal(audit.payload.retention_days, 30);
  assert.equal(audit.payload.deleted_at, NOW);
  assert.equal(audit.payload.parsed_profile_unaffected, true);
});

test("in-memory uploads are marked and audited without touching the bucket", async () => {
  const { deps, calls } = createDeps({
    cvs: [cvRecord({ storageProvider: "in_memory", uploadedAt: daysAgo(40) })],
  });

  const summary = await runRetentionJob({ deps, now: NOW });

  assert.equal(summary.rawCvDeleted, 1);
  assert.deepEqual(calls.deleted, [], "no storage delete for bytes that never hit the bucket");
  assert.equal(calls.marked.length, 1);
  assert.equal(calls.audits.length, 1);
});

test("expired raw media is deleted with its own audit event", async () => {
  const { deps, calls } = createDeps({
    media: [
      { userId: "user_1", path: "cand_1/media/old.webm", createdAt: hoursAgo(30) },
      { userId: "user_1", path: "cand_1/media/new.webm", createdAt: hoursAgo(1) },
    ],
  });

  const summary = await runRetentionJob({ deps, now: NOW });

  assert.equal(summary.rawMediaDeleted, 1);
  assert.deepEqual(calls.deleted, ["cand_1/media/old.webm"]);
  assert.equal(calls.audits.length, 1);
  assert.equal(calls.audits[0].eventType, "retention.raw_media_deleted");
  assert.equal(calls.audits[0].targetType, "RawInterviewMedia");
  assert.equal(calls.audits[0].payload.retention_hours, 24);
});

test("a failing deletion is reported per item and never aborts the run", async () => {
  let attempts = 0;
  const { deps, calls } = createDeps({
    cvs: [
      cvRecord({ resumeDocumentId: "doc_a", uploadedAt: daysAgo(40) }),
      cvRecord({ resumeDocumentId: "doc_b", uploadedAt: daysAgo(40) }),
    ],
  });
  const flaky = {
    ...deps,
    async deleteStorageObjects(paths) {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("bucket hiccup");
      }
      return deps.deleteStorageObjects(paths);
    },
  };

  const summary = await runRetentionJob({ deps: flaky, now: NOW });

  assert.equal(summary.rawCvDeleted, 1);
  assert.equal(summary.errors.length, 1);
  assert.match(summary.errors[0], /doc_a: bucket hiccup/);
  assert.equal(calls.marked.length, 1, "the failed item is not marked as deleted");
});

test("retention windows honor env overrides", async () => {
  const { deps, calls } = createDeps({
    cvs: [cvRecord({ uploadedAt: daysAgo(8) })],
  });

  const summary = await runRetentionJob({
    deps,
    now: NOW,
    env: { RETENTION_DAYS_RAW_CV: "7", RETENTION_HOURS_RAW_MEDIA: "1" },
  });

  assert.equal(summary.rawCvDeleted, 1);
  assert.equal(calls.audits[0].payload.retention_days, 7);
});
