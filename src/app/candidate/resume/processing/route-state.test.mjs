import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../../..");

function loadRouteState() {
  const absolutePath = path.join(rootDir, "src/app/candidate/resume/processing/route-state.ts");
  const output = ts.transpileModule(readFileSync(absolutePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: absolutePath
  }).outputText;
  const cjsModule = { exports: {} };

  vm.runInNewContext(output, {
    exports: cjsModule.exports,
    module: cjsModule
  }, {
    filename: absolutePath
  });

  return cjsModule.exports;
}

const { normalizeCandidateNextHref } = loadRouteState();

test("processing route falls back when next points back to processing", () => {
  assert.equal(
    normalizeCandidateNextHref(
      "/candidate/resume/processing?next=/candidate/interview",
      "resume doc 123"
    ),
    "/candidate/profile/confirm?resumeDocumentId=resume%20doc%20123"
  );
});

test("processing route keeps a valid candidate handoff path", () => {
  assert.equal(
    normalizeCandidateNextHref(
      "/candidate/profile/confirm?resumeDocumentId=resume_doc_123",
      "resume_doc_cookie"
    ),
    "/candidate/profile/confirm?resumeDocumentId=resume_doc_123"
  );
});
