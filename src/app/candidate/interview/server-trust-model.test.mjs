import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

function readMigration(namePart) {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) => name.includes(namePart));
  assert.ok(migrationName, `expected migration including ${namePart}`);
  return readFileSync(path.join(migrationsDir, migrationName), "utf8");
}

test("the interview turn route never reconstructs a session from the request body", () => {
  const routeSource = read("src", "app", "candidate", "interview", "turn", "route.ts");

  assert.doesNotMatch(routeSource, /resumeInterviewSession/);
  assert.doesNotMatch(routeSource, /payload\.session/);
  assert.doesNotMatch(routeSource, /plannedQuestionText/);
  assert.doesNotMatch(routeSource, /elapsedSecondsForTurn/);
  assert.match(routeSource, /parseServerTurnRequestBody/);
  assert.match(routeSource, /conductServerTurn/);
  assert.match(routeSource, /loadServerInterviewState/);
  assert.match(routeSource, /resolveServerInterviewStore/);
  assert.match(routeSource, /markTurnEvaluated/);
});

test("the module start route derives state server-side and rejects client session fields", () => {
  const routeSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "module",
    "[moduleId]",
    "start",
    "route.ts",
  );

  assert.doesNotMatch(routeSource, /resumeInterviewSession/);
  assert.doesNotMatch(routeSource, /body\.session/);
  assert.match(routeSource, /FORBIDDEN_CLIENT_STATE_FIELDS/);
  assert.match(routeSource, /client_state_rejected/);
  assert.match(routeSource, /loadServerInterviewState/);
  // Idempotent resume: a pending issued turn is returned unchanged after a disconnect.
  assert.match(routeSource, /resumablePendingTurn/);
});

test("the session snapshot route persists server-derived state, never the client's session", () => {
  const routeSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "session-snapshot",
    "route.ts",
  );

  assert.match(routeSource, /"session" in payload/);
  assert.match(routeSource, /client_state_rejected/);
  assert.match(routeSource, /loadServerInterviewState/);
  assert.match(routeSource, /session: state\.session/);
  assert.doesNotMatch(routeSource, /session:\s*payload\.session/);
});

test("the interview client only ever posts moduleId, turnId, and answerText", () => {
  const clientSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "interview-session-client.tsx",
  );

  assert.match(
    clientSource,
    /moduleId: activeTurn\.moduleId,\s*turnId: activeTurn\.turnId,\s*candidateAnswer: \{ answerText \}/,
  );
  assert.doesNotMatch(clientSource, /body: JSON\.stringify\(\{\s*session/);
  assert.doesNotMatch(clientSource, /createInterviewSession/);
  assert.doesNotMatch(clientSource, /recordInterviewResponse/);
  // Provider-session recovery (session-recovery.ts) still drives reconnects.
  assert.match(clientSource, /shouldRestoreLiveInterviewProviderSession/);
});

test("the interview page creates the server-authoritative session, not the client", () => {
  const pageSource = read("src", "app", "candidate", "interview", "page.tsx");

  assert.match(pageSource, /loadServerInterviewState/);
  assert.match(pageSource, /createServerInterviewSession/);
  assert.match(pageSource, /initialSession=\{serverSession\}/);
});

test("interview state tables are service-role write only with an anti-replay constraint", () => {
  const migration = readMigration("server_authoritative_interview_turns");

  assert.match(migration, /create table if not exists public\.candidate_interview_turns/);
  assert.match(migration, /unique \(user_id, interview_session_id, turn_id\)/);
  assert.match(
    migration,
    /drop policy if exists candidate_module_sessions_owner_insert on public\.candidate_module_sessions/,
  );
  assert.match(
    migration,
    /drop policy if exists candidate_module_sessions_owner_update on public\.candidate_module_sessions/,
  );
  assert.match(
    migration,
    /revoke insert, update, delete on table public\.candidate_module_sessions from anon, authenticated/,
  );
  assert.match(
    migration,
    /revoke all privileges on table public\.candidate_interview_turns from anon, authenticated/,
  );
  // Owner read access is preserved so candidates can resume their interview.
  assert.match(migration, /grant select on table public\.candidate_module_sessions to authenticated/);
  assert.match(migration, /grant select on table public\.candidate_interview_turns to authenticated/);
  // No write policies are created for candidates on the turns ledger.
  assert.doesNotMatch(migration, /candidate_interview_turns[\s\S]*for (insert|update)/);
});

test("evaluator runs stay service-role only and turn columns exist for timing", () => {
  const migration = readMigration("server_authoritative_interview_turns");
  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "server-interview-store.ts",
  );

  assert.match(migration, /add column if not exists active_turn_id text/);
  assert.match(migration, /add column if not exists turn_started_at timestamptz/);
  assert.match(migration, /add column if not exists turn_count integer not null default 0/);
  assert.match(storeSource, /createAdminClient/);
  assert.match(storeSource, /createInMemoryServerInterviewStore/);
});
