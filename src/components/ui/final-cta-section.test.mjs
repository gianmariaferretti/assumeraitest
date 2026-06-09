import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const ctaPath = path.join(rootDir, "src", "components", "ui", "final-cta-section.tsx");
const homeSectionsPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "home-below-fold-sections.tsx",
);
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");

test("final CTA section matches the landing page closing design", () => {
  assert.ok(existsSync(ctaPath), "expected final CTA section component to exist");

  const source = readFileSync(ctaPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");

  assert.match(source, /useI18n/);
  assert.match(translations, /Twenty calm/);
  assert.match(translations, /someone else's/);
  assert.match(translations, /Take the interview now/);
  assert.match(translations, /within 48 hours/);
  assert.match(translations, /Take the interview/);
  assert.match(translations, /I'm a hiring team/);
  assert.match(translations, /Venti minuti tranquilli/);
  assert.match(translations, /Vingt minutes calmes/);
  assert.match(source, /var\(--font-geist-sans\)/);
  assert.match(source, /max-w-\[900px\]/);
  assert.match(source, /border-t border-slate-200/);
  assert.match(source, /text-\[clamp\(1\.75rem,3vw,2\.65rem\)\]/);
  assert.match(source, /h-10 .*rounded-full/);
  assert.match(source, /bg-slate-950/);
  assert.doesNotMatch(source, /var\(--font-instrument-serif\)/);
  assert.doesNotMatch(source, /italic/);
  assert.doesNotMatch(source, /radial-gradient/);
  assert.doesNotMatch(source, /gradientText/);
  assert.doesNotMatch(source, /min-h-\[390px\]/);
  assert.doesNotMatch(source, /min-h-\[460px\]/);
  assert.doesNotMatch(source, /rounded-\[2\.25rem\]/);
  assert.doesNotMatch(source, /shadow-\[/);
});

test("home page renders final CTA after pricing", () => {
  const source = readFileSync(homeSectionsPath, "utf8");

  assert.match(source, /FinalCtaSection/);
  assert.match(source, /<PricingSection \/>\s*<FinalCtaSection \/>/);
});
