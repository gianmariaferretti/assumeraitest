import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const dashboardPagePath = path.join(rootDir, "src", "app", "company", "dashboard", "page.tsx");
const roleNewPagePath = path.join(rootDir, "src", "app", "company", "roles", "new", "page.tsx");
const onboardingPagePath = path.join(rootDir, "src", "app", "company", "onboarding", "page.tsx");
const onboardingSubmitRoutePath = path.join(
  rootDir,
  "src",
  "app",
  "company",
  "onboarding",
  "submit",
  "route.ts",
);
const roleDetailPagePath = path.join(rootDir, "src", "app", "company", "roles", "[roleId]", "page.tsx");
const roleUpdateRoutePath = path.join(
  rootDir,
  "src",
  "app",
  "company",
  "roles",
  "[roleId]",
  "update",
  "route.ts",
);
const roleLifecycleRoutePath = path.join(
  rootDir,
  "src",
  "app",
  "company",
  "roles",
  "[roleId]",
  "status",
  "route.ts",
);
const reviewPagePath = path.join(rootDir, "src", "app", "company", "review", "[matchId]", "page.tsx");
const reviewDecisionRoutePath = path.join(
  rootDir,
  "src",
  "app",
  "company",
  "review",
  "[matchId]",
  "decision",
  "route.ts",
);
const dashboardComponentPath = path.join(
  rootDir,
  "src",
  "components",
  "company",
  "CompanyDashboard.tsx",
);
const roleWizardComponentPath = path.join(
  rootDir,
  "src",
  "components",
  "company",
  "CompanyRoleWizard.tsx",
);
const reviewComponentPath = path.join(
  rootDir,
  "src",
  "components",
  "company",
  "CompanyCandidateReview.tsx",
);
const onboardingComponentPath = path.join(
  rootDir,
  "src",
  "components",
  "company",
  "CompanyOnboarding.tsx",
);
const routeContextPath = path.join(
  rootDir,
  "src",
  "features",
  "company-workspace",
  "company-route-context.ts",
);

test("company dashboard routes exist and use the company route context", () => {
  for (const routePath of [
    dashboardPagePath,
    onboardingPagePath,
    roleNewPagePath,
    roleDetailPagePath,
    reviewPagePath,
  ]) {
    assert.ok(existsSync(routePath), `expected route ${routePath}`);
    const source = readFileSync(routePath, "utf8");
    assert.match(source, /resolveCompanyRouteContext/);
    assert.match(source, /\/login\?next=\/company/);
  }
});

test("company dashboard does not bounce unavailable company workspaces back to profile", () => {
  const pageSource = readFileSync(dashboardPagePath, "utf8");
  const dashboardSource = readFileSync(dashboardComponentPath, "utf8");
  const routeContextSource = readFileSync(routeContextPath, "utf8");

  assert.match(pageSource, /company_workspace_unavailable/);
  assert.match(pageSource, /CompanyDashboardSetupFallback/);
  assert.match(pageSource, /companyContext\.code\s*===\s*"company_workspace_unavailable"/);
  assert.match(dashboardSource, /export function CompanyDashboardSetupFallback/);
  assert.match(dashboardSource, /copy\.firstRun\.fallbackTitle/);
  assert.doesNotMatch(pageSource, /Workspace setup is still preparing/);
  assert.doesNotMatch(pageSource, /Company workspace tables are not ready/);
  assert.doesNotMatch(pageSource, /Retry workspace setup/);
  assert.doesNotMatch(pageSource, /Continue company setup/);
  assert.match(routeContextSource, /createAdminClient/);
  assert.match(routeContextSource, /bootstrapCompanyWorkspace/);
});

test("company onboarding page and submit route are protected and profile-backed", () => {
  assert.ok(existsSync(onboardingPagePath), "expected company onboarding page");
  assert.ok(existsSync(onboardingSubmitRoutePath), "expected company onboarding submit route");

  const pageSource = readFileSync(onboardingPagePath, "utf8");
  const routeSource = readFileSync(onboardingSubmitRoutePath, "utf8");
  const onboardingSource = readFileSync(onboardingComponentPath, "utf8");

  assert.match(pageSource, /resolveCompanyRouteContext/);
  assert.match(pageSource, /\/login\?next=\/company\/onboarding/);
  assert.match(pageSource, /CompanyOnboarding/);
  assert.match(routeSource, /resolveCompanyRouteContext/);
  assert.match(routeSource, /updateCompanyWorkspaceProfile/);
  assert.match(routeSource, /profilePayload/);
  assert.match(routeSource, /domain/);
  assert.match(routeSource, /hiring_locations/);
  assert.match(routeSource, /primary_contact/);
  assert.match(onboardingSource, /"use client"/);
  assert.match(onboardingSource, /useI18n/);
  assert.match(onboardingSource, /t\.companyOnboarding/);
  assert.match(onboardingSource, /font-family:\s*var\(--font-geist-sans\),\s*sans-serif/);
  assert.match(onboardingSource, /padding:\s*clamp\(104px/);
  assert.doesNotMatch(onboardingSource, /Confirm the workspace profile|Company profile|Save profile/);
});

test("company dashboard exposes lifecycle queues and onboarding status", () => {
  const dashboardSource = readFileSync(dashboardComponentPath, "utf8");

  assert.match(dashboardSource, /"use client"/);
  assert.match(dashboardSource, /useI18n/);
  assert.match(dashboardSource, /t\.companyDashboard/);
  assert.match(dashboardSource, /font-family:\s*var\(--font-geist-sans\),\s*sans-serif/);
  assert.doesNotMatch(dashboardSource, /font-family:\s*(?:Georgia|"Times New Roman"|ui-serif|serif)/);
  assert.doesNotMatch(dashboardSource, /padding:\s*clamp\(104px/);
  assert.doesNotMatch(dashboardSource, /font-size:\s*clamp\(2rem,\s*4vw,\s*4rem\)/);
  assert.match(dashboardSource, /CompanyFirstRunDashboard/);
  assert.match(dashboardSource, /dashboard\.roles\.length\s*===\s*0/);
  assert.match(dashboardSource, /copy\.actions\.finishSetup/);
  assert.match(dashboardSource, /copy\.actions\.createFirstRole/);
  assert.match(dashboardSource, /<strong>\{dashboard\.companyName\}<\/strong>/);
  assert.match(dashboardSource, /getInitials\(dashboard\.companyName\)/);
  assert.doesNotMatch(dashboardSource, />Assumerai</);
  assert.doesNotMatch(dashboardSource, />Assumer</);
  assert.match(dashboardSource, /company-sidebar-footer-count/);
  assert.match(dashboardSource, /href="\/company\/dashboard#candidates"/);
  assert.match(dashboardSource, /href="\/company\/dashboard#schedule"/);
  assert.match(dashboardSource, /href="\/company\/dashboard#analytics"/);
  assert.match(dashboardSource, /id="overview"/);
  assert.match(dashboardSource, /id="candidates"/);
  assert.match(dashboardSource, /id="schedule"/);
  assert.match(dashboardSource, /id="analytics"/);

  for (const label of ["New", "On hold", "Overdue", "Advanced", "Declined"]) {
    assert.doesNotMatch(dashboardSource, new RegExp(`>${label}<|${label} queue`));
  }

  assert.match(dashboardSource, /candidate_accepted/);
  assert.match(dashboardSource, /company_hold/);
  assert.match(dashboardSource, /company_advanced/);
  assert.match(dashboardSource, /company_declined/);
  assert.match(dashboardSource, /isOverdue/);
  assert.match(dashboardSource, /onboarding/i);
  assert.match(dashboardSource, /\/company\/onboarding/);
});

test("company dashboard keeps a compact localized app workspace structure", () => {
  const dashboardSource = readFileSync(dashboardComponentPath, "utf8");

  const workspaceConcepts = [
    {
      label: "sidebar or workspace nav",
      pattern: /<nav\b|company-(?:sidebar|side-nav|workspace-nav)|copy\.(?:nav|navigation)\./,
    },
    {
      label: "search",
      pattern: /type="search"|company-search|copy\.search\./,
    },
    {
      label: "metrics",
      pattern: /company-metrics|copy\.metrics\./,
    },
    {
      label: "candidate queue",
      pattern: /candidate-queue|copy\.panels\.candidateQueues|copy\.firstRun\.candidateQueue/,
    },
    {
      label: "role pipeline",
      pattern: /role-pipeline|company-role-pipeline|copy\.(?:pipeline|panels\.rolePipeline)\./,
    },
    {
      label: "schedule or review",
      pattern: /schedule-review|copy\.(?:schedule|review|panels\.scheduleReview)\.|copy\.match\.reviewDueAt|reviewDueAt/,
    },
    {
      label: "analytics",
      pattern: /company-analytics|copy\.(?:analytics|panels\.analytics)\./,
    },
  ];

  const missingConcepts = workspaceConcepts
    .filter(({ pattern }) => !pattern.test(dashboardSource))
    .map(({ label }) => label);

  assert.deepEqual(missingConcepts, [], "expected compact dashboard concepts");
});

test("company dashboard fallback and setup states stay localized", () => {
  const pageSource = readFileSync(dashboardPagePath, "utf8");
  const dashboardSource = readFileSync(dashboardComponentPath, "utf8");

  assert.match(pageSource, /CompanyDashboardSetupFallback/);
  assert.match(dashboardSource, /useI18n/);
  assert.match(dashboardSource, /copy\.firstRun\.fallbackTitle/);
  assert.match(dashboardSource, /copy\.firstRun\.fallbackBody/);
  assert.match(dashboardSource, /copy\.firstRun\.backToProfile/);
  assert.doesNotMatch(
    dashboardSource,
    />\s*(?:Set up your hiring workspace|Confirm the company details once|Back to company profile|Finish company setup)\s*</,
  );
});

test("company dashboard does not expose raw candidate media or CV wording", () => {
  const dashboardSource = readFileSync(dashboardComponentPath, "utf8");

  assert.doesNotMatch(
    dashboardSource,
    /\braw\s+(?:cv|resume|audio|video|media)\b|rawCv|rawResume|rawAudio|rawVideo|rawMediaUrl|recordingUrl|audio recording|video recording/i,
  );
  assert.doesNotMatch(dashboardSource, /<audio\b|<video\b/i);
});

test("company role detail supports edit and lifecycle action routes", () => {
  assert.ok(existsSync(roleUpdateRoutePath), "expected company role edit route");
  assert.ok(existsSync(roleLifecycleRoutePath), "expected company role lifecycle route");

  const detailSource = readFileSync(roleDetailPagePath, "utf8");
  const dashboardSource = readFileSync(dashboardComponentPath, "utf8");
  const updateSource = readFileSync(roleUpdateRoutePath, "utf8");
  const lifecycleSource = readFileSync(roleLifecycleRoutePath, "utf8");

  assert.match(detailSource, /params: Promise/);
  assert.match(updateSource, /validateCompanyRoleIntake/);
  assert.match(updateSource, /company_roles/);
  assert.match(lifecycleSource, /pause/);
  assert.match(lifecycleSource, /close/);
  assert.match(lifecycleSource, /activate|reopen/);
  assert.match(lifecycleSource, /company_roles/);
  assert.match(dashboardSource, /role-edit-form/);
  assert.match(dashboardSource, /name="action"/);
  assert.match(dashboardSource, /value="pause"/);
  assert.match(dashboardSource, /value="close"/);
  assert.match(dashboardSource, /value="activate"/);
  assert.match(dashboardSource, /role-status-closed/);
  assert.match(dashboardSource, /role-status-paused/);
});

test("company review decision route records auditable human decisions", () => {
  assert.ok(existsSync(reviewDecisionRoutePath), "expected company review decision route");
  const source = readFileSync(reviewDecisionRoutePath, "utf8");

  assert.match(source, /recordCompanyMatchDecision/);
  assert.match(source, /advance/);
  assert.match(source, /hold/);
  assert.match(source, /decline/);
  assert.match(source, /reason/);
  assert.match(source, /followUpAt/);
  assert.match(source, /audit_event/);
  assert.match(source, /\/company\/review\/\$\{matchId\}\?error=/);
  assert.match(source, /redirectPath:[\s\S]+status:\s*400/);
});

test("company UI covers dashboard, role setup, SLA queue, evidence review, and empty states", () => {
  for (const componentPath of [
    dashboardComponentPath,
    roleWizardComponentPath,
    reviewComponentPath,
  ]) {
    assert.ok(existsSync(componentPath), `expected component ${componentPath}`);
  }

  const dashboardSource = readFileSync(dashboardComponentPath, "utf8");
  const roleWizardSource = readFileSync(roleWizardComponentPath, "utf8");
  const reviewSource = readFileSync(reviewComponentPath, "utf8");

  assert.match(dashboardSource, /reviewDueAt/);
  assert.match(dashboardSource, /overdue/);
  assert.match(dashboardSource, /empty-state/);
  assert.match(roleWizardSource, /"use client"/);
  assert.match(roleWizardSource, /useI18n/);
  assert.match(roleWizardSource, /t\.companyRoleWizard/);
  assert.match(roleWizardSource, /font-family:\s*var\(--font-geist-sans\),\s*sans-serif/);
  assert.match(roleWizardSource, /padding:\s*clamp\(104px/);
  assert.doesNotMatch(roleWizardSource, /Validation ready|validationReady|CheckCircle2/);
  assert.match(roleWizardSource, /daily_work_reality/);
  assert.doesNotMatch(roleWizardSource, /Structured role intake|Create role|Tech Risk Analyst/);
  assert.match(reviewSource, /"use client"/);
  assert.match(reviewSource, /useI18n/);
  assert.match(reviewSource, /t\.companyReview/);
  assert.match(reviewSource, /font-family:\s*var\(--font-geist-sans\),\s*sans-serif/);
  assert.match(reviewSource, /padding:\s*clamp\(104px/);
  assert.match(reviewSource, /transcriptExcerpt/);
  assert.match(reviewSource, /copy\.scorecard/);
  assert.match(reviewSource, /copy\.rawMediaExcluded/);
  assert.match(reviewSource, /company-review-actions/);
});

test("company review surfaces consent scope and audit history without raw media", () => {
  const reviewSource = readFileSync(reviewComponentPath, "utf8");
  const reviewPageSource = readFileSync(reviewPagePath, "utf8");

  assert.match(reviewPageSource, /params: Promise/);
  assert.match(reviewSource, /copy\.consentScope/);
  assert.match(reviewSource, /profile/);
  assert.match(reviewSource, /scorecard/);
  assert.match(reviewSource, /match_explanation/);
  assert.match(reviewSource, /interview_transcript/);
  assert.match(reviewSource, /copy\.auditHistory/);
  assert.match(reviewSource, /companyDecisionReason/);
  assert.doesNotMatch(reviewSource, /<audio|<video|rawMediaUrl|recordingUrl/);
});

test("company role create route redirects form users with usable validation errors", () => {
  const createSource = readFileSync(
    path.join(rootDir, "src", "app", "company", "roles", "create", "route.ts"),
    "utf8",
  );
  const roleNewSource = readFileSync(roleNewPagePath, "utf8");
  const roleWizardSource = readFileSync(roleWizardComponentPath, "utf8");

  assert.match(createSource, /accept/i);
  assert.match(createSource, /application\/json/);
  assert.match(createSource, /company_role_invalid/);
  assert.match(createSource, /\/company\/roles\/new\?error=/);
  assert.match(roleNewSource, /searchParams/);
  assert.match(roleWizardSource, /role-form-error/);
});
