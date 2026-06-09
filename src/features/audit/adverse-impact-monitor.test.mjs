import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

function load(absPath) {
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
  vm.runInNewContext(
    output,
    { exports: mod.exports, module: mod, require: () => ({}), process, console },
    { filename: absPath },
  );
  return mod.exports;
}

const { computeAdverseImpact } = load(
  path.join(rootDir, "src/features/audit/adverse-impact-monitor.ts"),
);

function records(dimension, value, applied, advanced) {
  return Array.from({ length: applied }, (_, i) => ({
    candidateId: `${value}_${i}`,
    decision: i < advanced ? "advance" : "decline",
    cohortValues: { [dimension]: value },
    decidedAt: "2026-06-01T00:00:00.000Z",
  }));
}

const decisions = [
  ...records("role_family", "A", 60, 18), // 30% (reference)
  ...records("role_family", "B", 40, 10), // 25% -> ratio 0.833 -> pass
  ...records("role_family", "C", 20, 3), //  15% -> ratio 0.5 -> fail
  ...records("seniority", "lead", 3, 1), //  n<5 -> warn
];

test("a cohort at 25% vs a 30% reference passes the four-fifths rule", () => {
  const { rows } = computeAdverseImpact(decisions);
  const b = rows.find((row) => row.cohortDimension === "role_family" && row.cohortValue === "B");
  assert.ok(b);
  assert.equal(b.referenceValue, "A");
  assert.ok(Math.abs(b.ratioVsReference - 0.8333) < 0.01);
  assert.equal(b.status, "pass");
});

test("a cohort at 15% vs a 30% reference fails the four-fifths rule", () => {
  const { rows } = computeAdverseImpact(decisions);
  const c = rows.find((row) => row.cohortDimension === "role_family" && row.cohortValue === "C");
  assert.ok(c);
  assert.ok(Math.abs(c.ratioVsReference - 0.5) < 0.001);
  assert.equal(c.status, "fail");
});

test("a cohort with fewer than five applicants is warned, not failed", () => {
  const { rows } = computeAdverseImpact(decisions);
  const lead = rows.find((row) => row.cohortDimension === "seniority" && row.cohortValue === "lead");
  assert.ok(lead);
  assert.equal(lead.nApplied, 3);
  assert.equal(lead.status, "warn");
});

test("rows are ordered worst-first by ratio", () => {
  const { rows } = computeAdverseImpact(decisions);
  assert.equal(rows[0].cohortValue, "C"); // lowest ratio (0.5) at the top
  for (let i = 1; i < rows.length; i += 1) {
    assert.ok(rows[i - 1].ratioVsReference <= rows[i].ratioVsReference);
  }
});

test("empty decisions produce no rows without throwing", () => {
  const { rows, computedAt } = computeAdverseImpact([]);
  assert.equal(rows.length, 0);
  assert.equal(typeof computedAt, "string");
});
