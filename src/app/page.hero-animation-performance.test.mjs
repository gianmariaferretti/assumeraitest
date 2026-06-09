import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const pagePath = path.join(rootDir, "src", "app", "page.tsx");

test("hero canvas uses demand frames on mobile", () => {
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /HeroIsolationTestSection mode="home"/);
});

test("hero progress loop does not force continuous mobile RAF", () => {
  const source = readFileSync(pagePath, "utf8");

  assert.doesNotMatch(source, /function HomeLegacy/);
});
