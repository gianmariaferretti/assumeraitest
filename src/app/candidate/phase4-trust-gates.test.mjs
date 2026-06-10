import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

// ---------------------------------------------------------------------------
// Item 1 — deepgram-token: security gates fail closed in production
// ---------------------------------------------------------------------------

test("deepgram token gates fail closed when Supabase progress is unreadable", () => {
  const routeSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "deepgram-token",
    "route.ts",
  );

  // Unreadable progress + no explicitly-enabled local fallback -> 503.
  assert.match(routeSource, /shouldAllowLocalCandidateFallback/);
  assert.match(routeSource, /candidate_progress_unavailable/);
  assert.match(routeSource, /503/);
  assert.ok(
    routeSource.indexOf("candidate_progress_unavailable") <
      routeSource.indexOf("assumerai_profile_confirmed"),
    "the fail-closed check must run before any cookie is consulted",
  );

  // Cookies are only read behind the explicit local-dev fallback flag.
  assert.match(routeSource, /allowCookieFallback/);
  assert.match(
    routeSource,
    /allowCookieFallback &&\s*\n?\s*request\.cookies\.get\("assumerai_profile_confirmed"\)/,
  );
  assert.match(
    routeSource,
    /allowCookieFallback &&\s*\n?\s*request\.cookies\.get\("assumerai_ai_disclosure_acknowledged"\)/,
  );
  assert.match(
    routeSource,
    /allowCookieFallback &&\s*\n?\s*request\.cookies\.get\("assumerai_interview_device_check_completed"\)/,
  );

  // The flag helper is the single production switch (reused, not re-derived).
  const contextSource = read(
    "src",
    "features",
    "candidate-persistence",
    "supabase-candidate-context.ts",
  );
  assert.match(contextSource, /ASSUMERAI_ALLOW_LOCAL_CANDIDATE_FALLBACK/);
  assert.match(
    contextSource,
    /process\.env\.NODE_ENV !== "production" \|\|\s*\n?\s*process\.env\.ASSUMERAI_ALLOW_LOCAL_CANDIDATE_FALLBACK === "true"/,
  );
});

// ---------------------------------------------------------------------------
// Item 2 — ownership audit fixes
// ---------------------------------------------------------------------------

test("profile confirmation rejects resume documents owned by another candidate", () => {
  const routeSource = read(
    "src",
    "app",
    "candidate",
    "profile",
    "confirm",
    "action",
    "route.ts",
  );

  assert.match(routeSource, /review\.profile\.candidate_id !== candidateId/);
  assert.match(routeSource, /profile_ownership_required/);
  assert.match(routeSource, /status: 403/);
  // The ownership check happens before the pipeline confirm runs.
  assert.ok(
    routeSource.indexOf("profile_ownership_required") <
      routeSource.indexOf("candidateResumeProfilePipeline.confirm"),
    "ownership must be verified before confirming the profile",
  );
});

test("candidate data workflows never read the acting candidate id from the request", () => {
  const routeSource = read("src", "app", "candidate", "data", "request", "route.ts");

  assert.doesNotMatch(routeSource, /x-candidate-id/);
  assert.doesNotMatch(routeSource, /readOptionalString\(payload\.candidateId\)/);
  assert.match(routeSource, /candidateContext\.candidateId/);
});

// ---------------------------------------------------------------------------
// Item 2 — audited-clean routes stay scoped to the authenticated owner
// ---------------------------------------------------------------------------

test("candidate match decisions verify candidate-visible ownership server-side", () => {
  const routeSource = read("src", "app", "candidate", "matches", "decision", "route.ts");

  // matchId/companyId/roleId from the body are only honored when a row scoped
  // to the authenticated candidate (and candidate_visible) exists.
  assert.match(routeSource, /eq\("candidate_user_id", candidateContext\.user\.id\)/);
  assert.match(routeSource, /eq\("status", "candidate_visible"\)/);
  assert.match(routeSource, /candidate_match_not_visible/);
});

test("company routes scope every read and write to the membership-resolved company", () => {
  const companyRoutes = [
    ["src", "app", "company", "review", "[matchId]", "decision", "route.ts"],
    ["src", "app", "company", "roles", "[roleId]", "status", "route.ts"],
    ["src", "app", "company", "roles", "[roleId]", "update", "route.ts"],
  ];

  for (const segments of companyRoutes) {
    const source = read(...segments);
    assert.match(source, /resolveCompanyRouteContext/, segments.join("/"));
    assert.match(
      source,
      /eq\("company_id", companyContext\.companyId\)/,
      `${segments.join("/")} must filter by the resolved company id`,
    );
  }

  // Company identity comes from company_memberships (auth uid -> workspace),
  // never from the request.
  const contextSource = read(
    "src",
    "features",
    "company-workspace",
    "company-route-context.ts",
  );
  assert.match(contextSource, /company_memberships/);
});
