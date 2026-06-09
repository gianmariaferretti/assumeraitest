import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const cache = new Map();

function load(absPath) {
  if (cache.has(absPath)) return cache.get(absPath);
  const source = readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absPath,
  }).outputText;
  const mod = { exports: {} };
  cache.set(absPath, mod.exports);
  const dir = path.dirname(absPath);
  const requireShim = (req) => {
    let target = path.resolve(dir, req);
    if (!target.endsWith(".ts")) target += ".ts";
    return load(target);
  };
  vm.runInNewContext(
    output,
    { exports: mod.exports, module: mod, require: requireShim, process, console },
    { filename: absPath },
  );
  cache.set(absPath, mod.exports);
  return mod.exports;
}

const { conductTurn } = load(path.join(rootDir, "src/features/interview-flow/conduct-turn.ts"));
const { createInterviewSession } = load(
  path.join(rootDir, "src/features/interview-flow/session-state.ts"),
);
const { applyDecision } = load(
  path.join(rootDir, "src/features/interview-flow/funnel-state-machine.ts"),
);

const competency = {
  id: "communication",
  name: "Communication",
  tier: 1,
  description: "Communicate clearly and listen actively.",
  sbiQuestions: [],
  bars: [
    { level: "below_standard", scoreRange: [1, 3], descriptors: ["vague"] },
    { level: "meets_standard", scoreRange: [4, 6], descriptors: ["concrete context"] },
    { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["measurable result"] },
    { level: "exceptional", scoreRange: [10, 10], descriptors: ["meta-communication"] },
  ],
  redFlags: [],
};

const roleProfile = {
  role_id: "role_sdr",
  title: "Sales Development Representative",
  role_type: "sales",
  requirements: { required_skills: ["outbound"] },
  calibration: {},
};

function newSession() {
  return createInterviewSession({
    candidateId: "cand_1",
    interviewLanguage: "en",
    roleProfile,
    now: "2026-06-03T10:00:00.000Z",
    sessionId: "sess_conduct",
  });
}

// Drive a module funnel into exploration with one primary question asked, so the
// next answer is eligible for a STAR follow-up.
function intoExplorationWithPrimary(session, moduleId) {
  let fs = session.module_sessions[moduleId].funnelState;
  fs = applyDecision(fs, { kind: "advance_phase", phase: "exploration", reason: "" }, 50);
  fs = applyDecision(fs, { kind: "ask_primary_question", phase: "exploration", reason: "" }, 30);
  session.module_sessions[moduleId].funnelState = fs;
}

const fullStarFetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          star_completeness: { situation: true, task: true, action: true, result: true },
          bars_score: 8,
          bars_level: "exceeds_standard",
          evidence_snippets: ["built a three-touch sequence"],
          red_flags: [],
          followup_recommendation: { action: "next_question", missing_star_elements: [] },
          confidence: 0.82,
        }),
      },
    ],
  }),
});

test("a STAR-complete answer advances without asking a follow-up", async () => {
  const session = newSession();
  intoExplorationWithPrimary(session, "motivation");

  const result = await conductTurn({
    session,
    moduleId: "motivation",
    competency,
    candidateAnswer: {
      questionId: session.module_sessions.motivation.currentQuestionId,
      questionText: "Tell me about a time you explained something complex.",
      answerText:
        "At Acme in 2023 I owned DACH outbound. I built a three-touch sequence and booked 14 meetings, a 30% lift.",
    },
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: true,
    hasMoreCompetencies: true,
    elapsedSecondsForTurn: 20,
    evaluatorOptions: { apiKey: "test-key", fetchImpl: fullStarFetch },
    interviewerOptions: { apiKey: null },
  });

  assert.equal(result.evaluation.source, "anthropic");
  assert.notEqual(result.nextAction, "ask_follow_up");
});

test("a vague answer triggers a targeted STAR follow-up", async () => {
  const session = newSession();
  intoExplorationWithPrimary(session, "motivation");

  const result = await conductTurn({
    session,
    moduleId: "motivation",
    competency,
    candidateAnswer: {
      questionId: session.module_sessions.motivation.currentQuestionId,
      questionText: "Tell me about a time you explained something complex.",
      answerText: "I'm good at communicating, I always do it well.",
    },
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: false,
    hasMoreCompetencies: true,
    elapsedSecondsForTurn: 10,
    evaluatorOptions: { apiKey: null },
    interviewerOptions: { apiKey: null },
  });

  assert.equal(result.nextAction, "ask_follow_up");
  assert.ok(result.decision.missingStarElements.length > 0);
  assert.ok(result.interviewerText.length > 0);
});

test("every evaluation produces a well-formed interview_evaluator_runs record", async () => {
  const session = newSession();
  intoExplorationWithPrimary(session, "motivation");

  const result = await conductTurn({
    session,
    moduleId: "motivation",
    competency,
    candidateAnswer: {
      questionId: session.module_sessions.motivation.currentQuestionId,
      questionText: "Tell me about a time you explained something complex.",
      answerText: "At Acme I prepared simple slides and checked understanding; most got it.",
    },
    evaluatorOptions: { apiKey: null },
    interviewerOptions: { apiKey: null },
  });

  const run = result.evaluatorRun;
  assert.ok(run);
  assert.equal(run.interview_session_id, "sess_conduct");
  assert.equal(run.candidate_id, "cand_1");
  assert.equal(run.competency_id, "communication");
  assert.equal(run.module_id, "motivation");
  assert.ok(run.bars_score >= 1 && run.bars_score <= 10);
  assert.equal(typeof run.star_situation, "boolean");
  assert.ok(run.confidence >= 0 && run.confidence <= 1);
  assert.equal(run.scoring_version, "bars-evaluator-v0");
  assert.equal(typeof run.red_flag_count, "number");
});

test("a provider line with a protected trait falls back to a safe interviewer line", async () => {
  const session = newSession();
  const unsafeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text: "What is your age and nationality?" }],
    }),
  });

  const result = await conductTurn({
    session,
    moduleId: "motivation",
    competency,
    interviewerOptions: { apiKey: "test-key", fetchImpl: unsafeFetch },
  });

  assert.equal(result.interviewerSource, "deterministic_fallback");
  assert.doesNotMatch(result.interviewerText.toLowerCase(), /age|nationality/);
});
