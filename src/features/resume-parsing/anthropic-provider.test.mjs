import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const providerPath = path.join(
  rootDir,
  "src",
  "features",
  "resume-parsing",
  "anthropic-provider.ts",
);

test("Anthropic resume parser repairs zero confidence when profile evidence is populated", () => {
  const source = readFileSync(providerPath, "utf8");
  const outputContractPrompt = source.slice(
    source.indexOf("function buildOutputContractPrompt"),
    source.indexOf("function normalizeAnthropicParserResult"),
  );

  assert.doesNotMatch(outputContractPrompt, /parser_confidence:\s*0/);
  assert.match(source, /deriveParserConfidenceFromProfile/);
  assert.match(source, /deriveFieldConfidenceFromProfile/);
  assert.match(source, /isUnusableProviderConfidence/);
  assert.match(source, /parser_confidence:\s*deriveParserConfidenceFromProfile/);
  assert.match(
    source,
    /const fieldConfidence = deriveFieldConfidenceFromProfile\(result\.profile\)/,
  );
  assert.match(source, /field_confidence:\s*fieldConfidence/);
});
