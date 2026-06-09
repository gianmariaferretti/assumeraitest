import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

test("response analysis flags can carry missing STAR elements", () => {
  const typesSource = read("src", "features", "interview-flow", "types.ts");

  assert.match(
    typesSource,
    /export type StarEvidenceElement =\s*"situation"\s*\|\s*"task"\s*\|\s*"action"\s*\|\s*"result"/
  );
  assert.match(typesSource, /missingStarElements\?: StarEvidenceElement\[\]/);
});

test("session-state recognizes missing STAR evidence as a follow-up reason", () => {
  const sessionSource = read("src", "features", "interview-flow", "session-state.ts");

  assert.match(
    sessionSource,
    /const COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON = "complete_star_element"/
  );
  assert.match(sessionSource, /missingStarElementFor\(flags\)/);
  assert.match(
    sessionSource,
    /if \(missingStarElementFor\(flags\)\) \{\s*return COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON;/
  );
});

test("missing Action follow-up asks what the candidate personally did", () => {
  const sessionSource = read("src", "features", "interview-flow", "session-state.ts");

  assert.match(sessionSource, /action: "What did you personally do/);
  assert.match(sessionSource, /case COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON:/);
  assert.match(
    sessionSource,
    /starFollowUpPrompt\(missingStarElement \?\? "action", evidenceTarget, interviewLanguage\)/
  );
});
