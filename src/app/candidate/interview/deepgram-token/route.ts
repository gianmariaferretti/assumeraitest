import { NextResponse, type NextRequest } from "next/server";

import {
  DeepgramTokenGrantError,
  createDeepgramTokenGrantClient
} from "@/features/live-interview/deepgram-token-grant";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { readCandidateProgress } from "@/features/candidate-persistence/supabase-candidate-store";
import {
  clientIpFromHeaders,
  enforceRateLimit,
  readRateLimitFromEnv,
  resolveRateLimitStore
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const DEEPGRAM_TOKEN_TTL_SECONDS = 60;

export async function POST(request: NextRequest) {
  const candidateContext = await resolveCandidateRouteContext({
    allowLocalFallback: false
  });
  if (isCandidateContextError(candidateContext)) {
    return tokenError(candidateContext.code, candidateContext.message, candidateContext.status);
  }

  const rate = await enforceRateLimit({
    store: resolveRateLimitStore(),
    rule: {
      bucket: "deepgram_token",
      limit: readRateLimitFromEnv(process.env.RATE_LIMIT_DEEPGRAM_TOKEN_PER_HOUR, 10),
      windowSeconds: 3600
    },
    subjects: [
      `user:${candidateContext.candidateId}`,
      `ip:${clientIpFromHeaders(request.headers)}`
    ]
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many transcription token requests. Wait before retrying.",
          status: 429
        }
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const progress = await readCandidateProgress(candidateContext);
  const profileConfirmed =
    progress.status === "supabase_persisted"
      ? progress.profileConfirmed
      : request.cookies.get("assumerai_profile_confirmed")?.value === "true";
  const disclosureAcknowledged =
    progress.status === "supabase_persisted"
      ? progress.disclosureAcknowledged
      : request.cookies.get("assumerai_ai_disclosure_acknowledged")?.value === "true";
  const deviceCheckCompleted =
    progress.status === "supabase_persisted"
      ? progress.deviceCheckCompleted
      : request.cookies.get("assumerai_interview_device_check_completed")?.value === "true";

  if (!profileConfirmed) {
    return tokenError("profile_required", "Profile confirmation is required.", 403);
  }
  if (!disclosureAcknowledged) {
    return tokenError("ai_disclosure_required", "Interview disclosure is required.", 403);
  }
  if (!deviceCheckCompleted) {
    return tokenError("device_check_required", "Device check is required.", 403);
  }

  const apiKey = process.env.DEEPGRAM_KEY?.trim();
  if (!apiKey) {
    return tokenError(
      "deepgram_key_missing",
      "Live transcription is not configured on this server.",
      503
    );
  }

  try {
    const tokenGrant = await createDeepgramTokenGrantClient({
      apiKey,
      ttlSeconds: DEEPGRAM_TOKEN_TTL_SECONDS
    }).grantToken();

    return NextResponse.json(
      {
        provider: tokenGrant.provider,
        auth_mode: "bearer",
        credential: tokenGrant.accessToken,
        expires_in: tokenGrant.expiresIn,
        raw_media: {
          stored: false,
          deleted: true
        }
      },
      { status: 200 }
    );
  } catch (caught) {
    if (caught instanceof DeepgramTokenGrantError) {
      return tokenError(
        caught.code,
        caught.message,
        caught.code === "deepgram_key_insufficient_permissions" ? 503 : 502
      );
    }

    return tokenError(
      "deepgram_token_failed",
      "Live transcription could not start. Pause and try again when ready.",
      502
    );
  }
}

function tokenError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        status
      }
    },
    { status }
  );
}
