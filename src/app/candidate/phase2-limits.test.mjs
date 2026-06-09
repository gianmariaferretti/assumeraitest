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

test("the interview turn route rate-limits per user and per IP with Retry-After", () => {
  const routeSource = read("src", "app", "candidate", "interview", "turn", "route.ts");

  assert.match(routeSource, /enforceRateLimit/);
  assert.match(routeSource, /RATE_LIMIT_TURN_PER_MINUTE/);
  assert.match(routeSource, /windowSeconds: 60/);
  assert.match(routeSource, /user:\$\{candidateContext\.candidateId\}/);
  assert.match(routeSource, /clientIpFromHeaders\(request\.headers\)/);
  assert.match(routeSource, /"Retry-After"/);
  assert.match(routeSource, /status: 429/);
});

test("the interview turn route caps the JSON body at 32KB", () => {
  const routeSource = read("src", "app", "candidate", "interview", "turn", "route.ts");

  assert.match(routeSource, /TURN_MAX_BODY_BYTES = 32 \* 1024/);
  assert.match(routeSource, /request\.text\(\)/);
  assert.match(routeSource, /413/);
  assert.match(routeSource, /payload_too_large/);
});

test("the interview turn route returns a controlled 503 when the LLM budget is spent", () => {
  const routeSource = read("src", "app", "candidate", "interview", "turn", "route.ts");

  assert.match(routeSource, /checkLlmBudget/);
  assert.match(routeSource, /llm_budget_exhausted/);
  assert.match(routeSource, /status: 503/);
  assert.match(routeSource, /secondsUntilUtcMidnight/);
  // The budget gate runs before any state is loaded or any provider is called.
  assert.ok(
    routeSource.indexOf("await checkLlmBudget(") <
      routeSource.indexOf("await loadServerInterviewState("),
    "budget check must precede the turn orchestration",
  );
});

test("the resume upload route rate-limits and budget-gates the Anthropic parser", () => {
  const routeSource = read("src", "app", "candidate", "resume", "upload", "route.ts");

  assert.match(routeSource, /enforceRateLimit/);
  assert.match(routeSource, /RATE_LIMIT_RESUME_UPLOAD_PER_HOUR/);
  assert.match(routeSource, /windowSeconds: 3600/);
  assert.match(routeSource, /"Retry-After"/);
  assert.match(routeSource, /checkLlmBudget/);
  assert.match(routeSource, /llm_budget_exhausted/);
  // The local deterministic parser is never budget-gated.
  assert.match(routeSource, /wouldUseAnthropicParser/);
  assert.match(routeSource, /shouldForceLocalResumeParserForCandidateUpload/);
});

test("the deepgram token route rate-limits per user and per IP", () => {
  const routeSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "deepgram-token",
    "route.ts",
  );

  assert.match(routeSource, /enforceRateLimit/);
  assert.match(routeSource, /RATE_LIMIT_DEEPGRAM_TOKEN_PER_HOUR/);
  assert.match(routeSource, /windowSeconds: 3600/);
  assert.match(routeSource, /"Retry-After"/);
  assert.match(routeSource, /status: 429/);
});

test("rate limit and LLM usage tables are service-role only", () => {
  const migration = readMigration("rate_limit_and_llm_budget");

  assert.match(migration, /create table if not exists public\.rate_limit_events/);
  assert.match(migration, /create table if not exists public\.llm_usage_daily/);
  assert.match(migration, /alter table public\.rate_limit_events enable row level security/);
  assert.match(migration, /alter table public\.llm_usage_daily enable row level security/);
  assert.match(
    migration,
    /revoke all privileges on table public\.rate_limit_events from anon, authenticated/,
  );
  assert.match(
    migration,
    /revoke all privileges on table public\.llm_usage_daily from anon, authenticated/,
  );
  // No candidate-facing policies exist on either table.
  assert.doesNotMatch(migration, /create policy[^;]*rate_limit_events/);
  assert.doesNotMatch(migration, /create policy[^;]*llm_usage_daily/);
  assert.match(migration, /create or replace function public\.record_llm_usage/);
  assert.match(
    migration,
    /revoke all on function public\.record_llm_usage[^;]*from anon, authenticated, public/,
  );
});

test("every Anthropic call site reports usage through the recordUsage hook", () => {
  const sites = [
    ["src", "features", "resume-parsing", "anthropic-provider.ts"],
    ["src", "features", "interview-flow", "claude-resume-question-planner.ts"],
    ["src", "features", "interview-flow", "interviewer-agent.ts"],
    ["src", "features", "scoring", "bars", "evaluator.ts"],
  ];

  for (const segments of sites) {
    const source = read(...segments);
    assert.match(source, /recordLlmUsage/, segments.join("/"));
    assert.match(source, /recordUsage/, segments.join("/"));
    assert.match(source, /usage\?\.input_tokens/, segments.join("/"));
    assert.match(source, /usage\?\.output_tokens/, segments.join("/"));
    // Providers stay free of server-only imports: they use the pure core seam.
    assert.match(source, /llm-budget\/core/, segments.join("/"));
    assert.doesNotMatch(source, /llm-budget\/store/, segments.join("/"));
  }
});

test("the interview page planner falls back deterministically when the budget is spent", () => {
  const pageSource = read("src", "app", "candidate", "interview", "page.tsx");

  assert.match(pageSource, /checkLlmBudget/);
  assert.match(pageSource, /options: \{ apiKey: null \}/);
});
