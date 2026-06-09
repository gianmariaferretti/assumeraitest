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

const { toModulePlan, CORE_MODULE_ID } = load(
  path.join(rootDir, "src/features/roles/module-plan-adapter.ts"),
);
const { validateModulePlan } = load(path.join(rootDir, "src/features/roles/role-profile.ts"));

test("derives a required plan from legacy interview_modules with motivation core", () => {
  const plan = toModulePlan({ interview_modules: ["sales", "coding"] });
  const byId = new Map(plan.map((entry) => [entry.module_id, entry]));

  assert.ok(byId.has("sales"));
  assert.ok(byId.has("coding"));
  assert.ok(byId.has(CORE_MODULE_ID));
  for (const entry of plan) {
    assert.equal(entry.level, "required");
  }
});

test("motivation core is required even when no legacy modules are present", () => {
  const plan = toModulePlan({});
  assert.equal(plan.length, 1);
  assert.equal(plan[0].module_id, CORE_MODULE_ID);
  assert.equal(plan[0].level, "required");
});

test("an explicit module_plan is returned unchanged", () => {
  const explicit = [
    { module_id: "coding", level: "auto_trigger", auto_trigger_keywords: ["Python"] },
    { module_id: "language_fr", level: "blocked" },
  ];
  const plan = toModulePlan({ module_plan: explicit });
  assert.deepEqual(plan, explicit);
});

test("validateModulePlan accepts a valid plan and an absent plan", () => {
  assert.deepEqual(validateModulePlan(undefined), []);
  assert.deepEqual(
    validateModulePlan([
      { module_id: "sales", level: "required" },
      { module_id: "coding", level: "auto_trigger", auto_trigger_keywords: ["Python"] },
    ]),
    [],
  );
});

test("validateModulePlan rejects invalid levels and empty module ids", () => {
  const issues = validateModulePlan([
    { module_id: "", level: "required" },
    { module_id: "coding", level: "sometimes" },
  ]);
  assert.ok(issues.some((issue) => issue.code === "module_plan.module_id"));
  assert.ok(issues.some((issue) => issue.code === "module_plan.level"));
});

test("validateModulePlan rejects a non-array plan", () => {
  const issues = validateModulePlan({ module_id: "sales" });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "module_plan.invalid");
});
