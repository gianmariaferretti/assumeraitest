import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const pagePath = path.join(rootDir, "src", "app", "contact", "page.tsx");

test("contact route renders the combined contact and team page", () => {
  assert.ok(existsSync(pagePath), "expected /contact page to exist");
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /ContactTeamPage/);
  assert.match(source, /metadata/);
});
