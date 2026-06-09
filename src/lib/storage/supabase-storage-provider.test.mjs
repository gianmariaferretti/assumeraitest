import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  CANDIDATE_DOCUMENTS_BUCKET,
  SIGNED_READ_URL_TTL_SECONDS,
  SupabaseStorageProvider,
  candidateDocumentPath,
} = loadFromRepoRoot("src/lib/storage/supabase-storage-provider.ts");

function createMockClient() {
  const calls = { upload: [], download: [], remove: [], createSignedUrl: [], buckets: [] };
  const objects = new Map();

  const client = {
    storage: {
      from(bucket) {
        calls.buckets.push(bucket);
        return {
          async upload(path, body, options) {
            calls.upload.push({ path, body, options });
            objects.set(path, new Uint8Array(body));
            return { data: { path }, error: null };
          },
          async download(path) {
            calls.download.push(path);
            const bytes = objects.get(path);
            if (!bytes) {
              return { data: null, error: { message: "not found" } };
            }
            return {
              data: { arrayBuffer: async () => bytes.buffer.slice(0) },
              error: null,
            };
          },
          async remove(paths) {
            calls.remove.push([...paths]);
            for (const path of paths) {
              objects.delete(path);
            }
            return { data: paths, error: null };
          },
          async createSignedUrl(path, expiresIn) {
            calls.createSignedUrl.push({ path, expiresIn });
            return {
              data: { signedUrl: `https://signed.example/${path}?ttl=${expiresIn}` },
              error: null,
            };
          },
        };
      },
    },
  };

  return { client, calls, objects };
}

const INPUT = {
  objectKey: "candidates/cand_1/raw-resumes/doc_1/raw",
  bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  contentType: "application/pdf",
  metadata: { candidate_id: "cand_1", retention_policy: "raw_cv" },
};

test("objects are stored in the private bucket at {candidate_id}/{objectKey}", async () => {
  const { client, calls } = createMockClient();
  const provider = new SupabaseStorageProvider({ client });

  const stored = await provider.putObject(INPUT);

  assert.equal(calls.buckets[0], CANDIDATE_DOCUMENTS_BUCKET);
  assert.equal(calls.upload.length, 1);
  assert.equal(calls.upload[0].path, "cand_1/candidates/cand_1/raw-resumes/doc_1/raw");
  assert.equal(calls.upload[0].options.contentType, "application/pdf");
  assert.equal(calls.upload[0].options.upsert, true);
  assert.equal(stored.provider, "supabase_storage");
  assert.ok(stored.storedAt);
});

test("getObject round-trips the stored bytes", async () => {
  const { client } = createMockClient();
  const provider = new SupabaseStorageProvider({ client });

  await provider.putObject(INPUT);
  const bytes = await provider.getObject("cand_1", INPUT.objectKey);

  assert.deepEqual([...bytes], [0x25, 0x50, 0x44, 0x46]);
  assert.equal(await provider.getObject("cand_1", "missing/key"), undefined);
});

test("deleteObject removes the bucket path", async () => {
  const { client, calls } = createMockClient();
  const provider = new SupabaseStorageProvider({ client });

  await provider.putObject(INPUT);
  await provider.deleteObject("cand_1", INPUT.objectKey);

  assert.deepEqual(calls.remove[0], ["cand_1/candidates/cand_1/raw-resumes/doc_1/raw"]);
  assert.equal(await provider.getObject("cand_1", INPUT.objectKey), undefined);
});

test("reads for humans are short-lived signed URLs", async () => {
  const { client, calls } = createMockClient();
  const provider = new SupabaseStorageProvider({ client });

  const url = await provider.createSignedReadUrl("cand_1", INPUT.objectKey);

  assert.ok(url.startsWith("https://signed.example/cand_1/candidates/"));
  assert.equal(calls.createSignedUrl[0].expiresIn, SIGNED_READ_URL_TTL_SECONDS);
});

test("upload errors surface instead of silently dropping documents", async () => {
  const failingClient = {
    storage: {
      from() {
        return {
          async upload() {
            return { data: null, error: { message: "bucket missing" } };
          },
        };
      },
    },
  };
  const provider = new SupabaseStorageProvider({ client: failingClient });

  await assert.rejects(() => provider.putObject(INPUT), /bucket missing/);
});

test("candidate path segments are sanitized and never empty", () => {
  assert.equal(candidateDocumentPath("cand_1", "a/b"), "cand_1/a/b");
  assert.equal(candidateDocumentPath("../../etc", "a"), "______etc/a");
  assert.equal(candidateDocumentPath("", "a"), "unknown/a");
  assert.equal(candidateDocumentPath("cand_1", "/leading/slash"), "cand_1/leading/slash");
});
