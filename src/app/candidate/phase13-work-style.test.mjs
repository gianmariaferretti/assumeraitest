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

function walk(dir, extensions) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full, extensions);
    return extensions.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

// ---------------------------------------------------------------------------
// Profiles table: service-role write, candidate reads own — never company-readable
// ---------------------------------------------------------------------------

test("work_style_profiles is RLS-locked: owner select only, no client writes", () => {
  const migration = readMigration("work_style_profiles");

  assert.match(migration, /create table if not exists public\.work_style_profiles/);
  assert.match(migration, /unique \(user_id, interview_session_id\)/);
  assert.match(migration, /alter table public\.work_style_profiles enable row level security/);
  assert.match(
    migration,
    /work_style_profiles_owner_select[\s\S]*?for select using \(\(select auth\.uid\(\)\) = user_id\)/,
  );
  assert.match(
    migration,
    /revoke all privileges on table public\.work_style_profiles from anon, authenticated/,
  );
  assert.match(migration, /grant select on table public\.work_style_profiles to authenticated/);
  // No insert/update/delete policy or grant: writes go through the service role.
  assert.doesNotMatch(migration, /work_style_profiles[\s\S]*?for (insert|update|delete)/);
  assert.doesNotMatch(migration, /grant (insert|update|delete|all)[^;]*work_style_profiles/);
});

test("match-weights-v1 seeds ValuesAlignmentFit at a low weight and becomes the active set", () => {
  const migration = readMigration("work_style_profiles");

  assert.match(migration, /'match-weights-v1'/);
  assert.match(migration, /"ValuesAlignmentFit": 0\.05/);
  assert.match(migration, /set active = false where version = 'match-weights-v0'/);
  assert.match(migration, /set active = true where version = 'match-weights-v1'/);
});

// ---------------------------------------------------------------------------
// SJT dilemmas: descriptive, 5 languages, employer-neutral, always in the arc
// ---------------------------------------------------------------------------

test("both work-style dilemmas say 'no right answer' in all five languages and stay employer-neutral", () => {
  const { workStyleEntries, CANONICAL_LANGUAGES } = loadFromRepoRoot(
    "src/features/interview-flow/canonical-questions.ts",
  );
  const { containsEmployerPresupposingText, containsEmployerVoice } = loadFromRepoRoot(
    "src/features/interview-flow/platform-neutrality.ts",
  );

  const entries = workStyleEntries();
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["canonical_workstyle_autonomy_speed", "canonical_workstyle_collaboration_structure"],
  );

  const noRightAnswer = {
    en: /no right answer/i,
    it: /risposta giusta/i,
    fr: /bonne réponse/i,
    de: /keine richtige Antwort/i,
    es: /respuesta correcta/i,
  };

  for (const entry of entries) {
    assert.equal(entry.scoringMode, "baseline_only", `${entry.id} never enters BARS scores`);
    assert.equal(entry.stage, "situational");
    for (const language of CANONICAL_LANGUAGES) {
      const prompt = entry.prompts[language];
      assert.ok(prompt, `${entry.id} has a ${language} prompt`);
      assert.match(prompt, noRightAnswer[language], `${entry.id} (${language})`);
      assert.equal(containsEmployerPresupposingText(prompt), false, `${entry.id} (${language})`);
      assert.equal(containsEmployerVoice(prompt), false, `${entry.id} (${language})`);
    }
  }
});

test("the interview arc always includes the work-style dilemmas before closing", () => {
  const { buildInterviewArcQuestions } = loadFromRepoRoot(
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
    const autonomyIndex = ids.indexOf("canonical_workstyle_autonomy_speed");
    const structureIndex = ids.indexOf("canonical_workstyle_collaboration_structure");
    const closingIndex = ids.findIndex((id) => id.startsWith("canonical_closing"));

    assert.ok(autonomyIndex >= 0, `${seniority}: autonomy dilemma present`);
    assert.ok(structureIndex >= 0, `${seniority}: structure dilemma present`);
    assert.ok(autonomyIndex < closingIndex && structureIndex < closingIndex, "before closing");
    assert.equal(
      ids.filter((id) => id.startsWith("canonical_workstyle_")).length,
      2,
      `${seniority}: exactly once each (no stage-substitution duplicates)`,
    );
  }
});

// ---------------------------------------------------------------------------
// Wiring: turn route classifies, role wizard declares, monitor watches
// ---------------------------------------------------------------------------

test("the turn route classifies work-style answers without ever blocking the turn", () => {
  const turnRouteSource = read("src", "app", "candidate", "interview", "turn", "route.ts");

  assert.match(turnRouteSource, /isWorkStyleQuestionId\(result\.answeredQuestion\.id\)/);
  assert.match(turnRouteSource, /await evaluateWorkStyle\(/);
  assert.match(turnRouteSource, /mergeWorkStyleProfiles\(/);
  assert.match(turnRouteSource, /store\.saveWorkStyleProfile\(/);
  // Failures are logged, never thrown into the candidate's interview.
  assert.match(turnRouteSource, /logWarn\("work_style_evaluation_failed"/);

  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "server-interview-store.ts",
  );
  assert.match(storeSource, /from\("work_style_profiles"\)/);
  assert.match(storeSource, /onConflict: "user_id,interview_session_id"/);
});

test("companies declare their key in the role wizard and it reaches the matching engine", () => {
  const wizardSource = read("src", "components", "company", "CompanyRoleWizard.tsx");
  assert.match(wizardSource, /work_style\.\$\{dimension\}\.position/);
  assert.match(wizardSource, /work_style\.\$\{dimension\}\.statement/);
  assert.match(wizardSource, /Neither pole is\s+better/);
  assert.match(wizardSource, /never a personality judgment/);

  for (const route of [
    ["src", "app", "company", "roles", "create", "route.ts"],
    ["src", "app", "company", "roles", "[roleId]", "update", "route.ts"],
  ]) {
    const source = read(...route);
    assert.match(source, /readWorkStyleKeyFromFormData\(formData\)/, route.join("/"));
    assert.match(source, /work_style_key: workStyleKey/, route.join("/"));
  }

  const workspaceSource = read(
    "src",
    "features",
    "company-workspace",
    "company-workspace.ts",
  );
  assert.match(workspaceSource, /readWorkStyleKey\(calibration\.work_style_key\)/);
  assert.match(workspaceSource, /from\("work_style_profiles"\)/);
  assert.match(workspaceSource, /workStyleProfile/);

  const weightsSource = read("src", "features", "matching", "weights.ts");
  assert.match(weightsSource, /"ValuesAlignmentFit"/);
  assert.match(weightsSource, /match-weights-v1/);
});

test("the adverse impact monitor watches the values-alignment contribution", () => {
  const monitorSource = read("src", "features", "audit", "adverse-impact-monitor.ts");
  assert.match(monitorSource, /"values_alignment_band"/);
});

// ---------------------------------------------------------------------------
// Vocabulary lint: the scorecard label is "values alignment on declared
// work-style dimensions" — the legacy two-word phrase is banned repo-wide.
// ---------------------------------------------------------------------------

test("the banned legacy phrase appears nowhere in the repo", () => {
  // Built dynamically so this test file itself stays clean.
  const banned = new RegExp("cultural" + "[\\s_-]*" + "fit", "i");
  const files = [
    ...walk(path.join(rootDir, "src"), [".ts", ".tsx", ".mjs", ".json", ".md"]),
    ...walk(path.join(rootDir, "supabase"), [".sql"]),
    ...walk(path.join(rootDir, "docs"), [".md"]),
  ];
  assert.ok(files.length > 100, "the lint walks the real tree");
  for (const file of files) {
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      banned,
      `${path.relative(rootDir, file)} uses the banned phrase`,
    );
  }
});
