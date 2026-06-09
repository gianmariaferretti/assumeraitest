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

const fsm = load(path.join(rootDir, "src/features/interview-flow/funnel-state-machine.ts"));

test("funnel follows the canonical SBI sequence", () => {
  assert.equal(
    Array.from(fsm.FUNNEL_SEQUENCE).join(","),
    "rapport,exploration,challenge,closing",
  );
  const state = fsm.createFunnelState("communication");
  assert.equal(state.phase, "rapport");
  assert.equal(state.competency.competencyId, "communication");
});

test("incomplete STAR in exploration triggers a targeted follow-up", () => {
  let state = fsm.createFunnelState("communication");
  state = fsm.applyDecision(state, { kind: "advance_phase", phase: "exploration", reason: "" }, 50);
  state = fsm.applyDecision(state, { kind: "ask_primary_question", phase: "exploration", reason: "" }, 30);
  state = fsm.recordStarEvidence(state, { situation: true });

  const decision = fsm.decideNext({
    state,
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: true,
    hasMoreCompetencies: true,
  });

  assert.equal(decision.kind, "ask_follow_up");
  assert.ok(decision.missingStarElements.includes("action"));
  assert.ok(decision.missingStarElements.includes("result"));
});

test("follow-ups are capped per question", () => {
  let state = fsm.createFunnelState("communication");
  state = fsm.applyDecision(state, { kind: "advance_phase", phase: "exploration", reason: "" }, 50);
  state = fsm.applyDecision(state, { kind: "ask_primary_question", phase: "exploration", reason: "" }, 30);
  state = fsm.applyDecision(state, { kind: "ask_follow_up", phase: "exploration", reason: "" }, 20);
  state = fsm.applyDecision(state, { kind: "ask_follow_up", phase: "exploration", reason: "" }, 20);

  const decision = fsm.decideNext({
    state,
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: false,
    hasMoreCompetencies: true,
  });

  assert.notEqual(decision.kind, "ask_follow_up");
});

test("completing closing with no further competencies completes the interview", () => {
  let state = fsm.createFunnelState("communication");
  state = fsm.applyDecision(state, { kind: "advance_phase", phase: "closing", reason: "" }, 0);
  state = fsm.applyDecision(state, { kind: "ask_primary_question", phase: "closing", reason: "" }, 40);

  const decision = fsm.decideNext({
    state,
    currentQuestionStarTarget: [],
    hasMorePrimaryQuestions: false,
    hasMoreCompetencies: false,
  });

  assert.equal(decision.kind, "complete_interview");
});

test("rapport phase never opens with a challenge", () => {
  const state = fsm.createFunnelState("communication");
  const decision = fsm.decideNext({
    state,
    currentQuestionStarTarget: [],
    hasMorePrimaryQuestions: true,
    hasMoreCompetencies: true,
  });
  assert.equal(decision.phase, "rapport");
  assert.notEqual(decision.kind, "ask_follow_up");
});
