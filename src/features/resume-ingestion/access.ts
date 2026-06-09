import { createSafeResumeUploadError } from "./errors";
import type { ResumeUploadActor, SafeResumeUploadError } from "./types";

export function validateCandidateUploadAccess(
  actor: ResumeUploadActor,
  candidateId: string,
  correlationId: string
): SafeResumeUploadError | undefined {
  if (!candidateId || !actor.id) {
    return createSafeResumeUploadError("missing_candidate", correlationId);
  }

  if (actor.type !== "candidate" || actor.id !== candidateId) {
    return createSafeResumeUploadError("access_denied", correlationId);
  }

  return undefined;
}
