import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

function readMigration(namePart) {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) => name.includes(namePart));
  assert.ok(migrationName, `expected migration including ${namePart}`);
  return readFileSync(path.join(migrationsDir, migrationName), "utf8");
}

function walkSources(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkSources(full));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

test("integrity_signals is service-role write with owner-only reads", () => {
  const migration = readMigration("integrity_signals");

  assert.match(migration, /create table if not exists public\.integrity_signals/);
  assert.match(migration, /unique \(user_id, interview_session_id, turn_id\)/);
  assert.match(migration, /alter table public\.integrity_signals enable row level security/);
  assert.match(
    migration,
    /create policy integrity_signals_owner_select on public\.integrity_signals/,
  );
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/);
  // Candidates can read their own rows and nothing else; no write policies.
  assert.match(
    migration,
    /revoke all privileges on table public\.integrity_signals from anon, authenticated/,
  );
  assert.match(migration, /grant select on table public\.integrity_signals to authenticated/);
  assert.doesNotMatch(migration, /for (insert|update|delete)/);
});

test("the client collects only honest signals — no keystrokes, no camera analysis", () => {
  const clientSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "interview-session-client.tsx",
  );

  assert.match(clientSource, /visibilitychange/);
  assert.match(clientSource, /addEventListener\("blur"/);
  assert.match(clientSource, /addEventListener\("paste"/);
  assert.match(clientSource, /AUDIO_GAP_THRESHOLD_SECONDS/);
  assert.match(clientSource, /integritySignals: \{ \.\.\.integritySignalsRef\.current \}/);
  // Signals reset when a new server turn is issued.
  assert.match(clientSource, /emptyTurnIntegritySignals\(\)/);

  // Forbidden surveillance surfaces (safety.ts philosophy): no keystroke
  // listeners, no face/emotion analysis APIs.
  assert.doesNotMatch(clientSource, /keydown|keypress|keyup/);
  assert.doesNotMatch(clientSource, /new FaceDetector|faceLandmark|detectEmotion|EmotionDetector/);
});

test("signals travel with the turn and persist server-side after evaluation", () => {
  const routeSource = read("src", "app", "candidate", "interview", "turn", "route.ts");
  const serverTurnSource = read("src", "features", "interview-flow", "server-turn.ts");
  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "server-interview-store.ts",
  );

  assert.match(routeSource, /integritySignals: parsed\.value\.integritySignals/);
  assert.match(routeSource, /recordIntegritySignals/);
  assert.match(serverTurnSource, /parseTurnIntegritySignals/);
  assert.match(serverTurnSource, /accumulateIntegritySummary/);
  // The summary folds in strictly after the evaluator ran.
  assert.ok(
    serverTurnSource.indexOf("await conductTurn(") <
      serverTurnSource.indexOf("accumulateIntegritySummary(moduleForIntegrity"),
    "integrity accumulation must happen after scoring",
  );
  assert.match(storeSource, /from\("integrity_signals"\)\.upsert/);
});

test("nothing under scoring/ can see integrity data", () => {
  const scoringDir = path.join(rootDir, "src", "features", "scoring");
  for (const file of walkSources(scoringDir)) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /integrity/i,
      `${path.relative(rootDir, file)} must not reference integrity data`,
    );
  }

  const aggregationSource = read("src", "features", "scoring", "aggregation.ts");
  assert.ok(aggregationSource.length > 0);
});

test("the company review page surfaces summaries read-only with neutral wording", () => {
  const pageSource = read("src", "app", "company", "review", "[matchId]", "page.tsx");
  const componentSource = read("src", "components", "company", "CompanyCandidateReview.tsx");
  const workspaceSource = read(
    "src",
    "features",
    "company-workspace",
    "company-workspace.ts",
  );
  const i18nSource = read("src", "lib", "i18n.tsx");

  assert.match(pageSource, /readIntegritySummariesForMatch/);
  assert.match(componentSource, /integritySummaries/);
  assert.match(componentSource, /copy\.integritySignals/);
  assert.match(componentSource, /copy\.integrityNeverScored/);
  // Consent gate: only consent-approved matches expose summaries.
  assert.match(workspaceSource, /consentApprovedStatuses/);
  assert.match(workspaceSource, /integritySummaryHighlights/);
  // Copy exists in all three languages and states the never-a-score rule.
  assert.match(i18nSource, /never used in score computation/);
  assert.match(i18nSource, /non vengono mai usati nel calcolo dei punteggi/);
  assert.match(i18nSource, /jamais utilises dans le calcul des scores/);
});

test("the never-a-penalty policy is documented in the interview engine docs", () => {
  const docs = read("docs", "interview-engine.md");

  assert.match(docs, /Integrity signals/i);
  assert.match(docs, /NEVER an\s*\n?input to any score computation/);
  assert.match(docs, /No\s*\n?keystroke logging, no camera analysis, no biometrics/);
  assert.match(docs, /never "score lower"/);
});
