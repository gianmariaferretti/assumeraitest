import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildModuleSessionEnvelope,
  reconstructInterviewSessionFromRows,
  type IssuedTurn,
  type PersistedModuleSessionRow
} from "@/features/interview-flow/server-turn";
import type { TurnIntegritySignals } from "@/features/interview-flow/integrity-signals";
import {
  createInterviewSession,
  type CandidateInterviewLanguageCode,
  type InterviewQuestion,
  type InterviewSession,
  type RoleProfileInput
} from "@/features/interview-flow";
import type { CandidateProfile } from "@/features/resume-parsing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isAuthenticatedCandidateContext,
  type CandidateRouteContext
} from "./supabase-candidate-context";
import type { CandidatePersistenceResult } from "./supabase-candidate-store";

/**
 * Server-authoritative interview state store.
 *
 * candidate_module_sessions and candidate_interview_turns are service-role
 * write only (migration 20260609100000): the candidate's browser cannot write
 * interview state, not even with their own JWT. Routes read and write through
 * this store; an in-memory implementation backs explicitly-enabled local dev
 * (no Supabase / no service role) and tests.
 */

export type TurnLedgerStatus = "issued" | "evaluated" | "expired";

export interface ServerInterviewStore {
  readonly kind: "supabase" | "memory";
  loadModuleRows(
    candidateId: string,
    interviewSessionId?: string
  ): Promise<PersistedModuleSessionRow[]>;
  saveModuleRow(
    candidateId: string,
    row: PersistedModuleSessionRow
  ): Promise<CandidatePersistenceResult>;
  getTurnStatus(
    candidateId: string,
    interviewSessionId: string,
    turnId: string
  ): Promise<TurnLedgerStatus | undefined>;
  recordIssuedTurn(
    candidateId: string,
    interviewSessionId: string,
    turn: IssuedTurn
  ): Promise<CandidatePersistenceResult>;
  markTurnEvaluated(
    candidateId: string,
    interviewSessionId: string,
    turnId: string,
    evaluatedAt: string,
    status?: Extract<TurnLedgerStatus, "evaluated" | "expired">,
    asrConfidence?: number
  ): Promise<CandidatePersistenceResult>;
  /** Per-turn ASR confidences for a module (null entries = text-mode turns). */
  listModuleAsrConfidences(
    candidateId: string,
    interviewSessionId: string,
    moduleId: string
  ): Promise<(number | null)[]>;
  /**
   * Route a module's evaluation to human review for low transcription
   * confidence (idempotent; reuses the Phase 8 human-review request table).
   */
  recordAsrReviewFlag(
    candidateId: string,
    interviewSessionId: string,
    moduleId: string,
    averageConfidence: number
  ): Promise<CandidatePersistenceResult>;
  /** Candidate's descriptive work-style profile for a session (Phase 13). */
  readWorkStyleProfile(
    candidateId: string,
    interviewSessionId: string
  ): Promise<Record<string, unknown> | undefined>;
  saveWorkStyleProfile(
    candidateId: string,
    interviewSessionId: string,
    profile: Record<string, unknown>
  ): Promise<CandidatePersistenceResult>;
  /** Candidate's descriptive job-driver profile for a session (Phase 14, flag-only). */
  readDriverProfile(
    candidateId: string,
    interviewSessionId: string
  ): Promise<Record<string, unknown> | undefined>;
  saveDriverProfile(
    candidateId: string,
    interviewSessionId: string,
    profile: Record<string, unknown>
  ): Promise<CandidatePersistenceResult>;
  /** Persist one turn's honest integrity signals (service-role write only). */
  recordIntegritySignals(
    candidateId: string,
    row: {
      readonly interviewSessionId: string;
      readonly moduleId: string;
      readonly turnId: string;
      readonly questionId: string | null;
      readonly signals: TurnIntegritySignals | undefined;
      readonly responseLatencySeconds: number;
    }
  ): Promise<CandidatePersistenceResult>;
}

export interface LoadedServerInterviewState {
  readonly session: InterviewSession;
  readonly rows: readonly PersistedModuleSessionRow[];
}

/** Load and reconstruct the candidate's latest server-authoritative session. */
export async function loadServerInterviewState(
  store: ServerInterviewStore,
  candidateId: string,
  interviewSessionId?: string
): Promise<LoadedServerInterviewState | undefined> {
  const rows = await store.loadModuleRows(candidateId, interviewSessionId);
  const session = reconstructInterviewSessionFromRows(rows);

  return session ? { session, rows } : undefined;
}

export function moduleRowFor(
  rows: readonly PersistedModuleSessionRow[],
  moduleId: string
): PersistedModuleSessionRow | undefined {
  return rows.find((row) => row.moduleId === moduleId);
}

/**
 * Persist one module of a session as a server-written row (envelope payload).
 * Turn-tracking columns are taken from the supplied overrides so the route
 * controls exactly when a turn becomes active or consumed.
 */
export async function persistServerModuleSession(
  store: ServerInterviewStore,
  candidateId: string,
  session: InterviewSession,
  moduleId: string,
  turnTracking: {
    readonly activeTurnId: string | null;
    readonly turnStartedAt: string | null;
    readonly turnCount: number;
    /** Mode the module is conducted in (voice | text); defaults to voice. */
    readonly interviewMode?: "voice" | "text";
  }
): Promise<CandidatePersistenceResult> {
  const moduleSession = session.module_sessions[moduleId];

  return store.saveModuleRow(candidateId, {
    interviewSessionId: session.sessionId,
    moduleId,
    state: moduleSession.state,
    modulePayload: buildModuleSessionEnvelope(session, moduleId),
    startedAt: moduleSession.startedAt ?? null,
    completedAt: moduleSession.completedAt ?? null,
    activeTurnId: turnTracking.activeTurnId,
    turnStartedAt: turnTracking.turnStartedAt,
    turnCount: turnTracking.turnCount,
    interviewMode: turnTracking.interviewMode ?? "voice",
    updatedAt: new Date().toISOString()
  });
}

/** Persist every module row of a freshly created session (no active turns yet). */
export async function persistAllServerModuleSessions(
  store: ServerInterviewStore,
  candidateId: string,
  session: InterviewSession,
  interviewMode: "voice" | "text" = "voice"
): Promise<CandidatePersistenceResult> {
  let worst: CandidatePersistenceResult = { status: "supabase_persisted" };
  for (const moduleId of Object.keys(session.module_sessions)) {
    const result = await persistServerModuleSession(store, candidateId, session, moduleId, {
      activeTurnId: null,
      turnStartedAt: null,
      turnCount: 0,
      interviewMode
    });
    if (result.status !== "supabase_persisted") {
      worst = result;
    }
  }

  return worst;
}

// ---------------------------------------------------------------------------
// Session creation (server-side; the client never creates interview state)
// ---------------------------------------------------------------------------

export interface CreateServerInterviewSessionInput {
  readonly roleProfile: RoleProfileInput;
  readonly interviewLanguage: CandidateInterviewLanguageCode;
  readonly candidateProfile?: CandidateProfile;
  readonly questionBank?: InterviewQuestion[];
  /** Pre-interview mode choice (text is first-class, not a fallback). */
  readonly interviewMode?: "voice" | "text";
}

function createServerSessionId(): string {
  return `interview_session_${Date.now().toString(36)}_${globalThis.crypto
    .randomUUID()
    .slice(0, 8)}`;
}

/** Create and persist a fresh server-authoritative interview session. */
export async function createServerInterviewSession(
  store: ServerInterviewStore,
  candidateId: string,
  input: CreateServerInterviewSessionInput
): Promise<{ readonly session: InterviewSession; readonly persistence: CandidatePersistenceResult }> {
  const session = createInterviewSession({
    candidateId,
    interviewLanguage: input.interviewLanguage,
    roleProfile: input.roleProfile,
    candidateProfile: input.questionBank ? undefined : input.candidateProfile,
    questionBank: input.questionBank,
    sessionId: createServerSessionId()
  });
  const persistence = await persistAllServerModuleSessions(
    store,
    candidateId,
    session,
    input.interviewMode ?? "voice"
  );

  return { session, persistence };
}

/**
 * Load the candidate's current server session, creating one when none exists.
 * An in-progress session is reused while its interview language still matches;
 * a language switch starts a fresh session with the new question plan.
 */
export async function ensureServerInterviewSession(
  store: ServerInterviewStore,
  candidateId: string,
  input: CreateServerInterviewSessionInput
): Promise<{
  readonly session: InterviewSession;
  readonly created: boolean;
  readonly persistence: CandidatePersistenceResult;
}> {
  const existing = await loadServerInterviewState(store, candidateId);
  if (existing && existing.session.interviewLanguage === input.interviewLanguage) {
    return {
      session: existing.session,
      created: false,
      persistence: { status: "supabase_persisted" }
    };
  }

  const created = await createServerInterviewSession(store, candidateId, input);

  return { session: created.session, created: true, persistence: created.persistence };
}

// ---------------------------------------------------------------------------
// Supabase-backed store (service role)
// ---------------------------------------------------------------------------

type AdminClient = Pick<SupabaseClient, "from">;

export function createSupabaseServerInterviewStore(admin: AdminClient): ServerInterviewStore {
  return {
    kind: "supabase",

    async loadModuleRows(candidateId, interviewSessionId) {
      const filtered = admin
        .from("candidate_module_sessions")
        .select(
          "interview_session_id,module_id,state,module_payload,started_at,completed_at,active_turn_id,turn_started_at,turn_count,interview_mode,updated_at"
        )
        .eq("user_id", candidateId);
      const query = interviewSessionId
        ? filtered.eq("interview_session_id", interviewSessionId)
        : filtered;
      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error || !data) {
        return [];
      }

      const rows = (data as Record<string, unknown>[]).map(rowFromSupabase);
      if (interviewSessionId || rows.length === 0) {
        return rows;
      }
      // Without an explicit id, scope to the most recently updated session.
      const latestSessionId = rows[0].interviewSessionId;
      return rows.filter((row) => row.interviewSessionId === latestSessionId);
    },

    async saveModuleRow(candidateId, row) {
      return runWrite(
        admin.from("candidate_module_sessions").upsert(
          {
            user_id: candidateId,
            interview_session_id: row.interviewSessionId,
            module_id: row.moduleId,
            state: row.state,
            module_payload: row.modulePayload,
            started_at: row.startedAt,
            completed_at: row.completedAt,
            active_turn_id: row.activeTurnId,
            turn_started_at: row.turnStartedAt,
            turn_count: row.turnCount,
            interview_mode: row.interviewMode ?? "voice",
            updated_at: row.updatedAt ?? new Date().toISOString()
          },
          { onConflict: "user_id,interview_session_id,module_id" }
        )
      );
    },

    async getTurnStatus(candidateId, interviewSessionId, turnId) {
      const { data, error } = await admin
        .from("candidate_interview_turns")
        .select("status")
        .eq("user_id", candidateId)
        .eq("interview_session_id", interviewSessionId)
        .eq("turn_id", turnId)
        .maybeSingle();
      if (error || !data) {
        return undefined;
      }
      const status = (data as Record<string, unknown>).status;
      return status === "issued" || status === "evaluated" || status === "expired"
        ? status
        : undefined;
    },

    async recordIssuedTurn(candidateId, interviewSessionId, turn) {
      return runWrite(
        admin.from("candidate_interview_turns").upsert(
          {
            user_id: candidateId,
            interview_session_id: interviewSessionId,
            module_id: turn.moduleId,
            turn_id: turn.turnId,
            question_id: turn.questionId,
            status: "issued",
            issued_at: turn.issuedAt
          },
          { onConflict: "user_id,interview_session_id,turn_id", ignoreDuplicates: true }
        )
      );
    },

    async markTurnEvaluated(candidateId, interviewSessionId, turnId, evaluatedAt, status, asrConfidence) {
      return runWrite(
        admin
          .from("candidate_interview_turns")
          .update({
            status: status ?? "evaluated",
            evaluated_at: evaluatedAt,
            ...(asrConfidence === undefined ? {} : { asr_confidence: asrConfidence })
          })
          .eq("user_id", candidateId)
          .eq("interview_session_id", interviewSessionId)
          .eq("turn_id", turnId)
      );
    },

    async listModuleAsrConfidences(candidateId, interviewSessionId, moduleId) {
      const { data, error } = await admin
        .from("candidate_interview_turns")
        .select("asr_confidence")
        .eq("user_id", candidateId)
        .eq("interview_session_id", interviewSessionId)
        .eq("module_id", moduleId)
        .eq("status", "evaluated");
      if (error || !data) {
        return [];
      }

      return (data as Record<string, unknown>[]).map((row) =>
        typeof row.asr_confidence === "number" ? row.asr_confidence : null
      );
    },

    async recordAsrReviewFlag(candidateId, interviewSessionId, moduleId, averageConfidence) {
      return runWrite(
        admin.from("human_review_requests").upsert(
          {
            user_id: candidateId,
            request_id: `asr_review_${interviewSessionId}_${moduleId}`,
            target_type: "interview_scorecard",
            target_id: `${interviewSessionId}:${moduleId}`,
            summary: "low transcription confidence",
            evidence_notes: `Module ${moduleId} average ASR confidence ${averageConfidence.toFixed(
              2
            )} is below the review threshold. Scores must be human-reviewed; transcription quality is never a score input.`,
            status: "open",
            request_payload: {
              reason: "low_transcription_confidence",
              module_id: moduleId,
              average_asr_confidence: averageConfidence
            },
            audit_event_id: `audit_asr_review_${interviewSessionId}_${moduleId}`,
            requested_at: new Date().toISOString()
          },
          { onConflict: "user_id,request_id", ignoreDuplicates: true }
        )
      );
    },

    async readWorkStyleProfile(candidateId, interviewSessionId) {
      const { data, error } = await admin
        .from("work_style_profiles")
        .select("profile")
        .eq("user_id", candidateId)
        .eq("interview_session_id", interviewSessionId)
        .maybeSingle();
      if (error || !data) {
        return undefined;
      }
      const profile = (data as Record<string, unknown>).profile;
      return profile && typeof profile === "object" && !Array.isArray(profile)
        ? (profile as Record<string, unknown>)
        : undefined;
    },

    async saveWorkStyleProfile(candidateId, interviewSessionId, profile) {
      return runWrite(
        admin.from("work_style_profiles").upsert(
          {
            user_id: candidateId,
            interview_session_id: interviewSessionId,
            profile,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,interview_session_id" }
        )
      );
    },

    async readDriverProfile(candidateId, interviewSessionId) {
      const { data, error } = await admin
        .from("driver_profiles")
        .select("profile")
        .eq("user_id", candidateId)
        .eq("interview_session_id", interviewSessionId)
        .maybeSingle();
      if (error || !data) {
        return undefined;
      }
      const profile = (data as Record<string, unknown>).profile;
      return profile && typeof profile === "object" && !Array.isArray(profile)
        ? (profile as Record<string, unknown>)
        : undefined;
    },

    async saveDriverProfile(candidateId, interviewSessionId, profile) {
      return runWrite(
        admin.from("driver_profiles").upsert(
          {
            user_id: candidateId,
            interview_session_id: interviewSessionId,
            profile,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,interview_session_id" }
        )
      );
    },

    async recordIntegritySignals(candidateId, row) {
      return runWrite(
        admin.from("integrity_signals").upsert(
          {
            user_id: candidateId,
            interview_session_id: row.interviewSessionId,
            module_id: row.moduleId,
            turn_id: row.turnId,
            question_id: row.questionId,
            tab_hidden_count: row.signals?.tabHiddenCount ?? 0,
            window_blur_count: row.signals?.windowBlurCount ?? 0,
            paste_count: row.signals?.pasteCount ?? 0,
            audio_gap_count: row.signals?.audioGapCount ?? 0,
            max_audio_gap_seconds: row.signals?.maxAudioGapSeconds ?? 0,
            response_latency_seconds: row.responseLatencySeconds
          },
          { onConflict: "user_id,interview_session_id,turn_id", ignoreDuplicates: true }
        )
      );
    }
  };
}

function rowFromSupabase(row: Record<string, unknown>): PersistedModuleSessionRow {
  return {
    interviewSessionId: String(row.interview_session_id ?? ""),
    moduleId: String(row.module_id ?? ""),
    state: String(row.state ?? "not_started"),
    modulePayload: isRecord(row.module_payload) ? row.module_payload : {},
    startedAt: readNullableString(row.started_at),
    completedAt: readNullableString(row.completed_at),
    activeTurnId: readNullableString(row.active_turn_id),
    turnStartedAt: readNullableString(row.turn_started_at),
    turnCount: typeof row.turn_count === "number" ? row.turn_count : 0,
    interviewMode: row.interview_mode === "text" ? "text" : "voice",
    updatedAt: readNullableString(row.updated_at)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function runWrite(
  promise: PromiseLike<{ readonly error: { readonly message?: string } | null }>
): Promise<CandidatePersistenceResult> {
  try {
    const { error } = await promise;
    if (error) {
      return { status: "supabase_unavailable", detail: error.message ?? "Supabase write failed." };
    }
    return { status: "supabase_persisted" };
  } catch (error) {
    return {
      status: "supabase_unavailable",
      detail: error instanceof Error ? error.message : "Supabase write failed."
    };
  }
}

// ---------------------------------------------------------------------------
// In-memory store (explicit local dev fallback + tests)
// ---------------------------------------------------------------------------

type MemoryCandidateState = {
  readonly rows: Map<string, PersistedModuleSessionRow>;
  readonly turns: Map<string, TurnLedgerStatus>;
  readonly asrConfidences: Map<string, number>;
  readonly asrReviewFlags: Set<string>;
  readonly workStyleProfiles: Map<string, Record<string, unknown>>;
  readonly driverProfiles: Map<string, Record<string, unknown>>;
};

const memoryState = new Map<string, MemoryCandidateState>();

function memoryFor(candidateId: string): MemoryCandidateState {
  let state = memoryState.get(candidateId);
  if (!state) {
    state = { rows: new Map(), turns: new Map(), asrConfidences: new Map(), asrReviewFlags: new Set(), workStyleProfiles: new Map(), driverProfiles: new Map() };
    memoryState.set(candidateId, state);
  }
  return state;
}

export function createInMemoryServerInterviewStore(): ServerInterviewStore {
  return {
    kind: "memory",

    async loadModuleRows(candidateId, interviewSessionId) {
      const rows = [...memoryFor(candidateId).rows.values()].sort((a, b) =>
        String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
      );
      if (interviewSessionId) {
        return rows.filter((row) => row.interviewSessionId === interviewSessionId);
      }
      const latestSessionId = rows[0]?.interviewSessionId;
      return latestSessionId
        ? rows.filter((row) => row.interviewSessionId === latestSessionId)
        : [];
    },

    async saveModuleRow(candidateId, row) {
      memoryFor(candidateId).rows.set(`${row.interviewSessionId}:${row.moduleId}`, {
        ...row,
        updatedAt: row.updatedAt ?? new Date().toISOString()
      });
      return { status: "local_fallback" };
    },

    async getTurnStatus(candidateId, interviewSessionId, turnId) {
      return memoryFor(candidateId).turns.get(`${interviewSessionId}:${turnId}`);
    },

    async recordIssuedTurn(candidateId, interviewSessionId, turn) {
      const key = `${interviewSessionId}:${turn.turnId}`;
      const turns = memoryFor(candidateId).turns;
      if (!turns.has(key)) {
        turns.set(key, "issued");
      }
      return { status: "local_fallback" };
    },

    async markTurnEvaluated(candidateId, interviewSessionId, turnId, _evaluatedAt, status, asrConfidence) {
      const state = memoryFor(candidateId);
      state.turns.set(`${interviewSessionId}:${turnId}`, status ?? "evaluated");
      if (asrConfidence !== undefined) {
        state.asrConfidences.set(`${interviewSessionId}:${turnId}`, asrConfidence);
      }
      return { status: "local_fallback" };
    },

    async listModuleAsrConfidences(candidateId, interviewSessionId) {
      const state = memoryFor(candidateId);
      return [...state.asrConfidences.entries()]
        .filter(([key]) => key.startsWith(`${interviewSessionId}:`))
        .map(([, value]) => value);
    },

    async recordAsrReviewFlag(candidateId, interviewSessionId, moduleId) {
      memoryFor(candidateId).asrReviewFlags.add(`${interviewSessionId}:${moduleId}`);
      return { status: "local_fallback" };
    },

    async readWorkStyleProfile(candidateId, interviewSessionId) {
      return memoryFor(candidateId).workStyleProfiles.get(interviewSessionId);
    },

    async saveWorkStyleProfile(candidateId, interviewSessionId, profile) {
      memoryFor(candidateId).workStyleProfiles.set(interviewSessionId, profile);
      return { status: "local_fallback" };
    },

    async readDriverProfile(candidateId, interviewSessionId) {
      return memoryFor(candidateId).driverProfiles.get(interviewSessionId);
    },

    async saveDriverProfile(candidateId, interviewSessionId, profile) {
      memoryFor(candidateId).driverProfiles.set(interviewSessionId, profile);
      return { status: "local_fallback" };
    },

    async recordIntegritySignals() {
      // The in-memory store keeps the integrity summary on the module payload
      // only; per-turn rows exist in Postgres.
      return { status: "local_fallback" };
    }
  };
}

/** Test-only helper: clear the in-memory store between cases. */
export function clearInMemoryServerInterviewStore(): void {
  memoryState.clear();
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the store for a candidate route. Authenticated context with a
 * configured service role gets the Supabase store; otherwise the in-memory
 * store keeps local development working (state still never comes from the
 * client). The fallback path mirrors resolveCandidateRouteContext's gating.
 */
export function resolveServerInterviewStore(context: CandidateRouteContext): ServerInterviewStore {
  if (isAuthenticatedCandidateContext(context)) {
    try {
      return createSupabaseServerInterviewStore(createAdminClient());
    } catch {
      // Service role not configured (local dev): fall through to memory.
    }
  }

  return createInMemoryServerInterviewStore();
}
