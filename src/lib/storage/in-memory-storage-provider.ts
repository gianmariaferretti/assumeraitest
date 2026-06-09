import type { StorageObjectInput, StorageProvider, StoredObject } from "./storage-provider";

export class InMemoryStorageProvider implements StorageProvider {
  readonly providerName = "in_memory";

  private readonly objects = new Map<string, StoredObject>();

  async putObject(input: StorageObjectInput): Promise<StoredObject> {
    const stored: StoredObject = {
      ...input,
      bytes: new Uint8Array(input.bytes),
      metadata: { ...input.metadata },
      provider: this.providerName,
      storedAt: new Date().toISOString()
    };

    this.objects.set(input.objectKey, stored);
    return stored;
  }

  async getObject(objectKey: string): Promise<StoredObject | undefined> {
    const stored = this.objects.get(objectKey);
    if (!stored) {
      return undefined;
    }

    return {
      ...stored,
      bytes: new Uint8Array(stored.bytes),
      metadata: { ...stored.metadata }
    };
  }
}
