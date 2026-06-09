import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const authSessionPath = path.join(rootDir, "src", "lib", "auth", "session.ts");
const accountRolePath = path.join(rootDir, "src", "lib", "auth", "account-role.ts");
const profilePagePath = path.join(rootDir, "src", "app", "profile", "page.tsx");
const profileContentPath = path.join(rootDir, "src", "app", "profile", "profile-content.tsx");
const settingsPagePath = path.join(
  rootDir,
  "src",
  "app",
  "profile",
  "settings",
  "page.tsx",
);
const settingsContentPath = path.join(
  rootDir,
  "src",
  "app",
  "profile",
  "settings",
  "profile-settings-content.tsx",
);
const companyProfilePagePath = path.join(
  rootDir,
  "src",
  "app",
  "company",
  "profile",
  "page.tsx",
);
const companySettingsPagePath = path.join(
  rootDir,
  "src",
  "app",
  "company",
  "profile",
  "settings",
  "page.tsx",
);
const authComponentPath = path.join(
  rootDir,
  "src",
  "components",
  "auth",
  "auth-component.tsx",
);
const callbackRoutePath = path.join(
  rootDir,
  "src",
  "app",
  "auth",
  "callback",
  "route.ts",
);
const confirmRoutePath = path.join(
  rootDir,
  "src",
  "app",
  "auth",
  "confirm",
  "route.ts",
);
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");

test("profile account routes are protected by a server-side Supabase session check", () => {
  assert.ok(existsSync(authSessionPath), "expected auth session helper to exist");
  assert.ok(existsSync(accountRolePath), "expected account role helper to exist");
  assert.ok(existsSync(profilePagePath), "expected /profile page to exist");
  assert.ok(existsSync(settingsPagePath), "expected /profile/settings page to exist");
  assert.ok(existsSync(companyProfilePagePath), "expected /company/profile page to exist");
  assert.ok(
    existsSync(companySettingsPagePath),
    "expected /company/profile/settings page to exist",
  );

  const sessionSource = readFileSync(authSessionPath, "utf8");
  const profileSource = readFileSync(profilePagePath, "utf8");
  const settingsSource = readFileSync(settingsPagePath, "utf8");
  const companyProfileSource = readFileSync(companyProfilePagePath, "utf8");
  const companySettingsSource = readFileSync(companySettingsPagePath, "utf8");

  assert.match(sessionSource, /import\s+"server-only"/);
  assert.match(sessionSource, /cache\(/);
  assert.match(sessionSource, /supabase\.auth\.getUser\(\)/);
  assert.match(sessionSource, /redirect\("\/login\?next=\/profile"\)/);
  assert.match(profileSource, /requireUser\(\)/);
  assert.match(settingsSource, /requireUser\(\)/);
  assert.match(companyProfileSource, /requireUser\("\/company\/profile"\)/);
  assert.match(companySettingsSource, /requireUser\("\/company\/profile\/settings"\)/);
});

test("profile account pages render signed-in user identity through translated client views", () => {
  const profileSource = readFileSync(profilePagePath, "utf8");
  const profileContentSource = readFileSync(profileContentPath, "utf8");
  const settingsSource = readFileSync(settingsPagePath, "utf8");
  const settingsContentSource = readFileSync(settingsContentPath, "utf8");

  assert.match(profileSource, /title:\s*"Profile \| Assumerai"/);
  assert.doesNotMatch(profileSource, /Profile \| AssumerAI/);
  assert.match(profileSource, /user\.email/);
  assert.match(profileSource, /ProfileContent/);
  assert.match(profileContentSource, /"use client"/);
  assert.match(profileContentSource, /useI18n\(\)/);
  assert.match(profileContentSource, /t\.profile\[accountRole\]/);
  assert.match(profileContentSource, /t\.profile\.candidate/);
  assert.match(profileContentSource, /t\.profile\.company/);
  assert.match(settingsSource, /ProfileSettingsContent/);
  assert.match(settingsContentSource, /"use client"/);
  assert.match(settingsContentSource, /useI18n\(\)/);
  assert.match(settingsSource, /user\.email/);
  assert.match(settingsContentSource, /t\.profile\.settings/);
});

test("candidate profile links to the real candidate process, not the preview", () => {
  const i18nSource = readFileSync(i18nPath, "utf8");
  const profileContentSource = readFileSync(profileContentPath, "utf8");

  assert.match(i18nSource, /workspaceHref:\s*"\/candidate"/);
  assert.doesNotMatch(i18nSource, /workspaceHref:\s*"\/candidates\/app"/);
  assert.match(i18nSource, /workspaceCta:\s*"Start candidate process"/);
  assert.match(profileContentSource, /startSetup:\s*"Start the interview process"/);
  assert.match(profileContentSource, /href:\s*START_INTERVIEW_PROCESS_HREF/);
  assert.match(profileContentSource, /const START_INTERVIEW_PROCESS_HREF = "\/candidate\?selectLanguage=1"/);
});

test("company profile links to the real company dashboard workspace", () => {
  const i18nSource = readFileSync(i18nPath, "utf8");
  const profileContentSource = readFileSync(profileContentPath, "utf8");

  assert.match(i18nSource, /workspaceHref:\s*"\/company\/dashboard"/);
  assert.match(i18nSource, /workspaceCta:\s*"Open company dashboard"/);
  assert.doesNotMatch(i18nSource, /workspaceCta:\s*"Review hiring teams product"/);
  assert.match(profileContentSource, /href=\{profileCopy\.workspaceHref\}/);
});

test("successful auth sends users to the protected profile area", () => {
  const authSource = readFileSync(authComponentPath, "utf8");
  const callbackSource = readFileSync(callbackRoutePath, "utf8");
  const confirmSource = readFileSync(confirmRoutePath, "utf8");

  assert.match(authSource, /getProfilePathForRole\(accountRole\)/);
  assert.match(authSource, /router\.push\(successPath\)/);
  assert.match(authSource, /searchParams\.set\("next",\s*successPath\)/);
  assert.match(callbackSource, /getSafeProfileNextPath/);
  assert.match(confirmSource, /getSafeProfileNextPath/);
});

test("company accounts are routed away from candidate account pages", () => {
  const profileSource = readFileSync(profilePagePath, "utf8");
  const settingsSource = readFileSync(settingsPagePath, "utf8");
  const companyProfileSource = readFileSync(companyProfilePagePath, "utf8");
  const companySettingsSource = readFileSync(companySettingsPagePath, "utf8");

  assert.match(profileSource, /getUserAccountRole\(user\)/);
  assert.match(profileSource, /redirect\("\/company\/profile"\)/);
  assert.match(settingsSource, /getUserAccountRole\(user\)/);
  assert.match(settingsSource, /redirect\("\/company\/profile\/settings"\)/);
  assert.match(companyProfileSource, /getUserAccountRole\(user\)/);
  assert.match(companyProfileSource, /redirect\("\/profile"\)/);
  assert.match(companySettingsSource, /getUserAccountRole\(user\)/);
  assert.match(companySettingsSource, /redirect\("\/profile\/settings"\)/);
});

test("candidate profile layout keeps account controls left and interview progress primary", () => {
  const profileContentSource = readFileSync(profileContentPath, "utf8");

  assert.match(
    profileContentSource,
    /data-profile-layout="account-left-interview-primary"/,
  );
  assert.match(profileContentSource, /lg:grid-cols-\[320px_minmax\(0,1fr\)\]/);
  assert.match(profileContentSource, /data-profile-region="account-controls"/);
  assert.match(
    profileContentSource,
    /data-profile-primary="candidate-interview-progress"/,
  );
  assert.match(profileContentSource, /getSettingsPathForRole\(accountRole\)/);
  assert.doesNotMatch(profileContentSource, /profileCopy\.workflowCards\.map/);
});
