import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");

test("candidate match consent uses a server-owned shareable category allowlist", () => {
  const consentSource = read("src", "features", "matching", "candidate-match-consent.ts");

  assert.match(consentSource, /resolveEmployerSharingDataCategories/);
  assert.doesNotMatch(consentSource, /input\.dataCategories\s*\?\?\s*DEFAULT_MATCH_SHARING_CATEGORIES/);
  assert.match(consentSource, /!EXCLUDED_MATCH_SHARING_CATEGORIES\.includes\(category\)/);
  assert.match(consentSource, /DEFAULT_MATCH_SHARING_CATEGORIES\.includes\(category\)/);
});

test("candidate match decision route enforces scoped server-side sharing metadata", () => {
  const routeSource = read(
    "src",
    "app",
    "candidate",
    "matches",
    "decision",
    "route.ts"
  );

  assert.match(routeSource, /DEFAULT_MATCH_SHARING_CATEGORIES/);
  assert.match(routeSource, /EXCLUDED_MATCH_SHARING_CATEGORIES/);
  assert.match(routeSource, /requires matchId, companyId, roleId/);
  assert.match(routeSource, /candidate_match_not_visible/);
  assert.match(
    routeSource,
    /\.from\("company_candidate_matches"\)[\s\S]+\.eq\("candidate_user_id",\s*candidateContext\.user\.id\)[\s\S]+\.eq\("match_id",\s*matchId\)[\s\S]+\.eq\("company_id",\s*companyId\)[\s\S]+\.eq\("role_id",\s*roleId\)/,
  );
  assert.doesNotMatch(routeSource, /dataCategories:\s*readStringArray\(payload\.dataCategories\)/);
  assert.doesNotMatch(routeSource, /excludedCategories:\s*readStringArray\(payload\.excludedCategories\)/);
  assert.doesNotMatch(routeSource, /matchScore\s*=\s*readNumber\(payload\.matchScore\)/);
  assert.doesNotMatch(routeSource, /evidence\s*=\s*readStringArray\(payload\.evidence\)/);
});

test("candidate match inbox only updates visible decisions after server persistence succeeds", () => {
  const inboxSource = read("src", "components", "candidate", "CandidateMatchInbox.tsx");

  assert.match(inboxSource, /await persistCandidateMatchDecision\(match, decision\)/);
  assert.doesNotMatch(inboxSource, /void persistCandidateMatchDecision\(match, decision\)/);
  assert.match(inboxSource, /setDecisionError/);
});

test("candidate dashboard match actions do not record client-only decisions", () => {
  const dashboardSource = read("src", "components", "candidate", "CandidateDashboard.tsx");

  assert.match(dashboardSource, /await persistCandidateDashboardMatchDecision\(match, decision\)/);
  assert.doesNotMatch(
    dashboardSource,
    /updateCandidateMatchDecision\(\s*current,\s*matchId,\s*"accepted"/
  );
});

test("candidate results and dashboard avoid parser implementation language", () => {
  const ownedCandidateSources = [
    read("src", "components", "candidate", "candidate-results-review-model.ts"),
    read("src", "components", "candidate", "candidate-dashboard-model.ts"),
    read("src", "components", "candidate", "CandidateDashboard.tsx")
  ].join("\n");

  assert.doesNotMatch(ownedCandidateSources, /parser confidence/i);
  assert.match(ownedCandidateSources, /profile extraction confidence/i);
});

test("candidate matches show company review feedback in app", () => {
  const matchesPageSource = read("src", "app", "candidate", "matches", "page.tsx");
  const inboxSource = read("src", "components", "candidate", "CandidateMatchInbox.tsx");
  const dashboardModelSource = read("src", "components", "candidate", "candidate-dashboard-model.ts");

  assert.match(matchesPageSource, /materializeCandidateMatchesForCandidate/);
  assert.match(
    matchesPageSource,
    /await materializeCandidateMatchesForCandidate\(candidateContext\)[\s\S]*await readCandidateMatchFeedback\(candidateContext\)/
  );
  assert.match(matchesPageSource, /materializedMatches=/);
  assert.match(matchesPageSource, /readCandidateMatchFeedback/);
  assert.match(matchesPageSource, /companyFeedback=/);
  assert.match(dashboardModelSource, /CompanyMatchFeedback/);
  assert.match(dashboardModelSource, /company_advanced/);
  assert.match(dashboardModelSource, /company_hold/);
  assert.match(dashboardModelSource, /company_declined/);
  assert.match(dashboardModelSource, /buildCandidateMatchTimeline/);
  assert.match(inboxSource, /match-decision-timeline/);
  assert.match(inboxSource, /materializedMatches/);
  assert.doesNotMatch(
    inboxSource,
    /buildCandidateDashboardView\(candidateResultsReviewSeed\)\.matches\.map/,
  );
  assert.match(dashboardModelSource, /Candidate accepted/);
  assert.match(dashboardModelSource, /Company reviewing/);
  assert.match(dashboardModelSource, /Advanced by company/);
  assert.match(dashboardModelSource, /Still under review/);
  assert.match(dashboardModelSource, /Not moving forward/);
  assert.doesNotMatch(inboxSource, /Company advanced this match/);
  assert.doesNotMatch(inboxSource, /Company placed this match on hold/);
  assert.doesNotMatch(inboxSource, /Company declined this match/);
  assert.match(inboxSource, /company-feedback-card/);
  assert.match(inboxSource, /unresolved/);
  assert.match(inboxSource, /next-step/);
  assert.match(inboxSource, /decline-reason/);
  assert.match(inboxSource, /followUpAt/);
  assert.match(inboxSource, /nextStep/);
  assert.match(inboxSource, /Candidate-owned sharing only/);
  assert.doesNotMatch(inboxSource, /shared raw CV/i);
  assert.doesNotMatch(inboxSource, /shared raw interview media/i);
});
