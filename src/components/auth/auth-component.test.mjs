import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const authComponentPath = path.join(
  rootDir,
  "src",
  "components",
  "auth",
  "auth-component.tsx",
);
const loginPagePath = path.join(rootDir, "src", "app", "login", "page.tsx");
const signupPagePath = path.join(rootDir, "src", "app", "signup", "page.tsx");

test("auth component is a reusable client component for login and signup modes", () => {
  assert.ok(existsSync(authComponentPath), "expected auth component to exist");

  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /export function AuthComponent/);
  assert.match(source, /mode\?:\s*"login"\s*\|\s*"signup"/);
  assert.match(source, /brandName = "Assumerai"/);
  assert.match(source, /t\.auth\.continueWith/);
  assert.match(source, /GoogleIcon/);
  assert.match(source, /GitHubIcon/);
  assert.match(source, /t\.auth\.confirmPasswordLabel/);
  assert.match(source, /var\(--font-geist-sans\), sans-serif/);
  assert.doesNotMatch(source, /font-instrument-serif/);
  assert.doesNotMatch(source, /canvas-confetti/);
});

test("login and signup modes reuse the shared globe language dropdown", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /import\s+\{\s*LanguageSelector\s*\}/);
  assert.match(source, /<LanguageSelector[\s\S]*className=/);
  assert.match(source, /fixed right-4 top-4 z-20/);
  assert.doesNotMatch(source, /!\s*isSignup\s*&&\s*<AuthLanguageSwitcher/);
  assert.doesNotMatch(source, /function AuthLanguageSwitcher/);
  assert.doesNotMatch(source, /authLanguageAccents/);
});

test("auth copy comes from shared i18n state instead of hardcoded English", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /const\s+\{\s*t\s*\}\s*=\s*useI18n\(\)/);
  assert.match(source, /t\.auth\.welcomeBack/);
  assert.match(source, /t\.auth\.emailInvalid/);
  assert.match(source, /t\.auth\.accountTypeLabel/);
  assert.match(source, /t\.auth\.companyAccount/);
  assert.doesNotMatch(source, /Welcome back/);
  assert.doesNotMatch(source, /Enter a valid email and password\./);
});

test("auth flow lets users choose candidate or company account role", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /AccountRole/);
  assert.match(source, /DEFAULT_ACCOUNT_ROLE/);
  assert.match(source, /ACCOUNT_ROLE_PARAM/);
  assert.match(source, /accountRole,\s*setAccountRole/);
  assert.match(source, /roleOptions\.map/);
  assert.match(source, /getProfilePathForRole\(accountRole\)/);
  assert.match(source, /searchParams\.set\(ACCOUNT_ROLE_PARAM,\s*role\)/);
  assert.match(source, /data:\s*\{[\s\S]*role:\s*accountRole[\s\S]*account_role:\s*accountRole/);
  assert.match(source, /updateUser\(\{[\s\S]*data:\s*\{[\s\S]*role:\s*accountRole[\s\S]*account_role:\s*accountRole/);
});

test("password prompt transition is quick but smooth after email step", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /AUTH_STEP_TRANSITION:\s*Transition\s*=\s*\{\s*duration:\s*0\.32/);
  assert.match(source, /AUTH_COPY_TRANSITION:\s*Transition\s*=\s*\{\s*duration:\s*0\.42/);
  assert.match(source, /AUTH_COPY_PANEL_CLASS\s*=[\s\S]*h-\[188px\]/);
  assert.match(source, /AUTH_COPY_ITEM_CLASS\s*=[\s\S]*absolute inset-x-0 top-0/);
  assert.match(source, /key="password-title"[\s\S]*transition=\{AUTH_COPY_TRANSITION\}/);
  assert.match(source, /className=\{AUTH_COPY_PANEL_CLASS\}/);
  assert.match(source, /className=\{AUTH_COPY_ITEM_CLASS\}/);
  assert.doesNotMatch(source, /AUTH_COPY_ITEM_CLASS\s*=[\s\S]*bottom-0/);
});

test("auth form fixes step height instead of recentering the fieldset", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /AUTH_FORM_PANEL_CLASS\s*=[\s\S]*h-\[172px\]/);
  assert.match(source, /AUTH_FORM_STACK_CLASS\s*=[\s\S]*absolute inset-x-0 top-0/);
  assert.match(source, /AUTH_FORM_SINGLE_CLASS\s*=[\s\S]*absolute inset-x-0 top-0/);
  assert.match(source, /className=\{AUTH_FORM_PANEL_CLASS\}/);
  assert.match(source, /className=\{AUTH_FORM_STACK_CLASS\}/);
  assert.match(source, /className=\{AUTH_FORM_SINGLE_CLASS\}/);
  assert.doesNotMatch(source, /<motion\.fieldset[\s\S]*layout/);
  assert.doesNotMatch(source, /AUTH_FORM_PANEL_CLASS\s*=[\s\S]*min-h-\[172px\]/);
});

test("password field keeps a constant action slot while typing", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(
    source,
    /isPasswordValid\s*\?\s*"opacity-100"\s*:\s*"pointer-events-none opacity-0"/,
  );
  assert.match(source, /disabled=\{!isPasswordValid\}/);
  assert.doesNotMatch(source, /isPasswordValid \? "w-10 pr-1" : "w-0"/);
});

test("account footer reserves space so delayed text does not recenter the form", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /AUTH_FOOTER_SLOT_CLASS\s*=[\s\S]*h-6/);
  assert.match(source, /AUTH_FOOTER_TEXT_CLASS\s*=[\s\S]*absolute inset-x-0 top-0/);
  assert.match(source, /className=\{AUTH_FOOTER_SLOT_CLASS\}/);
  assert.match(source, /className=\{AUTH_FOOTER_TEXT_CLASS\}/);
  assert.doesNotMatch(source, /<BlurFade delay=\{0\.82\}>/);
});

test("blur fade lands on its actual layout position", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /inView\s*=\s*false/);
  assert.match(source, /visible:\s*\{\s*y:\s*0,\s*opacity:\s*1/);
  assert.doesNotMatch(source, /visible:\s*\{\s*y:\s*-yOffset/);
  assert.doesNotMatch(source, /<BlurFade inView/);
});

test("login and signup routes render the auth component with the correct mode", () => {
  assert.ok(existsSync(loginPagePath), "expected /login page to exist");
  assert.ok(existsSync(signupPagePath), "expected /signup page to exist");

  const loginSource = readFileSync(loginPagePath, "utf8");
  const signupSource = readFileSync(signupPagePath, "utf8");

  assert.match(loginSource, /<AuthComponent mode="login"/);
  assert.match(signupSource, /<AuthComponent mode="signup"/);
});
