import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "next.config.ts");
const packagePath = path.join(__dirname, "package.json");

test("pins Turbopack to the app directory instead of an inferred parent workspace", () => {
  const source = readFileSync(configPath, "utf8");

  assert.match(source, /turbopack\s*:/);
  assert.match(source, /root\s*:\s*process\.cwd\(\)/);
  assert.doesNotMatch(source, /root\s*:\s*path\.join\([^)]*,\s*["']\.\.["']\)/);
});

test("default dev server uses webpack while preserving an explicit turbopack escape hatch", () => {
  const manifest = JSON.parse(readFileSync(packagePath, "utf8"));

  assert.equal(manifest.scripts.dev, "next dev --webpack");
  assert.equal(manifest.scripts["dev:turbo"], "next dev");
});
