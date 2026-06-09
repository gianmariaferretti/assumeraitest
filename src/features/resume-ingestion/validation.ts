import { createSafeResumeUploadError } from "./errors";
import type { ResumeUploadConfig, ResumeUploadFile, ResumeValidationResult } from "./types";

const GENERIC_BROWSER_MIME_TYPES = new Set(["", "application/octet-stream"]);
const MIME_TYPES_BY_EXTENSION = new Map<string, ReadonlySet<string>>([
  [".pdf", new Set(["application/pdf", "application/x-pdf"])],
  [".html", new Set(["text/html"])],
  [".htm", new Set(["text/html"])],
  [".json", new Set(["application/json"])],
  [".txt", new Set(["text/plain"])]
]);

export function validateResumeFile(
  file: ResumeUploadFile,
  config: ResumeUploadConfig
): ResumeValidationResult {
  if (file.sizeBytes > config.maxFileBytes) {
    return { ok: false, error: createSafeResumeUploadError("file_too_large") };
  }

  const extension = getFileExtension(file.name);
  const normalizedMimeType = file.mimeType.trim().toLowerCase();
  const allowedExtensions = new Set(
    config.allowedExtensions.map((item) => item.trim().toLowerCase())
  );
  const allowedMimeTypes = new Set(
    config.allowedMimeTypes.map((item) => item.trim().toLowerCase())
  );

  const hasAllowedExtension = allowedExtensions.has(extension);
  const hasAllowedMimeType = allowedMimeTypes.has(normalizedMimeType);
  const hasGenericMimeType = GENERIC_BROWSER_MIME_TYPES.has(normalizedMimeType);
  const hasMatchedMimeType = hasMatchingExtensionMimeType(extension, normalizedMimeType);

  if (
    !hasAllowedExtension ||
    (!hasGenericMimeType && (!hasAllowedMimeType || !hasMatchedMimeType))
  ) {
    return { ok: false, error: createSafeResumeUploadError("unsupported_file_type") };
  }

  return { ok: true };
}

export function getFileExtension(fileName: string): string {
  const normalizedName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return normalizedName.slice(lastDotIndex);
}

function hasMatchingExtensionMimeType(extension: string, mimeType: string): boolean {
  const knownMimeTypes = MIME_TYPES_BY_EXTENSION.get(extension);

  return knownMimeTypes ? knownMimeTypes.has(mimeType) : true;
}
