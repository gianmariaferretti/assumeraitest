import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

const plannerSource = read("src", "features", "interview-flow", "resume-question-planner.ts");
const interviewLanguageSource = read("src", "features", "interview-flow", "interview-language.ts");

function sourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `expected source to include ${startNeedle}`);

  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `expected source after ${startNeedle} to include ${endNeedle}`);

  return source.slice(start, end);
}

function readSwitchCaseBlockFrom(source, start, moduleId) {
  const startNeedle = `case "${moduleId}":`;
  const lineStart = source.lastIndexOf("\n", start) + 1;
  const lines = source.slice(lineStart).split(/\r?\n/);
  const firstLine = lines[0];
  assert.match(firstLine, new RegExp(startNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const caseIndent = firstLine.match(/^\s*/)[0].length;
  const block = [firstLine];

  for (const line of lines.slice(1)) {
    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trimStart();

    if (indent === caseIndent && trimmed.startsWith('case "')) {
      break;
    }

    if (indent < caseIndent && trimmed.startsWith("}")) {
      break;
    }

    block.push(line);
  }

  assert.ok(block.length > 1, `expected ${moduleId} prompt block to have source lines`);

  return block.join("\n");
}

function switchCaseBlocks(source, moduleId) {
  const startNeedle = `case "${moduleId}":`;
  const blocks = [];
  let offset = 0;

  while (offset < source.length) {
    const start = source.indexOf(startNeedle, offset);
    if (start === -1) {
      break;
    }

    const block = readSwitchCaseBlockFrom(source, start, moduleId);
    blocks.push(block);
    offset = start + block.length;
  }

  assert.ok(blocks.length > 0, `expected deterministic prompts to include ${startNeedle}`);
  return blocks;
}

function switchCaseBlock(source, moduleId) {
  return switchCaseBlocks(source, moduleId)[0];
}

const plannerPromptSource = sourceBetween(
  plannerSource,
  "function promptForModule",
  "export function createResumeAwareQuestionPlan"
);
const localizedPromptSource = sourceBetween(
  interviewLanguageSource,
  "export function localizeResumeAwarePrompt",
  "export function localizeFollowUpPrompt"
);
const deterministicPromptSource = `${plannerPromptSource}\n${localizedPromptSource}`;

test("deterministic resume-aware prompts ask for STAR/SBI past evidence against one target", () => {
  assert.match(deterministicPromptSource, /specific past example/i);
  assert.match(deterministicPromptSource, /\bSituation\b/);
  assert.match(deterministicPromptSource, /\bTask\b/);
  assert.match(deterministicPromptSource, /\bAction\b/);
  assert.match(deterministicPromptSource, /\bResult\b/);
  assert.match(deterministicPromptSource, /\bSBI\b|\bSituation\b[\s\S]*\bBehavior\b[\s\S]*\bImpact\b/);
  assert.match(deterministicPromptSource, /\bone (?:competency|evidence target)\b/i);
});

test("core resume-aware prompts do not introduce generic hypothetical patterns", () => {
  const corePromptSource = ["motivation", "domain", "work_sample", "case"]
    .flatMap((moduleId) => switchCaseBlocks(deterministicPromptSource, moduleId))
    .join("\n");

  assert.doesNotMatch(corePromptSource, /\bwhat would you do\b/i);
  assert.doesNotMatch(corePromptSource, /\bhow would you\b/i);
  assert.doesNotMatch(corePromptSource, /\bconsider\b[\s\S]{0,80}\bscenario\b/i);
});

test("core resume-aware prompts anchor resume evidence to a role requirement or missing evidence target", () => {
  for (const moduleId of ["motivation", "domain", "work_sample", "case"]) {
    const promptSource = switchCaseBlock(plannerPromptSource, moduleId);

    assert.match(
      promptSource,
      /context\.primaryExperience|resumeEvidence/,
      `${moduleId} prompt should reference concrete resume evidence`
    );
    assert.match(
      promptSource,
      /\brequirement\b|\bmissing\b/,
      `${moduleId} prompt should reference a role requirement or missing-evidence target`
    );
  }
});

test("declared resume languages become a separate CEFR language check", () => {
  assert.match(plannerSource, /candidateProfile\.languages/);
  assert.match(plannerSource, /declared_level/);
  assert.match(deterministicPromptSource, /\bCEFR\b/);
  assert.match(deterministicPromptSource, /declared level/i);
  assert.match(deterministicPromptSource, /target language/i);
  assert.match(deterministicPromptSource, /grammar\/vocabulary|grammar and vocabulary/i);
  assert.match(deterministicPromptSource, /reading comprehension/i);
  assert.match(deterministicPromptSource, /spoken production/i);
});

test("language checks exclude accent, native speaker, and nationality from scoring", () => {
  const languagePromptSource = switchCaseBlocks(deterministicPromptSource, "language").join("\n");

  assert.match(languagePromptSource, /\baccent\b/i);
  assert.match(languagePromptSource, /\bnative speaker\b/i);
  assert.match(languagePromptSource, /\bnationality\b/i);
  assert.match(languagePromptSource, /\b(?:exclude|do not score|not scoring|not a scoring signal)\b/i);
});
