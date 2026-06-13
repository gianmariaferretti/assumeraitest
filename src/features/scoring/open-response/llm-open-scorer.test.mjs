import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../../test-helpers/ts-loader.mjs";

const { scoreOpenResponse } = loadFromRepoRoot(
  "src/features/scoring/open-response/llm-open-scorer.ts",
);

const competencies = [
  { competency_id: "writing_clarity", descriptor: "Clear, well-structured writing." },
];

function mockProvider(scoresJson, capture) {
  return async (_url, init) => {
    if (capture) {
      capture.body = JSON.parse(init.body);
    }
    return {
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(scoresJson) }],
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
    };
  };
}

test("scores an open answer 0-100 with evidence and an audit reason", async () => {
  const result = await scoreOpenResponse({
    module_id: "language_writing",
    mode: "writing",
    prompt: "Describe a process improvement you led.",
    response: "I mapped the handoff, removed two redundant approvals, and cut cycle time by 30%.",
    competencies,
    language: "English",
    options: {
      apiKey: "test-key",
      recordUsage: () => {},
      fetchImpl: mockProvider({
        competencies: [
          {
            competency_id: "writing_clarity",
            score: 82,
            confidence: 0.8,
            evidence: ["removed two redundant approvals"],
            reason: "Clear structure with a concrete result.",
            needs_human_review: false,
          },
        ],
      }),
    },
  });

  assert.equal(result.scorer_type, "language");
  assert.equal(result.used_fallback, false);
  assert.equal(result.competency_scores[0].score, 82);
  assert.match(result.competency_scores[0].reason, /human review/i);
});

test("the prompt forbids protected attributes; speaking mode forbids accent", async () => {
  const capture = {};
  await scoreOpenResponse({
    module_id: "language_speaking",
    mode: "speaking",
    prompt: "Talk about a recent project.",
    response: "We shipped the new onboarding flow last quarter.",
    competencies: [{ competency_id: "speaking_fluency", descriptor: "Fluency and clarity." }],
    options: { apiKey: "k", recordUsage: () => {}, fetchImpl: mockProvider({ competencies: [] }, capture) },
  });
  assert.match(capture.body.system, /NEVER assess or infer protected attributes/i);
  assert.match(capture.body.system, /NEVER assess or mention accent/i);
  assert.match(capture.body.system, /TEXT ONLY/);
});

test("a model reason that trips the protected-trait filter drops to fallback", async () => {
  const result = await scoreOpenResponse({
    module_id: "language_writing",
    mode: "writing",
    prompt: "p",
    response: "a substantive answer here",
    competencies,
    options: {
      apiKey: "k",
      recordUsage: () => {},
      fetchImpl: mockProvider({
        competencies: [
          {
            competency_id: "writing_clarity",
            score: 90,
            confidence: 0.9,
            evidence: [],
            // Unsafe: references a protected attribute → whole result invalidated.
            reason: "Strong for someone of their age and nationality.",
            needs_human_review: false,
          },
        ],
      }),
    },
  });
  assert.equal(result.used_fallback, true);
  assert.equal(result.needs_human_review, true);
  assert.ok(result.confidence <= 0.4);
});

test("fairness: the score does not depend on candidate identity, only the answer", async () => {
  // The grader sees only prompt + answer + competencies (no name/identity is
  // ever passed). Same answer → same score regardless of who submitted it.
  const base = {
    module_id: "language_writing",
    mode: "writing",
    prompt: "p",
    response: "Same answer text, identical content.",
    competencies,
    options: {
      apiKey: "k",
      recordUsage: () => {},
      fetchImpl: mockProvider({
        competencies: [
          { competency_id: "writing_clarity", score: 70, confidence: 0.7, evidence: [], reason: "ok", needs_human_review: false },
        ],
      }),
    },
  };
  const first = await scoreOpenResponse(base);
  const second = await scoreOpenResponse(base);
  assert.equal(first.module_score, second.module_score);
  const captured = {};
  await scoreOpenResponse({ ...base, options: { ...base.options, fetchImpl: mockProvider({ competencies: [] }, captured) } });
  // The payload sent to the model carries no identity field.
  assert.equal("candidate_id" in captured.body, false);
  assert.equal("name" in captured.body, false);
});

test("a missing provider or empty answer degrades to a neutral review result", async () => {
  const noKey = await scoreOpenResponse({
    module_id: "language_writing",
    mode: "writing",
    prompt: "p",
    response: "an answer",
    competencies,
    options: { apiKey: null },
  });
  assert.equal(noKey.used_fallback, true);
  assert.equal(noKey.needs_human_review, true);
  assert.equal(noKey.competency_scores[0].score, 50, "neutral, never punitive");

  const failed = await scoreOpenResponse({
    module_id: "language_writing",
    mode: "writing",
    prompt: "p",
    response: "an answer",
    competencies,
    options: { apiKey: "k", recordUsage: () => {}, fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) },
  });
  assert.equal(failed.used_fallback, true);
});
