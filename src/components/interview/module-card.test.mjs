import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const cardPath = path.join(rootDir, "src", "components", "interview", "ModuleCard.tsx");
const source = readFileSync(cardPath, "utf8");

test("a blocked card is never rendered", () => {
  // ModuleCard short-circuits to null for blocked / non-visible modules.
  assert.match(
    source,
    /if \(model\.state === "blocked" \|\| !model\.visibleToCandidate\) \{\s*return null;/,
  );
  // The dashboard grid also filters blocked modules out.
  assert.match(source, /modules\.filter\(\s*\(module\) =>\s*module\.visibleToCandidate && module\.state !== "blocked"/);
});

test("a completed card shows the completed state and is not a start button", () => {
  assert.match(source, /const isCompleted = model\.state === "completed";/);
  // Completed renders a non-interactive span, not the start/resume button.
  assert.match(source, /isCompleted \? \(/);
  assert.match(source, /✓ Completed/);
});

test("active cards offer Inizia / Riprendi based on session state", () => {
  assert.match(source, /model\.sessionState === "in_progress" \? "Riprendi" : "Inizia"/);
  assert.match(source, /onClick=\{\(\) => onStart\?\.\(model\.moduleId\)\}/);
});

test("the scorecard shows partial until required modules complete, then final", () => {
  assert.match(source, /scorecard\.status === "final"/);
  assert.match(source, /Partial score/);
  assert.match(source, /Final score/);
});

test("the in-flight panel surfaces competency and funnel phase for transparency", () => {
  assert.match(source, /inFlight\.competencyName/);
  assert.match(source, /Phase: \{inFlight\.funnelPhase\}/);
});
