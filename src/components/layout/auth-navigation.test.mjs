import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const headerPath = path.join(rootDir, "src", "components", "layout", "header.tsx");
const mobileNavPath = path.join(
  rootDir,
  "src",
  "components",
  "layout",
  "mobile-nav-menu.tsx",
);
const srcPath = path.join(rootDir, "src");

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    return entryPath.endsWith(".tsx") ? [entryPath] : [];
  });
}

test("desktop header links to the dedicated auth routes", () => {
  const source = readFileSync(headerPath, "utf8");

  assert.match(source, /href="\/login"/);
  assert.match(source, /href="\/signup"/);
  assert.doesNotMatch(source, /href="#signin"/);
  assert.doesNotMatch(source, /href="#begin"/);
});

test("desktop header swaps auth CTAs for account and sign out when signed in", () => {
  const source = readFileSync(headerPath, "utf8");

  assert.match(source, /createClient/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /supabase\.auth\.onAuthStateChange/);
  assert.match(source, /getUserAccountRole/);
  assert.match(source, /getProfilePathForRole/);
  assert.match(source, /accountHref/);
  assert.match(source, /href=\{accountHref\}/);
  assert.match(source, /handleSignOut/);
  assert.match(source, /supabase\.auth\.signOut\(\)/);
  assert.match(source, /fetch\("\/auth\/sign-out"/);
  assert.match(source, /setIsSignedIn\(false\)/);
  assert.match(source, /router\.refresh\(\)/);
  assert.match(source, /onSignOut=\{handleSignOut\}/);
  assert.match(source, /t\.common\.userAccount/);
  assert.match(source, /t\.common\.signOut/);
  assert.match(source, /isSignedIn/);
});

test("desktop header uses the uploaded navbar logo asset", () => {
  const source = readFileSync(headerPath, "utf8");

  assert.match(source, /src="\/logo_assumerai\.png"/);
});

test("desktop header brand text uses the landing page font", () => {
  const source = readFileSync(headerPath, "utf8");

  assert.match(source, /\[font-family:var\(--font-geist-sans\),sans-serif\]/);
  assert.match(source, /font-bold/);
  assert.match(source, /tracking-tighter/);
});

test("desktop header keeps the brand name out of browser translation", () => {
  const source = readFileSync(headerPath, "utf8");

  assert.match(source, /notranslate/);
  assert.match(source, /translate="no"/);
});

test("header no longer links to the removed interview product page", () => {
  const source = readFileSync(headerPath, "utf8");
  const mobileSource = readFileSync(mobileNavPath, "utf8");

  assert.doesNotMatch(source, /\/product\/interview/);
  assert.doesNotMatch(source, /t\.nav\.interview/);
  assert.doesNotMatch(mobileSource, /\/product\/interview/);
});

test("global nav links do not precompile product routes from the homepage", () => {
  const source = readFileSync(headerPath, "utf8");
  const mobileSource = readFileSync(mobileNavPath, "utf8");

  assert.match(source, /prefetch=\{false\}/);
  assert.match(mobileSource, /prefetch=\{false\}/);
});

test("source files no longer reference the old Assumerai logo asset", () => {
  const oldLogoPath = ["/logos", ["assumer", "logo.png"].join("-")].join("/");
  const offenders = collectSourceFiles(srcPath).filter((filePath) =>
    readFileSync(filePath, "utf8").includes(oldLogoPath),
  );

  assert.deepEqual(offenders, []);
});

test("mobile menu links to the dedicated auth routes", () => {
  const source = readFileSync(mobileNavPath, "utf8");

  assert.match(source, /href="\/login"/);
  assert.match(source, /href="\/signup"/);
  assert.doesNotMatch(source, /href="#signin"/);
  assert.doesNotMatch(source, /href="#begin"/);
});

test("mobile menu mirrors signed-in account and sign-out actions", () => {
  const source = readFileSync(mobileNavPath, "utf8");

  assert.match(source, /isSignedIn/);
  assert.match(source, /accountHref/);
  assert.match(source, /href=\{accountHref\}/);
  assert.match(source, /onSignOut/);
  assert.match(source, /void onSignOut\(\)/);
  assert.match(source, /t\.common\.userAccount/);
  assert.match(source, /t\.common\.signOut/);
});
