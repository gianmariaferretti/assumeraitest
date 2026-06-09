import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../../../..");
const routeSource = readFileSync(
  path.join(rootDir, "src/app/candidate/profile/confirm/action/route.ts"),
  "utf8"
);

test("profile confirmation JSON responses set the same handoff cookies as redirects", () => {
  assert.match(routeSource, /function setCandidateProfileHandoffCookies/);
  assert.match(
    routeSource,
    /const response = NextResponse\.json\([\s\S]*?setCandidateProfileHandoffCookies\(response, resumeDocumentId\);[\s\S]*?return response;/
  );
  assert.match(
    routeSource,
    /const response = NextResponse\.redirect\([\s\S]*?setCandidateProfileHandoffCookies\(response, resumeDocumentId\);[\s\S]*?return response;/
  );
});
