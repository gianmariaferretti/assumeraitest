import { NextResponse } from "next/server";

import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  CANDIDATE_INTERVIEW_LANGUAGE_FIELD,
  resolveCandidateInterviewLanguageCode
} from "@/features/interview-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { persistCandidateInterviewLanguage } from "@/features/candidate-persistence/supabase-candidate-store";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const formData = await request.formData();
  const interviewLanguage = resolveCandidateInterviewLanguageCode(
    formData.get(CANDIDATE_INTERVIEW_LANGUAGE_FIELD)
  );
  const candidateContext = await resolveCandidateRouteContext();
  if (!isCandidateContextError(candidateContext)) {
    await persistCandidateInterviewLanguage(candidateContext, interviewLanguage);
  }

  const redirectUrl = new URL("/candidate", request.url);
  redirectUrl.searchParams.set("language", interviewLanguage);

  const response = NextResponse.redirect(redirectUrl, {
    status: 303
  });

  response.cookies.set(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE, interviewLanguage, {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/candidate",
    sameSite: "lax"
  });

  return response;
}

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/candidate", request.url));
}
