import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

test("auth callback redirects stay on the request origin instead of trusting forwarded host headers", () => {
  const callbackSource = read("src", "app", "auth", "callback", "route.ts");

  assert.doesNotMatch(callbackSource, /x-forwarded-host/);
  assert.doesNotMatch(callbackSource, /forwardedHost/);
  assert.doesNotMatch(callbackSource, /https:\/\/\$\{[^}]*forwarded/i);
  assert.match(callbackSource, /NextResponse\.redirect\(new URL\(next,\s*request\.url\)\)/);
});
