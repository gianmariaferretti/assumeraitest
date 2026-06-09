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

const { computePeerCohortStats, classifyCohortStatus, zScoreVsCohort } = load(
  path.join(rootDir, "src/features/scoring/peer-cohort.ts"),
);

function scores(values) {
  return values.map((score) => ({ score }));
}

test("classifyCohortStatus follows the published thresholds", () => {
  assert.equal(classifyCohortStatus(5), "insufficient");
  assert.equal(classifyCohortStatus(10), "emerging");
  assert.equal(classifyCohortStatus(29), "emerging");
  assert.equal(classifyCohortStatus(30), "established");
});

test("a tiny cohort is insufficient and returns no Z", () => {
  const stats = computePeerCohortStats(scores([6, 7, 8, 7, 6]), "sales", "junior", "2026-06-03T00:00:00.000Z");
  assert.equal(stats.cohortStatus, "insufficient");
  assert.equal(stats.meanScore, null);
  assert.equal(stats.stdevScore, null);

  const z = zScoreVsCohort(8, stats);
  assert.equal(z.z, null);
  assert.match(z.interpretation, /too small/i);
});

test("an emerging cohort returns a Z with a preliminary disclaimer", () => {
  const fifteen = Array.from({ length: 15 }, (_, i) => 6 + (i % 3)); // 6,7,8 repeating
  const stats = computePeerCohortStats(scores(fifteen), "sales", "mid", "2026-06-03T00:00:00.000Z");
  assert.equal(stats.cohortStatus, "emerging");
  const z = zScoreVsCohort(8, stats);
  assert.equal(typeof z.z, "number");
  assert.match(z.interpretation, /preliminary/i);
});

test("an established cohort (mean 7, sd 1) gives z≈1 for a score of 8", () => {
  // 50 values: 25 sixes and 25 eights → mean 7, sample sd ≈ 1.005
  const fifty = [...Array(25).fill(6), ...Array(25).fill(8)];
  const stats = computePeerCohortStats(scores(fifty), "engineering", "senior", "2026-06-03T00:00:00.000Z");
  assert.equal(stats.cohortStatus, "established");
  assert.equal(stats.meanScore, 7);
  const z = zScoreVsCohort(8, stats);
  assert.ok(Math.abs(z.z - 1) < 0.05, `expected z≈1, got ${z.z}`);
  assert.match(z.interpretation, /Normed against 50/);
});

test("empty input is insufficient with null stats and no throw", () => {
  const stats = computePeerCohortStats([], "sales", "junior", "2026-06-03T00:00:00.000Z");
  assert.equal(stats.sampleSize, 0);
  assert.equal(stats.cohortStatus, "insufficient");
  assert.equal(stats.meanScore, null);
  assert.equal(zScoreVsCohort(7, stats).z, null);
});
