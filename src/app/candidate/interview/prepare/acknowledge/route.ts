import { NextRequest, NextResponse } from "next/server";

import {
  createInterviewDisclosureAcknowledgement,
  INTERVIEW_AI_DISCLOSURE_VERSION,
  readInterviewDisclosureAcknowledgementFromFormData
} from "@/features/candidate-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  persistCandidateInterviewLanguage,
  persistInterviewDisclosureAcknowledgement
} from "@/features/candidate-persistence/supabase-candidate-store";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  CANDIDATE_INTERVIEW_LANGUAGE_FIELD,
  resolveCandidateInterviewLanguageCode
} from "@/features/interview-flow";
import { interviewDeviceCheckPath } from "@/features/live-interview";

const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const acknowledged = readInterviewDisclosureAcknowledgementFromFormData(formData);

  if (!acknowledged) {
    return NextResponse.json(
      {
        error: {
          code: "ai_interview_disclosure_required",
          message: "Acknowledge the AI interview disclosure before starting."
        }
      },
      { status: 400 }
    );
  }

  const candidateContext = await resolveCandidateRouteContext({
    fallbackCandidateId: formData.get("candidate_id")?.toString()
  });
  if (isCandidateContextError(candidateContext)) {
    if (candidateContext.status === 401) {
      return NextResponse.redirect(new URL("/login?next=/candidate/interview/prepare", request.url), 303);
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

  const candidateId = candidateContext.candidateId;
  const interviewLanguage = resolveCandidateInterviewLanguageCode(
    formData.get(CANDIDATE_INTERVIEW_LANGUAGE_FIELD)
  );
  const now = new Date().toISOString();
  const { acknowledgement, auditEvent } = createInterviewDisclosureAcknowledgement({
    candidateId,
    actorId: candidateId,
    acknowledgedAt: now,
    correlationId: `interview-ai-disclosure-${candidateId}-${now}`
  });
  await persistInterviewDisclosureAcknowledgement(candidateContext, acknowledgement, auditEvent);
  await persistCandidateInterviewLanguage(candidateContext, interviewLanguage);

  const response = NextResponse.redirect(new URL(interviewDeviceCheckPath, request.url), {
    status: 303
  });

  response.cookies.set("assumerai_ai_disclosure_acknowledged", "true", {
    httpOnly: true,
    path: "/candidate",
    sameSite: "lax"
  });
  response.cookies.set(
    "assumerai_ai_disclosure_version",
    INTERVIEW_AI_DISCLOSURE_VERSION,
    {
      httpOnly: true,
      path: "/candidate",
      sameSite: "lax"
    }
  );
  response.cookies.set(
    "assumerai_ai_disclosure_audit_event_id",
    acknowledgement.auditEventId,
    {
      httpOnly: true,
      path: "/candidate",
      sameSite: "lax"
    }
  );
  response.cookies.set(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE, interviewLanguage, {
    httpOnly: true,
    maxAge: LANGUAGE_COOKIE_MAX_AGE_SECONDS,
    path: "/candidate",
    sameSite: "lax"
  });

  return response;
}
