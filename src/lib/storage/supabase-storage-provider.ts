import type { StorageObjectInput, StorageProvider, StoredObject } from "./storage-provider";

/**
 * Supabase Storage implementation of the StorageProvider seam.
 *
 * Objects live in the private "candidate-documents" bucket under
 * {candidate_id}/{objectKey}: the first path folder is the owning candidate,
 * which is what the storage RLS owner-read policy keys on. All writes and
 * deletes go through the service role; reads for humans are short-lived
 * signed URLs minted server-side.
 *
 * The client is injectable (tests pass a mock); when omitted, the Supabase
 * admin client is imported lazily so this module never drags server-only
 * imports into unit tests.
 */

export const CANDIDATE_DOCUMENTS_BUCKET = "candidate-documents";
export const SIGNED_READ_URL_TTL_SECONDS = 300;

type StorageResult<T> = Promise<{
  readonly data: T | null;
  readonly error: { readonly message?: string } | null;
}>;

export interface SupabaseStorageBucketApi {
  upload(
    path: string,
    body: Uint8Array | ArrayBuffer,
    options?: {
      readonly contentType?: string;
      readonly upsert?: boolean;
      readonly metadata?: Record<string, unknown>;
    }
  ): StorageResult<unknown>;
  download(path: string): StorageResult<{ arrayBuffer(): Promise<ArrayBuffer> }>;
  remove(paths: readonly string[]): StorageResult<unknown>;
  createSignedUrl(path: string, expiresIn: number): StorageResult<{ signedUrl: string }>;
}

export interface SupabaseStorageClientLike {
  readonly storage: {
    from(bucket: string): SupabaseStorageBucketApi;
  };
}

export interface SupabaseStorageProviderOptions {
  readonly client?: SupabaseStorageClientLike;
  readonly bucket?: string;
}

/** Bucket path for a candidate document: {candidate_id}/{objectKey}. */
export function candidateDocumentPath(candidateId: string, objectKey: string): string {
  return `${sanitizePathSegment(candidateId)}/${objectKey.replace(/^\/+/, "")}`;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, "_");
  return sanitized.length > 0 ? sanitized : "unknown";
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly providerName = "supabase_storage";

  private readonly bucket: string;
  private client: SupabaseStorageClientLike | undefined;

  constructor(options: SupabaseStorageProviderOptions = {}) {
    this.bucket = options.bucket ?? CANDIDATE_DOCUMENTS_BUCKET;
    this.client = options.client;
  }

  private async resolveBucketApi(): Promise<SupabaseStorageBucketApi> {
    if (!this.client) {
      const { createAdminClient } = await import("../supabase/admin");
      this.client = createAdminClient() as unknown as SupabaseStorageClientLike;
    }

    return this.client.storage.from(this.bucket);
  }

  async putObject(input: StorageObjectInput): Promise<StoredObject> {
    const candidateId = String(input.metadata.candidate_id ?? "unknown");
    const path = candidateDocumentPath(candidateId, input.objectKey);
    const api = await this.resolveBucketApi();

    const { error } = await api.upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: true,
      metadata: { ...input.metadata }
    });
    if (error) {
      throw new Error(error.message ?? "Supabase storage upload failed.");
    }

    return {
      ...input,
      bytes: new Uint8Array(input.bytes),
      metadata: { ...input.metadata },
      provider: this.providerName,
      storedAt: new Date().toISOString()
    };
  }

  async getObject(candidateId: string, objectKey: string): Promise<Uint8Array | undefined> {
    const api = await this.resolveBucketApi();
    const { data, error } = await api.download(candidateDocumentPath(candidateId, objectKey));
    if (error || !data) {
      return undefined;
    }

    return new Uint8Array(await data.arrayBuffer());
  }

  async deleteObject(candidateId: string, objectKey: string): Promise<void> {
    await this.deleteObjectPaths([candidateDocumentPath(candidateId, objectKey)]);
  }

  /** Delete pre-computed bucket paths (used by the retention job). */
  async deleteObjectPaths(paths: readonly string[]): Promise<void> {
    if (paths.length === 0) {
      return;
    }
    const api = await this.resolveBucketApi();
    const { error } = await api.remove(paths);
    if (error) {
      throw new Error(error.message ?? "Supabase storage delete failed.");
    }
  }

  /** Short-lived signed URL for a human-facing read of a private document. */
  async createSignedReadUrl(
    candidateId: string,
    objectKey: string,
    expiresInSeconds = SIGNED_READ_URL_TTL_SECONDS
  ): Promise<string | undefined> {
    const api = await this.resolveBucketApi();
    const { data, error } = await api.createSignedUrl(
      candidateDocumentPath(candidateId, objectKey),
      expiresInSeconds
    );
    if (error || !data) {
      return undefined;
    }

    return data.signedUrl;
  }
}
