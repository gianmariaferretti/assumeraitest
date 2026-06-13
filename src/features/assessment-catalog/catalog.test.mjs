import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  ASSESSMENT_CATALOG,
  activeModules,
  coreModuleIds,
  defaultModulePlan,
  scorerTypeForModule,
  isDescriptiveOnly,
} = loadFromRepoRoot("src/features/assessment-catalog/catalog.ts");
const { getItemBank } = loadFromRepoRoot("src/features/assessment-catalog/item-banks.ts");
const { summarizeWorkStylePreferences } = loadFromRepoRoot(
  "src/features/assessment-catalog/work-style-preference.ts",
);
const { resolveModuleStatuses } = loadFromRepoRoot(
  "src/features/interview-flow/module-unlock-engine.ts",
);
const { gradeQuiz, gradedItemsToCompetencyScores } = loadFromRepoRoot(
  "src/features/scoring/quiz-engine/grader.ts",
);
const { combineModuleResults } = loadFromRepoRoot(
  "src/features/scoring/module-scoring/combine-results.ts",
);
const { buildModuleScoreResult } = loadFromRepoRoot(
  "src/features/scoring/module-scoring/scorer-types.ts",
);
const { evaluateRequiredModulesGate } = loadFromRepoRoot("src/features/matching/gates.ts");

const byId = (statuses) => new Map(statuses.map((s) => [s.module_id, s]));

// ---------------------------------------------------------------------------
// Catalog integrity
// ---------------------------------------------------------------------------

test("the catalog declares all 22 modules with two CORE modules", () => {
  assert.equal(ASSESSMENT_CATALOG.length, 22);
  assert.deepEqual(coreModuleIds().sort(), ["comm_problem_solving", "motivation"]);
});

test("every active module has competencies, a budget, and a known scorer type", () => {
  const types = new Set(["behavioral", "deterministic", "work_sample", "language", "interactive"]);
  for (const definition of activeModules()) {
    assert.ok(definition.competencies.length > 0, `${definition.module_id} has competencies`);
    assert.ok(definition.duration_budget_seconds > 0, `${definition.module_id} has a budget`);
    assert.ok(types.has(definition.scorer_type), `${definition.module_id} scorer type valid`);
  }
});

test("the CORE fits inside ~20 minutes", () => {
  const coreBudget = ASSESSMENT_CATALOG.filter((m) => m.core).reduce(
    (sum, m) => sum + m.duration_budget_seconds,
    0,
  );
  assert.ok(coreBudget <= 20 * 60, `core budget ${coreBudget}s <= 1200s`);
});

test("the Phase 1 MVP set is active", () => {
  const phase1 = ["motivation", "comm_problem_solving", "coding_with_ai", "language_reading", "language_writing", "logical_reasoning"];
  for (const id of phase1) {
    const definition = ASSESSMENT_CATALOG.find((m) => m.module_id === id);
    assert.ok(definition, `${id} present`);
    assert.equal(definition.status, "active", `${id} active`);
  }
});

test("scorerTypeForModule reflects the catalog and defaults to behavioral", () => {
  assert.equal(scorerTypeForModule("logical_reasoning"), "deterministic");
  assert.equal(scorerTypeForModule("coding_with_ai"), "work_sample");
  assert.equal(scorerTypeForModule("language_writing"), "language");
  assert.equal(scorerTypeForModule("unknown_module"), "behavioral");
  assert.equal(isDescriptiveOnly("work_style"), true);
});

// ---------------------------------------------------------------------------
// Candidate journey: CORE gates everything; completing it unlocks the set;
// the match gate opens once required modules are complete.
// ---------------------------------------------------------------------------

test("non-core modules are locked behind the CORE until it is completed", () => {
  const plan = defaultModulePlan();
  const statuses = resolveModuleStatuses({
    rolePlan: plan,
    systemCoreModules: coreModuleIds(),
    cvSkills: ["python"],
    completedModuleIds: [],
  });
  const map = byId(statuses);
  // CORE shown and required.
  assert.equal(map.get("motivation").state, "required");
  assert.equal(map.get("comm_problem_solving").state, "required");
  // Everything unlockable is locked-pending until CORE done (visible, not startable).
  assert.equal(map.get("coding_with_ai").state, "locked_pending_prerequisite");
  assert.equal(map.get("language_reading").state, "locked_pending_prerequisite");
  assert.equal(map.get("logical_reasoning").state, "locked_pending_prerequisite");
  assert.match(map.get("coding_with_ai").unlock_reason, /Complete .* first/);
});

test("completing CORE unlocks the Phase 1 set, with coding auto-triggered by the CV", () => {
  const plan = defaultModulePlan();
  const statuses = resolveModuleStatuses({
    rolePlan: plan,
    systemCoreModules: coreModuleIds(),
    cvSkills: ["python"], // matches coding_with_ai auto-trigger keyword
    completedModuleIds: ["motivation", "comm_problem_solving"],
  });
  const map = byId(statuses);
  assert.equal(map.get("coding_with_ai").state, "auto_triggered", "CV skill opens coding");
  assert.equal(map.get("language_reading").state, "optional");
  assert.equal(map.get("language_writing").state, "optional");
  assert.equal(map.get("logical_reasoning").state, "optional");
});

test("the match gate opens once the required (CORE) modules are complete", () => {
  // Before: CORE incomplete → gate closed.
  const closed = evaluateRequiredModulesGate({
    role: { requirements: { hard_gates: [] } },
    candidate: { candidate_id: "c" },
    requiredModuleStatuses: [
      { module_id: "motivation", required_for_match: true, completed: false },
      { module_id: "comm_problem_solving", required_for_match: true, completed: false },
    ],
  });
  assert.equal(closed.passed, false);

  // After: CORE complete → gate opens; optional unlockables don't block it.
  const open = evaluateRequiredModulesGate({
    role: { requirements: { hard_gates: [] } },
    candidate: { candidate_id: "c" },
    requiredModuleStatuses: [
      { module_id: "motivation", required_for_match: true, completed: true },
      { module_id: "comm_problem_solving", required_for_match: true, completed: true },
      { module_id: "logical_reasoning", required_for_match: false, completed: false },
    ],
  });
  assert.equal(open.passed, true);
});

// ---------------------------------------------------------------------------
// Item banks grade end-to-end; the classic puzzles are present and correct.
// ---------------------------------------------------------------------------

test("seed item banks grade through the deterministic engine", () => {
  const bank = getItemBank("logical_reasoning");
  assert.ok(bank.length > 0);
  const responses = bank.map((entry) => {
    const key = entry.key.correct;
    const answer = key.type === "single_choice" ? key.option_id : key.type === "numeric_entry" ? key.value : null;
    return {
      item_id: entry.public.item_id,
      answer,
      issued_at: "2026-06-13T10:00:00.000Z",
      answered_at: "2026-06-13T10:00:10.000Z",
    };
  });
  const graded = gradeQuiz({ bank, responses });
  const scores = gradedItemsToCompetencyScores(graded);
  assert.equal(scores[0].competency_id, "logical_reasoning");
  assert.equal(scores[0].score, 100, "all correct answers score 100");
});

test("the CORE puzzle bank encodes the 9-ball (2) and 12-ball (3) answers distinctly", () => {
  const bank = getItemBank("comm_problem_solving");
  const nineBall = bank.find((e) => e.public.item_id === "puzzle_9_ball_known_heavier");
  const twelveBall = bank.find((e) => e.public.item_id === "puzzle_12_ball_unknown");
  assert.equal(nineBall.key.correct.value, 2);
  assert.equal(twelveBall.key.correct.value, 3);
  assert.ok(twelveBall.public.difficulty > nineBall.public.difficulty, "12-ball tagged harder");
});

// ---------------------------------------------------------------------------
// Mixed module combiner + descriptive work-style (no quality score)
// ---------------------------------------------------------------------------

test("the combiner merges a mixed module's parts into one result", () => {
  const deterministic = buildModuleScoreResult({
    module_id: "comm_problem_solving",
    scorer_type: "deterministic",
    scorer_version: "v1",
    competency_scores: [
      { competency_id: "logical_puzzles", score: 80, confidence: 0.7, evidence: [], reason: "", needs_human_review: false },
    ],
    used_fallback: false,
  });
  const behavioral = buildModuleScoreResult({
    module_id: "comm_problem_solving",
    scorer_type: "behavioral",
    scorer_version: "v1",
    competency_scores: [
      { competency_id: "communication_clarity", score: 70, confidence: 0.8, evidence: [], reason: "", needs_human_review: false },
    ],
    used_fallback: false,
  });
  const combined = combineModuleResults({
    module_id: "comm_problem_solving",
    scorer_type: "behavioral",
    scorer_version: "comm-mixed-v1",
    parts: [deterministic, behavioral],
  });
  assert.equal(combined.competency_scores.length, 2);
  assert.ok(combined.module_score > 0 && combined.module_score <= 100);
});

test("work-style preferences produce a descriptive profile, never a quality score", () => {
  const profile = summarizeWorkStylePreferences([
    { dimension: "autonomy_vs_collaboration", choice: "a", chosen_label: "I prefer deciding independently" },
    { dimension: "autonomy_vs_collaboration", choice: "b", chosen_label: "I check with the team first" },
    { dimension: "structure_vs_ambiguity", choice: "b", chosen_label: "I thrive with open-ended problems" },
  ]);
  assert.equal(profile.descriptive_only, true);
  assert.equal(profile.needs_human_review, true);
  assert.ok(!("score" in profile), "no quality score is emitted");
  const autonomy = profile.leans.find((l) => l.dimension === "autonomy_vs_collaboration");
  assert.equal(autonomy.lean, 0, "one each way -> balanced");
  assert.match(profile.note, /never a trait score and never decides a match/);
});
