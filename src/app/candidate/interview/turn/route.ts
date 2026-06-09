import { NextResponse, type NextRequest } from "next/server";

import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  persistInterviewEvaluatorRun,
  persistModuleSessionState
} from "@/features/candidate-persistence/supabase-candidate-store";
import {
  conductTurn,
  resumeInterviewSession,
  type ConductTurnCandidateAnswer,
  type ConductTurnInput
} from "@/features/interview-flow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

  const parsed = await readTurnPayload(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "invalid_interview_turn", message: parsed.message, status: 400 } },
      { status: 400 }
    );
  }

  let session;
  try {
    session = resumeInterviewSession(JSON.stringify(parsed.value.session));
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

  if (!session.module_sessions[parsed.value.moduleId]) {
    return NextResponse.json(
      {
        error: {
          code: "module_not_found",
          message: `Module ${parsed.value.moduleId} was not found in this interview session.`,
          status: 404
        }
      },
      { status: 404 }
    );
  }

  const result = await conductTurn({
    session,
    moduleId: parsed.value.moduleId,
    competency: parsed.value.competency,
    candidateAnswer: parsed.value.candidateAnswer,
    plannedQuestionText: parsed.value.plannedQuestionText,
    currentQuestionStarTarget: parsed.value.currentQuestionStarTarget,
    cvHook: parsed.value.cvHook,
    hasMorePrimaryQuestions: parsed.value.hasMorePrimaryQuestions,
    hasMoreCompetencies: parsed.value.hasMoreCompetencies,
    elapsedSecondsForTurn: parsed.value.elapsedSecondsForTurn
  });

  const moduleSession = result.session.module_sessions[parsed.value.moduleId];
  const modulePersistence = await persistModuleSessionState(candidateContext, {
    interviewSessionId: result.session.sessionId,
    moduleId: parsed.value.moduleId,
    state: moduleSession.state,
    modulePayload: moduleSession as unknown as Record<string, unknown>,
    startedAt: moduleSession.startedAt ?? null,
    completedAt: moduleSession.completedAt ?? null
  });

  // Persist every individual ensemble rater run (they share a replicate_group_id);
  // fall back to the aggregate record if individual runs are unavailable.
  const runsToPersist =
    result.evaluatorRuns && result.evaluatorRuns.length > 0
      ? result.evaluatorRuns
      : result.evaluatorRun
        ? [result.evaluatorRun]
        : [];
  const evaluatorPersistResults = await Promise.all(
    runsToPersist.map((run) =>
      persistInterviewEvaluatorRun(run as unknown as Record<string, unknown>),
    ),
  );
  const evaluatorPersistence = evaluatorPersistResults.find((entry) => entry.status !== "supabase_persisted")
    ? evaluatorPersistResults.find((entry) => entry.status !== "supabase_persisted")!
    : evaluatorPersistResults[0] ?? null;

  return NextResponse.json({
    interviewerText: result.interviewerText,
    interviewerSource: result.interviewerSource,
    nextAction: result.nextAction,
    decision: result.decision,
    evaluation: result.evaluation ?? null,
    globalStatus: result.session.global_status,
    session: result.session,
    persistence: {
      module: modulePersistence.status,
      evaluatorRun: evaluatorPersistence?.status ?? "skipped"
    }
  });
}

type TurnPayload = {
  readonly session: Record<string, unknown>;
  readonly moduleId: string;
  readonly competency: ConductTurnInput["competency"];
  readonly candidateAnswer?: ConductTurnCandidateAnswer;
  readonly plannedQuestionText?: string;
  readonly currentQuestionStarTarget?: ConductTurnInput["currentQuestionStarTarget"];
  readonly cvHook?: string;
  readonly hasMorePrimaryQuestions?: boolean;
  readonly hasMoreCompetencies?: boolean;
  readonly elapsedSecondsForTurn?: number;
};

async function readTurnPayload(
  request: Request
): Promise<{ readonly ok: true; readonly value: TurnPayload } | { readonly ok: false; readonly message: string }> {
  const payload = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(payload)) {
    return { ok: false, message: "Interview turn request requires a JSON object." };
  }
  if (!isRecord(payload.session)) {
    return { ok: false, message: "Interview turn request requires a session object." };
  }
  const moduleId = readString(payload.moduleId);
  if (!moduleId) {
    return { ok: false, message: "Interview turn request requires a moduleId." };
  }
  if (!isRecord(payload.competency) || !readString(payload.competency.id)) {
    return { ok: false, message: "Interview turn request requires a competency with an id." };
  }

  const candidateAnswer = readCandidateAnswer(payload.candidateAnswer);

  return {
    ok: true,
    value: {
      session: payload.session,
      moduleId,
      competency: payload.competency as ConductTurnInput["competency"],
      candidateAnswer,
      plannedQuestionText: readString(payload.plannedQuestionText),
      currentQuestionStarTarget: Array.isArray(payload.currentQuestionStarTarget)
        ? (payload.currentQuestionStarTarget as ConductTurnInput["currentQuestionStarTarget"])
        : undefined,
      cvHook: readString(payload.cvHook),
      hasMorePrimaryQuestions: readBoolean(payload.hasMorePrimaryQuestions),
      hasMoreCompetencies: readBoolean(payload.hasMoreCompetencies),
      elapsedSecondsForTurn: readNumber(payload.elapsedSecondsForTurn)
    }
  };
}

function readCandidateAnswer(value: unknown): ConductTurnCandidateAnswer | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const questionId = readString(value.questionId);
  const questionText = readString(value.questionText);
  const answerText = readString(value.answerText);
  if (!questionId || !questionText || !answerText) {
    return undefined;
  }
  return { questionId, questionText, answerText };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
