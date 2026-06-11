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

test("text mode and ASR confidence are persisted with the spec'd columns", () => {
  const migration = readMigration("text_mode_and_asr_quality");

  assert.match(migration, /candidate_interview_progress/);
  assert.match(migration, /candidate_module_sessions/);
  assert.match(
    migration,
    /interview_mode text not null default 'voice'/,
  );
  assert.match(migration, /interview_mode in \('voice', 'text'\)/);
  assert.match(migration, /candidate_interview_turns/);
  assert.match(migration, /asr_confidence numeric/);
  assert.match(migration, /asr_confidence >= 0 and asr_confidence <= 1/);
  assert.match(migration, /'accommodation_request'/);
});

test("text mode is a first-class pre-interview choice, not a hidden fallback", () => {
  const prepSource = read("src", "components", "candidate", "InterviewDevicePrep.tsx");

  // Two equal forms: voice (device check) and text (mode route).
  assert.match(prepSource, /interview_mode" type="hidden" value="voice"/);
  assert.match(prepSource, /interview_mode" type="hidden" value="text"/);
  assert.match(prepSource, /\/candidate\/interview\/mode/);
  assert.match(prepSource, /copy\.modeText/);
  assert.match(prepSource, /copy\.accommodationLabel/);

  const modeRouteSource = read("src", "app", "candidate", "interview", "mode", "route.ts");
  // Choosing text satisfies the device gate (no microphone test required).
  assert.match(modeRouteSource, /persistDeviceCheckCompleted/);
  assert.match(modeRouteSource, /accommodation_request/);
  assert.match(modeRouteSource, /no medical details/i);

  // The interview client renders a typed-answer input in text mode and keeps
  // everything downstream identical.
  const clientSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "interview-session-client.tsx",
  );
  assert.match(clientSource, /initialInterviewMode/);
  assert.match(clientSource, /isTextMode/);
  assert.match(clientSource, /<textarea/);
});

test("accommodation requests stay invisible to companies and outside scoring", () => {
  // Owner-only RLS on human_review_requests (Phase 8) + explicit exclusion
  // from the company-gated review queue listing.
  const queueSource = read("src", "app", "admin", "review-queue", "page.tsx");
  assert.match(queueSource, /neq\("target_type", "accommodation_request"\)/);

  // Nothing in scoring references accommodations.
  const scoringDir = path.join(rootDir, "src", "features", "scoring");
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith(".ts") ? [full] : [];
    });
  for (const file of walk(scoringDir)) {
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /accommodation/i,
      `${path.relative(rootDir, file)} must not reference accommodations`,
    );
  }
});

test("low ASR confidence auto-routes the module evaluation to human review", () => {
  const turnRouteSource = read("src", "app", "candidate", "interview", "turn", "route.ts");

  assert.match(turnRouteSource, /listModuleAsrConfidences/);
  assert.match(turnRouteSource, /readAsrThresholdFromEnv\(process\.env\.ASR_CONFIDENCE_REVIEW_THRESHOLD\)/);
  assert.match(turnRouteSource, /shouldRouteForAsrReview/);
  assert.match(turnRouteSource, /recordAsrReviewFlag/);

  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "server-interview-store.ts",
  );
  assert.match(storeSource, /low transcription confidence/);
  assert.match(storeSource, /never a score input/);
});

test("the adverse impact monitor covers interview mode and ASR confidence bands", () => {
  const monitorSource = read("src", "features", "audit", "adverse-impact-monitor.ts");

  assert.match(monitorSource, /"interview_mode"/);
  assert.match(monitorSource, /"asr_confidence_band"/);
});

test("the public accessibility page exists with localized copy", () => {
  const pageSource = read("src", "app", "accessibility", "page.tsx");
  const contentSource = read("src", "app", "accessibility", "accessibility-content.tsx");
  const i18nSource = read("src", "lib", "i18n.tsx");

  assert.match(pageSource, /AccessibilityContent/);
  assert.match(contentSource, /t\.accessibility/);
  assert.match(contentSource, /copy\.textModeTitle/);
  assert.match(contentSource, /copy\.accommodationTitle/);
  assert.match(i18nSource, /Accessibility at AssumerAI/);
  assert.match(i18nSource, /Accessibilità in AssumerAI/);
  assert.match(i18nSource, /Accessibilite chez AssumerAI/);

  const envExample = read(".env.example");
  assert.match(envExample, /ASR_CONFIDENCE_REVIEW_THRESHOLD/);
});
