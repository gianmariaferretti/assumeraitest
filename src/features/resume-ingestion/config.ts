import type { ResumeUploadConfig } from "./types";

const DEFAULT_ALLOWED_EXTENSIONS = [".pdf", ".html", ".htm", ".json", ".txt"];
const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/json",
  "text/html",
  "text/plain"
];
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_RAW_CV_RETENTION_DAYS = 30;

type ConfigEnv = Partial<Record<string, string | undefined>>;

export function createResumeUploadConfig(env: ConfigEnv = process.env): ResumeUploadConfig {
  return {
    allowedExtensions: parseList(
      env.RESUME_UPLOAD_ALLOWED_EXTENSIONS,
      DEFAULT_ALLOWED_EXTENSIONS
    ),
    allowedMimeTypes: parseList(
      env.RESUME_UPLOAD_ALLOWED_MIME_TYPES,
      DEFAULT_ALLOWED_MIME_TYPES
    ).map((mimeType) => mimeType.toLowerCase()),
    maxFileBytes: parsePositiveInteger(
      env.RESUME_UPLOAD_MAX_BYTES,
      DEFAULT_MAX_FILE_BYTES,
      1,
      50 * 1024 * 1024
    ),
    rawCvRetentionDays: parsePositiveInteger(
      env.RETENTION_DAYS_RAW_CV,
      DEFAULT_RAW_CV_RETENTION_DAYS,
      1,
      365
    )
  };
}

function parseList(value: string | undefined, fallback: readonly string[]): string[] {
  const parsed = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed && parsed.length > 0 ? parsed : [...fallback];
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}
