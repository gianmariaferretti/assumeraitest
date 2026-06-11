import { NextRequest, NextResponse } from "next/server";

import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { persistDeviceCheckCompleted } from "@/features/candidate-persistence/supabase-candidate-store";
import { interviewStartPath } from "@/features/live-interview";

export async function POST(request: NextRequest) {
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    if (candidateContext.status === 401) {
      return NextResponse.redirect(new URL("/login?next=/candidate/interview/device-check", request.url), 303);
    }

    return NextResponse.json(
      {
        error: {
          code: candidateContext.code,
          message: candidateContext.message
        }
      },
      { status: candidateContext.status }
    );
  }

  await persistDeviceCheckCompleted(candidateContext, new Date().toISOString());

  // Completing the device check starts a voice interview (text mode goes
  // through /candidate/interview/mode and needs no device test).
  if (candidateContext.mode === "authenticated") {
    await candidateContext.supabase.from("candidate_interview_progress").upsert(
      {
        user_id: candidateContext.user.id,
        interview_mode: "voice",
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );
  }

  const response = NextResponse.redirect(new URL(interviewStartPath, request.url), {
    status: 303
  });

  response.cookies.set("assumerai_interview_device_check_completed", "true", {
    httpOnly: true,
    path: "/candidate",
    sameSite: "lax"
  });

  return response;
}
