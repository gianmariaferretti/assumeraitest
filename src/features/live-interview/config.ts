import {
  DEFAULT_LIVE_INTERVIEW_SESSION_CAPS,
  type LiveInterviewSessionCaps
} from "./types";

export type LiveInterviewProviderConfigEnv = Partial<Record<string, string | undefined>>;

export interface LiveInterviewProviderConfig {
  readonly provider: "mock";
  readonly caps: LiveInterviewSessionCaps;
}

export function resolveLiveInterviewProviderConfig(
  env: LiveInterviewProviderConfigEnv = process.env
): LiveInterviewProviderConfig {
  const provider = (env.LIVE_INTERVIEW_PROVIDER?.trim() || "mock").toLowerCase();

  if (provider !== "mock") {
    throw new Error("LIVE_INTERVIEW_PROVIDER must be mock until vendor providers are implemented.");
  }

  return {
    provider,
    caps: {
      maxDurationSeconds: readPositiveInteger(
        env,
        "LIVE_INTERVIEW_MAX_DURATION_SECONDS",
        DEFAULT_LIVE_INTERVIEW_SESSION_CAPS.maxDurationSeconds
      ),
      maxTranscriptEvents: readPositiveInteger(
        env,
        "LIVE_INTERVIEW_MAX_TRANSCRIPT_EVENTS",
        DEFAULT_LIVE_INTERVIEW_SESSION_CAPS.maxTranscriptEvents
      ),
      maxDisconnects: readNonNegativeInteger(
        env,
        "LIVE_INTERVIEW_MAX_DISCONNECTS",
        DEFAULT_LIVE_INTERVIEW_SESSION_CAPS.maxDisconnects
      )
    }
  };
}

function readPositiveInteger(
  env: LiveInterviewProviderConfigEnv,
  key: string,
  fallback: number
): number {
  const value = env[key];

  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsed;
}

function readNonNegativeInteger(
  env: LiveInterviewProviderConfigEnv,
  key: string,
  fallback: number
): number {
  const value = env[key];

  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer.`);
  }

  return parsed;
}
