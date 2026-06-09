// Generates docs/fairness/latest.md from the counterfactual fairness suite.
// Usage: node scripts/fairness-report.mjs
// Uses ANTHROPIC_API_KEY when present; otherwise runs the deterministic fallback
// evaluator so the report is reproducible offline.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
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

function genericCompetency(id) {
  return {
    id,
    name: id,
    tier: 1,
    description: `Behavioral competency: ${id}.`,
    sbiQuestions: [],
    bars: [
      { level: "below_standard", scoreRange: [1, 3], descriptors: ["vague, no outcome"] },
      { level: "meets_standard", scoreRange: [4, 6], descriptors: ["concrete context"] },
      { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["measurable outcome"] },
      { level: "exceptional", scoreRange: [10, 10], descriptors: ["exemplary, transferable"] },
    ],
    redFlags: [],
  };
}

async function main() {
  const { runCounterfactualSuite } = load(
    path.join(rootDir, "src/features/fairness/counterfactual/runner.ts"),
  );
  const { allCounterfactualFixtures } = load(
    path.join(rootDir, "src/features/fairness/counterfactual/fixtures/index.ts"),
  );

  const competencyIds = [...new Set(allCounterfactualFixtures.map((f) => f.competency_id))];
  const competencyMap = Object.fromEntries(competencyIds.map((id) => [id, genericCompetency(id)]));

  const report = await runCounterfactualSuite(allCounterfactualFixtures, {
    evaluatorOptions: { apiKey: process.env.ANTHROPIC_API_KEY ?? null },
    competencyMap,
  });

  const lines = [];
  lines.push("# Counterfactual fairness report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: \`${process.env.ANTHROPIC_API_KEY ? "anthropic ensemble" : "deterministic fallback"}\``);
  lines.push("");
  lines.push(`Overall pass rate: **${(report.passRate * 100).toFixed(1)}%** across ${report.results.length} fixtures.`);
  lines.push("");
  lines.push("## By variation category");
  lines.push("");
  lines.push("| Variation | Tests | Passed | Pass rate |");
  lines.push("|-----------|------:|-------:|----------:|");
  for (const [category, bucket] of Object.entries(report.aggregateByVariesCategory)) {
    lines.push(`| ${category} | ${bucket.tests} | ${bucket.passed} | ${(bucket.passRate * 100).toFixed(1)}% |`);
  }
  lines.push("");
  if (report.failingFixtures.length > 0) {
    lines.push("## Failing fixtures");
    lines.push("");
    for (const id of report.failingFixtures) {
      lines.push(`- ${id}`);
    }
    lines.push("");
  }
  lines.push("> Counterfactual fairness over 20 fixtures is an empirical first defense, not a");
  lines.push("> complete bias audit. A formal Differential Item Functioning analysis is planned");
  lines.push("> pre-launch enterprise.");
  lines.push("");

  const outDir = path.join(rootDir, "docs", "fairness");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "latest.md"), lines.join("\n"), "utf8");
  console.log(`Wrote docs/fairness/latest.md (pass rate ${(report.passRate * 100).toFixed(1)}%).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
