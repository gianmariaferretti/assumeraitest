import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const mobileNavPath = path.join(
  rootDir,
  "src",
  "components",
  "layout",
  "mobile-nav-menu.tsx",
);
const headerPath = path.join(rootDir, "src", "components", "layout", "header.tsx");

test("mobile nav menu exposes an accessible hamburger toggle", () => {
  assert.ok(existsSync(mobileNavPath), "expected mobile nav menu component to exist");

  const source = readFileSync(mobileNavPath, "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /aria-controls="mobile-navigation"/);
  assert.match(source, /Menu/);
  assert.match(source, /X/);
  assert.match(source, /navItems\.map/);
  assert.match(source, /LanguageSelector/);
});

test("header renders the mobile nav menu", () => {
  const source = readFileSync(headerPath, "utf8");

  assert.match(source, /MobileNavMenu/);
  assert.match(source, /<MobileNavMenu[\s\S]*navItems=\{navItems\}/);
  assert.match(source, /LanguageSelector/);
  assert.match(source, /useI18n/);
});
