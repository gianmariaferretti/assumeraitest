export function normalizeCandidateNextHref(
  value: string | undefined,
  resumeDocumentId: string | undefined
): string {
  const fallbackHref = buildProfileConfirmHref(resumeDocumentId);
  const trimmed = value?.trim();

  if (!trimmed?.startsWith("/candidate/") || isResumeProcessingHref(trimmed)) {
    return fallbackHref;
  }

  return trimmed;
}

function buildProfileConfirmHref(resumeDocumentId: string | undefined): string {
  const normalizedResumeDocumentId = normalizeResumeDocumentId(resumeDocumentId);

  if (!normalizedResumeDocumentId) {
    return "/candidate/profile/confirm";
  }

  return `/candidate/profile/confirm?resumeDocumentId=${encodeURIComponent(
    normalizedResumeDocumentId
  )}`;
}

function normalizeResumeDocumentId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function isResumeProcessingHref(value: string): boolean {
  return (
    value === "/candidate/resume/processing" ||
    value.startsWith("/candidate/resume/processing?")
  );
}
