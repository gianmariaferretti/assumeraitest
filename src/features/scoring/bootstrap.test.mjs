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

const { bootstrapWeightedMean, intervalsDistinguishable } = load(
  path.join(rootDir, "src/features/scoring/bootstrap.ts"),
);

function interval(lower, upper, point = (lower + upper) / 2) {
  return {
    point,
    lower,
    upper,
    iterations: 1000,
    confidence: 0.95,
    se_estimate: 0,
    method: "percentile_bootstrap_v0",
  };
}

test("CI of a known distribution (mean 7) contains 7 and is reproducible by seed", () => {
  const values = [5, 6, 6, 7, 7, 7, 7, 8, 8, 9].map((value) => ({ value, weight: 1 }));
  const a = bootstrapWeightedMean(values, { seed: 42 });
  const b = bootstrapWeightedMean(values, { seed: 42 });

  assert.ok(Math.abs(a.point - 7) < 0.01);
  assert.ok(a.lower <= 7 && a.upper >= 7, `expected CI to contain 7, got [${a.lower}, ${a.upper}]`);
  assert.deepEqual(a, b); // deterministic given the same seed
  assert.equal(a.method, "percentile_bootstrap_v0");
});

test("empty input yields a zero interval without throwing", () => {
  const result = bootstrapWeightedMean([]);
  assert.deepEqual(
    { point: result.point, lower: result.lower, upper: result.upper, iterations: result.iterations },
    { point: 0, lower: 0, upper: 0, iterations: 0 },
  );
});

test("all-zero-weight samples are treated as empty", () => {
  const result = bootstrapWeightedMean([
    { value: 7, weight: 0 },
    { value: 8, weight: 0 },
  ]);
  assert.equal(result.iterations, 0);
  assert.equal(result.point, 0);
});

test("a single sample collapses to a point interval", () => {
  const result = bootstrapWeightedMean([{ value: 6, weight: 1 }]);
  assert.equal(result.point, 6);
  assert.equal(result.lower, 6);
  assert.equal(result.upper, 6);
  assert.equal(result.se_estimate, 0);
});

test("iteration count is respected and floored at the minimum", () => {
  const values = [{ value: 5, weight: 1 }, { value: 9, weight: 1 }];
  assert.equal(bootstrapWeightedMean(values, { iterations: 500 }).iterations, 500);
  assert.equal(bootstrapWeightedMean(values, { iterations: 10 }).iterations, 200); // min 200
});

test("intervalsDistinguishable is true only when intervals do not overlap", () => {
  assert.equal(intervalsDistinguishable(interval(6, 7.2), interval(7.0, 8)), false); // overlap
  assert.equal(intervalsDistinguishable(interval(6, 6.9), interval(7.1, 8)), true); // no overlap
  assert.equal(intervalsDistinguishable(interval(7.1, 8), interval(6, 6.9)), true); // order-independent
});

test("reported bounds are clamped to the BARS 1-10 scale", () => {
  const values = [{ value: 10, weight: 1 }, { value: 10, weight: 1 }, { value: 9, weight: 1 }];
  const result = bootstrapWeightedMean(values, { seed: 1 });
  assert.ok(result.upper <= 10);
  assert.ok(result.lower >= 1);
});
