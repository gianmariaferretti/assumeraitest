import { NextResponse, type NextRequest } from "next/server";

import {
  isAuthenticatedCandidateContext,
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  persistDeviceCheckCompleted,
  persistHumanReviewRequest
} from "@/features/candidate-persistence/supabase-candidate-store";
import { interviewStartPath } from "@/features/live-interview";

export const runtime = "nodejs";

/**
 * Pre-interview mode choice (Phase 12). Text mode is a first-class equivalent
 * interview mode, not a hidden fallback. The optional accommodation request
 * is recorded as a human-review request: free text only, no medical details
 * requested or stored, owner + service-role visibility (never companies),
 * never an input to scoring.
 */
export async function POST(request: NextRequest) {
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    if (candidateContext.status === 401) {
      return NextResponse.redirect(
        new URL("/login?next=/candidate/interview/device-check", request.url),
        303
      );
    }
    return NextResponse.json(
      { error: { code: candidateContext.code, message: candidateContext.message } },
      { status: candidateContext.status }
    );
  }

  const formData = await request.formData();
  const mode = formData.get("interview_mode") === "text" ? "text" : "voice";
  const accommodationRequest = readFormText(formData, "accommodation_request");

  if (isAuthenticatedCandidateContext(candidateContext)) {
    await candidateContext.supabase.from("candidate_interview_progress").upsert(
      {
        user_id: candidateContext.user.id,
        interview_mode: mode,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

    if (accommodationRequest) {
      const requestedAt = new Date().toISOString();
      await persistHumanReviewRequest(candidateContext, {
        humanReviewRequestId: `accommodation_${candidateContext.candidateId}_${Date.parse(requestedAt).toString(36)}`,
        targetType: "accommodation_request",
        targetId: "pre_interview",
        summary: "Candidate requested an interview accommodation.",
        evidenceNotes: accommodationRequest,
        requestedAt,
        auditEventId: `audit_accommodation_${candidateContext.candidateId}_${Date.parse(requestedAt).toString(36)}`
      });
    }
  }

  // Text mode needs no microphone/camera test: choosing it satisfies the
  // device-readiness gate (a deaf candidate must not be blocked by it).
  if (mode === "text") {
    await persistDeviceCheckCompleted(candidateContext, new Date().toISOString());
  }

  const response = NextResponse.redirect(new URL(interviewStartPath, request.url), 303);
  response.cookies.set("assumerai_interview_mode", mode, {
    httpOnly: true,
    path: "/candidate",
    sameSite: "lax"
  });
  if (mode === "text") {
    response.cookies.set("assumerai_interview_device_check_completed", "true", {
      httpOnly: true,
      path: "/candidate",
      sameSite: "lax"
    });
  }

  return response;
}

function readFormText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed.slice(0, 2000) : undefined;
}
