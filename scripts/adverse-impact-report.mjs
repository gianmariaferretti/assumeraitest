// Generates docs/fairness/adverse-impact-latest.md.
// Usage: node scripts/adverse-impact-report.mjs
// Runs the four-fifths-rule monitor on a SAMPLE synthetic dataset so the pitch
// document exists offline. In production the live snapshot comes from the
// auth-gated GET /admin/adverse-impact endpoint reading real decisions.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function load(absPath) {
  const source = readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
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

function records(dimension, value, applied, advanced) {
  return Array.from({ length: applied }, (_, i) => ({
    candidateId: `${value}_${i}`,
    decision: i < advanced ? "advance" : "decline",
    cohortValues: { [dimension]: value },
    decidedAt: new Date().toISOString(),
  }));
}

const { computeAdverseImpact } = load(
  path.join(rootDir, "src/features/audit/adverse-impact-monitor.ts"),
);

// SAMPLE data — replace with the live snapshot from /admin/adverse-impact.
const sample = [
  ...records("role_family", "sales", 60, 18),
  ...records("role_family", "engineering", 40, 12),
  ...records("role_family", "operations", 22, 6),
  ...records("seniority", "junior", 50, 16),
  ...records("seniority", "mid", 45, 13),
  ...records("seniority", "senior", 25, 6),
];

const { rows, computedAt } = computeAdverseImpact(sample);

const lines = [];
lines.push("# Adverse impact snapshot (SAMPLE)");
lines.push("");
lines.push(`Generated: ${computedAt}`);
lines.push("");
lines.push("> SAMPLE data for the pitch deck. The live snapshot comes from the auth-gated");
lines.push("> `GET /admin/adverse-impact` endpoint over real review decisions (last 30 days).");
lines.push("");
lines.push("| Dimension | Cohort | Reference | Applied | Selected | Sel. rate | Ratio vs ref | Status |");
lines.push("|-----------|--------|-----------|--------:|---------:|----------:|-------------:|:------:|");
for (const row of rows) {
  lines.push(
    `| ${row.cohortDimension} | ${row.cohortValue} | ${row.referenceValue} | ${row.nApplied} | ${row.nSelected} | ${(row.selectionRate * 100).toFixed(1)}% | ${row.ratioVsReference.toFixed(3)} | ${row.status.toUpperCase()} |`,
  );
}
lines.push("");
lines.push("Thresholds: four-fifths rule (EEOC 1978) — ratio < 0.80 = fail, 0.80–0.90 = warn, ≥ 0.90 = pass; cohorts with < 5 applicants are warned, never failed.");
lines.push("");
lines.push("> Adverse impact on neutral proxies is an early-warning system, not a substitute");
lines.push("> for a protected-attribute analysis (which requires explicit consent and a DPA).");
lines.push("");

const outDir = path.join(rootDir, "docs", "fairness");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "adverse-impact-latest.md"), lines.join("\n"), "utf8");
console.log(`Wrote docs/fairness/adverse-impact-latest.md (${rows.length} cohort rows).`);
