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
