import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  agilityEntries,
  isAgilityQuestionId,
  CANONICAL_LANGUAGES,
} = loadFromRepoRoot("src/features/interview-flow/canonical-questions.ts");
const { containsEmployerPresupposingText, containsEmployerVoice } = loadFromRepoRoot(
  "src/features/interview-flow/platform-neutrality.ts",
);
const {
  MICRO_LEARNING_CONCEPT_IDS,
  microLearningQuestionId,
  selectMicroLearningConceptId,
} = loadFromRepoRoot("src/features/interview-flow/micro-learning.ts");
const { buildInterviewArcQuestions, validateArcOrder } = loadFromRepoRoot(
  "src/features/interview-flow/interview-arc.ts",
);
const {
  competencyForModule,
  LEARNING_AGILITY_COMPETENCY_ID,
  learningAgilityWeightForSeniority,
} = loadFromRepoRoot("src/features/interview-flow/module-competencies.ts");
const { assessModuleScore } = loadFromRepoRoot("src/features/scoring/aggregation.ts");
const { aggregateModuleScores } = loadFromRepoRoot("src/features/interview-evaluation/index.ts");

// ---------------------------------------------------------------------------
// Curated concept bank: 5 languages, in-prompt explanation, neutral
// ---------------------------------------------------------------------------

test("the agility bank has the STAR item plus three fully-explained micro-task concepts", () => {
  const entries = agilityEntries();
  assert.deepEqual(
    entries.map((entry) => entry.id),
    [
      "canonical_agility_star",
      "canonical_agility_micro_goodhart_measure",
      "canonical_agility_micro_premortem",
      "canonical_agility_micro_swiss_cheese",
    ],
  );
  assert.deepEqual(MICRO_LEARNING_CONCEPT_IDS, ["goodhart_measure", "premortem", "swiss_cheese"]);

  // The no-penalty promise is IN the prompt, in every language.
  const notExpectedToKnow = {
    en: /not expected to know it/i,
    it: /non è richiesto conoscerla/i,
    fr: /pas censé la connaître/i,
    de: /müssen sie nicht kennen/i,
    es: /no se espera que la conozca/i,
  };

  for (const entry of entries) {
    assert.equal(entry.scoringMode, "full", `${entry.id} is a scored competency item`);
    assert.equal(entry.stage, "behavioral_core");
    assert.equal(entry.moduleId, "domain");
    for (const language of CANONICAL_LANGUAGES) {
      const prompt = entry.prompts[language];
      assert.ok(prompt, `${entry.id} has a ${language} prompt`);
      assert.equal(containsEmployerPresupposingText(prompt), false, `${entry.id} (${language})`);
      assert.equal(containsEmployerVoice(prompt), false, `${entry.id} (${language})`);
      if (entry.id.startsWith("canonical_agility_micro_")) {
        assert.match(prompt, notExpectedToKnow[language], `${entry.id} (${language})`);
      }
    }
    assert.match(
      entry.rubric.join(" "),
      /[Nn]ever scores prior familiarity/,
      `${entry.id} rubric carries the no-penalty rule`,
    );
  }
});

test("micro-task concept selection is deterministic and covers the bank", () => {
  // Same seed -> same concept, every time.
  for (const seed of ["engineering:junior:en", "sales:any:it", "operations:experienced:de"]) {
    assert.equal(selectMicroLearningConceptId(seed), selectMicroLearningConceptId(seed));
  }
  // The bank is actually used: many seeds reach more than one concept.
  const seen = new Set(
    Array.from({ length: 40 }, (_, index) => selectMicroLearningConceptId(`seed_${index}`)),
  );
  assert.ok(seen.size > 1, "selection varies across seeds");
  for (const conceptId of seen) {
    assert.ok(MICRO_LEARNING_CONCEPT_IDS.includes(conceptId));
  }
  assert.equal(microLearningQuestionId("premortem"), "canonical_agility_micro_premortem");
});

// ---------------------------------------------------------------------------
// Arc: STAR always + exactly ONE micro-task, deterministic per plan inputs
// ---------------------------------------------------------------------------

test("the arc includes the agility STAR and exactly one micro-task, rebuilt identically", () => {
  for (const seniority of ["junior", "senior"]) {
    const build = () =>
      buildInterviewArcQuestions({
        moduleQuestions: [],
        roleFamily: "engineering",
        seniority,
        language: "it",
      });
    const ids = build().map((question) => question.id);

    assert.ok(ids.includes("canonical_agility_star"), `${seniority}: STAR item present`);
    const microIds = ids.filter((id) => id.startsWith("canonical_agility_micro_"));
    assert.equal(microIds.length, 1, `${seniority}: exactly one micro-task`);
    // Server-authoritative determinism: the same inputs rebuild the same plan.
    assert.deepEqual(build().map((question) => question.id), ids);
    assert.deepEqual(validateArcOrder(build()), [], "arc order stays valid");
  }
});

// ---------------------------------------------------------------------------
// Competency: dedicated BARS anchors, no penalty for unfamiliarity
// ---------------------------------------------------------------------------

test("agility items resolve to the learning_agility competency in any module", () => {
  const question = {
    id: "canonical_agility_micro_premortem",
    rubric: ["extra grounding"],
  };
  const competency = competencyForModule("domain", question);
  assert.equal(competency.id, LEARNING_AGILITY_COMPETENCY_ID);
  assert.equal(isAgilityQuestionId(question.id), true);

  // The question rubric is appended to the meets_standard anchors as usual.
  const meets = competency.bars.find((anchor) => anchor.level === "meets_standard");
  assert.ok(meets.descriptors.includes("extra grounding"));

  // Non-agility questions keep their module competency.
  assert.equal(competencyForModule("domain", { id: "q1", rubric: [] }).id, "domain_knowledge");
});

test("the BARS anchors score the learning process, never prior knowledge", () => {
  const competency = competencyForModule("domain", { id: "canonical_agility_star", rubric: [] });

  assert.match(competency.description, /learning process only/i);
  assert.match(competency.description, /admitting unfamiliarity never lowers the score/i);

  const meets = competency.bars.find((anchor) => anchor.level === "meets_standard");
  assert.ok(
    meets.descriptors.some((descriptor) => /admitting unfamiliarity.*meets this bar/i.test(descriptor)),
    "honest unfamiliarity explicitly meets the bar",
  );
  const below = competency.bars.find((anchor) => anchor.level === "below_standard");
  assert.ok(
    below.descriptors.some((descriptor) => /bluffs familiarity/i.test(descriptor)),
    "bluffing — not unfamiliarity — is what scores below standard",
  );
});

// ---------------------------------------------------------------------------
// Seniority weighting: more for juniors, never zeroed
// ---------------------------------------------------------------------------

test("learning agility weighs more for juniors and is never zeroed", () => {
  const junior = learningAgilityWeightForSeniority("junior");
  const experienced = learningAgilityWeightForSeniority("experienced");
  const unknown = learningAgilityWeightForSeniority(undefined);

  assert.ok(junior > unknown, "junior weight above default");
  assert.ok(experienced < unknown, "experienced weight below default");
  assert.ok(experienced > 0, "never zeroed");
  assert.equal(unknown, 1);
});

test("the competency weight actually moves the module score", () => {
  const agility = {
    competency_id: LEARNING_AGILITY_COMPETENCY_ID,
    bars_score: 9,
    bars_level: "exceeds_standard",
    answers_evaluated: 2,
    mean_star_completeness: 3,
    confidence: 0.8,
    evidence_snippets: [],
    red_flags: [],
    human_review_required: false,
  };
  const domain = { ...agility, competency_id: "domain_knowledge", bars_score: 5 };

  const unweighted = assessModuleScore("domain", [agility, domain]);
  const juniorWeighted = assessModuleScore("domain", [
    { ...agility, weight: learningAgilityWeightForSeniority("junior") },
    domain,
  ]);
  const experiencedWeighted = assessModuleScore("domain", [
    { ...agility, weight: learningAgilityWeightForSeniority("experienced") },
    domain,
  ]);

  assert.equal(unweighted.bars_score, 7, "equal weights -> plain confidence-weighted mean");
  assert.ok(
    juniorWeighted.bars_score >= unweighted.bars_score,
    "junior weighting pulls toward the agility evidence",
  );
  assert.ok(
    experiencedWeighted.bars_score <= unweighted.bars_score,
    "experienced weighting pulls toward track-record evidence",
  );
});

test("aggregateModuleScores applies the seniority weight to learning agility", () => {
  const makeEvaluation = (competencyId, score) => ({
    competency_id: competencyId,
    bars_score: score,
    star_completeness: { situation: true, task: true, action: true, result: true },
    confidence: 0.8,
    evidence_snippets: [],
    red_flags: [],
    human_review_required: false,
  });
  const evaluations = [
    makeEvaluation(LEARNING_AGILITY_COMPETENCY_ID, 9),
    makeEvaluation("domain_knowledge", 5),
  ];
  const meta = { domain_knowledge: { moduleId: "domain", tier: 2 } };

  const [juniorModule] = aggregateModuleScores(evaluations, meta, { seniority: "junior" });
  const [seniorModule] = aggregateModuleScores(evaluations, meta, { seniority: "senior engineer" });

  assert.equal(juniorModule.module_id, "domain", "agility lands in the domain module");
  const juniorAgility = juniorModule.competencies.find(
    (competency) => competency.competency_id === LEARNING_AGILITY_COMPETENCY_ID,
  );
  const seniorAgility = seniorModule.competencies.find(
    (competency) => competency.competency_id === LEARNING_AGILITY_COMPETENCY_ID,
  );
  assert.equal(juniorAgility.weight, learningAgilityWeightForSeniority("junior"));
  assert.equal(seniorAgility.weight, learningAgilityWeightForSeniority("experienced"));
  assert.ok(
    juniorModule.bars_score >= seniorModule.bars_score,
    "the same evidence weighs more for the junior",
  );

  // Without the seniority option the behavior is unchanged (no weight set).
  const [plainModule] = aggregateModuleScores(evaluations, meta);
  const plainAgility = plainModule.competencies.find(
    (competency) => competency.competency_id === LEARNING_AGILITY_COMPETENCY_ID,
  );
  assert.equal(plainAgility.weight, undefined);
});
