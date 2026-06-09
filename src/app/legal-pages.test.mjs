import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const privacyPagePath = path.join(rootDir, "src", "app", "privacy-policy", "page.tsx");
const termsPagePath = path.join(rootDir, "src", "app", "terms-of-use", "page.tsx");
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");

test("legal routes expose privacy policy and terms of use pages", () => {
  assert.ok(existsSync(privacyPagePath), "expected /privacy-policy page to exist");
  assert.ok(existsSync(termsPagePath), "expected /terms-of-use page to exist");

  const privacySource = readFileSync(privacyPagePath, "utf8");
  const termsSource = readFileSync(termsPagePath, "utf8");

  assert.match(privacySource, /Privacy policy \| Assumerai/);
  assert.match(privacySource, /candidate data/i);
  assert.match(privacySource, /model improvement/i);
  assert.match(privacySource, /hello@assumer\.ai/);

  assert.match(termsSource, /Terms of use \| Assumerai/);
  assert.match(termsSource, /human review/i);
  assert.match(termsSource, /acceptable use/i);
  assert.match(termsSource, /hello@assumer\.ai/);
});

test("footer legal links point to the real legal routes", () => {
  const translations = readFileSync(i18nPath, "utf8");

  assert.match(translations, /href: "\/privacy-policy"/);
  assert.match(translations, /href: "\/terms-of-use"/);
  assert.doesNotMatch(translations, /\{ label: "Privacy", href: "#" \}/);
  assert.doesNotMatch(translations, /\{ label: "Terms", href: "#" \}/);
});
