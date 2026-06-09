import { NextResponse, type NextRequest } from "next/server";

import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { persistModuleSessionState } from "@/features/candidate-persistence/supabase-candidate-store";
import { resumeInterviewSession } from "@/features/interview-flow";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ readonly moduleId: string }> }
) {
  const { moduleId } = await params;

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

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body) || !isRecord(body.session)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_interview_session",
          message: "Module start request requires a session object.",
          status: 400
        }
      },
      { status: 400 }
    );
  }

  let session;
  try {
    session = resumeInterviewSession(JSON.stringify(body.session));
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_interview_session",
          message: error instanceof Error ? error.message : "Interview session could not be restored.",
          status: 400
        }
      },
      { status: 400 }
    );
  }

  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    return NextResponse.json(
      {
        error: {
          code: "module_not_found",
          message: `Module ${moduleId} was not found in this interview session.`,
          status: 404
        }
      },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const startedModule = {
    ...moduleSession,
    state: moduleSession.state === "not_started" ? ("in_progress" as const) : moduleSession.state,
    startedAt: moduleSession.startedAt ?? now
  };
  const updatedSession = {
    ...session,
    module_sessions: { ...session.module_sessions, [moduleId]: startedModule },
    updatedAt: now
  };

  const persistence = await persistModuleSessionState(candidateContext, {
    interviewSessionId: session.sessionId,
    moduleId,
    state: startedModule.state,
    modulePayload: startedModule as unknown as Record<string, unknown>,
    startedAt: startedModule.startedAt,
    completedAt: startedModule.completedAt ?? null
  });

  return NextResponse.json({
    module: startedModule,
    currentQuestionId: startedModule.currentQuestionId,
    session: updatedSession,
    persistence: persistence.status
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
