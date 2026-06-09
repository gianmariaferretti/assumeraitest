import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../..");
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

const { runCounterfactualSuite } = load(
  path.join(rootDir, "src/features/fairness/counterfactual/runner.ts"),
);
const { communicationFixtures } = load(
  path.join(rootDir, "src/features/fairness/counterfactual/fixtures/competencies/communication.ts"),
);

const competencyMap = {
  communication: {
    id: "communication",
    name: "Communication",
    tier: 1,
    description: "Communicate clearly.",
    sbiQuestions: [],
    bars: [
      { level: "below_standard", scoreRange: [1, 3], descriptors: ["vague"] },
      { level: "meets_standard", scoreRange: [4, 6], descriptors: ["concrete"] },
      { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["measurable"] },
      { level: "exceptional", scoreRange: [10, 10], descriptors: ["meta"] },
    ],
    redFlags: [],
  },
};

function levelFor(score) {
  if (score <= 3) return "below_standard";
  if (score <= 6) return "meets_standard";
  if (score <= 9) return "exceeds_standard";
  return "exceptional";
}

function scoredResponse(score) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            star_completeness: { situation: true, task: true, action: true, result: true },
            bars_score: score,
            bars_level: levelFor(score),
            evidence_snippets: ["evidence"],
            red_flags: [],
            followup_recommendation: { action: "next_question", missing_star_elements: [] },
            confidence: 0.85,
          }),
        },
      ],
    }),
  };
}

const FOREIGN_NAMES = ["Aymen", "Fatima", "Omar", "Wei", "Aisha", "Karim", "Lin", "Hassan", "Yuki", "Mei"];

test("counterfactual suite: identical scores across variants yield a perfect pass rate", async () => {
  const fetchImpl = async () => scoredResponse(8);
  const report = await runCounterfactualSuite(communicationFixtures, {
    evaluatorOptions: { apiKey: "k", fetchImpl },
    competencyMap,
    raters: 3,
  });

  assert.equal(report.passRate, 1);
  assert.equal(report.failingFixtures.length, 0);
  for (const bucket of Object.values(report.aggregateByVariesCategory)) {
    assert.equal(bucket.passRate, 1);
  }
  // JSON serializable
  assert.doesNotThrow(() => JSON.stringify(report));
});

test("counterfactual suite: a score that shifts only for foreign-name variants fails that bucket", async () => {
  const fetchImpl = async (_url, init) => {
    const body = String(init?.body ?? "");
    const isForeign = FOREIGN_NAMES.some((name) => body.includes(name));
    return scoredResponse(isForeign ? 5 : 8);
  };

  const report = await runCounterfactualSuite(communicationFixtures, {
    evaluatorOptions: { apiKey: "k", fetchImpl },
    competencyMap,
    raters: 3,
  });

  assert.ok(report.aggregateByVariesCategory.nameClass.passRate < 1, "nameClass bucket should fail");
  // Neutral non-name dimensions remain invariant.
  assert.equal(report.aggregateByVariesCategory.gender.passRate, 1);
  assert.equal(report.aggregateByVariesCategory.schoolPrestige.passRate, 1);
  assert.ok(report.failingFixtures.length > 0);
});
