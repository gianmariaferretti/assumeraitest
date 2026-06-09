import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

test("Deepgram token route requires an authenticated candidate context before issuing browser credentials", () => {
  const routeSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "deepgram-token",
    "route.ts"
  );

  assert.match(routeSource, /resolveCandidateRouteContext\(\{\s*allowLocalFallback: false\s*\}\)/s);
  assert.match(routeSource, /readCandidateProgress\(candidateContext\)/);
  assert.match(routeSource, /device_check_required/);
  assert.match(routeSource, /disclosureAcknowledged/);
  assert.doesNotMatch(routeSource, /credential: apiKey/);
});

test("camera and microphone prep stop late media streams when async permission prompts resolve after cleanup", () => {
  const viewfinderSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "CandidateViewfinder.tsx"
  );
  const prepSource = read("src", "components", "candidate", "InterviewDevicePrep.tsx");

  assert.match(viewfinderSource, /isMountedRef/);
  assert.match(viewfinderSource, /stopStream\(userStream\);\s*return;/s);
  assert.match(prepSource, /isMountedRef/);
  assert.match(prepSource, /stopStream\(stream\);\s*return;/s);
});
