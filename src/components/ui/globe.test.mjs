import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const globePath = path.join(rootDir, "src", "components", "ui", "globe.tsx");

test("featured globe defers its animated canvas until the section nears the viewport", () => {
  const source = readFileSync(globePath, "utf8");

  assert.match(source, /function DeferredGlobe/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /setShouldMountGlobe\(true\)/);
  assert.match(source, /<DeferredGlobe className=/);
  assert.doesNotMatch(source, /<Globe className="left-auto right-\[-3rem\]/);
});

test("featured globe flows directly after the laptop section without a gray card divider", () => {
  const source = readFileSync(globePath, "utf8");

  assert.match(source, /<section className="relative w-full overflow-hidden bg-white px-6 py-16 md:px-16 md:py-24">/);
  assert.doesNotMatch(source, /mt-48/);
  assert.doesNotMatch(source, /bg-muted/);
  assert.doesNotMatch(source, /rounded-3xl/);
  assert.doesNotMatch(source, /shadow-md/);
});
