import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../..");
const pagePath = path.join(rootDir, "src", "app", "candidates", "app", "page.tsx");
const componentPath = path.join(
  rootDir,
  "src",
  "app",
  "candidates",
  "app",
  "candidate-showcase-app.tsx",
);

test("/candidates/app exposes a polished App Router candidate workspace", () => {
  assert.ok(existsSync(pagePath), "expected /candidates/app page to exist");
  assert.ok(
    existsSync(componentPath),
    "expected route-local candidate showcase component to exist",
  );

  const pageSource = readFileSync(pagePath, "utf8");
  const componentSource = readFileSync(componentPath, "utf8");

  assert.match(pageSource, /metadata: Metadata/);
  assert.match(pageSource, /CandidateShowcaseApp/);
  assert.match(componentSource, /"use client";/);
  assert.match(componentSource, /useState/);
  assert.match(componentSource, /const candidateProfile/);
  assert.match(componentSource, /const matchedRoles/);
  assert.match(componentSource, /const applicationTracker/);
  assert.match(componentSource, /const skillInsights/);
  assert.match(componentSource, /const nextSteps/);
  assert.match(componentSource, /const interviewPrep/);
});

test("candidate workspace copy and sections match the candidate product promise", () => {
  const source = readFileSync(componentPath, "utf8");

  for (const copy of [
    "Candidate OS",
    "Free for candidates, always.",
    "One CV. One interview. Get matched.",
    "You did the work, now let it work for you.",
    "Profile readiness",
    "Matched opportunities",
    "Application tracker",
    "Skill insights",
    "Suggested next steps",
    "Interview prep",
    "scorecard visible to you",
    "Consent-led visibility",
    "14-day response",
    "Max two human interviews",
    "Feedback always",
    "No trick questions",
    "No hidden scoring",
    "No silent inbox",
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("candidate workspace stays UI-only and brand-aligned", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /#f5f5f7/);
  assert.match(source, /#040817/);
  assert.match(source, /#0b2146/);
  assert.match(source, /#f7c8d9/);
  assert.match(source, /#a8c5f1/);
  assert.match(source, /var\(--font-geist-sans\)/);
  assert.match(source, /var\(--font-instrument-serif\)/);
  assert.match(source, /rounded-\[8px\]/);
  assert.match(source, /rounded-full/);
  assert.match(source, /lucide-react/);
  assert.match(source, /type="button"/);
  assert.match(source, /demo-only/);
  assert.match(source, /grid gap-4 lg:grid-cols/);
  assert.match(source, /sm:/);
  assert.match(source, /lg:/);
  assert.doesNotMatch(source, /@\/lib\/supabase|createClient|fetch\(|route\.ts|localStorage|process\.env/);
});

test("candidate workspace exposes accessible state for selectable controls and progress", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /aria-pressed=\{activeFilter === filter\}/);
  assert.match(source, /aria-pressed=\{selectedRole\.id === role\.id\}/);
  assert.match(source, /aria-pressed=\{focusStep === index\}/);
  assert.match(source, /focus-visible:ring/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuemin=\{0\}/);
  assert.match(source, /aria-valuemax=\{100\}/);
  assert.match(source, /aria-valuenow=\{candidateProfile\.readiness\}/);
  assert.match(source, /aria-valuenow=\{item\.value\}/);
});

test("demo-only buttons provide local feedback instead of dead keyboard stops", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /const \[demoMessage, setDemoMessage\] = useState/);
  assert.match(source, /const \[completedSteps, setCompletedSteps\] = useState/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /<DemoButton[\s\S]*onClick=\{/);
  assert.match(source, /data-demo-action/);
  assert.match(source, /onClick=\{\(\) => handleNextStep/);
  assert.match(source, /onClick=\{\(\) =>\s*setDemoMessage\(`Previewing/);
});

test("matched opportunities heading reflects the active filter", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /const matchedOpportunityTitle/);
  assert.match(source, /activeFilter === "Recommended"/);
  assert.match(source, /activeFilter === "Interviewing"/);
  assert.doesNotMatch(source, />\s*Recommended roles\s*</);
});
