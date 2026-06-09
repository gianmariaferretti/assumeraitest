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

const { sniffResumeContentType, validateResumeFile, validateResumeFileContent } =
  loadTsModule("src/features/resume-ingestion/validation.ts");
const { createResumeUploadConfig } = loadTsModule("src/features/resume-ingestion/config.ts");

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const config = {
  allowedExtensions: [".pdf", ".docx", ".html", ".htm", ".json", ".txt"],
  allowedMimeTypes: ["application/pdf", DOCX_MIME, "application/json", "text/html", "text/plain"],
  maxFileBytes: 8 * 1024 * 1024,
  rawCvRetentionDays: 30
};

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
const ZIP_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]); // PK\x03\x04
const TEXT_BYTES = new TextEncoder().encode("Plain resume text content.");
const BINARY_TEXT_BYTES = new Uint8Array([0x48, 0x69, 0x00, 0x21]); // contains NUL

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

// ---------------------------------------------------------------------------
// Magic-byte content verification (declared MIME must match the actual bytes)
// ---------------------------------------------------------------------------

test("content sniffing recognizes PDF, DOCX zip containers, and text", () => {
  assert.equal(sniffResumeContentType(PDF_BYTES), "pdf");
  assert.equal(sniffResumeContentType(ZIP_BYTES), "zip");
  assert.equal(sniffResumeContentType(TEXT_BYTES), "text");
});

test("a declared PDF must start with %PDF", () => {
  assert.equal(validateResumeFileContent(PDF_BYTES, "application/pdf"), true);
  assert.equal(validateResumeFileContent(ZIP_BYTES, "application/pdf"), false);
  assert.equal(validateResumeFileContent(TEXT_BYTES, "application/pdf"), false);
});

test("a declared DOCX must carry the PK zip header", () => {
  assert.equal(validateResumeFileContent(ZIP_BYTES, DOCX_MIME), true);
  assert.equal(validateResumeFileContent(PDF_BYTES, DOCX_MIME), false);
});

test("declared text must be genuine text, not renamed binary", () => {
  assert.equal(validateResumeFileContent(TEXT_BYTES, "text/plain"), true);
  assert.equal(validateResumeFileContent(PDF_BYTES, "text/plain"), false);
  assert.equal(validateResumeFileContent(BINARY_TEXT_BYTES, "text/plain"), false);
});

test("a fake .pdf with text bytes is rejected even with a matching declared MIME", () => {
  const result = validateResumeFile(
    {
      name: "totally-a-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: TEXT_BYTES.byteLength,
      bytes: TEXT_BYTES
    },
    config
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "unsupported_file_type");
});

test("a genuine PDF and a genuine DOCX pass the content check", () => {
  const pdf = validateResumeFile(
    { name: "resume.pdf", mimeType: "application/pdf", sizeBytes: PDF_BYTES.byteLength, bytes: PDF_BYTES },
    config
  );
  const docx = validateResumeFile(
    { name: "resume.docx", mimeType: DOCX_MIME, sizeBytes: ZIP_BYTES.byteLength, bytes: ZIP_BYTES },
    config
  );

  assert.equal(pdf.ok, true);
  assert.equal(docx.ok, true);
});

test("pasted plain text resumes keep working under the content check", () => {
  const result = validateResumeFile(
    {
      name: "pasted-resume.txt",
      mimeType: "text/plain",
      sizeBytes: TEXT_BYTES.byteLength,
      bytes: TEXT_BYTES
    },
    config
  );

  assert.equal(result.ok, true);
});

test("the default upload config caps files at 8MB and allows docx", () => {
  const defaults = createResumeUploadConfig({});

  assert.equal(defaults.maxFileBytes, 8 * 1024 * 1024);
  assert.ok(defaults.allowedExtensions.includes(".docx"));
  assert.ok(defaults.allowedMimeTypes.includes(DOCX_MIME));

  const tooLarge = validateResumeFile(
    {
      name: "resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: defaults.maxFileBytes + 1,
      bytes: PDF_BYTES
    },
    defaults
  );
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.error.code, "file_too_large");
});
