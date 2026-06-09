import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const pricingPath = path.join(rootDir, "src", "components", "ui", "pricing-section.tsx");

test("pricing cards use calmer pricing typography and non-gradient top lines", () => {
  const source = readFileSync(pricingPath, "utf8");

  assert.doesNotMatch(source, /font-black leading-none tracking-\[-0\.06em\]/);
  assert.doesNotMatch(source, /bg-gradient-to-r/);
  assert.doesNotMatch(source, /from-sky-500|from-emerald-500|from-violet-500/);
  assert.match(source, /font-light leading-none/);
  assert.match(source, /bg-\[#d9d2ff\]/);
  assert.match(source, /price: "\\u20ac400"/);
  assert.match(source, /cadence: "platform"/);
  assert.match(source, /price: "\\u20ac200"/);
  assert.match(source, /cadence: "per hire"/);
  assert.match(source, /price: "lets speak"/);
  assert.match(source, /body: ""/);
  assert.match(source, /plan\.cadence \?/);
  assert.match(source, /plan\.body \?/);
});
