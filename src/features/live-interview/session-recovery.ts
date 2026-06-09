import type { LiveInterviewProviderSession, LiveInterviewSessionStatus } from "./types";

const TERMINAL_PROVIDER_STATUSES = new Set<LiveInterviewSessionStatus>([
  "completed",
  "disconnected",
  "expired",
  "failed"
]);

export interface RestoreLiveInterviewProviderSessionInput {
  readonly interviewSessionId: string;
  readonly now?: string;
}

export function shouldRestoreLiveInterviewProviderSession(
  providerSession: LiveInterviewProviderSession,
  { interviewSessionId, now }: RestoreLiveInterviewProviderSessionInput
): boolean {
  if (providerSession.interviewSessionId !== interviewSessionId) {
    return false;
  }

  if (TERMINAL_PROVIDER_STATUSES.has(providerSession.status)) {
    return false;
  }

  const expiresAtMs = new Date(providerSession.expiresAt).getTime();
  const nowMs = now ? new Date(now).getTime() : Date.now();
  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs)) {
    return false;
  }

  return expiresAtMs > nowMs;
}
