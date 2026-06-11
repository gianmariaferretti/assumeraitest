import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

function readMigration(namePart) {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) => name.includes(namePart));
  assert.ok(migrationName, `expected migration including ${namePart}`);
  return readFileSync(path.join(migrationsDir, migrationName), "utf8");
}

// ---------------------------------------------------------------------------
// Profiles table: service-role write, candidate reads own — never company-readable
// ---------------------------------------------------------------------------

test("driver_profiles is RLS-locked: owner select only, no client writes", () => {
  const migration = readMigration("driver_profiles");

  assert.match(migration, /create table if not exists public\.driver_profiles/);
  assert.match(migration, /unique \(user_id, interview_session_id\)/);
  assert.match(migration, /alter table public\.driver_profiles enable row level security/);
  assert.match(
    migration,
    /driver_profiles_owner_select[\s\S]*?for select using \(\(select auth\.uid\(\)\) = user_id\)/,
  );
  assert.match(
    migration,
    /revoke all privileges on table public\.driver_profiles from anon, authenticated/,
  );
  assert.match(migration, /grant select on table public\.driver_profiles to authenticated/);
  // No insert/update/delete policy or grant: writes go through the service role.
  assert.doesNotMatch(migration, /driver_profiles[\s\S]*?for (insert|update|delete)/);
  assert.doesNotMatch(migration, /grant (insert|update|delete|all)[^;]*driver_profiles/);
  // The flag-only contract is documented at the schema level too.
  assert.match(migration, /FLAG-ONLY/);
  assert.match(migration, /never a score/);
});

// ---------------------------------------------------------------------------
// Interview items: trade-off + revealed-preference STAR, 5 languages, neutral
// ---------------------------------------------------------------------------

test("both driver items exist in five languages, descriptive and employer-neutral", () => {
  const { jobDriverEntries, CANONICAL_LANGUAGES } = loadFromRepoRoot(
    "src/features/interview-flow/canonical-questions.ts",
  );
  const { containsEmployerPresupposingText, containsEmployerVoice } = loadFromRepoRoot(
    "src/features/interview-flow/platform-neutrality.ts",
  );

  const entries = jobDriverEntries();
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["canonical_drivers_tradeoff", "canonical_drivers_star"],
  );

  for (const entry of entries) {
    assert.equal(entry.scoringMode, "baseline_only", `${entry.id} never enters BARS scores`);
    assert.equal(entry.stage, "motivation");
    for (const language of CANONICAL_LANGUAGES) {
      const prompt = entry.prompts[language];
      assert.ok(prompt, `${entry.id} has a ${language} prompt`);
      assert.equal(containsEmployerPresupposingText(prompt), false, `${entry.id} (${language})`);
      assert.equal(containsEmployerVoice(prompt), false, `${entry.id} (${language})`);
    }
  }

  // The trade-off item says "no right answer" in every language.
  const tradeoff = entries[0];
  const noRightAnswer = {
    en: /no right answer/i,
    it: /risposta giusta/i,
    fr: /bonne réponse/i,
    de: /keine richtige Antwort/i,
    es: /respuesta correcta/i,
  };
  for (const language of CANONICAL_LANGUAGES) {
    assert.match(tradeoff.prompts[language], noRightAnswer[language], `tradeoff (${language})`);
  }

  // The STAR item asks for a REAL past fork (revealed preference), in every language.
  const star = entries[1];
  const realChoice = {
    en: /real fork.*actually choose|actually choose/i,
    it: /bivio reale/i,
    fr: /vrai croisement/i,
    de: /echten Weggabelung/i,
    es: /bifurcación real/i,
  };
  for (const language of CANONICAL_LANGUAGES) {
    assert.match(star.prompts[language], realChoice[language], `star (${language})`);
  }
});

test("the interview arc always includes both driver items in the motivation block", () => {
  const { buildInterviewArcQuestions, validateArcOrder } = loadFromRepoRoot(
    "src/features/interview-flow/interview-arc.ts",
  );

  for (const seniority of ["junior", "senior"]) {
    const questions = buildInterviewArcQuestions({
      moduleQuestions: [],
      roleFamily: "engineering",
      seniority,
      language: "it",
    });
    const ids = questions.map((question) => question.id);
    const tradeoffIndex = ids.indexOf("canonical_drivers_tradeoff");
    const starIndex = ids.indexOf("canonical_drivers_star");
    const selfAwarenessIndex = ids.indexOf("canonical_self_awareness");

    assert.ok(tradeoffIndex >= 0, `${seniority}: trade-off item present`);
    assert.ok(starIndex >= 0, `${seniority}: revealed-preference STAR present`);
    assert.ok(
      tradeoffIndex < selfAwarenessIndex && starIndex < selfAwarenessIndex,
      "driver items sit in the motivation block, before self-awareness",
    );
    assert.equal(
      ids.filter((id) => id.startsWith("canonical_drivers_")).length,
      2,
      `${seniority}: exactly once each (no stage-substitution duplicates)`,
    );
    assert.deepEqual(validateArcOrder(questions), [], "arc order stays valid");
  }
});

// ---------------------------------------------------------------------------
// Wiring: turn route extracts, wizard declares, insights stay flag-only
// ---------------------------------------------------------------------------

test("the turn route extracts driver signals without ever blocking the turn", () => {
  const turnRouteSource = read("src", "app", "candidate", "interview", "turn", "route.ts");

  assert.match(turnRouteSource, /isDriversQuestionId\(result\.answeredQuestion\.id\)/);
  assert.match(turnRouteSource, /await evaluateJobDrivers\(/);
  assert.match(turnRouteSource, /mergeDriverProfiles\(/);
  assert.match(turnRouteSource, /store\.saveDriverProfile\(/);
  // Failures are logged, never thrown into the candidate's interview.
  assert.match(turnRouteSource, /logWarn\("driver_evaluation_failed"/);

  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "server-interview-store.ts",
  );
  assert.match(storeSource, /from\("driver_profiles"\)/);
});

test("companies declare the work-context reality in the wizard and it reaches the engine", () => {
  const wizardSource = read("src", "components", "company", "CompanyRoleWizard.tsx");
  assert.match(wizardSource, /driver_context\.\$\{driver\}\.level/);
  assert.match(wizardSource, /driver_context\.\$\{driver\}\.note/);
  assert.match(wizardSource, /never carries or influences a score/);
  assert.match(wizardSource, /hard-coded anti-proxy guardrail/);

  for (const route of [
    ["src", "app", "company", "roles", "create", "route.ts"],
    ["src", "app", "company", "roles", "[roleId]", "update", "route.ts"],
  ]) {
    const source = read(...route);
    assert.match(source, /readDriverContextFromFormData\(formData\)/, route.join("/"));
    assert.match(source, /driver_context: driverContext/, route.join("/"));
  }

  const workspaceSource = read(
    "src",
    "features",
    "company-workspace",
    "company-workspace.ts",
  );
  assert.match(workspaceSource, /readRoleDriverContext\(calibration\.driver_context\)/);
  assert.match(workspaceSource, /from\("driver_profiles"\)/);
  assert.match(workspaceSource, /driverInsights: match\.driver_insights \?\? null/);
});

// ---------------------------------------------------------------------------
// Flag-only default: drivers have NO scored dimension and NO weight anywhere
// ---------------------------------------------------------------------------

test("driver signals have no matching dimension, no weight, and cannot move match_score", () => {
  const { MATCH_DIMENSIONS, DEFAULT_MATCH_WEIGHTS } = loadFromRepoRoot(
    "src/features/matching/weights.ts",
  );
  assert.ok(
    !MATCH_DIMENSIONS.some((name) => /driver|lifestyle/i.test(name)),
    "no driver dimension in MATCH_DIMENSIONS",
  );
  assert.ok(
    !Object.keys(DEFAULT_MATCH_WEIGHTS).some((name) => /driver|lifestyle/i.test(name)),
    "no driver weight in the default weight set",
  );

  const weightsSource = read("src", "features", "matching", "weights.ts");
  assert.doesNotMatch(weightsSource, /driver/i, "weights.ts never mentions drivers");

  // The engine computes driver insights AFTER match_score, from a flag-only module.
  const engineSource = read("src", "features", "matching", "engine.ts");
  assert.match(engineSource, /buildDriverInsights\(/);
  assert.match(engineSource, /Computed AFTER match_score/);

  const insightsSource = read("src", "features", "scoring", "job-drivers", "insights.ts");
  assert.match(insightsSource, /flag_only: true/);
  assert.match(insightsSource, /FLAG_ONLY_NEVER_COMPARED\.includes\(entry\.driver\)/);
  assert.match(insightsSource, /continue;/);
});

test("a match scored with a full driver profile + context has the same score as without", () => {
  const { createCompanyMatch } = loadFromRepoRoot("src/features/matching/matching-engine.ts");

  const candidate = {
    candidate_id: "cand_drivers",
    education: [],
    experience: [],
    skills: [{ name: "TypeScript" }],
    languages: [],
    preferences: { target_roles: ["Engineer"], locations: ["Remote"], work_modes: ["remote"] },
  };
  const baseRole = {
    role_id: "role_drivers",
    company_id: "co_drivers",
    title: "Engineer",
    requirements: { required_skills: ["TypeScript"], nice_to_have_skills: [], hard_gates: [] },
    calibration: { version: "test" },
  };
  const driverProfile = {
    version: "driver-profile-v1",
    signals: [
      { driver: "autonomy_independence", strength: 95, confidence: 0.9, evidence: ["q"] },
      { driver: "lifestyle_balance", strength: 95, confidence: 0.9, evidence: ["q"] },
    ],
    generatedAt: "2026-06-11T00:00:00.000Z",
    source: "anthropic",
  };
  const driverContext = {
    version: "driver-context-v1",
    entries: [
      { driver: "autonomy_independence", level: 5, note: "strict process" },
      { driver: "lifestyle_balance", level: 5, note: "constant travel" },
    ],
  };

  const generatedAt = "2026-06-11T12:00:00.000Z";
  const without = createCompanyMatch({ candidate, role: baseRole, generatedAt });
  const withDrivers = createCompanyMatch({
    candidate,
    role: { ...baseRole, calibration: { ...baseRole.calibration, driver_context: driverContext } },
    driverProfile,
    generatedAt,
  });

  // Maximal mismatch on every declared driver — and the score must not move.
  assert.equal(withDrivers.match_score, without.match_score);
  assert.equal(withDrivers.match_confidence, without.match_confidence);
  assert.equal(withDrivers.driver_insights.flag_only, true);
  assert.ok(withDrivers.driver_insights.flags.length >= 1, "autonomy mismatch is flagged");
  assert.ok(
    !withDrivers.driver_insights.flags.some((flag) => flag.includes("lifestyle")),
    "lifestyle mismatch is NOT flagged (hard-coded)",
  );
  assert.equal(without.driver_insights, undefined, "no context -> no insights key");
});

test("the adverse impact monitor watches the lifestyle driver flag cohort", () => {
  const monitorSource = read("src", "features", "audit", "adverse-impact-monitor.ts");
  assert.match(monitorSource, /"lifestyle_driver_flag"/);
});
