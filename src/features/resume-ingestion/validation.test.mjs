import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const moduleCache = new Map();
const nativeRequire = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const cacheKey = path.normalize(absolutePath);

  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey).exports;
  }

  const source = readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: absolutePath
  }).outputText;
  const cjsModule = { exports: {} };
  moduleCache.set(cacheKey, cjsModule);

  function localRequire(specifier) {
    if (specifier.startsWith(".")) {
      const nextPath = path.resolve(path.dirname(absolutePath), specifier);
      return loadTsModule(path.relative(rootDir, `${nextPath}.ts`));
    }

    return nativeRequire(specifier);
  }

  vm.runInNewContext(output, {
    console,
    exports: cjsModule.exports,
    module: cjsModule,
    require: localRequire
  }, {
    filename: absolutePath
  });

  return cjsModule.exports;
}

const { validateResumeFile } = loadTsModule("src/features/resume-ingestion/validation.ts");

const config = {
  allowedExtensions: [".pdf", ".html", ".htm", ".json", ".txt"],
  allowedMimeTypes: ["application/pdf", "application/json", "text/html", "text/plain"],
  maxFileBytes: 10 * 1024 * 1024,
  rawCvRetentionDays: 30
};

test("resume validation rejects mismatched allowed extension and MIME pairs", () => {
  const result = validateResumeFile(
    {
      name: "candidate-profile.pdf",
      mimeType: "text/plain",
      sizeBytes: 64,
      bytes: new Uint8Array([1, 2, 3])
    },
    config
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "unsupported_file_type");
});

test("resume validation still accepts generic browser MIME with an allowed extension", () => {
  const result = validateResumeFile(
    {
      name: "candidate-profile.pdf",
      mimeType: "application/octet-stream",
      sizeBytes: 64,
      bytes: new Uint8Array([1, 2, 3])
    },
    config
  );

  assert.equal(result.ok, true);
});
