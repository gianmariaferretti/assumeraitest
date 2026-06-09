import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const selectorPath = path.join(
  rootDir,
  "src",
  "components",
  "layout",
  "language-selector.tsx",
);

test("desktop language selector uses a compact dropdown trigger", () => {
  assert.ok(existsSync(selectorPath), "expected language selector component to exist");

  const source = readFileSync(selectorPath, "utf8");

  assert.match(source, /Globe2/);
  assert.match(source, /ChevronDown/);
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitemradio"/);
  assert.match(source, /aria-checked=\{isActive\}/);
  assert.doesNotMatch(source, /flagAccents/);
  assert.doesNotMatch(source, /compactFlagStripe/);
});

test("desktop language selector can be positioned by page surfaces", () => {
  const source = readFileSync(selectorPath, "utf8");

  assert.match(source, /className\?:\s*string/);
  assert.match(source, /cn\("relative hidden lg:block", className\)/);
});

test("language selector keeps mobile options inline", () => {
  const source = readFileSync(selectorPath, "utf8");

  assert.match(source, /variant = "desktop"/);
  assert.match(source, /isMobile/);
  assert.match(source, /grid gap-2/);
  assert.match(source, /inline-flex w-fit max-w-full gap-1/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /item\.shortLabel/);
});
