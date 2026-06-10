import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  CANONICAL_LANGUAGES,
  CANONICAL_QUESTION_BANK,
  buildCanonicalQuestion,
} = loadFromRepoRoot("src/features/interview-flow/canonical-questions.ts");
const { validateArcOrder, resolveSeniorityBand, resolveStarSjtMix } = loadFromRepoRoot(
  "src/features/interview-flow/interview-arc.ts",
);
const { selectQuestionBankForRole } = loadFromRepoRoot(
  "src/features/interview-flow/question-bank.ts",
);
const { createResumeAwareQuestionPlan } = loadFromRepoRoot(
  "src/features/interview-flow/resume-question-planner.ts",
);
const { containsEmployerPresupposingText, containsEmployerVoice } = loadFromRepoRoot(
  "src/features/interview-flow/platform-neutrality.ts",
);
const { containsDisallowedQuestionText, inspectQuestionSafety } = loadFromRepoRoot(
  "src/features/interview-flow/safety.ts",
);
const { assessCompetencyScores, SCORING_MODE_WEIGHTS } = loadFromRepoRoot(
  "src/features/scoring/aggregation.ts",
);
const { conductTurn } = loadFromRepoRoot("src/features/interview-flow/conduct-turn.ts");
const { createInterviewSession, startModule } = {
  ...loadFromRepoRoot("src/features/interview-flow/session-state.ts"),
  ...loadFromRepoRoot("src/features/interview-flow/server-turn.ts"),
};
const { generateInterviewerTurn } = loadFromRepoRoot(
  "src/features/interview-flow/interviewer-agent.ts",
);

const salesRole = {
  role_id: "role_sdr",
  title: "Sales Development Representative",
  role_type: "sales",
  seniority: "junior",
  requirements: { required_skills: ["outbound"] },
  calibration: {},
};

const ARC_STAGES = [
  "opening",
  "motivation",
  "self_awareness",
  "behavioral_core",
  "situational",
  "closing",
];

// ---------------------------------------------------------------------------
// 1. Arc order is enforced for every generated plan
// ---------------------------------------------------------------------------

test("every generated plan follows the realistic arc, in every language", () => {
  for (const language of ["en", "it", "fr"]) {
    for (const seniority of ["junior", "senior", undefined]) {
      const plan = selectQuestionBankForRole(
        { ...salesRole, seniority },
        undefined,
        language,
      );
      const violations = validateArcOrder(plan);
      assert.deepEqual(violations, [], `${language}/${seniority ?? "mid"}`);

      assert.equal(plan[0].id, "canonical_opening");
      assert.equal(plan[0].scoringMode, "baseline_only");
      assert.equal(plan.at(-1).id, "canonical_closing_process");
      assert.equal(plan.at(-1).arcStage, "closing");
    }
  }
});

test("the self-awareness bridge is the strengths question followed by its STAR probe", () => {
  const plan = selectQuestionBankForRole(salesRole, undefined, "en");
  const strengthsIndex = plan.findIndex((q) => q.id === "canonical_self_awareness");
  const probeIndex = plan.findIndex((q) => q.id === "canonical_self_awareness_probe");

  assert.ok(strengthsIndex > 0);
  assert.equal(probeIndex, strengthsIndex + 1, "the probe immediately follows the on-ramp");
  assert.equal(plan[strengthsIndex].scoringMode, "low_weight", "the classic question is the on-ramp");
  assert.equal(plan[probeIndex].scoringMode, "full", "the follow-up carries the score");
});

test("sales-family interviews always include the failure/rejection question", () => {
  const salesPlan = selectQuestionBankForRole(salesRole, undefined, "en");
  assert.ok(salesPlan.some((q) => q.id === "canonical_failure_sales"));
  assert.ok(
    salesPlan.some((q) => q.id === "canonical_motivation_sales"),
    "sales motivation uses the role-family variant",
  );

  const opsPlan = selectQuestionBankForRole(
    { ...salesRole, role_type: "operations", title: "Operations Analyst" },
    undefined,
    "en",
  );
  assert.ok(!opsPlan.some((q) => q.id === "canonical_failure_sales"));
  assert.ok(opsPlan.some((q) => q.id === "canonical_motivation_generic"));
});

// ---------------------------------------------------------------------------
// 2. Seniority calibration (STAR/SJT mix)
// ---------------------------------------------------------------------------

test("juniors get an extra situational item; experienced get an extra behavioral item", () => {
  assert.deepEqual(resolveStarSjtMix(resolveSeniorityBand("junior")), {
    extraSituational: true,
    extraBehavioral: false,
  });
  assert.deepEqual(resolveStarSjtMix(resolveSeniorityBand("Senior Account Executive")), {
    extraSituational: false,
    extraBehavioral: true,
  });
  assert.deepEqual(resolveStarSjtMix(resolveSeniorityBand("mid")), {
    extraSituational: false,
    extraBehavioral: false,
  });

  const juniorPlan = selectQuestionBankForRole({ ...salesRole, seniority: "junior" }, undefined, "en");
  assert.ok(juniorPlan.some((q) => q.id === "canonical_situational_sales_junior"));
  assert.ok(!juniorPlan.some((q) => q.id === "canonical_behavioral_experienced"));

  const seniorPlan = selectQuestionBankForRole({ ...salesRole, seniority: "senior" }, undefined, "en");
  assert.ok(seniorPlan.some((q) => q.id === "canonical_behavioral_experienced"));
  assert.ok(!seniorPlan.some((q) => q.id === "canonical_situational_sales_junior"));
});

// ---------------------------------------------------------------------------
// 3. Bank coverage + neutrality lint (5 languages x all stages)
// ---------------------------------------------------------------------------

test("the canonical bank covers all five languages for every arc stage it serves", () => {
  assert.deepEqual([...CANONICAL_LANGUAGES], ["en", "it", "fr", "de", "es"]);
  const stagesInBank = new Set(CANONICAL_QUESTION_BANK.map((entry) => entry.stage));
  for (const stage of ["opening", "motivation", "self_awareness", "behavioral_core", "situational", "closing"]) {
    assert.ok(stagesInBank.has(stage), `bank must cover stage ${stage}`);
  }

  for (const entry of CANONICAL_QUESTION_BANK) {
    assert.ok(ARC_STAGES.includes(entry.stage), entry.id);
    for (const language of CANONICAL_LANGUAGES) {
      const prompt = entry.prompts[language];
      assert.ok(
        typeof prompt === "string" && prompt.trim().length > 10,
        `${entry.id} must have a real ${language} prompt`,
      );
    }
  }
});

test("no bank entry, in any language, presupposes an employer or trips safety", () => {
  for (const entry of CANONICAL_QUESTION_BANK) {
    for (const language of CANONICAL_LANGUAGES) {
      const prompt = entry.prompts[language];
      assert.equal(
        containsEmployerPresupposingText(prompt),
        false,
        `${entry.id}/${language}: ${prompt}`,
      );
      assert.equal(
        containsDisallowedQuestionText(prompt),
        false,
        `${entry.id}/${language}: ${prompt}`,
      );
    }
  }
});

test("the employer-presupposing lint catches violations in every language", () => {
  for (const text of [
    "Why do you want to work with us?",
    "What do you know about us and our company?",
    "Perché ha scelto noi? Cosa sa della nostra azienda?",
    "Pourquoi avez-vous postulé ? Que savez-vous de nous ?",
    "Warum möchten Sie bei uns arbeiten? Was wissen Sie über uns?",
    "¿Por qué quiere trabajar con nosotros? ¿Qué sabe de nuestra empresa?",
  ]) {
    assert.equal(containsEmployerPresupposingText(text), true, text);
  }

  // Legitimate platform phrasings stay clean.
  for (const text of [
    "Tell me about a time you worked with a difficult customer.",
    "Mi descriva come gestirebbe quella conversazione con il cliente.",
    "What matters most to you in your next job?",
  ]) {
    assert.equal(containsEmployerPresupposingText(text), false, text);
  }

  const safety = inspectQuestionSafety({
    id: "q_bad",
    version: "interview-question-v0",
    moduleId: "motivation",
    roleFamily: "sales",
    difficulty: "baseline",
    prompt: "Why do you want to work for our company?",
    rubric: ["r"],
    expectedSignals: ["s"],
    disallowedSignals: [],
    evidenceRequirements: ["e"],
    timeTargetSeconds: 60,
    followUpRules: [],
  });
  assert.equal(safety.safe, false, "safety integration rejects employer-presupposing questions");
});

// ---------------------------------------------------------------------------
// 4. Deterministic fallback: complete realistic arc with zero LLM calls
// ---------------------------------------------------------------------------

test("the deterministic planner yields a full arc and never rewrites canonical items", () => {
  const candidateProfile = {
    candidate_id: "cand_1",
    updated_at: "2026-06-09T10:00:00.000Z",
    experience: [
      {
        title: "SDR",
        company: "Acme",
        responsibilities: ["outbound prospecting"],
        measurable_impact: ["booked 14 meetings"],
        tools: ["Salesforce"],
      },
    ],
    skills: [{ name: "outbound", evidence: ["three-touch sequence"] }],
    languages: [{ language: "English", declared_level: "C1" }],
    education: [],
    preferences: { target_roles: ["SDR"], locations: [], work_modes: [] },
  };

  const base = selectQuestionBankForRole(salesRole, undefined, "it");
  const plan = createResumeAwareQuestionPlan(base, salesRole, candidateProfile, "it");

  assert.deepEqual(validateArcOrder(plan), []);
  const opening = plan.find((q) => q.id === "canonical_opening");
  const entry = CANONICAL_QUESTION_BANK.find((e) => e.id === "canonical_opening");
  assert.equal(
    opening.prompt,
    entry.prompts.it,
    "the fallback keeps the canonical Italian phrasing verbatim",
  );
  assert.equal(opening.prompt, "Mi parli di lei — il suo percorso e cosa cerca nel suo prossimo ruolo.");
  // Module questions still receive the resume-aware treatment.
  const domain = plan.find((q) => q.moduleId === "domain" && !q.id.startsWith("canonical_"));
  assert.ok(domain.resumeGrounding, "behavioral core stays resume-grounded");
});

// ---------------------------------------------------------------------------
// 5. baseline_only never moves a competency score
// ---------------------------------------------------------------------------

function evaluation(overrides = {}) {
  return {
    competency_id: "communication",
    question_id: "q1",
    star_completeness: { situation: true, task: true, action: true, result: true },
    bars_score: 6,
    bars_level: "meets_standard",
    evidence_snippets: ["evidence"],
    red_flags: [],
    followup_recommendation: { action: "next_question", missing_star_elements: [] },
    confidence: 0.8,
    source: "deterministic_fallback",
    human_review_required: false,
    ...overrides,
  };
}

test("the opening (baseline_only) turn never moves any competency score", () => {
  assert.equal(SCORING_MODE_WEIGHTS.baseline_only, 0);

  const without = assessCompetencyScores([evaluation({ bars_score: 6 })]);
  const withExtremeOpening = assessCompetencyScores([
    evaluation({ bars_score: 6 }),
    evaluation({ question_id: "canonical_opening", bars_score: 1, scoring_mode: "baseline_only" }),
  ]);

  assert.equal(withExtremeOpening[0].bars_score, without[0].bars_score);
  assert.equal(
    withExtremeOpening[0].answers_evaluated,
    without[0].answers_evaluated,
    "baseline_only answers are excluded entirely",
  );

  const onlyBaseline = assessCompetencyScores([
    evaluation({ scoring_mode: "baseline_only" }),
  ]);
  assert.equal(onlyBaseline.length, 0, "baseline-only evidence produces no competency score");
});

test("low_weight turns count at reduced weight", () => {
  const fullOnly = assessCompetencyScores([evaluation({ bars_score: 8 })]);
  const withLowWeight = assessCompetencyScores([
    evaluation({ bars_score: 8 }),
    evaluation({ question_id: "q2", bars_score: 2, scoring_mode: "low_weight" }),
  ]);
  const withFullSecond = assessCompetencyScores([
    evaluation({ bars_score: 8 }),
    evaluation({ question_id: "q2", bars_score: 2 }),
  ]);

  assert.ok(
    withLowWeight[0].bars_score > withFullSecond[0].bars_score,
    "a low_weight answer drags the mean less than a full-weight one",
  );
  assert.ok(withLowWeight[0].bars_score < fullOnly[0].bars_score);
});

test("evaluator run records carry arc_stage and scoring_mode", async () => {
  const session = createInterviewSession({
    candidateId: "cand_1",
    interviewLanguage: "en",
    roleProfile: salesRole,
    now: "2026-06-09T10:00:00.000Z",
    sessionId: "sess_arc",
  });

  const result = await conductTurn({
    session: startModule(session, "motivation", "2026-06-09T10:00:00.000Z"),
    moduleId: "motivation",
    competency: {
      id: "motivation_role_fit",
      name: "Motivation",
      tier: 1,
      description: "d",
      sbiQuestions: [],
      bars: [
        { level: "below_standard", scoreRange: [1, 3], descriptors: ["a"] },
        { level: "meets_standard", scoreRange: [4, 6], descriptors: ["b"] },
        { level: "exceeds_standard", scoreRange: [7, 9], descriptors: ["c"] },
        { level: "exceptional", scoreRange: [10, 10], descriptors: ["d"] },
      ],
      redFlags: [],
    },
    candidateAnswer: {
      questionId: "canonical_opening",
      questionText: "Tell me about yourself.",
      answerText: "I started in retail, moved to SaaS sales, and I'm looking for an SDR role.",
    },
    arcStage: "opening",
    scoringMode: "baseline_only",
    evaluatorOptions: { apiKey: null },
    interviewerOptions: { apiKey: null },
  });

  assert.equal(result.evaluatorRun.arc_stage, "opening");
  assert.equal(result.evaluatorRun.scoring_mode, "baseline_only");
  for (const run of result.evaluatorRuns) {
    assert.equal(run.scoring_mode, "baseline_only");
  }
});

// ---------------------------------------------------------------------------
// 6. Interviewer neutrality: identity in the prompt, employer voice blocked
// ---------------------------------------------------------------------------

test("the interviewer system prompt declares the neutral AssumerAI identity", async () => {
  let capturedBody;
  const capturingFetch = async (_url, init) => {
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "Thanks, that's clear. Tell me about a recent win." }] }),
    };
  };

  const turn = await generateInterviewerTurn({
    decision: { kind: "ask_primary_question", phase: "exploration", reason: "" },
    state: {
      phase: "exploration",
      phaseElapsedSeconds: 0,
      phaseQuestionsAsked: 0,
      competency: {
        competencyId: "c",
        primaryQuestionsAsked: 0,
        followUpsForCurrentQuestion: 0,
        followUpsForCompetency: 0,
        star: { situation: false, task: false, action: false, result: false },
      },
    },
    competency: { id: "c", name: "C", tier: 1, description: "d", sbiQuestions: [], bars: [], redFlags: [] },
    options: { apiKey: "test-key", fetchImpl: capturingFetch },
  });

  assert.equal(turn.source, "anthropic");
  const system = capturedBody.system;
  assert.match(system, /NEUTRAL AssumerAI career interviewer/);
  assert.match(system, /MULTIPLE potential employers/);
  assert.match(system, /Briefly acknowledge the previous answer/);
  assert.match(system, /smooth transitions/i);
  assert.match(system, /exactly ONE question per turn/);
  assert.match(system, /never exam-style|never a list of questions/i);
});

test("employer-voice output is blocked and falls back deterministically", async () => {
  const employerVoiceFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text: "We at Acme would love to hire you — join our team!" }],
    }),
  });

  const turn = await generateInterviewerTurn({
    decision: { kind: "ask_primary_question", phase: "exploration", reason: "" },
    state: {
      phase: "exploration",
      phaseElapsedSeconds: 0,
      phaseQuestionsAsked: 0,
      competency: {
        competencyId: "c",
        primaryQuestionsAsked: 0,
        followUpsForCurrentQuestion: 0,
        followUpsForCompetency: 0,
        star: { situation: false, task: false, action: false, result: false },
      },
    },
    competency: { id: "c", name: "C", tier: 1, description: "d", sbiQuestions: [], bars: [], redFlags: [] },
    options: { apiKey: "test-key", fetchImpl: employerVoiceFetch },
  });

  assert.equal(turn.source, "deterministic_fallback");
  assert.equal(containsEmployerVoice(turn.text), false);
});

test("canonical questions materialize as valid, safety-clean interview questions", () => {
  for (const entry of CANONICAL_QUESTION_BANK) {
    for (const language of CANONICAL_LANGUAGES) {
      const question = buildCanonicalQuestion(entry, language, "sales");
      assert.equal(question.arcStage, entry.stage);
      assert.equal(question.scoringMode, entry.scoringMode);
      assert.equal(inspectQuestionSafety(question).safe, true, `${entry.id}/${language}`);
    }
  }
});
