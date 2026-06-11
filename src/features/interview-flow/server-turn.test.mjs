import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  buildModuleSessionEnvelope,
  checkServerCaps,
  conductServerTurn,
  interviewDurationCapSeconds,
  issueTurnForModule,
  maxTurnsForModule,
  nextPendingModuleId,
  parseServerTurnRequestBody,
  reconstructInterviewSessionFromRows,
  startModule
} = loadFromRepoRoot("src/features/interview-flow/server-turn.ts");
const { createInterviewSession } = loadFromRepoRoot(
  "src/features/interview-flow/session-state.ts",
);
const { applyDecision } = loadFromRepoRoot(
  "src/features/interview-flow/funnel-state-machine.ts",
);

const NOW = "2026-06-09T10:00:00.000Z";
const ONE_MINUTE_LATER = "2026-06-09T10:01:00.000Z";

const roleProfile = {
  role_id: "role_sdr",
  title: "Sales Development Representative",
  role_type: "sales",
  requirements: { required_skills: ["outbound"] },
  calibration: {},
};

const offlineOptions = {
  evaluatorOptions: { apiKey: null },
  interviewerOptions: { apiKey: null },
};

function newSession() {
  return createInterviewSession({
    candidateId: "cand_1",
    interviewLanguage: "en",
    roleProfile,
    now: NOW,
    sessionId: "sess_server_turn",
  });
}

function buildRows(session, overrides = {}) {
  return Object.keys(session.module_sessions).map((moduleId) => ({
    interviewSessionId: session.sessionId,
    moduleId,
    state: session.module_sessions[moduleId].state,
    modulePayload: buildModuleSessionEnvelope(session, moduleId),
    startedAt: session.module_sessions[moduleId].startedAt ?? null,
    completedAt: session.module_sessions[moduleId].completedAt ?? null,
    activeTurnId: null,
    turnStartedAt: null,
    turnCount: 0,
    updatedAt: session.updatedAt,
    ...(overrides[moduleId] ?? {}),
  }));
}

// Drive a module funnel into exploration with one primary question asked, so the
// next answer is eligible for a STAR follow-up.
function intoExplorationWithPrimary(session, moduleId) {
  let fs = session.module_sessions[moduleId].funnelState;
  fs = applyDecision(fs, { kind: "advance_phase", phase: "exploration", reason: "" }, 50);
  fs = applyDecision(fs, { kind: "ask_primary_question", phase: "exploration", reason: "" }, 30);
  session.module_sessions[moduleId].funnelState = fs;
}

// ---------------------------------------------------------------------------
// Tampered-body rejection
// ---------------------------------------------------------------------------

test("a turn body smuggling session state is rejected, field by field", () => {
  for (const field of [
    "session",
    "competency",
    "plannedQuestionText",
    "elapsedSecondsForTurn",
    "hasMorePrimaryQuestions",
    "funnelState",
  ]) {
    const parsed = parseServerTurnRequestBody({
      moduleId: "motivation",
      turnId: "turn_x",
      candidateAnswer: { answerText: "hello" },
      [field]: { tampered: true },
    });
    assert.equal(parsed.ok, false, field);
    assert.equal(parsed.code, "client_state_rejected", field);
  }
});

test("candidateAnswer may not carry its own question; only answerText is accepted", () => {
  const parsed = parseServerTurnRequestBody({
    moduleId: "motivation",
    turnId: "turn_x",
    candidateAnswer: {
      answerText: "hello",
      questionId: "attacker-chosen-question",
      questionText: "What is 1+1?",
    },
  });
  assert.equal(parsed.ok, false);
  assert.equal(parsed.code, "client_state_rejected");
});

test("a minimal well-formed turn body parses", () => {
  const parsed = parseServerTurnRequestBody({
    moduleId: "motivation",
    turnId: "turn_x",
    candidateAnswer: { answerText: "  hello  " },
  });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, {
    moduleId: "motivation",
    turnId: "turn_x",
    candidateAnswer: { answerText: "hello" },
    integritySignals: undefined,
    asrConfidence: undefined,
  });
});

test("turn bodies missing moduleId, turnId, or answerText are invalid", () => {
  assert.equal(parseServerTurnRequestBody(null).ok, false);
  assert.equal(
    parseServerTurnRequestBody({ turnId: "t", candidateAnswer: { answerText: "x" } }).ok,
    false,
  );
  assert.equal(
    parseServerTurnRequestBody({ moduleId: "m", candidateAnswer: { answerText: "x" } }).ok,
    false,
  );
  assert.equal(
    parseServerTurnRequestBody({ moduleId: "m", turnId: "t", candidateAnswer: { answerText: " " } })
      .ok,
    false,
  );
});

// ---------------------------------------------------------------------------
// Reconstruction from persisted module rows (single source of truth)
// ---------------------------------------------------------------------------

test("a session round-trips through module_payload envelopes", () => {
  const session = newSession();
  const rebuilt = reconstructInterviewSessionFromRows(buildRows(session));

  assert.ok(rebuilt);
  assert.equal(rebuilt.sessionId, session.sessionId);
  assert.equal(rebuilt.candidateId, session.candidateId);
  assert.equal(rebuilt.interviewLanguage, session.interviewLanguage);
  assert.deepEqual(Object.keys(rebuilt.module_sessions), Object.keys(session.module_sessions));
  for (const moduleId of Object.keys(session.module_sessions)) {
    assert.deepEqual(
      rebuilt.module_sessions[moduleId].questions.map((q) => q.id),
      session.module_sessions[moduleId].questions.map((q) => q.id),
      moduleId,
    );
  }
});

test("legacy bare module payloads (no envelope shell) yield no server session", () => {
  const session = newSession();
  const rows = Object.keys(session.module_sessions).map((moduleId) => ({
    interviewSessionId: session.sessionId,
    moduleId,
    state: "not_started",
    modulePayload: JSON.parse(JSON.stringify(session.module_sessions[moduleId])),
    startedAt: null,
    completedAt: null,
    activeTurnId: null,
    turnStartedAt: null,
    turnCount: 0,
    updatedAt: session.updatedAt,
  }));

  assert.equal(reconstructInterviewSessionFromRows(rows), undefined);
  assert.equal(reconstructInterviewSessionFromRows([]), undefined);
});

// ---------------------------------------------------------------------------
// Happy path + resume after disconnect
// ---------------------------------------------------------------------------

test("happy path: a server-issued turn is answered, evaluated, and the next turn issued", async () => {
  let session = startModule(newSession(), "motivation", NOW);
  const turn = issueTurnForModule(session, "motivation", NOW);

  assert.ok(turn);
  assert.match(turn.turnId, /^turn_/);
  assert.equal(turn.questionId, session.module_sessions.motivation.currentQuestionId);

  const result = await conductServerTurn({
    session,
    moduleId: "motivation",
    turnId: turn.turnId,
    answerText:
      "At Acme in 2023 I owned DACH outbound. I built a three-touch sequence and booked 14 meetings, a 30% lift.",
    activeTurnId: turn.turnId,
    turnStartedAt: turn.issuedAt,
    turnCount: 0,
    now: ONE_MINUTE_LATER,
    ...offlineOptions,
  });

  assert.equal(result.kind, "turn_completed");
  assert.equal(result.turnCount, 1);
  assert.equal(result.answeredQuestion.id, turn.questionId);
  assert.equal(result.session.module_sessions.motivation.responses.length, 1);
  assert.equal(
    result.session.module_sessions.motivation.responses[0].answeredAt,
    ONE_MINUTE_LATER,
    "answer timestamp is the server clock, not a client value",
  );
  assert.ok(result.evaluatorRun, "an audit record is produced for the evaluation");
  assert.ok(result.nextTurn, "the next turn is issued server-side");
  assert.notEqual(result.nextTurn.turnId, turn.turnId);

  // Resume after disconnect: state rebuilt from persisted rows still points at
  // the same pending question the server issued before the connection dropped.
  const rows = buildRows(result.session, {
    [result.nextTurn.moduleId]: {
      activeTurnId: result.nextTurn.turnId,
      turnStartedAt: result.nextTurn.issuedAt,
    },
  });
  const rebuilt = reconstructInterviewSessionFromRows(rows);
  assert.ok(rebuilt);
  assert.equal(
    rebuilt.module_sessions[result.nextTurn.moduleId].currentQuestionId,
    result.nextTurn.questionId,
  );
  const pendingRow = rows.find((row) => row.moduleId === result.nextTurn.moduleId);
  assert.equal(pendingRow.activeTurnId, result.nextTurn.turnId);
});

// ---------------------------------------------------------------------------
// Replay rejection
// ---------------------------------------------------------------------------

test("an already-evaluated turn is rejected with 409", async () => {
  const session = startModule(newSession(), "motivation", NOW);
  const turn = issueTurnForModule(session, "motivation", NOW);

  const replay = await conductServerTurn({
    session,
    moduleId: "motivation",
    turnId: turn.turnId,
    answerText: "Replaying my previous answer.",
    activeTurnId: turn.turnId,
    turnStartedAt: turn.issuedAt,
    turnCount: 1,
    submittedTurnStatus: "evaluated",
    now: ONE_MINUTE_LATER,
    ...offlineOptions,
  });

  assert.equal(replay.kind, "rejected");
  assert.equal(replay.status, 409);
  assert.equal(replay.code, "turn_already_evaluated");
});

test("a turn id that is not the active server-issued turn is rejected with 409", async () => {
  const session = startModule(newSession(), "motivation", NOW);
  const turn = issueTurnForModule(session, "motivation", NOW);

  const forged = await conductServerTurn({
    session,
    moduleId: "motivation",
    turnId: "turn_forged_by_client",
    answerText: "Answering a turn the server never issued.",
    activeTurnId: turn.turnId,
    turnStartedAt: turn.issuedAt,
    turnCount: 0,
    now: ONE_MINUTE_LATER,
    ...offlineOptions,
  });

  assert.equal(forged.kind, "rejected");
  assert.equal(forged.status, 409);
  assert.equal(forged.code, "turn_not_active");
});

// ---------------------------------------------------------------------------
// Server-side hard caps
// ---------------------------------------------------------------------------

test("exceeding the per-module turn cap closes the module gracefully", async () => {
  const session = startModule(newSession(), "motivation", NOW);
  const turn = issueTurnForModule(session, "motivation", NOW);
  const cap = maxTurnsForModule(session, "motivation");

  const result = await conductServerTurn({
    session,
    moduleId: "motivation",
    turnId: turn.turnId,
    answerText: "One answer too many.",
    activeTurnId: turn.turnId,
    turnStartedAt: turn.issuedAt,
    turnCount: cap,
    now: ONE_MINUTE_LATER,
    ...offlineOptions,
  });

  assert.equal(result.kind, "module_closed");
  assert.equal(result.reason, "module_turn_cap_reached");
  assert.equal(result.session.module_sessions.motivation.state, "completed");
  assert.equal(result.nextModuleId, nextPendingModuleId(result.session, "motivation"));
});

test("exceeding the total interview duration cap (from the module plan) closes the module", async () => {
  const session = startModule(newSession(), "motivation", NOW);
  const turn = issueTurnForModule(session, "motivation", NOW);

  const capSeconds = interviewDurationCapSeconds(session);
  const plannedMinutes = session.modulePlan.reduce((total, m) => total + m.targetMinutes, 0);
  assert.equal(capSeconds, plannedMinutes * 60 * 2, "cap derives from the module plan");

  const wayPastCap = new Date(Date.parse(NOW) + (capSeconds + 60) * 1000).toISOString();
  assert.deepEqual(checkServerCaps(session, "motivation", 0, wayPastCap), {
    ok: false,
    reason: "interview_duration_cap_reached",
  });

  const result = await conductServerTurn({
    session,
    moduleId: "motivation",
    turnId: turn.turnId,
    answerText: "Answering long after the interview window closed.",
    activeTurnId: turn.turnId,
    turnStartedAt: turn.issuedAt,
    turnCount: 0,
    now: wayPastCap,
    ...offlineOptions,
  });

  assert.equal(result.kind, "module_closed");
  assert.equal(result.reason, "interview_duration_cap_reached");
  assert.equal(result.session.module_sessions.motivation.state, "completed");
});

// ---------------------------------------------------------------------------
// Server-driven STAR follow-up
// ---------------------------------------------------------------------------

test("a vague answer makes the server insert the follow-up question itself", async () => {
  const session = startModule(newSession(), "motivation", NOW);
  intoExplorationWithPrimary(session, "motivation");
  const turn = issueTurnForModule(session, "motivation", NOW);

  const result = await conductServerTurn({
    session,
    moduleId: "motivation",
    turnId: turn.turnId,
    answerText: "I'm good at this, I always do it well.",
    activeTurnId: turn.turnId,
    turnStartedAt: turn.issuedAt,
    turnCount: 0,
    now: ONE_MINUTE_LATER,
    ...offlineOptions,
  });

  assert.equal(result.kind, "turn_completed");
  assert.equal(result.nextAction, "ask_follow_up");
  const moduleSession = result.session.module_sessions.motivation;
  assert.equal(moduleSession.state, "in_progress", "follow-up reopens the module");
  const followUp = moduleSession.questions.find((q) => q.id === moduleSession.currentQuestionId);
  assert.ok(followUp.followUpReason, "current question is a server-created follow-up");
  assert.equal(result.nextTurn.moduleId, "motivation");
  assert.equal(result.nextTurn.questionId, followUp.id);
});
