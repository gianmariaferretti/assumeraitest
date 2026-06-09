import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const read = (...segments) => readFileSync(path.join(rootDir, ...segments), "utf8");
const exists = (...segments) => existsSync(path.join(rootDir, ...segments));

function readMigration(namePart) {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.includes(namePart)
  );

  assert.ok(migrationName, `expected migration including ${namePart}`);

  return readFileSync(path.join(migrationsDir, migrationName), "utf8");
}

test("real candidate interview app is mounted without replacing marketing candidate pages", () => {
  assert.ok(exists("src", "app", "candidate", "page.tsx"));
  assert.ok(exists("src", "app", "candidate", "resume", "page.tsx"));
  assert.ok(exists("src", "app", "candidate", "interview", "page.tsx"));
  assert.ok(exists("src", "app", "candidate", "results", "page.tsx"));
  assert.ok(exists("src", "app", "product", "[slug]", "page.tsx"));
  assert.ok(exists("src", "app", "candidates", "app", "page.tsx"));

  const heroSource = read("src", "components", "ui", "video-hero-section.tsx");
  const headerSource = read("src", "components", "layout", "header.tsx");

  assert.match(heroSource, /href="\/candidate"/);
  assert.match(headerSource, /href: "\/product\/candidates"/);
});

test("candidate interview routes use isolated chrome and scoped candidate CSS", () => {
  const layoutSource = read("src", "app", "layout.tsx");
  const candidateLayoutSource = read("src", "app", "candidate", "layout.tsx");
  const headerSource = read("src", "components", "layout", "header.tsx");
  const footerSource = read("src", "components", "layout", "footer.tsx");
  const candidateCss = read("src", "app", "candidate-flow.css");

  assert.match(layoutSource, /import "\.\/candidate-flow\.css"/);
  assert.match(candidateLayoutSource, /candidate-flow-host/);
  assert.match(headerSource, /pathname === "\/candidate" \|\| pathname\.startsWith\("\/candidate\/"\)/);
  assert.match(footerSource, /pathname === "\/candidate"/);
  assert.match(footerSource, /pathname\.startsWith\("\/candidate\/"\)/);
  assert.match(candidateCss, /\.candidate-flow-host \{/);
  assert.doesNotMatch(candidateCss, /:root\s*\{\s*--candidate-bg/);
});

test("candidate interview translation state remains wired for English Italian and French", () => {
  const homeSource = read("src", "app", "page.tsx");
  const candidatePageSource = read("src", "app", "candidate", "page.tsx");
  const candidateJourneySource = read("src", "components", "candidate", "CandidateJourney.tsx");
  const languageSource = read("src", "features", "interview-flow", "interview-language.ts");
  const routeSource = read("src", "app", "candidate", "interview-language", "route.ts");
  const selectorSource = read("src", "components", "candidate", "CandidateInterviewLanguageSelector.tsx");
  const resumeFormSource = read("src", "components", "candidate", "ResumeUploadForm.tsx");
  const prepareSource = read("src", "app", "candidate", "interview", "prepare", "page.tsx");
  const interviewPageSource = read("src", "app", "candidate", "interview", "page.tsx");
  const voiceSource = read("src", "app", "candidate", "interview", "VoiceTranscriptionControl.tsx");
  const candidateFlowCopySource = read("src", "features", "interview-flow", "candidate-flow-copy.ts");
  const progressRailSource = read("src", "components", "candidate", "CandidateProgressRail.tsx");
  const confirmProfileSource = read("src", "app", "candidate", "profile", "confirm", "page.tsx");
  const minimalReviewSource = read("src", "components", "candidate", "minimal-profile-review-fields.ts");
  const preferenceFieldsSource = read("src", "components", "candidate", "CandidateProfilePreferenceFields.tsx");
  const processingClientSource = read(
    "src",
    "app",
    "candidate",
    "resume",
    "processing",
    "processing-client.tsx"
  );
  const devicePrepSource = read("src", "components", "candidate", "InterviewDevicePrep.tsx");
  const movingForwardSource = read("src", "components", "candidate", "CandidateInterviewMovingForward.tsx");
  const interviewClientSource = read(
    "src",
    "app",
    "candidate",
    "interview",
    "interview-session-client.tsx"
  );
  const resultsReviewSource = read("src", "components", "candidate", "CandidateResultsReview.tsx");
  const matchInboxSource = read("src", "components", "candidate", "CandidateMatchInbox.tsx");
  const dataControlsSource = read("src", "components", "candidate", "CandidateDataControls.tsx");
  const candidateCss = read("src", "app", "candidate-flow.css");

  assert.doesNotMatch(homeSource, /CandidateInterviewLanguageSelector/);
  assert.match(candidatePageSource, /CANDIDATE_INTERVIEW_LANGUAGE_COOKIE/);
  assert.match(candidatePageSource, /searchParams/);
  assert.match(candidatePageSource, /shouldForceInterviewLanguageSelection/);
  assert.match(candidatePageSource, /resolveRouteInterviewLanguage/);
  assert.match(candidatePageSource, /selectLanguage/);
  assert.match(candidatePageSource, /searchParams\?\.language/);
  assert.match(candidatePageSource, /initialInterviewLanguage/);
  assert.doesNotMatch(candidatePageSource, /readCandidateProgress/);
  assert.match(candidateJourneySource, /initialInterviewLanguage/);
  assert.match(languageSource, /export type CandidateInterviewLanguageCode = "en" \| "it" \| "fr"/);
  assert.match(languageSource, /CANDIDATE_INTERVIEW_LANGUAGE_COOKIE = "assumerai_interview_language"/);
  assert.match(languageSource, /deepgramLanguage: "en-US"/);
  assert.match(languageSource, /deepgramLanguage: "it"/);
  assert.match(languageSource, /deepgramLanguage: "fr"/);
  assert.match(languageSource, /confirmLabel: "Confirm and proceed"/);
  assert.match(routeSource, /CANDIDATE_INTERVIEW_LANGUAGE_FIELD/);
  assert.match(routeSource, /new URL\("\/candidate", request\.url\)/);
  assert.match(routeSource, /searchParams\.set\("language", interviewLanguage\)/);
  assert.match(routeSource, /status: 303/);
  assert.match(routeSource, /httpOnly: true/);
  assert.match(routeSource, /sameSite: "lax"/);
  assert.match(routeSource, /path: "\/candidate"/);
  assert.match(selectorSource, /CANDIDATE_INTERVIEW_LANGUAGE_OPTIONS/);
  assert.match(selectorSource, /Your language\?/);
  assert.match(selectorSource, /English/);
  assert.match(selectorSource, /Italiano/);
  assert.match(selectorSource, /Fran(?:Ã§|\\u00e7|ç)ais/);
  assert.match(selectorSource, /setLanguage/);
  assert.match(selectorSource, /APP_LANGUAGE_STORAGE_KEY/);
  assert.match(selectorSource, /handleConfirmLanguage/);
  assert.match(selectorSource, /formRef\.current\?\.requestSubmit\(\)/);
  assert.doesNotMatch(selectorSource, /\bnative\b/i);
  assert.doesNotMatch(selectorSource, /\baccent\b/i);
  assert.doesNotMatch(selectorSource, /\bfluent\b/i);
  assert.doesNotMatch(selectorSource, /\bpronunciation\b/i);
  assert.match(resumeFormSource, /CandidateInterviewLanguageSelector/);
  assert.match(resumeFormSource, /candidate-splash-language/);
  assert.match(resumeFormSource, /resolveCandidateInterviewLanguageCode\(initialInterviewLanguage\)/);
  assert.match(resumeFormSource, /resumeUploadCopy/);
  assert.match(resumeFormSource, /Leggi informativa privacy e termini/);
  assert.match(resumeFormSource, /Lisez la politique de confidentialite et les conditions/);
  assert.doesNotMatch(resumeFormSource, /before we begin/);
  assert.match(candidateCss, /font-family: var\(--font-geist-sans/);
  assert.match(candidateCss, /\.candidate-splash \.begin-language-panel/);
  assert.match(candidateCss, /\.language-confetti/);
  assert.match(candidateCss, /@keyframes languageConfettiBurst/);
  assert.match(prepareSource, /CANDIDATE_INTERVIEW_LANGUAGE_FIELD/);
  assert.match(prepareSource, /value=\{activeInterviewLanguage\}/);
  assert.doesNotMatch(prepareSource, /CANDIDATE_INTERVIEW_LANGUAGE_OPTIONS/);
  assert.doesNotMatch(prepareSource, /prepare-language-panel/);
  assert.match(prepareSource, /progress\.interviewLanguage/);
  assert.match(interviewPageSource, /CANDIDATE_INTERVIEW_LANGUAGE_COOKIE/);
  assert.match(interviewPageSource, /progress\.interviewLanguage/);
  assert.match(voiceSource, /resolveDeepgramLanguageForInterviewLanguage\(interviewLanguage\)/);
  assert.match(candidateFlowCopySource, /candidateFlowCopy/);
  assert.match(candidateFlowCopySource, /Conferma solo cio che conta/);
  assert.match(candidateFlowCopySource, /Confidenza parser/);
  assert.match(candidateFlowCopySource, /Controlez seulement ce qui compte/);
  assert.match(candidateFlowCopySource, /Tous les elements sont prets/);
  assert.match(progressRailSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(confirmProfileSource, /CANDIDATE_INTERVIEW_LANGUAGE_COOKIE/);
  assert.match(confirmProfileSource, /resolveCandidateFlowCopy\(activeInterviewLanguage\)/);
  assert.match(confirmProfileSource, /selectMinimalProfileReviewGroups\(review\.reviewFields, activeInterviewLanguage\)/);
  assert.match(confirmProfileSource, /<CandidateProgressRail current="profile" language=\{activeInterviewLanguage\}/);
  assert.match(minimalReviewSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(preferenceFieldsSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(processingClientSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(prepareSource, /resolveCandidateFlowCopy\(activeInterviewLanguage\)/);
  assert.match(
    prepareSource,
    /\.prepare-grid\s*\{[\s\S]*margin: clamp\(34px, 4vw, 56px\) auto 0;/
  );
  assert.match(devicePrepSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(movingForwardSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(interviewClientSource, /resolveCandidateFlowCopy\(initialInterviewLanguage\)/);
  assert.match(resultsReviewSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(matchInboxSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(dataControlsSource, /resolveCandidateFlowCopy\(language\)/);
  assert.match(dataControlsSource, /href="\/profile"/);
  assert.match(dataControlsSource, /copy\.returnToProfile/);
  assert.match(candidateFlowCopySource, /returnToProfile: "Torna al profilo utente"/);
});

test("Deepgram route returns only short-lived browser credentials and never the server key", () => {
  const tokenGrantSource = read("src", "features", "live-interview", "deepgram-token-grant.ts");
  const routeSource = read("src", "app", "candidate", "interview", "deepgram-token", "route.ts");

  assert.match(tokenGrantSource, /auth\/grant/);
  assert.match(tokenGrantSource, /Authorization: `Token \$\{apiKey\}`/);
  assert.doesNotMatch(tokenGrantSource, /resolveBrowserCredential/);
  assert.match(routeSource, /\.grantToken\(\)/);
  assert.match(routeSource, /auth_mode: "bearer"/);
  assert.match(routeSource, /credential: tokenGrant\.accessToken/);
  assert.doesNotMatch(routeSource, /credential: apiKey/);
});

test("candidate Supabase persistence foundation is wired without trusting hidden candidate IDs", () => {
  const migration = readMigration("candidate_interview_readiness");
  const rlsOptimizationMigration = readMigration("candidate_rls_auth_initplan");
  const contextSource = read(
    "src",
    "features",
    "candidate-persistence",
    "supabase-candidate-context.ts"
  );
  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "supabase-candidate-store.ts"
  );
  const uploadRoute = read("src", "app", "candidate", "resume", "upload", "route.ts");
  const profileAction = read(
    "src",
    "app",
    "candidate",
    "profile",
    "confirm",
    "action",
    "route.ts"
  );
  const resumeForm = read("src", "components", "candidate", "ResumeUploadForm.tsx");
  const confirmPage = read("src", "app", "candidate", "profile", "confirm", "page.tsx");
  const preparePage = read("src", "app", "candidate", "interview", "prepare", "page.tsx");

  assert.match(migration, /create table if not exists public\.candidate_profiles/);
  assert.match(migration, /candidate_sharing_snapshots/);
  assert.match(migration, /enable row level security/);
  assert.doesNotMatch(migration, /for all using/i);
  assert.doesNotMatch(migration, /for delete/i);
  assert.match(rlsOptimizationMigration, /\(select auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(rlsOptimizationMigration, /for delete/i);
  assert.match(contextSource, /supabase\.auth\.getUser\(\)/);
  assert.match(contextSource, /getUserAccountRole\(user\) !== "candidate"/);
  assert.match(storeSource, /candidate_interview_sessions/);
  assert.match(storeSource, /candidate_compliance_workflows/);
  assert.match(uploadRoute, /resolveCandidateRouteContext/);
  assert.match(uploadRoute, /persistResumePipelineSession/);
  assert.doesNotMatch(uploadRoute, /headers\.get\("x-candidate-id"\)/);
  assert.match(profileAction, /persistCandidateProfileConfirmation/);
  assert.doesNotMatch(resumeForm, /name="candidate_id"/);
  assert.doesNotMatch(confirmPage, /name="candidateId"/);
  assert.doesNotMatch(preparePage, /name=\{interviewDisclosureFieldNames\.candidateId\}/);
});

test("candidate resume drafts do not depend on writable deployment filesystem", () => {
  const pipelineSource = read(
    "src",
    "features",
    "candidate-flow",
    "resume-profile-pipeline.ts"
  );
  const storeSource = read(
    "src",
    "features",
    "candidate-persistence",
    "supabase-candidate-store.ts"
  );
  const confirmPage = read("src", "app", "candidate", "profile", "confirm", "page.tsx");
  const profileAction = read(
    "src",
    "app",
    "candidate",
    "profile",
    "confirm",
    "action",
    "route.ts"
  );
  const interviewPage = read("src", "app", "candidate", "interview", "page.tsx");

  assert.match(pipelineSource, /process\.env\.NODE_ENV === "production"/);
  assert.match(pipelineSource, /createInMemoryCandidateResumeProfileSessionStore/);
  assert.match(pipelineSource, /restore\(\s*session: CandidateResumeProfilePipelineSession/);
  assert.match(storeSource, /readResumePipelineSession/);
  assert.match(storeSource, /\.from\("candidate_resume_documents"\)/);
  assert.match(storeSource, /\.select\("resume_document,parse_draft,score_readiness,next_step"\)/);
  assert.match(confirmPage, /readResumePipelineSession/);
  assert.match(confirmPage, /candidateResumeProfilePipeline\.restore/);
  assert.match(profileAction, /readResumePipelineSession/);
  assert.match(profileAction, /candidateResumeProfilePipeline\.restore/);
  assert.match(interviewPage, /readResumePipelineSession/);
});

test("candidate resume uploads only force the local parser when explicitly configured", () => {
  const journeySource = read("src", "components", "candidate", "CandidateJourney.tsx");
  const providerConfigSource = read(
    "src",
    "features",
    "candidate-flow",
    "resume-parser-provider-config.ts"
  );
  const envExample = read(".env.example");

  assert.match(
    journeySource,
    /shouldForceLocalResumeParserForCandidateUpload\(process\.env\)/
  );
  assert.doesNotMatch(
    journeySource,
    /NODE_ENV !== "production" && requestedParserProvider !== "anthropic"/
  );
  assert.match(providerConfigSource, /normalizeResumeParserProvider/);
  assert.match(providerConfigSource, /RESUME_PARSER_PROVIDER/);
  assert.match(envExample, /^RESUME_PARSER_PROVIDER=auto/m);
  assert.doesNotMatch(envExample, /^RESUME_PARSER_PROVIDER=local/m);
});

test("candidate resume route handoff survives first-run remounts", () => {
  const resumeForm = read("src", "components", "candidate", "ResumeUploadForm.tsx");
  const processingPage = read(
    "src",
    "app",
    "candidate",
    "resume",
    "processing",
    "page.tsx"
  );
  const processingRouteState = read(
    "src",
    "app",
    "candidate",
    "resume",
    "processing",
    "route-state.ts"
  );

  assert.match(resumeForm, /router\.replace\("\/candidate\/resume"\)/);
  assert.match(processingPage, /cookies\(\)/);
  assert.match(processingPage, /assumerai_resume_document_id/);
  assert.match(processingPage, /normalizeCandidateNextHref/);
  assert.match(processingPage, /normalizeCandidateNextHref\(\s*next,\s*cookieStore\.get/);
  assert.match(processingRouteState, /encodeURIComponent/);
  assert.match(processingRouteState, /startsWith\("\/candidate\/"\)/);
  assert.doesNotMatch(processingPage, /export function normalizeCandidateNextHref/);
});

test("candidate interview evidence snapshots and match decisions have server endpoints", () => {
  const interviewClient = read(
    "src",
    "app",
    "candidate",
    "interview",
    "interview-session-client.tsx"
  );
  const snapshotRoute = read(
    "src",
    "app",
    "candidate",
    "interview",
    "session-snapshot",
    "route.ts"
  );
  const matchInbox = read("src", "components", "candidate", "CandidateMatchInbox.tsx");
  const matchDecisionRoute = read(
    "src",
    "app",
    "candidate",
    "matches",
    "decision",
    "route.ts"
  );

  assert.match(interviewClient, /\/candidate\/interview\/session-snapshot/);
  assert.match(interviewClient, /initialQuestionPlanAudit/);
  assert.match(snapshotRoute, /persistInterviewSessionSnapshot/);
  assert.match(snapshotRoute, /resolveCandidateRouteContext/);
  assert.match(matchInbox, /\/candidate\/matches\/decision/);
  assert.match(matchDecisionRoute, /workflowType: "match_decision"/);
  assert.match(matchDecisionRoute, /raw_interview_media_included: false/);
});

test("candidate data controls route establishes candidate identity before rendering", () => {
  const dataPage = read("src", "app", "candidate", "data", "page.tsx");

  assert.match(dataPage, /resolveCandidateRouteContext/);
  assert.match(dataPage, /isCandidateContextError/);
  assert.match(dataPage, /redirect\(/);
  assert.match(dataPage, /\/login\?next=\/candidate\/data/);
  assert.match(dataPage, /\/candidate\?error=candidate_account_required/);
});

test("candidate route map does not loop on moving-forward after interview has advanced", () => {
  const routeMap = read("src", "components", "candidate", "candidate-flow-route-map.ts");
  const preparationCompletion = routeMap.match(
    /case "interview-preparation":\s*return ([\s\S]*?);/
  )?.[1];
  const movingForwardCompletion = routeMap.match(
    /case "moving-forward":\s*return ([\s\S]*?);/
  )?.[1];

  assert.ok(preparationCompletion, "expected interview-preparation completion branch");
  assert.match(preparationCompletion, /interviewPreparationViewed === true/);
  assert.match(preparationCompletion, /interviewDeviceCheckCompleted === true/);
  assert.match(preparationCompletion, /textInterviewCompleted/);

  assert.ok(movingForwardCompletion, "expected moving-forward completion branch");
  assert.match(movingForwardCompletion, /movingForwardViewed === true/);
  assert.match(movingForwardCompletion, /interviewPreparationViewed === true/);
  assert.match(movingForwardCompletion, /interviewDeviceCheckCompleted === true/);
  assert.match(movingForwardCompletion, /textInterviewCompleted/);
});
