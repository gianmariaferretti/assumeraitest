import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

test("evaluator runs persist arc_stage and scoring_mode (migration + record)", () => {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.includes("evaluator_runs_arc_stage"),
  );
  assert.ok(migrationName, "expected the arc-stage migration");
  const migration = readFileSync(path.join(migrationsDir, migrationName), "utf8");

  assert.match(migration, /alter table public\.interview_evaluator_runs/);
  assert.match(migration, /add column if not exists arc_stage text/);
  assert.match(
    migration,
    /add column if not exists scoring_mode text not null default 'full'/,
  );
  assert.match(migration, /scoring_mode in \('baseline_only', 'low_weight', 'full'\)/);

  const conductTurnSource = read("src", "features", "interview-flow", "conduct-turn.ts");
  assert.match(conductTurnSource, /arc_stage: input\.arcStage \?\? null/);
  assert.match(conductTurnSource, /scoring_mode: input\.scoringMode \?\? "full"/);

  const serverTurnSource = read("src", "features", "interview-flow", "server-turn.ts");
  assert.match(serverTurnSource, /arcStage: question\.arcStage/);
  assert.match(serverTurnSource, /scoringMode: question\.scoringMode/);
});

test("the LLM planner is instructed on platform neutrality and canonical arc items", () => {
  const plannerSource = read(
    "src",
    "features",
    "interview-flow",
    "claude-resume-question-planner.ts",
  );

  assert.match(plannerSource, /PLATFORM NEUTRALITY/);
  assert.match(plannerSource, /never an employer/);
  assert.match(plannerSource, /REALISTIC ARC/);
  assert.match(plannerSource, /canonical_/);
  assert.match(plannerSource, /lightly personalize/);
});

test("the deterministic fallback planner never rewrites canonical arc items", () => {
  const fallbackSource = read(
    "src",
    "features",
    "interview-flow",
    "resume-question-planner.ts",
  );

  assert.match(fallbackSource, /isCanonicalQuestionId\(question\.id\)/);
});

test("the docs explain the arc rationale and the platform-interview principle", () => {
  const docs = read("docs", "interview-engine.md");

  assert.match(docs, /one interview, many matches/i);
  assert.match(docs, /neutral AssumerAI career interviewer/);
  assert.match(docs, /procedural justice/);
  assert.match(docs, /warm-up reduces anxiety/i);
  assert.match(docs, /STAR on-ramps/);
  assert.match(docs, /baseline_only/);
  assert.match(docs, /matching\s*\n?\s*engine AFTER the interview/i);
});
