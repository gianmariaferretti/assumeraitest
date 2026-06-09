import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const packageJsonPath = path.join(rootDir, "package.json");
const authComponentPath = path.join(
  rootDir,
  "src",
  "components",
  "auth",
  "auth-component.tsx",
);
const browserClientPath = path.join(rootDir, "src", "lib", "supabase", "client.ts");
const serverClientPath = path.join(rootDir, "src", "lib", "supabase", "server.ts");
const proxyClientPath = path.join(rootDir, "src", "lib", "supabase", "proxy.ts");
const rootProxyPath = path.join(rootDir, "src", "proxy.ts");
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
const accountRolePath = path.join(rootDir, "src", "lib", "auth", "account-role.ts");

test("supabase auth packages are installed for Next.js SSR auth", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  assert.ok(packageJson.dependencies["@supabase/ssr"]);
  assert.ok(packageJson.dependencies["@supabase/supabase-js"]);
});

test("supabase clients use public project env values and SSR cookies", () => {
  assert.ok(existsSync(browserClientPath), "expected browser Supabase client");
  assert.ok(existsSync(serverClientPath), "expected server Supabase client");
  assert.ok(existsSync(proxyClientPath), "expected Supabase session proxy helper");

  const browserSource = readFileSync(browserClientPath, "utf8");
  const serverSource = readFileSync(serverClientPath, "utf8");
  const proxySource = readFileSync(proxyClientPath, "utf8");

  assert.match(browserSource, /createBrowserClient/);
  assert.match(browserSource, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(browserSource, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(browserSource, /SUPABASE_SECRET|SERVICE_ROLE|sb_secret/);

  assert.match(serverSource, /createServerClient/);
  assert.match(serverSource, /cookies\(\)/);
  assert.match(serverSource, /getAll\(\)/);
  assert.match(serverSource, /setAll/);

  assert.match(proxySource, /createServerClient/);
  assert.match(proxySource, /supabase\.auth\.getUser\(\)/);
});

test("auth UI submits to Supabase instead of simulating success", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /createClient/);
  assert.match(source, /isSubmittingRef/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /signUp/);
  assert.match(source, /signInWithOAuth/);
  assert.match(source, /provider:\s*"google"/);
  assert.match(source, /provider:\s*"github"/);
  assert.doesNotMatch(source, /window\.setTimeout\(\(\)\s*=>\s*\{\s*fireSideCanons\(\);\s*setModalStatus\("success"\)/);
});

test("auth persists selected account role in Supabase metadata", () => {
  assert.ok(existsSync(accountRolePath), "expected shared account role helper");

  const source = readFileSync(authComponentPath, "utf8");
  const accountRoleSource = readFileSync(accountRolePath, "utf8");

  assert.match(accountRoleSource, /export type AccountRole = "candidate" \| "company"/);
  assert.match(accountRoleSource, /normalizeAccountRole/);
  assert.match(accountRoleSource, /getUserAccountRole/);
  assert.match(accountRoleSource, /getProfilePathForRole/);
  assert.match(source, /supabase\.auth\.signUp\(\{[\s\S]*options:\s*\{[\s\S]*data:\s*\{/);
  assert.match(source, /role:\s*accountRole/);
  assert.match(source, /account_role:\s*accountRole/);
  assert.match(source, /supabase\.auth\.updateUser\(\{/);
});

test("glass button wrapper does not duplicate nested button clicks", () => {
  const source = readFileSync(authComponentPath, "utf8");

  assert.match(source, /event\.target instanceof Element/);
  assert.match(source, /event\.target\.closest\("button"\)/);
  assert.doesNotMatch(source, /event\.target !== button/);
});

test("auth callback, email confirmation, and session proxy routes exist", () => {
  assert.ok(existsSync(rootProxyPath), "expected src/proxy.ts");
  assert.ok(existsSync(callbackRoutePath), "expected OAuth callback route");
  assert.ok(existsSync(confirmRoutePath), "expected email confirmation route");

  const rootProxySource = readFileSync(rootProxyPath, "utf8");
  const callbackSource = readFileSync(callbackRoutePath, "utf8");
  const confirmSource = readFileSync(confirmRoutePath, "utf8");

  assert.match(rootProxySource, /export async function proxy/);
  assert.match(rootProxySource, /updateSession/);
  assert.match(rootProxySource, /matcher/);
  assert.match(callbackSource, /exchangeCodeForSession/);
  assert.match(confirmSource, /verifyOtp/);
});

test("auth callback and confirmation preserve role-aware safe profile redirects", () => {
  const callbackSource = readFileSync(callbackRoutePath, "utf8");
  const confirmSource = readFileSync(confirmRoutePath, "utf8");

  assert.match(callbackSource, /ACCOUNT_ROLE_PARAM/);
  assert.match(callbackSource, /getSafeProfileNextPath/);
  assert.match(callbackSource, /syncAccountRole/);
  assert.match(callbackSource, /updateUser/);
  assert.match(confirmSource, /ACCOUNT_ROLE_PARAM/);
  assert.match(confirmSource, /getSafeProfileNextPath/);
  assert.match(confirmSource, /syncAccountRole/);
  assert.match(confirmSource, /updateUser/);
});
