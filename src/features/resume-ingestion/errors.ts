import type { ResumeUploadErrorCode, SafeResumeUploadError } from "./types";

const SAFE_MESSAGES: Record<ResumeUploadErrorCode, { message: string; status: number }> = {
  access_denied: {
    message: "This resume can only be uploaded by the candidate who owns it.",
    status: 403
  },
  file_too_large: {
    message: "Upload a smaller resume file.",
    status: 413
  },
  missing_candidate: {
    message: "Sign in as the candidate before uploading.",
    status: 401
  },
  storage_failed: {
    message: "Resume upload could not be completed. Try again later.",
    status: 503
  },
  unsupported_file_type: {
    message: "Upload a PDF, HTML, JSON, text export, or paste resume text.",
    status: 400
  }
};

export function createSafeResumeUploadError(
  code: ResumeUploadErrorCode,
  correlationId?: string
): SafeResumeUploadError {
  return {
    code,
    ...SAFE_MESSAGES[code],
    ...(correlationId ? { correlationId } : {})
  };
}
