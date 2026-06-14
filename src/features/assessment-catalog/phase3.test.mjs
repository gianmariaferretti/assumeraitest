import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const { ASSESSMENT_CATALOG, activeModules, defaultModulePlan, coreModuleIds } = loadFromRepoRoot(
  "src/features/assessment-catalog/catalog.ts",
);
const { getItemBank } = loadFromRepoRoot("src/features/assessment-catalog/item-banks.ts");
const { buildRoleKnowledgeBank, ROLE_KNOWLEDGE_DOMAINS } = loadFromRepoRoot(
  "src/features/assessment-catalog/role-knowledge-template.ts",
);
const { runIdentityCheck } = loadFromRepoRoot("src/features/assessment-catalog/identity-check.ts");
const { competencyForModule } = loadFromRepoRoot(
  "src/features/interview-flow/module-competencies.ts",
);
const { gradeQuiz, gradedItemsToCompetencyScores } = loadFromRepoRoot(
  "src/features/scoring/quiz-engine/grader.ts",
);

// ---------------------------------------------------------------------------
// All 22 modules now active
// ---------------------------------------------------------------------------

test("every catalog module is active (Phases 1–3 all shipped)", () => {
  assert.equal(activeModules().length, 22);
  assert.ok(ASSESSMENT_CATALOG.every((m) => m.status === "active"));
});

test("the Phase 3 modules are present and active", () => {
  const phase3 = ["cloud_devops", "cybersecurity", "software_proficiency", "verbal_reasoning", "leadership", "role_knowledge", "identity_check"];
  for (const id of phase3) {
    const definition = ASSESSMENT_CATALOG.find((m) => m.module_id === id);
    assert.ok(definition, `${id} present`);
    assert.equal(definition.status, "active", `${id} active`);
  }
});

// ---------------------------------------------------------------------------
// New Phase 3 item banks grade through the deterministic engine
// ---------------------------------------------------------------------------

for (const [moduleId, competency] of [
  ["cloud_devops", "infra_troubleshooting"],
  ["cybersecurity", "vulnerability_recognition"],
  ["verbal_reasoning", "verbal_reasoning"],
  ["role_knowledge", "role_knowledge"],
]) {
  test(`${moduleId} bank grades all-correct answers to 100`, () => {
    const bank = getItemBank(moduleId);
    assert.ok(bank.length > 0, `${moduleId} has a bank`);
    const responses = bank.map((entry) => ({
      item_id: entry.public.item_id,
      answer:
        entry.key.correct.type === "single_choice"
          ? entry.key.correct.option_id
          : entry.key.correct.value,
      issued_at: "2026-06-13T10:00:00.000Z",
      answered_at: "2026-06-13T10:00:05.000Z",
    }));
    const scores = gradedItemsToCompetencyScores(gradeQuiz({ bank, responses }));
    const target = scores.find((s) => s.competency_id === competency);
    assert.ok(target, `${moduleId} rolls up to ${competency}`);
    assert.equal(target.score, 100);
  });
}

// ---------------------------------------------------------------------------
// Role-knowledge template: one architecture, many domains
// ---------------------------------------------------------------------------

test("the role-knowledge template builds a gradeable bank per domain", () => {
  assert.ok(ROLE_KNOWLEDGE_DOMAINS.length >= 2, "seed domains present");
  for (const domain of ROLE_KNOWLEDGE_DOMAINS) {
    const bank = buildRoleKnowledgeBank(domain);
    assert.ok(bank.length === domain.items.length);
    // Item ids are namespaced by domain so banks never collide.
    assert.ok(bank.every((entry) => entry.public.item_id.startsWith(`${domain.domain_id}_`)));
    assert.ok(bank.every((entry) => entry.public.competency_tag === "role_knowledge"));
  }
});

// ---------------------------------------------------------------------------
// Leadership behavioral competency (module 20)
// ---------------------------------------------------------------------------

test("leadership resolves to its own BARS competency, senior-only in the journey", () => {
  const competency = competencyForModule("leadership");
  assert.equal(competency.id, "leadership_management");
  assert.equal(competency.tier, 3);
  assert.match(competency.description, /[Dd]elegat/);

  // Senior-only gating: leadership is absent for non-senior journeys, present for senior.
  const juniorPlan = defaultModulePlan({ seniority: "junior" });
  const seniorPlan = defaultModulePlan({ seniority: "senior" });
  assert.ok(!juniorPlan.some((m) => m.module_id === "leadership"), "absent for junior");
  assert.ok(seniorPlan.some((m) => m.module_id === "leadership"), "present for senior");
});

test("non-senior modules still unlock_after the CORE regardless of seniority", () => {
  const plan = defaultModulePlan({ seniority: "senior" });
  const core = coreModuleIds();
  const cyber = plan.find((m) => m.module_id === "cybersecurity");
  assert.ok(cyber);
  assert.deepEqual(cyber.unlocks_after, core);
  // Cloud/DevOps is auto-triggered by infra CV skills.
  const cloud = plan.find((m) => m.module_id === "cloud_devops");
  assert.equal(cloud.level, "auto_trigger");
  assert.ok(cloud.auto_trigger_keywords.includes("kubernetes"));
});

// ---------------------------------------------------------------------------
// Identity / honesty check (module 22): flag-only, never auto-reject
// ---------------------------------------------------------------------------

test("a clean identity check confirms without flags and never auto-rejects", () => {
  const result = runIdentityCheck({
    consent_given: true,
    presence_confirmed: true,
    declared_identity_reaffirmed: true,
  });
  assert.equal(result.verdict, "confirmed");
  assert.equal(result.needs_human_review, false);
  assert.equal(result.auto_reject, false);
  assert.equal(result.descriptive_only, true);
});

test("a missing identity signal flags for human review — NEVER an automated rejection", () => {
  const result = runIdentityCheck({
    consent_given: true,
    presence_confirmed: false,
    declared_identity_reaffirmed: true,
  });
  assert.equal(result.verdict, "needs_human_review");
  assert.equal(result.needs_human_review, true);
  assert.equal(result.auto_reject, false, "flag for review, never auto-reject");
  assert.match(result.reasons.join(" "), /Presence confirmation/);
  // No sensitive identity fields are present on the result.
  assert.ok(!("document_number" in result));
  assert.ok(!("biometric" in result));
});
