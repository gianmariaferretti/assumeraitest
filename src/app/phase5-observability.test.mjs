import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");
const exists = (...segments) => existsSync(path.join(rootDir, ...segments));

test("every Anthropic/Deepgram call site emits telemetry with a WARN on fallback", () => {
  const anthropicSites = [
    ["src", "features", "scoring", "bars", "evaluator.ts"],
    ["src", "features", "interview-flow", "interviewer-agent.ts"],
    ["src", "features", "interview-flow", "claude-resume-question-planner.ts"],
    ["src", "features", "resume-parsing", "anthropic-provider.ts"],
  ];
  for (const segments of anthropicSites) {
    const source = read(...segments);
    assert.match(source, /logLlmTelemetry/, segments.join("/"));
    assert.match(source, /latencyMs: Date\.now\(\) - startedAt/, segments.join("/"));
    assert.match(source, /outcome: "ok"/, segments.join("/"));
  }

  // The three fallback-capable sites WARN inside their fallback constructors.
  for (const segments of anthropicSites.slice(0, 3)) {
    const source = read(...segments);
    assert.match(source, /outcome: "fallback"/, segments.join("/"));
  }

  const deepgramSource = read("src", "features", "live-interview", "deepgram-token-grant.ts");
  assert.match(deepgramSource, /logLlmTelemetry/);
  assert.match(deepgramSource, /provider: "deepgram"/);
  assert.match(deepgramSource, /outcome: "ok"/);
  assert.match(deepgramSource, /outcome: "error"/);
});

test("route handlers log structured JSON lines with correlation context", () => {
  const turnSource = read("src", "app", "candidate", "interview", "turn", "route.ts");
  assert.match(turnSource, /from "@\/lib\/log"/);
  assert.match(turnSource, /correlationId/);
  assert.match(turnSource, /interview_turn_rejected/);

  const uploadSource = read("src", "app", "candidate", "resume", "upload", "route.ts");
  assert.match(uploadSource, /logError\("resume_upload_failed"/);
  assert.match(uploadSource, /captureServerError/);

  const cronSource = read("src", "app", "api", "cron", "retention", "route.ts");
  assert.match(cronSource, /retention_run_completed/);
});

test("Sentry is wired for client and server and no-ops without a DSN", () => {
  const serverSource = read("src", "instrumentation.ts");
  assert.match(serverSource, /@sentry\/nextjs/);
  assert.match(serverSource, /process\.env\.SENTRY_DSN/);
  assert.match(serverSource, /if \(!dsn\) \{\s*\n?\s*return;/);
  assert.match(serverSource, /onRequestError/);

  const clientSource = read("src", "instrumentation-client.ts");
  assert.match(clientSource, /NEXT_PUBLIC_SENTRY_DSN/);
  assert.match(clientSource, /if \(dsn\) \{/);

  const helperSource = read("src", "lib", "sentry.ts");
  assert.match(helperSource, /setTag\("correlationId"/);
  assert.match(helperSource, /if \(!process\.env\.SENTRY_DSN\?\.trim\(\)\) \{\s*\n?\s*return;/);
});

test("CI runs checks and verifies migrations with the Supabase CLI", () => {
  const workflow = read(".github", "workflows", "ci.yml");

  assert.match(workflow, /on:\s*\n\s*push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /node --test/);
  assert.match(workflow, /supabase\/setup-cli/);
  assert.match(workflow, /supabase start/);
  assert.ok(exists("supabase", "config.toml"), "supabase config.toml must exist for the CLI");
});

test("repo hygiene: noise is ignored and marketing material is untracked", () => {
  const gitignore = read(".gitignore");

  assert.match(gitignore, /^\.DS_Store$/m);
  assert.match(gitignore, /^\*\.log$/m);
  assert.match(gitignore, /^\.claude\/settings\.local\.json$/m);
  assert.match(gitignore, /^starmethod\.pdf$/m);
  assert.match(gitignore, /^videos\/$/m);
  assert.match(gitignore, /^\.codex-starmethod-pages\/$/m);
});

test("the README documents setup, env vars, architecture, commands, and fairness", () => {
  const readme = read("README.md");

  assert.match(readme, /^# AssumerAI/m);
  assert.match(readme, /## Setup/);
  assert.match(readme, /## Environment variables/);
  assert.match(readme, /LLM_DAILY_BUDGET_EUR/);
  assert.match(readme, /## Commands/);
  assert.match(readme, /## Architecture/);
  assert.match(readme, /interview-engine\.md/);
  assert.match(readme, /## Fairness reports/);
  assert.match(readme, /server-authoritative/i);
  assert.doesNotMatch(readme, /create-next-app/);
});
