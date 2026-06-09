import { NextResponse } from "next/server";

import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  createServerInterviewSession,
  loadServerInterviewState,
  resolveServerInterviewStore
} from "@/features/candidate-persistence/server-interview-store";

import { candidateInterviewPreviewRole } from "../../interview-preview-role";

export const runtime = "nodejs";

/**
 * Start the interview over: create a fresh server-authoritative session from
 * the current session's primary question plan (follow-ups and responses are
 * dropped). No client state is read from the request.
 */
export async function POST() {
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    return NextResponse.json(
      {
        error: {
          code: candidateContext.code,
          message: candidateContext.message,
          status: candidateContext.status
        }
      },
      { status: candidateContext.status }
    );
  }

  const store = resolveServerInterviewStore(candidateContext);
  const state = await loadServerInterviewState(store, candidateContext.candidateId);
  if (!state) {
    return NextResponse.json(
      {
        error: {
          code: "interview_session_not_found",
          message: "No server interview session exists for this candidate.",
          status: 404
        }
      },
      { status: 404 }
    );
  }

  const primaryQuestionBank = Object.values(state.session.module_sessions).flatMap(
    (moduleSession) => moduleSession.questions.filter((question) => !question.followUpReason)
  );

  const created = await createServerInterviewSession(store, candidateContext.candidateId, {
    roleProfile: candidateInterviewPreviewRole,
    interviewLanguage: state.session.interviewLanguage,
    questionBank: primaryQuestionBank
  });

  return NextResponse.json({
    session: created.session,
    persistence: created.persistence.status
  });
}
