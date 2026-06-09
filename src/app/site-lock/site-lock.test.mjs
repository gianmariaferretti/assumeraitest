import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const rootProxyPath = path.join(rootDir, "proxy.ts");
const proxyPath = path.join(rootDir, "src", "proxy.ts");
const passwordLibPath = path.join(rootDir, "src", "lib", "site-password.ts");
const lockPagePath = path.join(rootDir, "src", "app", "site-lock", "page.tsx");
const lockFormPath = path.join(rootDir, "src", "app", "site-lock", "site-lock-form.tsx");
const lockActionsPath = path.join(rootDir, "src", "app", "site-lock", "actions.ts");

test("site password lock files exist", () => {
  assert.ok(existsSync(proxyPath), "expected src/proxy.ts next to src/app");
  assert.equal(
    existsSync(rootProxyPath),
    false,
    "root proxy.ts is ignored when the app router lives under src/app",
  );
  assert.ok(existsSync(passwordLibPath), "expected shared password helper");
  assert.ok(existsSync(lockPagePath), "expected password lock page");
  assert.ok(existsSync(lockFormPath), "expected password lock form");
  assert.ok(existsSync(lockActionsPath), "expected server action for unlocking");
});

test("proxy protects pages before refreshing Supabase sessions", () => {
  const source = readFileSync(proxyPath, "utf8");

  assert.match(source, /hasSiteAccess/);
  assert.match(source, /redirectToSiteLock/);
  assert.match(source, /updateSession/);
  assert.ok(
    source.indexOf("if (!(await hasSiteAccess") <
      source.indexOf("return updateSession"),
    "site password must be checked before Supabase session refresh",
  );
});

test("site lock keeps the password server-side and stores only an access cookie", () => {
  const libSource = readFileSync(passwordLibPath, "utf8");
  const actionsSource = readFileSync(lockActionsPath, "utf8");
  const formSource = readFileSync(lockFormPath, "utf8");

  assert.match(libSource, /SITE_PASSWORD/);
  assert.match(libSource, /assumerai_site_access/);
  assert.match(actionsSource, /httpOnly:\s*true/);
  assert.match(actionsSource, /sameSite:\s*"lax"/);
  assert.match(actionsSource, /secure:\s*process\.env\.NODE_ENV === "production"/);
  assert.doesNotMatch(formSource, /SITE_PASSWORD/);
});

test("site password is not hardcoded in source", () => {
  const libSource = readFileSync(passwordLibPath, "utf8");
  const actionsSource = readFileSync(lockActionsPath, "utf8");

  assert.doesNotMatch(libSource, /FALLBACK_SITE_PASSWORD/);
  assert.doesNotMatch(actionsSource, /FALLBACK_SITE_PASSWORD/);
});
