import {
  conductTurn,
  type ConductTurnResult,
  type InterviewEvaluatorRunRecord
} from "./conduct-turn";
import type { EnsembleEvaluatorOptions } from "../scoring/bars/ensemble-evaluator";
import type { InterviewerAgentOptions } from "./interviewer-agent";
import { competencyForModule } from "./module-competencies";
import {
  accumulateIntegritySummary,
  parseTurnIntegritySignals,
  type TurnIntegritySignals
} from "./integrity-signals";
import {
  appendFollowUpQuestionForModule,
  computeGlobalStatus,
  recordResponseForModule,
  resumeInterviewSession
} from "./session-state";
import type { InterviewQuestion, InterviewSession, ModuleSession } from "./types";

/**
 * Server-authoritative interview turns.
 *
 * The client contract for POST /candidate/interview/turn is exactly
 * `{ moduleId, turnId, candidateAnswer: { answerText } }`. Everything else —
 * planned question, competency, funnel phase, elapsed time, caps — is derived
 * from state persisted in `candidate_module_sessions` plus server timestamps.
 * Any session/state field arriving from the client is rejected, never merged.
 */

export const MODULE_SESSION_ENVELOPE_SCHEMA = "assumerai-module-session-envelope-v1";

/** Hard ceiling applied to the server-derived per-turn elapsed time. */
export const MAX_TURN_ELAPSED_SECONDS = 600;

/**
 * Total interview duration cap = planned module minutes (from the module plan)
 * times this grace factor. Exceeding it closes the module gracefully.
 */
export const INTERVIEW_DURATION_GRACE_FACTOR = 2;

/**
 * Client body fields that describe interview state. They were trusted by the
 * old contract; the server now rejects a request that tries to supply any of
 * them so tampering attempts fail loudly instead of being silently ignored.
 */
export const FORBIDDEN_CLIENT_STATE_FIELDS = [
  "session",
  "state",
  "competency",
  "plannedQuestionText",
  "currentQuestionStarTarget",
  "cvHook",
  "hasMorePrimaryQuestions",
  "hasMoreCompetencies",
  "elapsedSecondsForTurn",
  "funnelState",
  "questions",
  "responses",
  "modulePlan",
  "caps",
  "followUpCounts",
  "module_sessions",
  "global_status",
  "globalStatus"
] as const;

export interface ServerTurnRequest {
  readonly moduleId: string;
  readonly turnId: string;
  readonly candidateAnswer: { readonly answerText: string };
  /**
   * Optional honest behavioral counters for the turn (tab switches, blur,
   * paste, audio gaps). Validated and clamped; never affects any score.
   */
  readonly integritySignals?: TurnIntegritySignals;
}

export type ParseServerTurnRequestResult =
  | { readonly ok: true; readonly value: ServerTurnRequest }
  | { readonly ok: false; readonly code: string; readonly message: string };

export function parseServerTurnRequestBody(payload: unknown): ParseServerTurnRequestResult {
  if (!isRecord(payload)) {
    return {
      ok: false,
      code: "invalid_interview_turn",
      message: "Interview turn request requires a JSON object."
    };
  }

  const forbidden = FORBIDDEN_CLIENT_STATE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );
  if (forbidden.length > 0) {
    return {
      ok: false,
      code: "client_state_rejected",
      message: `Interview state is derived server-side; remove client field(s): ${forbidden.join(", ")}.`
    };
  }

  const moduleId = readString(payload.moduleId);
  if (!moduleId) {
    return {
      ok: false,
      code: "invalid_interview_turn",
      message: "Interview turn request requires a moduleId."
    };
  }
  const turnId = readString(payload.turnId);
  if (!turnId) {
    return {
      ok: false,
      code: "invalid_interview_turn",
      message: "Interview turn request requires the server-issued turnId."
    };
  }

  if (!isRecord(payload.candidateAnswer)) {
    return {
      ok: false,
      code: "invalid_interview_turn",
      message: "Interview turn request requires candidateAnswer with answerText."
    };
  }
  const extraAnswerFields = Object.keys(payload.candidateAnswer).filter(
    (key) => key !== "answerText"
  );
  if (extraAnswerFields.length > 0) {
    return {
      ok: false,
      code: "client_state_rejected",
      message: `candidateAnswer only carries answerText; remove: ${extraAnswerFields.join(", ")}. The question is derived server-side.`
    };
  }
  const answerText = readString(payload.candidateAnswer.answerText);
  if (!answerText) {
    return {
      ok: false,
      code: "invalid_interview_turn",
      message: "Interview turn request requires a non-empty answerText."
    };
  }

  // Malformed signals never block the turn: they simply aren't recorded.
  const integritySignals = parseTurnIntegritySignals(payload.integritySignals);

  return {
    ok: true,
    value: { moduleId, turnId, candidateAnswer: { answerText }, integritySignals }
  };
}

// ---------------------------------------------------------------------------
// Persistence envelope: candidate_module_sessions is the single source of truth
// ---------------------------------------------------------------------------

/** One row of candidate_module_sessions, camel-cased. */
export interface PersistedModuleSessionRow {
  readonly interviewSessionId: string;
  readonly moduleId: string;
  readonly state: string;
  readonly modulePayload: Record<string, unknown>;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly activeTurnId: string | null;
  readonly turnStartedAt: string | null;
  readonly turnCount: number;
  readonly updatedAt?: string | null;
}

/**
 * Build the module_payload envelope for one module row. The session shell
 * (identifiers, language, plan, caps — everything but the per-module state) is
 * embedded so the full interview state can be reconstructed from module rows
 * alone, without trusting any other table or the client.
 */
export function buildModuleSessionEnvelope(
  session: InterviewSession,
  moduleId: string
): Record<string, unknown> {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    throw new Error(`Interview module session ${moduleId} was not found.`);
  }
  const shell: Record<string, unknown> = { ...session };
  delete shell.module_sessions;

  return {
    schema: MODULE_SESSION_ENVELOPE_SCHEMA,
    shell,
    module: JSON.parse(JSON.stringify(moduleSession)) as Record<string, unknown>
  };
}

/**
 * Rebuild the authoritative InterviewSession from persisted module rows. The
 * shell comes from the most recently updated envelope; module state comes from
 * each row. Rows persisted before the envelope schema (legacy bare
 * ModuleSession payloads) cannot prove a shell, so reconstruction returns
 * undefined and the caller starts a fresh server session.
 */
export function reconstructInterviewSessionFromRows(
  rows: readonly PersistedModuleSessionRow[]
): InterviewSession | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  const sorted = [...rows].sort((a, b) =>
    String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
  );

  let shell: Record<string, unknown> | undefined;
  const moduleSessions: Record<string, unknown> = {};
  for (const row of sorted) {
    const payload = row.modulePayload;
    const moduleSession =
      payload.schema === MODULE_SESSION_ENVELOPE_SCHEMA && isRecord(payload.module)
        ? payload.module
        : undefined;
    if (!moduleSession) {
      continue;
    }
    if (!(row.moduleId in moduleSessions)) {
      moduleSessions[row.moduleId] = moduleSession;
    }
    if (!shell && isRecord(payload.shell)) {
      shell = payload.shell;
    }
  }

  if (!shell || Object.keys(moduleSessions).length === 0) {
    return undefined;
  }

  try {
    const session = resumeInterviewSession(
      JSON.stringify({ ...shell, module_sessions: moduleSessions })
    );
    const globalStatus = computeGlobalStatus(session.module_sessions);
    return {
      ...session,
      global_status: globalStatus,
      status: globalStatus === "all_required_completed" ? "completed" : "in_progress"
    };
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Turn issuance (server-generated turn ids + server timestamps)
// ---------------------------------------------------------------------------

export interface IssuedTurn {
  readonly turnId: string;
  readonly moduleId: string;
  readonly questionId: string;
  readonly questionText: string;
  readonly issuedAt: string;
}

function createTurnId(): string {
  return `turn_${globalThis.crypto.randomUUID()}`;
}

/** Issue a new turn for the module's current question; undefined when none is pending. */
export function issueTurnForModule(
  session: InterviewSession,
  moduleId: string,
  now?: string
): IssuedTurn | undefined {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession || moduleSession.state === "completed" || moduleSession.state === "skipped") {
    return undefined;
  }
  const question = moduleSession.questions.find(
    (item) => item.id === moduleSession.currentQuestionId
  );
  if (!question) {
    return undefined;
  }

  return {
    turnId: createTurnId(),
    moduleId,
    questionId: question.id,
    questionText: question.prompt,
    issuedAt: now ?? new Date().toISOString()
  };
}

/** Mark a module sub-session started (server-side state transition). */
export function startModule(
  session: InterviewSession,
  moduleId: string,
  now?: string
): InterviewSession {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    throw new Error(`Interview module session ${moduleId} was not found.`);
  }
  const timestamp = now ?? new Date().toISOString();
  const started: ModuleSession = {
    ...moduleSession,
    state: moduleSession.state === "not_started" ? "in_progress" : moduleSession.state,
    startedAt: moduleSession.startedAt ?? timestamp
  };

  return {
    ...session,
    module_sessions: { ...session.module_sessions, [moduleId]: started },
    updatedAt: timestamp
  };
}

/** First not-yet-finished module after (or other than) the given one, in plan order. */
export function nextPendingModuleId(
  session: InterviewSession,
  excludeModuleId?: string
): string | undefined {
  const planOrder = session.modulePlan
    .map((module) => module.id)
    .filter((id) => id in session.module_sessions);
  const order = planOrder.length > 0 ? planOrder : Object.keys(session.module_sessions);

  return order.find((id) => {
    if (id === excludeModuleId) {
      return false;
    }
    const moduleSession = session.module_sessions[id];
    return moduleSession.state !== "completed" && moduleSession.state !== "skipped";
  });
}

// ---------------------------------------------------------------------------
// Server-side hard caps (derived from the module plan, never from the client)
// ---------------------------------------------------------------------------

export function maxTurnsForModule(session: InterviewSession, moduleId: string): number {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    return 0;
  }
  const primaryQuestions = moduleSession.questions.filter(
    (question) => !question.followUpReason
  ).length;

  return primaryQuestions + session.caps.maxFollowUpsPerModule;
}

export function interviewDurationCapSeconds(session: InterviewSession): number {
  const plannedMinutes = session.modulePlan.reduce(
    (total, module) => total + module.targetMinutes,
    0
  );

  return plannedMinutes * 60 * INTERVIEW_DURATION_GRACE_FACTOR;
}

export type ServerCapViolation = "module_turn_cap_reached" | "interview_duration_cap_reached";

export function checkServerCaps(
  session: InterviewSession,
  moduleId: string,
  turnCount: number,
  now?: string
): { readonly ok: true } | { readonly ok: false; readonly reason: ServerCapViolation } {
  if (turnCount >= maxTurnsForModule(session, moduleId)) {
    return { ok: false, reason: "module_turn_cap_reached" };
  }

  const startedAtMs = Date.parse(session.createdAt);
  const nowMs = now ? Date.parse(now) : Date.now();
  if (
    Number.isFinite(startedAtMs) &&
    Number.isFinite(nowMs) &&
    (nowMs - startedAtMs) / 1000 > interviewDurationCapSeconds(session)
  ) {
    return { ok: false, reason: "interview_duration_cap_reached" };
  }

  return { ok: true };
}

/** Close a module without scoring penalty when a server cap is exceeded. */
export function closeModuleGracefully(
  session: InterviewSession,
  moduleId: string,
  now?: string
): InterviewSession {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    throw new Error(`Interview module session ${moduleId} was not found.`);
  }
  const timestamp = now ?? new Date().toISOString();
  const closed: ModuleSession = {
    ...moduleSession,
    state: "completed",
    currentQuestionId: "",
    completedAt: moduleSession.completedAt ?? timestamp
  };
  const moduleSessions = { ...session.module_sessions, [moduleId]: closed };
  const globalStatus = computeGlobalStatus(moduleSessions);

  return {
    ...session,
    module_sessions: moduleSessions,
    global_status: globalStatus,
    status: globalStatus === "all_required_completed" ? "completed" : session.status,
    updatedAt: timestamp
  };
}

// ---------------------------------------------------------------------------
// One server-authoritative turn
// ---------------------------------------------------------------------------

export interface ConductServerTurnInput {
  readonly session: InterviewSession;
  readonly moduleId: string;
  /** Turn id submitted by the client; must match the server-issued active turn. */
  readonly turnId: string;
  readonly answerText: string;
  /** Server-persisted active turn id for the module (null when none pending). */
  readonly activeTurnId: string | null;
  /** Server timestamp at which the pending question was issued. */
  readonly turnStartedAt: string | null;
  /** Evaluated turns so far in the module (server-persisted). */
  readonly turnCount: number;
  /** Ledger status of the submitted turn id, when known. */
  readonly submittedTurnStatus?: "issued" | "evaluated" | "expired";
  /** Validated honest signals for this turn; never affects any score. */
  readonly integritySignals?: TurnIntegritySignals;
  readonly now?: string;
  readonly evaluatorOptions?: EnsembleEvaluatorOptions;
  readonly interviewerOptions?: InterviewerAgentOptions;
}

export type ConductServerTurnResult =
  | {
      readonly kind: "rejected";
      readonly status: 404 | 409;
      readonly code: string;
      readonly message: string;
    }
  | {
      readonly kind: "module_closed";
      readonly session: InterviewSession;
      readonly reason: ServerCapViolation | "no_pending_question";
      readonly nextModuleId?: string;
      readonly nextTurn?: IssuedTurn;
    }
  | {
      readonly kind: "turn_completed";
      readonly session: InterviewSession;
      readonly interviewerText: ConductTurnResult["interviewerText"];
      readonly interviewerSource: ConductTurnResult["interviewerSource"];
      readonly evaluation: ConductTurnResult["evaluation"];
      readonly evaluatorRun?: InterviewEvaluatorRunRecord;
      readonly evaluatorRuns?: InterviewEvaluatorRunRecord[];
      readonly decision: ConductTurnResult["decision"];
      readonly nextAction: ConductTurnResult["nextAction"];
      readonly answeredQuestion: InterviewQuestion;
      readonly moduleCompleted: boolean;
      readonly nextModuleId?: string;
      readonly nextTurn?: IssuedTurn;
      readonly turnCount: number;
      /** Signals recorded for this turn (clamped) + server-derived latency. */
      readonly integritySignals?: TurnIntegritySignals;
      readonly responseLatencySeconds: number;
    };

export async function conductServerTurn(
  input: ConductServerTurnInput
): Promise<ConductServerTurnResult> {
  const now = input.now ?? new Date().toISOString();
  const moduleSession = input.session.module_sessions[input.moduleId];
  if (!moduleSession) {
    return {
      kind: "rejected",
      status: 404,
      code: "module_not_found",
      message: `Module ${input.moduleId} was not found in this interview session.`
    };
  }

  // Anti-replay: an already-evaluated turn is final.
  if (input.submittedTurnStatus === "evaluated") {
    return {
      kind: "rejected",
      status: 409,
      code: "turn_already_evaluated",
      message: "This turn was already evaluated and cannot be replayed."
    };
  }
  if (!input.activeTurnId || input.turnId !== input.activeTurnId) {
    return {
      kind: "rejected",
      status: 409,
      code: "turn_not_active",
      message: "The submitted turnId is not the active server-issued turn for this module."
    };
  }
  if (moduleSession.state === "completed" || moduleSession.state === "skipped") {
    return {
      kind: "rejected",
      status: 409,
      code: "module_already_completed",
      message: `Module ${input.moduleId} is already closed.`
    };
  }

  // Server-side hard caps from the module plan.
  const capCheck = checkServerCaps(input.session, input.moduleId, input.turnCount, now);
  if (!capCheck.ok) {
    const closed = closeModuleGracefully(input.session, input.moduleId, now);
    const nextModuleId = nextPendingModuleId(closed, input.moduleId);
    return {
      kind: "module_closed",
      session: closed,
      reason: capCheck.reason,
      nextModuleId,
      nextTurn: nextModuleId ? issueTurnForModule(closed, nextModuleId, now) : undefined
    };
  }

  // The question being answered is the server-persisted current question.
  const question = moduleSession.questions.find(
    (item) => item.id === moduleSession.currentQuestionId
  );
  if (!question) {
    const closed = closeModuleGracefully(input.session, input.moduleId, now);
    const nextModuleId = nextPendingModuleId(closed, input.moduleId);
    return {
      kind: "module_closed",
      session: closed,
      reason: "no_pending_question",
      nextModuleId,
      nextTurn: nextModuleId ? issueTurnForModule(closed, nextModuleId, now) : undefined
    };
  }

  let recorded: InterviewSession;
  try {
    recorded = recordResponseForModule(input.session, input.moduleId, {
      questionId: question.id,
      answerText: input.answerText,
      answeredAt: now
    });
  } catch (error) {
    return {
      kind: "rejected",
      status: 409,
      code: "turn_not_recordable",
      message:
        error instanceof Error ? error.message : "The answer could not be recorded for this turn."
    };
  }

  // Elapsed time comes from server timestamps, clamped, never from the client.
  const issuedAtMs = input.turnStartedAt ? Date.parse(input.turnStartedAt) : Number.NaN;
  const nowMs = Date.parse(now);
  const elapsedSecondsForTurn =
    Number.isFinite(issuedAtMs) && Number.isFinite(nowMs)
      ? Math.min(Math.max((nowMs - issuedAtMs) / 1000, 0), MAX_TURN_ELAPSED_SECONDS)
      : 0;

  const recordedModule = recorded.module_sessions[input.moduleId];
  const answeredIds = new Set(recordedModule.responses.map((response) => response.questionId));
  const hasMorePrimaryQuestions = recordedModule.questions.some(
    (item) => !item.followUpReason && !answeredIds.has(item.id)
  );
  const hasMoreCompetencies = Boolean(nextPendingModuleId(recorded, input.moduleId));
  const nextPlanned = recordedModule.questions.find((item) => !answeredIds.has(item.id));

  const result = await conductTurn({
    session: recorded,
    moduleId: input.moduleId,
    competency: competencyForModule(input.moduleId, question),
    candidateAnswer: {
      questionId: question.id,
      questionText: question.prompt,
      answerText: input.answerText
    },
    plannedQuestionText: nextPlanned?.prompt,
    cvHook: question.resumeGrounding?.resumeEvidence[0],
    hasMorePrimaryQuestions,
    hasMoreCompetencies,
    elapsedSecondsForTurn,
    arcStage: question.arcStage,
    scoringMode: question.scoringMode,
    now,
    evaluatorOptions: input.evaluatorOptions,
    interviewerOptions: input.interviewerOptions
  });

  let session = result.session;
  if (result.decision.kind === "ask_follow_up") {
    session =
      appendFollowUpQuestionForModule(
        session,
        input.moduleId,
        result.decision.missingStarElements ?? [],
        now
      ) ?? session;
  }

  // Fold the turn's honest signals into the module's read-only integrity
  // summary. This happens strictly AFTER scoring: the evaluation above never
  // sees integrity data, by construction.
  const moduleForIntegrity = session.module_sessions[input.moduleId];
  session = {
    ...session,
    module_sessions: {
      ...session.module_sessions,
      [input.moduleId]: {
        ...moduleForIntegrity,
        integritySummary: accumulateIntegritySummary(moduleForIntegrity.integritySummary, {
          signals: input.integritySignals,
          responseLatencySeconds: elapsedSecondsForTurn
        })
      }
    }
  };

  const moduleCompleted = session.module_sessions[input.moduleId].state === "completed";
  let nextModuleId: string | undefined;
  let nextTurn: IssuedTurn | undefined;
  if (moduleCompleted) {
    nextModuleId = nextPendingModuleId(session, input.moduleId);
    if (nextModuleId) {
      session = startModule(session, nextModuleId, now);
      nextTurn = issueTurnForModule(session, nextModuleId, now);
    }
  } else {
    nextTurn = issueTurnForModule(session, input.moduleId, now);
  }

  return {
    kind: "turn_completed",
    session,
    interviewerText: result.interviewerText,
    interviewerSource: result.interviewerSource,
    evaluation: result.evaluation,
    evaluatorRun: result.evaluatorRun,
    evaluatorRuns: result.evaluatorRuns,
    decision: result.decision,
    nextAction: result.nextAction,
    answeredQuestion: question,
    moduleCompleted,
    nextModuleId,
    nextTurn,
    turnCount: input.turnCount + 1,
    integritySignals: input.integritySignals,
    responseLatencySeconds: elapsedSecondsForTurn
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
