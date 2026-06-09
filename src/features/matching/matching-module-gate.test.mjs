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

const { createCompanyMatch } = load(
  path.join(rootDir, "src/features/matching/matching-engine.ts"),
);

const candidate = {
  candidate_id: "cand_1",
  education: [],
  experience: [
    {
      company: "Acme",
      title: "SDR",
      responsibilities: ["outbound prospecting"],
      measurable_impact: ["30% pipeline lift"],
      tools: ["CRM"],
    },
  ],
  skills: [{ name: "outbound", evidence_count: 2 }],
  languages: [],
  preferences: { target_roles: ["SDR"], locations: ["Remote"], work_modes: ["remote"] },
};

const role = {
  role_id: "role_sdr",
  company_id: "co_1",
  title: "Sales Development Representative",
  requirements: { required_skills: ["outbound"], nice_to_have_skills: [], hard_gates: [] },
  calibration: { version: "role-calibration-v0" },
};

function gateOf(match) {
  return match.hard_gates.find((gate) => gate.gate_type === "required_modules");
}

test("a required module that is incomplete blocks the match before scoring", () => {
  const match = createCompanyMatch({
    candidate,
    role,
    requiredModuleStatuses: [
      { module_id: "motivation", required_for_match: true, completed: false },
    ],
  });

  assert.equal(match.match_blocked, true);
  assert.equal(match.match_score, 0);
  const gate = gateOf(match);
  assert.ok(gate);
  assert.equal(gate.passed, false);
});

test("all required modules complete lets the match proceed to scoring", () => {
  const match = createCompanyMatch({
    candidate,
    role,
    requiredModuleStatuses: [
      { module_id: "motivation", required_for_match: true, completed: true },
      { module_id: "sales", required_for_match: true, completed: true },
    ],
  });

  assert.notEqual(match.match_blocked, true);
  const gate = gateOf(match);
  assert.ok(gate);
  assert.equal(gate.passed, true);
  assert.ok(match.match_score >= 0);
});

test("incomplete optional modules do not block the match", () => {
  const match = createCompanyMatch({
    candidate,
    role,
    requiredModuleStatuses: [
      { module_id: "motivation", required_for_match: true, completed: true },
      { module_id: "language", required_for_match: false, completed: false },
    ],
  });

  assert.notEqual(match.match_blocked, true);
});

test("omitting module statuses preserves legacy behavior (no module gate)", () => {
  const match = createCompanyMatch({ candidate, role });
  assert.notEqual(match.match_blocked, true);
  assert.equal(gateOf(match), undefined);
});
