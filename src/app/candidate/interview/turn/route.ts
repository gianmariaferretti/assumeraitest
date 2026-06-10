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
  persistInterviewEvaluatorRun,
  persistInterviewSessionSnapshot
} from "@/features/candidate-persistence/supabase-candidate-store";
import { conductServerTurn, parseServerTurnRequestBody } from "@/features/interview-flow";
import { checkLlmBudget, secondsUntilUtcMidnight } from "@/lib/llm-budget";
import { logInfo, logWarn } from "@/lib/log";
import {
  clientIpFromHeaders,
  enforceRateLimit,
  readRateLimitFromEnv,
  resolveRateLimitStore
} from "@/lib/rate-limit";

export const runtime = "nodejs";

/** JSON body cap for a single turn (32KB is ample for one spoken answer). */
export const TURN_MAX_BODY_BYTES = 32 * 1024;

/**
 * Server-authoritative interview turn.
 *
 * Contract: { moduleId, turnId, candidateAnswer: { answerText } }.
 * The session, planned question, competency, funnel phase, and elapsed time are
 * derived from server-persisted state (candidate_module_sessions +
 * candidate_interview_turns) — any client-supplied session/state field is
 * rejected with 400, an already-evaluated turn is rejected with 409.
 */
export async function POST(request: NextRequest) {
  const correlationId =
    request.headers.get("x-correlation-id") ?? `turn_${globalThis.crypto.randomUUID()}`;
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    return errorResponse(candidateContext.status, candidateContext.code, candidateContext.message);
  }
  const logContext = {
    route: "/candidate/interview/turn",
    correlationId,
    candidateId: candidateContext.candidateId
  };

  const rate = await enforceRateLimit({
    store: resolveRateLimitStore(),
    rule: {
      bucket: "interview_turn",
      limit: readRateLimitFromEnv(process.env.RATE_LIMIT_TURN_PER_MINUTE, 10),
      windowSeconds: 60
    },
    subjects: [
      `user:${candidateContext.candidateId}`,
      `ip:${clientIpFromHeaders(request.headers)}`
    ]
  });
  if (!rate.allowed) {
    return rateLimitedResponse(rate.retryAfterSeconds);
  }

  const rawBody = await request.text().catch(() => "");
  if (new TextEncoder().encode(rawBody).byteLength > TURN_MAX_BODY_BYTES) {
    return errorResponse(
      413,
      "payload_too_large",
      `Interview turn request bodies are limited to ${TURN_MAX_BODY_BYTES} bytes.`
    );
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    payload = null;
  }
  const parsed = parseServerTurnRequestBody(payload);
  if (!parsed.ok) {
    return errorResponse(400, parsed.code, parsed.message);
  }

  // LLM budget guard: never start an evaluation we are not willing to pay for.
  const budget = await checkLlmBudget();
  if (!budget.allowed) {
    return serviceUnavailableResponse();
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

  const moduleRow = moduleRowFor(state.rows, parsed.value.moduleId);
  if (!moduleRow) {
    return errorResponse(
      404,
      "module_not_found",
      `Module ${parsed.value.moduleId} was not found in this interview session.`
    );
  }

  const submittedTurnStatus = await store.getTurnStatus(
    candidateContext.candidateId,
    state.session.sessionId,
    parsed.value.turnId
  );

  const result = await conductServerTurn({
    session: state.session,
    moduleId: parsed.value.moduleId,
    turnId: parsed.value.turnId,
    answerText: parsed.value.candidateAnswer.answerText,
    activeTurnId: moduleRow.activeTurnId,
    turnStartedAt: moduleRow.turnStartedAt,
    turnCount: moduleRow.turnCount,
    submittedTurnStatus,
    integritySignals: parsed.value.integritySignals
  });

  if (result.kind === "rejected") {
    logWarn("interview_turn_rejected", { ...logContext, code: result.code, status: result.status });
    return errorResponse(result.status, result.code, result.message);
  }

  // Consume the submitted turn (evaluated, or expired when a cap closed the
  // module before evaluation) and persist the new authoritative state.
  await store.markTurnEvaluated(
    candidateContext.candidateId,
    state.session.sessionId,
    parsed.value.turnId,
    new Date().toISOString(),
    result.kind === "module_closed" ? "expired" : "evaluated"
  );

  const persistedModule = await persistServerModuleSession(
    store,
    candidateContext.candidateId,
    result.session,
    parsed.value.moduleId,
    {
      activeTurnId:
        result.nextTurn && result.nextTurn.moduleId === parsed.value.moduleId
          ? result.nextTurn.turnId
          : null,
      turnStartedAt:
        result.nextTurn && result.nextTurn.moduleId === parsed.value.moduleId
          ? result.nextTurn.issuedAt
          : null,
      turnCount: result.kind === "turn_completed" ? result.turnCount : moduleRow.turnCount
    }
  );

  // When the turn auto-advanced into the next module, persist that module's
  // freshly issued turn as well.
  if (result.nextTurn && result.nextTurn.moduleId !== parsed.value.moduleId) {
    const nextRow = moduleRowFor(state.rows, result.nextTurn.moduleId);
    await persistServerModuleSession(
      store,
      candidateContext.candidateId,
      result.session,
      result.nextTurn.moduleId,
      {
        activeTurnId: result.nextTurn.turnId,
        turnStartedAt: result.nextTurn.issuedAt,
        turnCount: nextRow?.turnCount ?? 0
      }
    );
  }
  if (result.nextTurn) {
    await store.recordIssuedTurn(
      candidateContext.candidateId,
      result.session.sessionId,
      result.nextTurn
    );
  }

  // Persist the per-turn honest signals (service-role write; reviewer context
  // only, never a score input).
  if (result.kind === "turn_completed") {
    await store.recordIntegritySignals(candidateContext.candidateId, {
      interviewSessionId: result.session.sessionId,
      moduleId: parsed.value.moduleId,
      turnId: parsed.value.turnId,
      questionId: result.answeredQuestion.id,
      signals: result.integritySignals,
      responseLatencySeconds: result.responseLatencySeconds
    });
  }

  // Keep the aggregate snapshot + candidate progress in sync, server-derived.
  await persistInterviewSessionSnapshot(candidateContext, {
    session: result.session as unknown as Record<string, unknown>,
    questionPlan: { source: "server_authoritative_turn", questions: result.session.questions }
  });

  if (persistedModule.status !== "supabase_persisted" && persistedModule.status !== "local_fallback") {
    logWarn("interview_turn_persistence_degraded", {
      ...logContext,
      moduleId: parsed.value.moduleId,
      persistence: persistedModule.status,
      detail: persistedModule.detail
    });
  }

  if (result.kind === "module_closed") {
    logInfo("interview_module_closed_by_cap", {
      ...logContext,
      moduleId: parsed.value.moduleId,
      reason: result.reason
    });
    return NextResponse.json({
      outcome: "module_closed",
      reason: result.reason,
      session: result.session,
      globalStatus: result.session.global_status,
      nextModuleId: result.nextModuleId ?? null,
      nextTurn: result.nextTurn ?? null,
      persistence: { module: persistedModule.status }
    });
  }

  // Persist every individual ensemble rater run (they share a replicate_group_id);
  // fall back to the aggregate record if individual runs are unavailable.
  const runsToPersist =
    result.evaluatorRuns && result.evaluatorRuns.length > 0
      ? result.evaluatorRuns
      : result.evaluatorRun
        ? [result.evaluatorRun]
        : [];
  const evaluatorPersistResults = await Promise.all(
    runsToPersist.map((run) => persistInterviewEvaluatorRun(run as unknown as Record<string, unknown>))
  );
  const evaluatorPersistence =
    evaluatorPersistResults.find((entry) => entry.status !== "supabase_persisted") ??
    evaluatorPersistResults[0] ??
    null;

  return NextResponse.json({
    outcome: "turn_completed",
    interviewerText: result.interviewerText,
    interviewerSource: result.interviewerSource,
    nextAction: result.nextAction,
    decision: result.decision,
    evaluation: result.evaluation ?? null,
    globalStatus: result.session.global_status,
    session: result.session,
    moduleCompleted: result.moduleCompleted,
    nextModuleId: result.nextModuleId ?? null,
    nextTurn: result.nextTurn ?? null,
    persistence: {
      module: persistedModule.status,
      evaluatorRun: evaluatorPersistence?.status ?? "skipped"
    }
  });
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, status } }, { status });
}

function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: "Too many interview turns. Wait a moment and try again.",
        status: 429
      }
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

function serviceUnavailableResponse() {
  return NextResponse.json(
    {
      error: {
        code: "llm_budget_exhausted",
        message: "The interview service is temporarily unavailable. Please try again later.",
        status: 503
      }
    },
    { status: 503, headers: { "Retry-After": String(secondsUntilUtcMidnight()) } }
  );
}
