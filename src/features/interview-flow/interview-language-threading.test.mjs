import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

test("candidate interview page ignores invalid language cookies before persisted fallback", () => {
  const pageSource = read("src", "app", "candidate", "interview", "page.tsx");

  assert.match(pageSource, /resolveExplicitCandidateInterviewLanguageCode/);
  assert.match(
    pageSource,
    /const cookieInterviewLanguage = resolveExplicitCandidateInterviewLanguageCode\([\s\S]*CANDIDATE_INTERVIEW_LANGUAGE_COOKIE/
  );
  assert.match(
    pageSource,
    /resolveCandidateInterviewLanguageCode\(\s*cookieInterviewLanguage \?\? progress\.interviewLanguage\s*\)/
  );
});

test("createInterviewSession localizes supplied base question banks without resume planning", () => {
  const sessionSource = read("src", "features", "interview-flow", "session-state.ts");

  assert.match(sessionSource, /localizeInterviewQuestions\(plannedQuestionBank, interviewLanguage\)/);
  assert.doesNotMatch(
    sessionSource,
    /input\.questionBank\s*\|\|\s*input\.candidateProfile\s*\?\s*plannedQuestionBank\s*:\s*localizeInterviewQuestions/
  );
});

test("interview sessions resume from server state for the active interview language", () => {
  const pageSource = read("src", "app", "candidate", "interview", "page.tsx");
  const clientSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "interview-session-client.tsx"
  );

  // The server reuses a persisted session only while its language matches; a
  // language switch starts a fresh server session with the new question plan.
  assert.match(
    pageSource,
    /existingState\.session\.interviewLanguage === interviewLanguage/
  );
  // The client never restores or submits interview session state on its own.
  assert.doesNotMatch(clientSource, /localStorage\.(getItem|setItem)\(STORAGE_KEY/);
  assert.doesNotMatch(clientSource, /resumeInterviewSession/);
});
