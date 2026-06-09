import { createSafeResumeUploadError } from "./errors";
import type { ResumeUploadConfig, ResumeUploadFile, ResumeValidationResult } from "./types";

const GENERIC_BROWSER_MIME_TYPES = new Set(["", "application/octet-stream"]);
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_TYPES_BY_EXTENSION = new Map<string, ReadonlySet<string>>([
  [".pdf", new Set(["application/pdf", "application/x-pdf"])],
  [".docx", new Set([DOCX_MIME_TYPE])],
  [".html", new Set(["text/html"])],
  [".htm", new Set(["text/html"])],
  [".json", new Set(["application/json"])],
  [".txt", new Set(["text/plain"])]
]);

/** Binary signature sniffing: the declared type must match the actual bytes. */
export type SniffedResumeContentType = "pdf" | "zip" | "text";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04 (DOCX container)

export function sniffResumeContentType(bytes: Uint8Array): SniffedResumeContentType {
  if (startsWith(bytes, PDF_MAGIC)) {
    return "pdf";
  }
  if (startsWith(bytes, ZIP_MAGIC)) {
    return "zip";
  }
  return "text";
}

/**
 * Verify the file content against its declared type using magic bytes, never
 * the file extension: a PDF must start with %PDF, a DOCX with the PK zip
 * header, and text formats must not be binary (no NUL bytes, no binary magic).
 */
export function validateResumeFileContent(
  bytes: Uint8Array,
  declaredMimeType: string
): boolean {
  const sniffed = sniffResumeContentType(bytes);
  const normalized = declaredMimeType.trim().toLowerCase();

  if (normalized.includes("pdf")) {
    return sniffed === "pdf";
  }
  if (normalized === DOCX_MIME_TYPE || normalized.includes("officedocument")) {
    return sniffed === "zip";
  }
  if (GENERIC_BROWSER_MIME_TYPES.has(normalized)) {
    // Browser did not declare a type: accept any recognized signature, and
    // require text payloads to actually look like text.
    return sniffed !== "text" || looksLikeText(bytes);
  }

  // text/plain, text/html, application/json: must be genuine text.
  return sniffed === "text" && looksLikeText(bytes);
}

function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
  if (bytes.length < magic.length) {
    return false;
  }
  return magic.every((byte, index) => bytes[index] === byte);
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 4096);
  for (const byte of sample) {
    if (byte === 0) {
      return false;
    }
  }
  return true;
}

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

  // The content check is authoritative: declared types and extensions are
  // hints, the magic bytes decide.
  if (file.bytes && file.bytes.length > 0 && !validateResumeFileContent(file.bytes, file.mimeType)) {
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
