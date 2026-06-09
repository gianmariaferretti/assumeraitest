import { NextResponse, type NextRequest } from "next/server";

import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  loadServerInterviewState,
  moduleRowFor,
  persistServerModuleSession,
  resolveServerInterviewStore
} from "@/features/candidate-persistence/server-interview-store";
import {
  FORBIDDEN_CLIENT_STATE_FIELDS,
  issueTurnForModule,
  startModule
} from "@/features/interview-flow";

export const runtime = "nodejs";

/**
 * Open (or resume) a module sub-session from server-persisted state.
 *
 * The request body carries no interview state — a body that tries to supply a
 * session is rejected. When a server-issued turn is still pending for the
 * module, the same turn is returned (idempotent resume after a disconnect);
 * otherwise a new turn is issued and persisted.
 */
export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ readonly moduleId: string }> }
) {
  const { moduleId } = await params;

  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    return errorResponse(candidateContext.status, candidateContext.code, candidateContext.message);
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (isRecord(body)) {
    const forbidden = FORBIDDEN_CLIENT_STATE_FIELDS.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    );
    if (forbidden.length > 0) {
      return errorResponse(
        400,
        "client_state_rejected",
        `Interview state is derived server-side; remove client field(s): ${forbidden.join(", ")}.`
      );
    }
  }

  const store = resolveServerInterviewStore(candidateContext);
  const state = await loadServerInterviewState(store, candidateContext.candidateId);
  if (!state) {
    return errorResponse(
      404,
      "interview_session_not_found",
      "No server interview session exists for this candidate. Open the interview page to start one."
    );
  }

  const moduleSession = state.session.module_sessions[moduleId];
  const moduleRow = moduleRowFor(state.rows, moduleId);
  if (!moduleSession || !moduleRow) {
    return errorResponse(
      404,
      "module_not_found",
      `Module ${moduleId} was not found in this interview session.`
    );
  }

  if (moduleSession.state === "completed" || moduleSession.state === "skipped") {
    return NextResponse.json({
      module: moduleSession,
      session: state.session,
      turn: null,
      persistence: "unchanged"
    });
  }

  const now = new Date().toISOString();
  const session = startModule(state.session, moduleId, now);
  const startedModule = session.module_sessions[moduleId];

  // Idempotent resume: a pending server-issued turn stays valid across
  // disconnects, so a reconnecting client picks up the same question.
  const pendingTurnStatus = moduleRow.activeTurnId
    ? await store.getTurnStatus(candidateContext.candidateId, session.sessionId, moduleRow.activeTurnId)
    : undefined;
  const resumablePendingTurn =
    moduleRow.activeTurnId && pendingTurnStatus !== "evaluated" && pendingTurnStatus !== "expired"
      ? {
          turnId: moduleRow.activeTurnId,
          moduleId,
          questionId: startedModule.currentQuestionId,
          questionText:
            startedModule.questions.find((item) => item.id === startedModule.currentQuestionId)
              ?.prompt ?? "",
          issuedAt: moduleRow.turnStartedAt ?? now
        }
      : undefined;

  const turn = resumablePendingTurn ?? issueTurnForModule(session, moduleId, now);
  if (!turn) {
    return errorResponse(
      409,
      "no_pending_question",
      `Module ${moduleId} has no pending question to issue.`
    );
  }

  const persistence = await persistServerModuleSession(
    store,
    candidateContext.candidateId,
    session,
    moduleId,
    {
      activeTurnId: turn.turnId,
      turnStartedAt: turn.issuedAt,
      turnCount: moduleRow.turnCount
    }
  );
  if (!resumablePendingTurn) {
    await store.recordIssuedTurn(candidateContext.candidateId, session.sessionId, turn);
  }

  return NextResponse.json({
    module: startedModule,
    session,
    turn,
    persistence: persistence.status
  });
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, status } }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
