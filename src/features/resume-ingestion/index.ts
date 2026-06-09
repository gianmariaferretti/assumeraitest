export { InMemoryStorageProvider } from "../../lib/storage/in-memory-storage-provider";
export type {
  StorageObjectInput,
  StorageProvider,
  StoredObject
} from "../../lib/storage/storage-provider";

export { createResumeUploadConfig } from "./config";
export { createSafeResumeUploadError } from "./errors";
export { ingestResumeDocument } from "./service";
export {
  getFileExtension,
  sniffResumeContentType,
  validateResumeFile,
  validateResumeFileContent,
  type SniffedResumeContentType
} from "./validation";
export type {
  ResumeDocumentMetadata,
  ResumeIngestionInput,
  ResumeIngestionResult,
  ResumeUploadActor,
  ResumeUploadActorType,
  ResumeUploadAuditEvent,
  ResumeUploadConfig,
  ResumeUploadErrorCode,
  ResumeUploadFile,
  SafeResumeUploadError
} from "./types";
