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

const { resolveModuleStatuses, extractCandidateSkills } = load(
  path.join(rootDir, "src/features/interview-flow/module-unlock-engine.ts"),
);

function byId(statuses) {
  return new Map(statuses.map((status) => [status.module_id, status]));
}

test("CV with Python auto-triggers a coding module", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [{ module_id: "coding", level: "auto_trigger", auto_trigger_keywords: ["Python"] }],
    cvSkills: ["Python", "Communication"],
  });
  const coding = byId(statuses).get("coding");
  assert.equal(coding.state, "auto_triggered");
  assert.equal(coding.required_for_match, true);
  assert.equal(coding.visible_to_candidate, true);
});

test("CV without the keyword leaves an auto-trigger module optional", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [{ module_id: "coding", level: "auto_trigger", auto_trigger_keywords: ["Python"] }],
    cvSkills: ["Sales", "Negotiation"],
  });
  const coding = byId(statuses).get("coding");
  assert.equal(coding.state, "optional");
  assert.equal(coding.required_for_match, false);
  assert.equal(coding.visible_to_candidate, true);
});

test("blocked modules are hidden and never required for match", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [{ module_id: "language_fr", level: "blocked" }],
    cvSkills: [],
  });
  const blocked = byId(statuses).get("language_fr");
  assert.equal(blocked.state, "blocked");
  assert.equal(blocked.visible_to_candidate, false);
  assert.equal(blocked.required_for_match, false);
});

test("motivation core is always present and required even if absent from the plan", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [{ module_id: "sales", level: "required" }],
    cvSkills: [],
  });
  const motivation = byId(statuses).get("motivation");
  assert.ok(motivation);
  assert.equal(motivation.state, "required");
  assert.equal(motivation.required_for_match, true);
});

test("a completed module reports completed while keeping its match requirement", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [{ module_id: "sales", level: "required" }],
    cvSkills: [],
    completedModuleIds: ["sales"],
  });
  const sales = byId(statuses).get("sales");
  assert.equal(sales.state, "completed");
  assert.equal(sales.required_for_match, true);
});

test("extractCandidateSkills normalizes synonyms: JS triggers a javascript keyword", () => {
  const skills = extractCandidateSkills({ skills: [{ name: "JS" }, { name: "Teamwork" }] });
  assert.ok(skills.includes("javascript"));

  const statuses = resolveModuleStatuses({
    rolePlan: [{ module_id: "coding", level: "auto_trigger", auto_trigger_keywords: ["javascript"] }],
    cvSkills: skills,
  });
  assert.equal(byId(statuses).get("coding").state, "auto_triggered");
});

// ---------------------------------------------------------------------------
// Module -> module prerequisites (Phase 0): locked_pending_prerequisite
// ---------------------------------------------------------------------------

test("a module with an unmet prerequisite is locked, visible, with a readable reason", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [
      { module_id: "coding", level: "required", unlocks_after: ["core_comm"] },
    ],
    systemCoreModules: ["motivation", "core_comm"],
    cvSkills: [],
  });
  const coding = byId(statuses).get("coding");
  assert.equal(coding.state, "locked_pending_prerequisite");
  assert.equal(coding.visible_to_candidate, true, "shown as locked, not hidden");
  assert.match(coding.unlock_reason, /Complete core_comm first/);
  // Still required_for_match, so the match gate stays correctly closed.
  assert.equal(coding.required_for_match, true);
});

test("completing the prerequisite resolves the module to its base state", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [
      { module_id: "coding", level: "auto_trigger", auto_trigger_keywords: ["python"], unlocks_after: ["core_comm"] },
    ],
    systemCoreModules: ["motivation", "core_comm"],
    cvSkills: ["python"],
    completedModuleIds: ["motivation", "core_comm"],
  });
  const coding = byId(statuses).get("coding");
  assert.equal(coding.state, "auto_triggered", "base state restored once prereq done");
});

test("with multiple prerequisites, the reason names only the ones still missing", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [
      { module_id: "leadership", level: "optional", unlocks_after: ["core_comm", "domain"] },
    ],
    systemCoreModules: ["motivation", "core_comm"],
    cvSkills: [],
    completedModuleIds: ["core_comm"], // domain still missing
  });
  const leadership = byId(statuses).get("leadership");
  assert.equal(leadership.state, "locked_pending_prerequisite");
  assert.match(leadership.unlock_reason, /domain/);
  assert.doesNotMatch(leadership.unlock_reason, /core_comm/);
});

test("a completed module short-circuits even if it had prerequisites", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [
      { module_id: "coding", level: "required", unlocks_after: ["core_comm"] },
    ],
    systemCoreModules: ["motivation", "core_comm"],
    cvSkills: [],
    completedModuleIds: ["coding"], // done, even though core_comm is not
  });
  assert.equal(byId(statuses).get("coding").state, "completed");
});

test("a self-listed prerequisite is ignored (config typo never deadlocks)", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [
      { module_id: "coding", level: "required", unlocks_after: ["coding"] },
    ],
    cvSkills: [],
  });
  assert.equal(byId(statuses).get("coding").state, "required", "self-prereq filtered out");
});

test("a mutual prerequisite cycle locks both without looping", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [
      { module_id: "a", level: "optional", unlocks_after: ["b"] },
      { module_id: "b", level: "optional", unlocks_after: ["a"] },
    ],
    cvSkills: [],
  });
  assert.equal(byId(statuses).get("a").state, "locked_pending_prerequisite");
  assert.equal(byId(statuses).get("b").state, "locked_pending_prerequisite");
});

test("a blocked module stays blocked and is never reclassified as locked-pending", () => {
  const statuses = resolveModuleStatuses({
    rolePlan: [
      { module_id: "secret", level: "blocked", unlocks_after: ["core_comm"] },
    ],
    systemCoreModules: ["motivation", "core_comm"],
    cvSkills: [],
  });
  const secret = byId(statuses).get("secret");
  assert.equal(secret.state, "blocked");
  assert.equal(secret.visible_to_candidate, false);
});
