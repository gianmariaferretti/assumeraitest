import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const testPagePath = path.join(rootDir, "src", "app", "test", "page.tsx");
const heroPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "hero-isolation-test-section.tsx",
);
const heroCanvasPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "hero-laptop-canvas.tsx",
);

test("test route exists and renders the isolated hero section", () => {
  assert.ok(existsSync(testPagePath), "expected /test page to exist");
  const source = readFileSync(testPagePath, "utf8");

  assert.match(source, /HeroIsolationTestSection/);
});

test("isolated hero keeps demand frameloop and 4-laptop mobile layout", () => {
  assert.ok(existsSync(heroPath), "expected isolated hero component to exist");
  assert.ok(existsSync(heroCanvasPath), "expected isolated hero canvas component to exist");
  const source = readFileSync(heroCanvasPath, "utf8");

  assert.match(source, /frameloop="demand"/);
  assert.match(source, /const visibleVariants = VARIANTS;/);
  assert.match(source, /\[-1\.05, -0\.9, 0\]/);
  assert.match(source, /\[1\.05, -0\.9, 0\]/);
  assert.match(source, /\/screens\/linkedin\.png/);
  assert.match(source, /\/screens\/reed-new-logo\.png/);
});
