import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  extractAnchorEntities,
  extractAnchorEntitiesViaProvider,
  followUpTextSafetyViolations,
} = loadFromRepoRoot("src/features/interview-flow/anchor-entities.ts");
const { conductTurn } = loadFromRepoRoot("src/features/interview-flow/conduct-turn.ts");
const { createInterviewSession } = loadFromRepoRoot(
  "src/features/interview-flow/session-state.ts",
);
const { applyDecision } = loadFromRepoRoot(
  "src/features/interview-flow/funnel-state-machine.ts",
);

// ---------------------------------------------------------------------------
// Deterministic anchor extraction
// ---------------------------------------------------------------------------

test("extracts technologies, metrics, and proper nouns as anchors (max 3)", () => {
  const anchors = extractAnchorEntities(
    "At Acme I migrated the pipeline to PostgreSQL and cut query time by 30%, working with Kafka for events.",
  );

  assert.ok(anchors.length >= 1 && anchors.length <= 3, `got ${anchors.length}`);
  assert.ok(
    anchors.some((anchor) => /postgresql|kafka/i.test(anchor)),
    `tech anchor expected in ${JSON.stringify(anchors)}`,
  );
});

test("a generic or empty answer yields no anchors and never throws", () => {
  assert.deepEqual(extractAnchorEntities(""), []);
  assert.deepEqual(extractAnchorEntities("   "), []);
  assert.deepEqual(
    extractAnchorEntities("i am good at communicating and i always do my best, really."),
    [],
  );
});

test("protected-trait terms are never anchors", () => {
  // Even if the candidate volunteers them, the extractor must drop them.
  const anchors = extractAnchorEntities(
    "I worked on Terraform after my pregnancy leave, improving deploys by 40%.",
  );
  assert.ok(anchors.length > 0, "the legitimate anchors survive");
  for (const anchor of anchors) {
    assert.equal(
      followUpTextSafetyViolations(anchor).length,
      0,
      `anchor ${anchor} must pass the safety inspection`,
    );
    assert.doesNotMatch(anchor, /pregnan/i);
  }
});

// ---------------------------------------------------------------------------
// Optional LLM extraction behind the provider interface
// ---------------------------------------------------------------------------

test("the LLM pass returns verbatim-checked anchors and falls back offline", async () => {
  const answerText = "I led the Kubernetes rollout and we halved deploy times.";
  const llmAnchors = await extractAnchorEntitiesViaProvider(
    { answerText },
    {
      apiKey: "test-key",
      recordUsage: () => {},
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              // "Grafana" is hallucinated (not in the answer) and must be dropped.
              text: JSON.stringify({ anchors: ["Kubernetes", "Grafana"] }),
            },
          ],
          usage: { input_tokens: 5, output_tokens: 5 },
        }),
      }),
    },
  );
  assert.deepEqual(llmAnchors, ["Kubernetes"]);

  // Provider failure -> deterministic fallback, never a throw.
  const fallbackAnchors = await extractAnchorEntitiesViaProvider(
    { answerText },
    {
      apiKey: "test-key",
      recordUsage: () => {},
      fetchImpl: async () => {
        throw new Error("network down");
      },
    },
  );
  assert.ok(fallbackAnchors.includes("Kubernetes"));

  // No key (offline) -> deterministic path directly.
  const offline = await extractAnchorEntitiesViaProvider({ answerText }, { apiKey: null });
  assert.ok(offline.includes("Kubernetes"));
});

// ---------------------------------------------------------------------------
// End-to-end: the follow-up references the anchor, within the existing budget
// ---------------------------------------------------------------------------

const competency = {
  id: "communication",
  name: "Communication",
  tier: 1,
  description: "Communicate clearly and listen actively.",
  sbiQuestions: [],
  bars: [
    { level: "below_standard", scoreRange: [1, 3], descriptors: ["vague"] },
    { level: "meets_standard", scoreRange: [4, 6], descriptors: ["concrete context"] },
    { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["measurable result"] },
    { level: "exceptional", scoreRange: [10, 10], descriptors: ["meta-communication"] },
  ],
  redFlags: [],
};

const roleProfile = {
  role_id: "role_sdr",
  title: "Sales Development Representative",
  role_type: "sales",
  requirements: { required_skills: ["outbound"] },
  calibration: {},
};

function sessionInExploration() {
  const session = createInterviewSession({
    candidateId: "cand_anchor",
    interviewLanguage: "en",
    roleProfile,
    now: "2026-06-12T10:00:00.000Z",
    sessionId: "sess_anchor",
  });
  let fs = session.module_sessions.motivation.funnelState;
  fs = applyDecision(fs, { kind: "advance_phase", phase: "exploration", reason: "" }, 50);
  fs = applyDecision(fs, { kind: "ask_primary_question", phase: "exploration", reason: "" }, 30);
  session.module_sessions.motivation.funnelState = fs;
  return session;
}

test("a STAR follow-up in exploration references an entity from the last answer", async () => {
  const session = sessionInExploration();

  const result = await conductTurn({
    session,
    moduleId: "motivation",
    competency,
    candidateAnswer: {
      questionId: session.module_sessions.motivation.currentQuestionId,
      questionText: "Tell me about a time you explained something complex.",
      // STAR-incomplete (no result) but rich in anchors.
      answerText: "I introduced Salesforce dashboards for the team and presented them weekly.",
    },
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: false,
    hasMoreCompetencies: true,
    elapsedSecondsForTurn: 10,
    evaluatorOptions: { apiKey: null },
    interviewerOptions: { apiKey: null },
  });

  assert.equal(result.nextAction, "ask_follow_up");
  assert.match(
    result.interviewerText,
    /Salesforce/,
    `follow-up must reference the anchor: ${result.interviewerText}`,
  );
  // The existing budget is untouched: still one follow-up consumed.
  assert.equal(
    result.session.module_sessions.motivation.funnelState.competency.followUpsForCurrentQuestion,
    1,
  );
});

test("an anchor-free answer degrades to the standard STAR follow-up", async () => {
  const session = sessionInExploration();

  const result = await conductTurn({
    session,
    moduleId: "motivation",
    competency,
    candidateAnswer: {
      questionId: session.module_sessions.motivation.currentQuestionId,
      questionText: "Tell me about a time you explained something complex.",
      answerText: "i am good at communicating, i always do it well.",
    },
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: false,
    hasMoreCompetencies: true,
    elapsedSecondsForTurn: 10,
    evaluatorOptions: { apiKey: null },
    interviewerOptions: { apiKey: null },
  });

  assert.equal(result.nextAction, "ask_follow_up");
  assert.ok(result.interviewerText.length > 0, "standard follow-up still produced");
  assert.doesNotMatch(result.interviewerText, /Hai citato undefined/);
});

test("an unsafe LLM follow-up referencing the anchor falls back to a safe line", async () => {
  const session = sessionInExploration();

  const result = await conductTurn({
    session,
    moduleId: "motivation",
    competency,
    candidateAnswer: {
      questionId: session.module_sessions.motivation.currentQuestionId,
      questionText: "Tell me about a time you explained something complex.",
      answerText: "I introduced Salesforce dashboards for the team and presented them weekly.",
    },
    currentQuestionStarTarget: ["situation", "task", "action", "result"],
    hasMorePrimaryQuestions: false,
    hasMoreCompetencies: true,
    elapsedSecondsForTurn: 10,
    evaluatorOptions: { apiKey: null },
    interviewerOptions: {
      apiKey: "test-key",
      recordUsage: () => {},
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          // Mentions the anchor but probes a protected trait: must be blocked
          // by the inspectQuestionSafety gate on follow-ups.
          content: [
            {
              type: "text",
              text: "About Salesforce: did your family status affect that rollout?",
            },
          ],
        }),
      }),
    },
  });

  assert.equal(result.nextAction, "ask_follow_up");
  assert.equal(result.interviewerSource, "deterministic_fallback");
  assert.doesNotMatch(result.interviewerText, /family status/i);
});

test("follow-up safety inspection catches protected traits and employer voice", () => {
  assert.equal(followUpTextSafetyViolations("Hai citato Kafka: cosa hai fatto tu?").length, 0);
  assert.ok(followUpTextSafetyViolations("How old are you, and what is your nationality?").length > 0);
  assert.ok(followUpTextSafetyViolations("Why do you want to work with us?").length > 0);
});
