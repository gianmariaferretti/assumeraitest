export type StorageMetadataValue = string | number | boolean;

export interface StorageObjectInput {
  objectKey: string;
  bytes: Uint8Array;
  contentType: string;
  metadata: Record<string, StorageMetadataValue>;
}

export interface StoredObject extends StorageObjectInput {
  provider: string;
  storedAt: string;
}

export interface StorageProvider {
  readonly providerName: string;
  putObject(input: StorageObjectInput): Promise<StoredObject>;
}
