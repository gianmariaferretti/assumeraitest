import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const safetyPath = path.join(rootDir, "src", "features", "interview-flow", "safety.ts");

function loadSafety() {
  const source = readFileSync(safetyPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: safetyPath,
  }).outputText;
  const cjsModule = { exports: {} };

  vm.runInNewContext(
    output,
    {
      exports: cjsModule.exports,
      module: cjsModule,
    },
    {
      filename: safetyPath,
    },
  );

  return cjsModule.exports;
}

test("safety filter blocks protected-trait and language-proxy variants", () => {
  const { containsDisallowedQuestionText } = loadSafety();

  for (const value of [
    "What is your gender?",
    "Tell me about your caregiver responsibilities.",
    "Do you have a visa or passport?",
    "Are you a native speaker?",
    "How is your pronunciation?",
    "We score voice tone and personality.",
  ]) {
    assert.equal(containsDisallowedQuestionText(value), true, value);
  }
});

test("safety filter still allows role-relevant behavioral evidence", () => {
  const { containsDisallowedQuestionText } = loadSafety();

  assert.equal(
    containsDisallowedQuestionText(
      "Tell me about a specific past example where you handled a customer escalation.",
    ),
    false,
  );
});
