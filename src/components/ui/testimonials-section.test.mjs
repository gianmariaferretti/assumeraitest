import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const testimonialsPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "testimonials-section.tsx",
);
const testimonialsColumnPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "testimonials-columns-1.tsx",
);
const pagePath = path.join(rootDir, "src", "app", "page.tsx");
const belowFoldPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "home-below-fold-sections.tsx",
);
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");
const globalsPath = path.join(rootDir, "src", "app", "globals.css");
const testimonialAvatarPaths = [
  "aissatou-conti.webp",
  "anna-pellegrini.webp",
  "lukas-pernigotti.webp",
  "marco-belluzzi.webp",
  "tobias-reiner.webp",
].map((filename) =>
  path.join(rootDir, "public", "images", "testimonials", filename),
);

test("testimonials section includes the supplied translated testimonial copy", () => {
  assert.ok(existsSync(testimonialsPath), "expected testimonials section component to exist");

  const source = readFileSync(testimonialsPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");

  assert.match(source, /useI18n/);
  assert.match(translations, /A few honest sentences\./);
  assert.match(translations, /I sent zero applications/);
  assert.match(translations, /Marco Belluzzi/);
  assert.match(translations, /Anna Pellegrini/);
  assert.match(translations, /Aïssatou Conti/);
  assert.match(translations, /Tobias Reiner/);
  assert.match(translations, /Lukas Pernigotti/);
  assert.match(translations, /Qualche frase sincera/);
  assert.match(translations, /Quelques phrases sincères/);
  assert.match(source, /bg-white/);
  assert.match(source, /TestimonialsColumn/);
  assert.match(source, /mask-image:linear-gradient/);
  assert.doesNotMatch(source, /grid gap-4 sm:grid-cols-2 lg:grid-cols-3/);
});

test("testimonials column uses compositor-friendly marquee styles", () => {
  assert.ok(
    existsSync(testimonialsColumnPath),
    "expected reusable testimonials column component to exist",
  );

  const source = readFileSync(testimonialsColumnPath, "utf8");
  const globals = readFileSync(globalsPath, "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /next\/image/);
  assert.match(source, /testimonialAvatarByInitials/);
  assert.match(source, /\/images\/testimonials\/lukas-pernigotti\.webp/);
  assert.match(source, /testimonial portrait/);
  assert.match(source, /--testimonial-marquee-duration/);
  assert.match(source, /motion-safe:animate-\[testimonials-marquee_var\(--testimonial-marquee-duration\)_linear_infinite\]/);
  assert.match(source, /motion-reduce:animate-none/);
  assert.match(globals, /@keyframes testimonials-marquee/);
  assert.match(globals, /translate3d\(0, -50%, 0\)/);
  assert.doesNotMatch(source, /motion\/react/);
  assert.doesNotMatch(source, /repeat: Infinity/);
});

test("testimonial avatar files are available as optimized local assets", () => {
  for (const avatarPath of testimonialAvatarPaths) {
    assert.ok(existsSync(avatarPath), `expected avatar asset ${avatarPath} to exist`);
  }
});

test("home page renders testimonials before pricing", () => {
  const pageSource = readFileSync(pagePath, "utf8");
  const belowFoldSource = readFileSync(belowFoldPath, "utf8");

  assert.match(pageSource, /HomeBelowFoldSections/);
  assert.match(belowFoldSource, /TestimonialsSection/);
  assert.match(
    belowFoldSource,
    /<DashboardShowcaseSection \/>\s*<TestimonialsSection \/>\s*<PricingSection \/>/,
  );
});
