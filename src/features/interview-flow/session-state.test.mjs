import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  createInterviewSession,
  recordResponseForModule,
  advanceModule,
  computeGlobalStatus,
  serializeInterviewSession,
  resumeInterviewSession,
} = loadFromRepoRoot("src/features/interview-flow/session-state.ts");
const { applyDecision } = loadFromRepoRoot(
  "src/features/interview-flow/funnel-state-machine.ts",
);

const roleProfile = {
  role_id: "role_sdr",
  title: "Sales Development Representative",
  role_type: "sales",
  requirements: { required_skills: ["outbound", "qualification"] },
  calibration: {},
};

function newSession(overrides = {}) {
  return createInterviewSession({
    candidateId: "cand_1",
    interviewLanguage: "en",
    roleProfile,
    now: "2026-06-03T10:00:00.000Z",
    sessionId: "sess_1",
    ...overrides,
  });
}

function completeModule(session, moduleId, answeredAt) {
  const moduleSession = session.module_sessions[moduleId];
  return recordResponseForModule(session, moduleId, {
    questionId: moduleSession.currentQuestionId,
    answerText:
      "When I was at Acme in 2023 I owned outbound for DACH. I built a three-touch sequence and booked 14 meetings, a 30% lift.",
    answeredAt,
  });
}

test("a fresh session has independent not-started module sub-sessions", () => {
  const session = newSession();
  const ids = Object.keys(session.module_sessions);
  assert.ok(ids.includes("motivation"));
  assert.ok(ids.length >= 2);
  for (const moduleSession of Object.values(session.module_sessions)) {
    assert.equal(moduleSession.state, "not_started");
  }
  assert.equal(session.global_status, "in_progress");
});

test("completing module A does not change the state of module B", () => {
  const session = newSession();
  const otherId = Object.keys(session.module_sessions).find((id) => id !== "motivation");

  const advanced = completeModule(session, "motivation", "2026-06-03T10:01:00.000Z");

  assert.equal(advanced.module_sessions.motivation.state, "completed");
  assert.equal(advanced.module_sessions[otherId].state, "not_started");
  // original session object is not mutated
  assert.equal(session.module_sessions.motivation.state, "not_started");
});

test("global_status flips to all_required_completed only when every required module is done", () => {
  let session = newSession();
  const moduleIds = Object.keys(session.module_sessions);

  for (let index = 0; index < moduleIds.length; index += 1) {
    const moduleId = moduleIds[index];
    session = completeModule(session, moduleId, `2026-06-03T10:0${index + 1}:00.000Z`);
    const expectedLast = index === moduleIds.length - 1;
    assert.equal(
      session.global_status,
      expectedLast ? "all_required_completed" : "in_progress",
      `after completing ${moduleId}`,
    );
  }
});

test("optional modules do not block global completion", () => {
  let session = newSession({ requiredModuleIds: ["motivation"] });
  session = completeModule(session, "motivation", "2026-06-03T10:01:00.000Z");
  assert.equal(session.global_status, "all_required_completed");
  assert.equal(computeGlobalStatus(session.module_sessions), "all_required_completed");
});

test("serialize + resume restores the exact per-module state", () => {
  let session = newSession();
  session = completeModule(session, "motivation", "2026-06-03T10:01:00.000Z");

  const restored = resumeInterviewSession(serializeInterviewSession(session));

  for (const [moduleId, moduleSession] of Object.entries(session.module_sessions)) {
    assert.equal(restored.module_sessions[moduleId].state, moduleSession.state, moduleId);
    assert.equal(
      restored.module_sessions[moduleId].currentQuestionId,
      moduleSession.currentQuestionId,
      moduleId,
    );
    assert.equal(
      restored.module_sessions[moduleId].responses.length,
      moduleSession.responses.length,
      moduleId,
    );
  }
  assert.equal(restored.global_status, session.global_status);
});

test("advanceModule applies the funnel state machine and returns a decision", () => {
  const session = newSession();
  // Drive the module into exploration with one primary question already asked,
  // so the observed STAR evidence belongs to the current question and the next
  // decision does not reset it (ask_primary_question starts a fresh STAR slate).
  let funnelState = session.module_sessions.motivation.funnelState;
  funnelState = applyDecision(
    funnelState,
    { kind: "advance_phase", phase: "exploration", reason: "" },
    50,
  );
  funnelState = applyDecision(
    funnelState,
    { kind: "ask_primary_question", phase: "exploration", reason: "" },
    30,
  );
  session.module_sessions.motivation.funnelState = funnelState;

  const { session: advanced, decision } = advanceModule(session, "motivation", {
    observedStar: { situation: true, task: true },
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: true,
    hasMoreCompetencies: true,
    elapsedSecondsForTurn: 30,
  });

  assert.ok(typeof decision.kind === "string");
  assert.ok(
    advanced.module_sessions.motivation.funnelState.competency.star.situation,
    "observed STAR evidence should be recorded on the module funnel state",
  );
});
