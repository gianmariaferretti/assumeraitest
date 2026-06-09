import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const footerPath = path.join(rootDir, "src", "components", "layout", "footer.tsx");
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");

test("footer matches the expanded landing footer content", () => {
  const source = readFileSync(footerPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const sourceWithoutLogo = source.replace(
    /<Link href="\/"[\s\S]*?<\/Link>/,
    "",
  );

  assert.match(source, /useI18n/);
  assert.match(source, /var\(--page-bg\)/);
  assert.match(source, /var\(--page-surface\)/);
  assert.match(source, /var\(--page-text\)/);
  assert.match(source, /var\(--page-text-muted\)/);
  assert.match(source, /var\(--page-accent-gradient\)/);
  assert.match(source, /var\(--page-accent-strong\)/);
  assert.match(source, /var\(--page-border\)/);
  assert.match(translations, /Product/);
  assert.match(translations, /Company/);
  assert.match(translations, /Trust/);
  assert.match(translations, /Stay close/);
  assert.match(source, /you@work\.com/);
  assert.match(translations, /Made in Milano \+ Berlin/);
  assert.match(translations, /Resta vicino/);
  assert.match(translations, /Restons proches/);
  assert.doesNotMatch(source, /All systems calm/);
  assert.doesNotMatch(source, /SOC 2 in progress/);
  assert.doesNotMatch(source, /208,246,235/);
  assert.doesNotMatch(source, /#eefaf4/);
  assert.doesNotMatch(sourceWithoutLogo, /bg-blue-600|hover:text-sky|focus:border-sky|rgba\(37,99,235|rgba\(230,222,247|#f6f3fb/);
});

test("footer no longer links to the removed interview product page", () => {
  const translations = readFileSync(i18nPath, "utf8");

  assert.doesNotMatch(translations, /\/product\/interview/);
});

test("footer links do not precompile product routes from the homepage", () => {
  const source = readFileSync(footerPath, "utf8");

  assert.match(source, /prefetch=\{false\}/);
});
