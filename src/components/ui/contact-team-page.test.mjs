import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const componentPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "contact-team-page.tsx",
);
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");
const headerPath = path.join(rootDir, "src", "components", "layout", "header.tsx");
const orbitAssetPath = path.join(rootDir, "public", "contact", "team-orbit.png");
const cofounderAssetPaths = [
  path.join(rootDir, "public", "cofounders", "gmaria.jpeg"),
  path.join(rootDir, "public", "cofounders", "lazark.jpg"),
];

test("contact team page follows the approved reference structure", () => {
  assert.ok(existsSync(componentPath), "expected contact team component to exist");
  assert.ok(existsSync(orbitAssetPath), "expected generated portrait orbit asset to exist");
  for (const cofounderAssetPath of cofounderAssetPaths) {
    assert.ok(existsSync(cofounderAssetPath), "expected cofounder portrait asset to exist");
  }

  const source = readFileSync(componentPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const header = readFileSync(headerPath, "utf8");

  assert.match(source, /useI18n/);
  assert.match(source, /team-orbit\.png/);
  assert.match(source, /var\(--font-geist-sans\)/);
  assert.match(source, /linear-gradient\(110deg, #f7c8d9/);
  assert.match(source, /Contact us/);
  assert.match(source, /Our team/);
  assert.match(translations, /contactTeam/);
  assert.match(
    translations,
    /Reach out and we'll get in touch within 24 hours/,
  );
  assert.match(
    translations,
    /We craft calm hiring products through careful analysis/,
  );
  assert.match(translations, /href: "\/contact"/);
  assert.match(translations, /href: "\/contact#team"/);
  assert.match(header, /href: "\/contact"/);
});

test("contact team page uses calm landing-page typography instead of heavy display text", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.doesNotMatch(source, /font-black/);
  assert.doesNotMatch(source, /text-\[clamp\(2\.5rem,5vw,4\.35rem\)\]/);
  assert.match(source, /text-\[clamp\(2\.1rem,4vw,3\.2rem\)\] font-light/);
  assert.doesNotMatch(source, /text-\[clamp\(2\.2rem,4\.2vw,3\.6rem\)\]/);
});

test("contact hero stays compact and keeps branding out of the orbit panel", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.doesNotMatch(source, /\/logos\/assumer-logo\.png/);
  assert.doesNotMatch(source, /absolute left-5 top-5/);
  assert.doesNotMatch(source, /max-w-\[1200px\]/);
  assert.doesNotMatch(source, /lg:min-h-\[760px\]/);
  assert.match(source, /max-w-\[1040px\]/);
  assert.match(source, /lg:min-h-\[640px\]/);
  assert.match(source, /h-\[280px\]/);
});

test("team section uses the two-person responsive reference layout", () => {
  const source = readFileSync(componentPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");

  assert.doesNotMatch(source, /contact\.team\.sectionNumber/);
  assert.match(source, /key=\{`\$\{member\.name\}-\$\{member\.role\}`\}/);
  assert.doesNotMatch(source, /contact\.team\.readMore/);
  assert.match(source, /max-w-\[560px\]/);
  assert.match(source, /sm:grid-cols-2/);
  assert.doesNotMatch(source, /xl:grid-cols-4/);
  assert.doesNotMatch(source, /contact\.team\.notes/);
  assert.doesNotMatch(translations, /sectionNumber: "04"/);
  assert.doesNotMatch(translations, /readMore: "Read more"/);
  assert.match(translations, /name: "Gianmaria Ferretti"/);
  assert.match(translations, /image: "\/cofounders\/gmaria\.jpeg"/);
  assert.match(translations, /imageAlt: "Portrait of Gianmaria Ferretti"/);
  assert.match(translations, /name: "Lazar Kovacevic"/);
  assert.match(translations, /image: "\/cofounders\/lazark\.jpg"/);
  assert.match(translations, /imageAlt: "Portrait of Lazar Kovacevic"/);
});
