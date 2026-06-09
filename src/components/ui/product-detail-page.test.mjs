import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const componentPath = path.join(rootDir, "src", "components", "ui", "product-detail-page.tsx");
const candidateCardsPath = path.join(rootDir, "src", "components", "ui", "candidate-horizontal-cards.tsx");
const candidateClarityPath = path.join(rootDir, "src", "components", "ui", "candidate-clarity-section.tsx");
const candidateCommitmentsPath = path.join(rootDir, "src", "components", "ui", "candidate-commitments-section.tsx");
const candidateExpandingCardsPath = path.join(rootDir, "src", "components", "ui", "candidate-expanding-cards-section.tsx");
const footerPath = path.join(rootDir, "src", "components", "layout", "footer.tsx");
const hiringTeamsComparisonPath = path.join(rootDir, "src", "components", "ui", "hiring-teams-comparison-section.tsx");
const pricingCardsPath = path.join(rootDir, "src", "components", "ui", "aniamted-pricing-cards.tsx");
const containerScrollPath = path.join(rootDir, "src", "components", "ui", "container-scroll.tsx");
const expandingCardsPath = path.join(rootDir, "src", "components", "ui", "expanding-cards.tsx");
const globalCssPath = path.join(rootDir, "src", "app", "globals.css");
const notForEveryonePath = path.join(rootDir, "src", "components", "ui", "not-for-everyone-section.tsx");
const textRevealPath = path.join(rootDir, "src", "components", "ui", "text-reveal-by-word.tsx");
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");
const notForEveryoneAssetPaths = [
  "repeat-hiring-calendar.png",
  "executive-search-king.png",
  "decision-timer-clock.png",
  "outreach-megaphone.png",
].map((fileName) => path.join(rootDir, "public", "images", "hiring-teams", "not-for-everyone", fileName));
const hiringTeamsReasonAssetPaths = [
  "reason-screening.png",
  "reason-outcome-data.png",
  "reason-offer.png",
  "reason-compliance.png",
  "reason-launch.png",
].map((fileName) => path.join(rootDir, "public", "images", "hiring-teams", "reasons", fileName));

test("product detail page keeps the landing page visual language", () => {
  assert.equal(existsSync(componentPath), true);

  const source = readFileSync(componentPath, "utf8");
  const genericProductSource = source.replace(
    /function HiringTeamsLineMetricCallout[\s\S]*?function HiringTeamsReasonsSection/,
    "function HiringTeamsReasonsSection",
  ).replace(
    /function HiringTeamsReasonsSection[\s\S]*?function MobileLinePath/,
    "function MobileLinePath",
  );

  assert.match(source, /linear-gradient\(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%\)/);
  assert.match(source, /var\(--font-geist-sans\)/);
  assert.match(source, /var\(--font-instrument-serif\)/);
  assert.match(source, /rounded-\[8px\]/);
  assert.doesNotMatch(genericProductSource, /rounded-\[2[0-9]px\]|rounded-\[3[0-9]px\]/);
});

test("product detail page includes scroll-driven scenes and real visuals", () => {
  assert.equal(existsSync(componentPath), true);

  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /useProductScrollScene/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /window\.addEventListener\("scroll"/);
  assert.match(source, /next\/image/);
  assert.match(source, /visualSrc/);
});

test("candidate product page starts with the white container scroll hero", () => {
  assert.equal(existsSync(componentPath), true);

  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /ContainerScroll/);
  assert.match(source, /candidateExperience\.heroTitle/);
  assert.match(source, /<span\s+className="block bg-clip-text text-transparent"/);
  assert.match(source, /candidateExperience\.heroAccent/);
  assert.match(source, /style=\{\{\s*backgroundImage: CANDIDATE_HERO_WORD_GRADIENT/);
  assert.match(source, /slug === "candidates"/);
  assert.match(source, /bg-white text-\[#040817\]/);
});

test("candidate product page feeds localized copy into custom candidate sections", () => {
  assert.equal(existsSync(componentPath), true);

  const source = readFileSync(componentPath, "utf8");

  assert.match(source, /page\.candidateExperience/);
  assert.match(source, /candidateExperience\.heroTitle/);
  assert.match(source, /candidateExperience\.revealText/);
  assert.match(source, /<CandidateHorizontalCards[\s\S]*cards=\{candidateExperience\.horizontalCards\.cards\}[\s\S]*dontDoLabel=\{candidateExperience\.horizontalCards\.dontDoLabel\}/);
  assert.match(source, /<CandidateClaritySection copy=\{candidateExperience\.clarity\} \/>/);
  assert.match(source, /<CandidateExpandingCardsSection copy=\{candidateExperience\.privacy\} \/>/);
  assert.match(source, /<CandidateCommitmentsSection copy=\{candidateExperience\.commitments\} \/>/);
  assert.doesNotMatch(source, /Here&apos;s exactly what happens/);
  assert.doesNotMatch(source, /No marketing fluff\. Every step explained/);
});

test("hiring teams page content uses a centralized non-navbar color system", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(globalCssPath), true);
  assert.equal(existsSync(notForEveryonePath), true);
  assert.equal(existsSync(hiringTeamsComparisonPath), true);
  assert.equal(existsSync(footerPath), true);

  const source = readFileSync(componentPath, "utf8");
  const globalCss = readFileSync(globalCssPath, "utf8");
  const notForEveryoneSource = readFileSync(notForEveryonePath, "utf8");
  const comparisonSource = readFileSync(hiringTeamsComparisonPath, "utf8");
  const footerSource = readFileSync(footerPath, "utf8");
  const hiringDataSource = source.slice(
    source.indexOf("const hiringTeamsLineMetrics"),
    source.indexOf("const VENN_SCROLL_PATH"),
  );
  const hiringRenderSource = source.slice(
    source.indexOf("function HiringTeamsScrollHero"),
    source.indexOf("function useProductScrollScene"),
  );
  const footerWithoutLogo = footerSource.replace(
    /<Link href="\/"[\s\S]*?<\/Link>/,
    "",
  );
  const hiringPageColorSource = [
    hiringDataSource,
    hiringRenderSource,
    notForEveryoneSource,
    comparisonSource,
    footerWithoutLogo,
  ].join("\n");

  assert.match(globalCss, /--page-bg: #F3F2FA;/);
  assert.match(globalCss, /--page-bg-soft: #FFFFFF;/);
  assert.match(globalCss, /--page-surface: rgba\(255, 255, 255, 0\.82\);/);
  assert.match(globalCss, /--page-surface-strong: #FFFFFF;/);
  assert.match(globalCss, /--page-text: #040817;/);
  assert.match(globalCss, /--page-text-soft: #1D1D1F;/);
  assert.match(globalCss, /--page-text-muted: #596071;/);
  assert.match(globalCss, /--page-border: rgba\(95, 99, 216, 0\.2\);/);
  assert.match(globalCss, /--page-shadow: rgba\(4, 8, 23, 0\.12\);/);
  assert.match(globalCss, /--page-dark: #061020;/);
  assert.match(globalCss, /--page-dark-soft: #101A2E;/);
  assert.match(globalCss, /--page-dark-violet: #171844;/);
  assert.match(globalCss, /--page-accent-pink: #F2A7C7;/);
  assert.match(globalCss, /--page-accent-lilac: #D28CEB;/);
  assert.match(globalCss, /--page-accent-violet: #8F8DE6;/);
  assert.match(globalCss, /--page-accent-blue: #78A8F0;/);
  assert.match(globalCss, /--page-accent: #8F8DE6;/);
  assert.match(globalCss, /--page-accent-gradient: linear-gradient\(110deg, #F2A7C7 0%, #D28CEB 35%, #8F8DE6 66%, #78A8F0 100%\);/);
  assert.match(globalCss, /--page-accent-soft: rgba\(143, 141, 230, 0\.24\);/);
  assert.match(globalCss, /--page-accent-surface: rgba\(120, 168, 240, 0\.2\);/);
  assert.match(globalCss, /--page-warm-surface: rgba\(242, 167, 199, 0\.26\);/);
  assert.match(globalCss, /--page-lilac-surface: rgba\(210, 140, 235, 0\.24\);/);
  assert.match(globalCss, /--page-blue-surface: rgba\(120, 168, 240, 0\.22\);/);
  assert.match(hiringPageColorSource, /var\(--page-bg\)/);
  assert.match(hiringPageColorSource, /var\(--page-surface\)/);
  assert.match(hiringPageColorSource, /var\(--page-text\)/);
  assert.match(hiringPageColorSource, /var\(--page-text-muted\)/);
  assert.match(hiringPageColorSource, /var\(--page-accent\)/);
  assert.match(hiringPageColorSource, /var\(--page-border\)/);
  assert.match(hiringRenderSource, /stroke="var\(--page-accent\)"/);
  assert.doesNotMatch(globalCss, /#F7FAED|#FBFDF3|#B7F23A|#8EC51D|rgba\(183, 242, 58|rgba\(139, 190, 65|rgba\(16, 35, 55/);
  assert.doesNotMatch(hiringPageColorSource, /#3467ff|#061a8f|#ffc34d|#e85d04|#9254de|#2e1065|#ff6b8a|#b5123f|#7C3AED|#A855F7|#DB2777|#D97706|#1f63ff|85,110,255|117, 91, 255|255, 90, 130/);
  assert.doesNotMatch(hiringPageColorSource, /bg-(blue|rose|amber|emerald|purple|pink|cyan|sky)-|text-(blue|rose|amber|emerald|purple|pink|cyan|sky)-|from-(blue|rose|amber|emerald|purple|pink|cyan|sky)-|to-(blue|rose|amber|emerald|purple|pink|cyan|sky)-|hover:text-sky|focus:border-sky/);
  assert.doesNotMatch(hiringPageColorSource, /stroke="#C2F84F"|bg-\[#FAFDEE\]|text-\[#1F3A4B\]|border-\[#C2F84F\]/);
});

test("hiring teams page uses the provided scroll-stroke hero", () => {
  assert.equal(existsSync(componentPath), true);

  const source = readFileSync(componentPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const heroSource = source.slice(
    source.indexOf("function HiringTeamsScrollHero"),
    source.indexOf("function HiringTeamsLineMetricCallout"),
  );

  assert.match(source, /const isHiringTeamsPage = slug === "hiring-teams";/);
  assert.match(source, /motion,\s*useScroll,\s*useTransform/);
  assert.match(source, /isHiringTeamsPage \? \(\s*<>\s*<HiringTeamsScrollHero copy=\{hiringTeamsExperience\.hero\} \/>\s*<HiringTeamsReasonsSection copy=\{hiringTeamsExperience\.reasons\} \/>\s*<\/>/);
  assert.match(source, /function HiringTeamsScrollHero/);
  assert.match(source, /function LinePath/);
  assert.match(source, /const VENN_SCROLL_PATH =/);
  assert.match(source, /const MOBILE_VENN_SCROLL_PATH =/);
  assert.match(source, /h-\[180vh\]/);
  assert.match(source, /scrollYProgress/);
  assert.match(source, /offset:\s*\["start start", "end center"\]/);
  assert.match(source, /const pathLength = useTransform\(scrollYProgress, \[0, 1\], \[0, 1\]\)/);
  assert.doesNotMatch(source, /const strokeDashoffset/);
  assert.match(translations, /The complete picture: why AssumerAI works,/);
  assert.match(translations, /when it doesn't, and how we compare\./);
  assert.match(translations, /We'll tell you when you shouldn't use us\./);
  assert.match(translations, /Because trust matters more than another signup\./);
  assert.match(translations, /90%/);
  assert.match(translations, /less screening/);
  assert.match(translations, /14d/);
  assert.match(translations, /decision SLA/);
  assert.match(translations, /\\u20ac200/);
  assert.match(translations, /per hire/);
  assert.match(source, /const HIRING_TEAMS_LINE_METRIC_LAYOUTS = \[/);
  assert.match(source, /revealRange: \[0\.2, 0\.28\]/);
  assert.match(source, /revealRange: \[0\.48, 0\.56\]/);
  assert.match(source, /revealRange: \[0\.78, 0\.88\]/);
  assert.match(source, /left-4 top-\[58vh\]/);
  assert.match(source, /right-4 top-\[92vh\]/);
  assert.match(source, /left-4 top-\[132vh\]/);
  assert.match(source, /lg:right-\[31rem\]/);
  assert.match(source, /lg:right-\[13rem\]/);
  assert.match(source, /lg:right-\[22rem\]/);
  assert.match(source, /function HiringTeamsLineMetricCallout/);
  assert.match(source, /<HiringTeamsLineMetricCallout[\s\S]*metric=\{\{ \.\.\.metric, \.\.\.layout \}\}[\s\S]*scrollYProgress=\{scrollYProgress\}[\s\S]*\/>/);
  assert.match(source, /copy\.metrics\.map/);
  assert.match(source, /const opacity = useTransform\(\s*scrollYProgress,[\s\S]*metric\.revealRange\[0\] - 0\.04[\s\S]*metric\.revealRange\[0\][\s\S]*1[\s\S]*0[\s\S]*1[\s\S]*1/);
  assert.match(source, /const y = useTransform\(\s*scrollYProgress,[\s\S]*metric\.revealRange\[0\] - 0\.04[\s\S]*metric\.revealRange\[0\][\s\S]*18[\s\S]*0/);
  assert.match(source, /const x = useTransform\(\s*scrollYProgress,[\s\S]*metric\.revealRange\[0\] - 0\.04[\s\S]*metric\.revealRange\[0\][\s\S]*12[\s\S]*0/);
  assert.match(source, /const filter = useTransform\(\s*scrollYProgress,[\s\S]*"blur\(8px\)"[\s\S]*"blur\(0px\)"/);
  assert.match(source, /<motion\.article[\s\S]*style=\{\{[\s\S]*opacity,[\s\S]*x,[\s\S]*y,[\s\S]*filter,[\s\S]*\}\}/);
  assert.doesNotMatch(source, /function HiringTeamsMetricCard/);
  assert.doesNotMatch(source, /<HiringTeamsMetricCard/);
  assert.doesNotMatch(source, /max-w-\[42rem\] gap-2\.5 sm:grid-cols-3 sm:gap-3/);
  assert.match(source, /rounded-\[24px\] border border-\[color:var\(--page-border\)\]/);
  assert.match(source, /bg-\[linear-gradient\(135deg,var\(--page-surface-strong\)_0%,var\(--page-lilac-surface\)_54%,var\(--page-blue-surface\)_100%\)\]/);
  assert.match(source, /shadow-\[0_20px_58px_var\(--page-shadow\),0_0_42px_var\(--page-accent-soft\),inset_0_1px_0_rgba\(255,255,255,0\.78\)\]/);
  assert.match(source, /backdrop-blur-xl/);
  assert.match(source, /bg-\[linear-gradient\(90deg,var\(--page-accent-pink\)_0%,var\(--page-accent-lilac\)_35%,var\(--page-accent-violet\)_68%,var\(--page-accent-blue\)_100%\)\]/);
  assert.match(source, /bg-\[var\(--page-accent-strong\)\]/);
  assert.match(source, /text-\[clamp\(2\.15rem,9vw,3\.35rem\)\]/);
  assert.match(source, /tracking-\[0\.16em\]/);
  assert.doesNotMatch(source, /rounded-\[8px\] border border-\[#1F3A4B\]\/14 bg-\[#FAFDEE\]\/70 p-3/);
  assert.match(heroSource, /className="[^"]*bg-white[^"]*"/);
  assert.doesNotMatch(heroSource, /bg-\[var\(--page-bg\)\]|radial-gradient\(circle at 78% 7%|linear-gradient\(180deg, var\(--page-bg-soft\)/);
  assert.match(source, /stroke="var\(--page-accent\)"/);
  assert.match(source, /strokeLinecap="round"/);
  assert.match(source, /strokeLinejoin="round"/);
  assert.match(source, /d=\{VENN_SCROLL_PATH\}/);
  assert.match(source, /M570 90A240 240 0 1 1 570 570A240 240 0 1 1 570 90/);
  assert.match(source, /M880 538A240 240 0 1 1 923 506/);
  assert.match(source, /C1012 642 1010 789 956 930/);
  assert.match(source, /C747 1502 915 1645 861 1846C830 1978 894 2082 1032 2160/);
  assert.match(source, /height="2200"/);
  assert.match(source, /viewBox="0 0 1278 2200"/);
  assert.match(source, /width="390"/);
  assert.match(source, /viewBox="0 0 390 2200"/);
  assert.doesNotMatch(source, /716 2310/);
  assert.doesNotMatch(source, /1016 3340/);
  assert.doesNotMatch(source, /w-screen flex-col items-center/);
  assert.match(source, /w-full flex-col items-center/);
  assert.doesNotMatch(source, /h-\[350vh\]/);
  assert.doesNotMatch(source, /h-\[335vh\]/);
  assert.doesNotMatch(source, /height="3400"/);
  assert.doesNotMatch(source, /viewBox="0 0 1278 3400"/);
  assert.match(source, /className="absolute right-3 top-8 z-0 h-\[176vh\] w-auto max-w-\[calc\(100vw-1\.5rem\)\] opacity-85 sm:right-6 lg:hidden"/);
  assert.match(source, /className="absolute -left-\[8rem\] top-8 z-0 hidden h-\[160vh\] w-auto max-w-none opacity-80 sm:-left-\[5rem\] lg:-right-\[18rem\] lg:left-auto lg:top-0 lg:block lg:opacity-100"/);
  assert.doesNotMatch(source, /M876\.605/);
  assert.match(source, /<h1 className="[^"]*max-w-\[18ch\][^"]*\[font-family:var\(--font-geist-sans\),sans-serif\][^"]*font-bold[^"]*text-\[clamp\(2rem,4vw,4\.5rem\)\][^"]*tracking-tighter/);
  assert.doesNotMatch(source, /max-w-\[13ch\] text-balance text-5xl/);
  assert.doesNotMatch(source, /<h1 className="[^"]*lg:text-9xl/);
  assert.doesNotMatch(source, /HiringTeamsCleanSlate/);
  assert.doesNotMatch(source, /HiringTeamsControlRoom/);
  assert.doesNotMatch(source, /HiringTeamsDecisionFlow/);
  assert.doesNotMatch(source, /HiringTeamsEvidenceGrid/);
  assert.doesNotMatch(source, /HiringTeamsFinalCta/);
  assert.doesNotMatch(source, /The Stroke/);
  assert.doesNotMatch(source, /Scroll down to see the effect/);
  assert.doesNotMatch(source, /skiperui\.com/);
});

test("hiring teams page adds the five-reason scroll reveal section after the hero", () => {
  assert.equal(existsSync(componentPath), true);
  hiringTeamsReasonAssetPaths.forEach((assetPath) => {
    assert.equal(existsSync(assetPath), true);
  });

  const source = readFileSync(componentPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const heroIndex = source.indexOf("<HiringTeamsScrollHero copy={hiringTeamsExperience.hero} />");
  const reasonsIndex = source.indexOf("<HiringTeamsReasonsSection copy={hiringTeamsExperience.reasons} />");
  const reasonsSource = source.slice(
    source.indexOf("function HiringTeamsReasonsSection"),
    source.indexOf("function LinePath"),
  );

  assert.ok(heroIndex > -1);
  assert.ok(reasonsIndex > -1);
  assert.ok(heroIndex < reasonsIndex);
  assert.match(source, /const HIRING_TEAMS_REASON_VISUALS = \[/);
  assert.match(source, /copy\.items\.map/);
  assert.match(reasonsSource, /function HiringTeamsReasonsSection/);
  assert.match(reasonsSource, /copy\.heading/);
  assert.match(translations, /Five reasons\. With numbers behind each\./);
  assert.match(translations, /Cut screening time by 90%\./);
  assert.match(translations, /SCREENING TIME/);
  assert.match(translations, /From 23 hours to 2\\u20133 hours per role\./);
  assert.match(translations, /12 mo/);
  assert.match(translations, /outcome data/);
  assert.match(translations, /Reduce mis-hires with predictive matching\./);
  assert.match(translations, /We back-test interview scores against 12-month performance \\u2014 quota attainment, retention, ramp time\./);
  assert.match(translations, /\\u20ac200/);
  assert.match(translations, /per hire/);
  assert.match(translations, /Pay only when hiring works\./);
  assert.match(translations, /Platform \\u20ac400\. \\u20ac200 per hire\. Performance: lets speak\./);
  assert.match(translations, /Day 0/);
  assert.match(translations, /compliance/);
  assert.match(translations, /AI Act compliant by design\./);
  assert.match(translations, /Audit trail per decision, bias detection per cohort, GDPR data residency in the EU\./);
  assert.match(translations, /7 days/);
  assert.match(translations, /to live/);
  assert.match(translations, /Live in 1 week, not 3 months\./);
  assert.match(translations, /No heavy ATS rebuild\. Greenhouse, Lever, Recruitee, Workable \\u2014 connect in a kickoff call, hire in the same week\./);
  assert.match(reasonsSource, /useReducedMotion/);
  assert.match(reasonsSource, /IntersectionObserver/);
  assert.match(reasonsSource, /grid-cols-5/);
  assert.match(reasonsSource, /scrollSnapType: "x mandatory"/);
  assert.match(reasonsSource, /snap-center/);
  assert.match(reasonsSource, /flex-\[0_0_min\(82vw,330px\)\]/);
  assert.match(reasonsSource, /lg:mx-\[clamp\(12px,2vw,32px\)\]/);
  assert.match(reasonsSource, /lg:rounded-\[clamp\(20px,2vw,32px\)\]/);
  assert.match(reasonsSource, /lg:overflow-hidden/);
  assert.match(reasonsSource, /lg:grid-cols-5/);
  assert.match(reasonsSource, /lg:items-stretch/);
  assert.match(reasonsSource, /lg:h-\[clamp\(480px,58vh,620px\)\]/);
  assert.match(reasonsSource, /min-h-\[clamp\(420px,54svh,520px\)\]/);
  assert.match(reasonsSource, /h-full/);
  assert.match(reasonsSource, /items-start/);
  assert.match(reasonsSource, /const headingMotion/);
  assert.match(reasonsSource, /const panelMotion/);
  assert.match(reasonsSource, /const imageMotion/);
  assert.match(reasonsSource, /const textMotion/);
  assert.match(reasonsSource, /clipPath/);
  assert.match(reasonsSource, /inset\(0 0 100% 0\)/);
  assert.match(reasonsSource, /translate3d\(0, 14px, 0\)/);
  assert.match(reasonsSource, /translate3d\(0, 18px, 0\)/);
  assert.match(reasonsSource, /translate3d\(0, 8px, 0\)/);
  assert.match(reasonsSource, /scale\(0\.97\)/);
  assert.match(reasonsSource, /index \* 80/);
  assert.match(reasonsSource, /transitionDelay/);
  assert.match(reasonsSource, /aria-label=\{copy\.ariaLabel\}/);
  assert.match(reasonsSource, /<ol/);
  assert.match(reasonsSource, /<li/);
  assert.match(reasonsSource, /\{copy\.reasonLabel\} \{reason\.number\}/);
  assert.match(reasonsSource, /reasonEyebrow/);
  assert.match(reasonsSource, /reasonDivider/);
  assert.doesNotMatch(reasonsSource, /copy\.proofPointLabel/);
  assert.doesNotMatch(reasonsSource, /font-black uppercase leading-none tracking-normal opacity-\[0\.76\]/);
  assert.match(reasonsSource, /reason\.body/);
  assert.match(reasonsSource, /text-\[clamp\(1\.85rem,8vw,2\.65rem\)\]/);
  assert.match(reasonsSource, /lg:text-\[clamp\(2rem,3vw,3\.5rem\)\]/);
  assert.match(reasonsSource, /mt-\[clamp\(34px,7vh,64px\)\]/);
  assert.match(reasonsSource, /lg:mt-\[clamp\(42px,5vh,60px\)\]/);
  assert.match(reasonsSource, /text-\[clamp\(2\.35rem,11vw,3\.35rem\)\]/);
  assert.match(reasonsSource, /lg:text-\[clamp\(2\.35rem,3\.5vw,4\.15rem\)\]/);
  assert.match(reasonsSource, /text-\[clamp\(1\.08rem,4\.6vw,1\.42rem\)\]/);
  assert.match(reasonsSource, /lg:text-\[clamp\(1\.05rem,1\.22vw,1\.45rem\)\]/);
  assert.match(reasonsSource, /text-\[0\.84rem\]/);
  assert.match(reasonsSource, /lg:text-\[clamp\(0\.78rem,0\.82vw,0\.92rem\)\]/);
  assert.match(reasonsSource, /\[text-wrap:balance\]/);
  assert.match(reasonsSource, /\[overflow-wrap:normal\]/);
  assert.doesNotMatch(reasonsSource, /break-words|break-all|lg:pt-\[18vh\]|justify-center|7\.5rem|6\.4rem|78vh|68svh|min-w-\[86vw\]/);
  assert.match(reasonsSource, /reason\.number/);
  assert.match(reasonsSource, /reasonVisual\.background/);
  assert.match(reasonsSource, /reasonVisual\.textColor/);
  assert.match(reasonsSource, /reasonVisual\.glow/);
  assert.match(reasonsSource, /reasonVisual\.visualSrc/);
  assert.match(reasonsSource, /reasonVisual\.visualBlendMode/);
  assert.match(reasonsSource, /<Image/);
  assert.match(reasonsSource, /alt=""/);
  assert.match(reasonsSource, /aria-hidden="true"/);
  assert.match(reasonsSource, /pointer-events-none/);
  assert.match(reasonsSource, /right-\[-6%\]/);
  assert.match(reasonsSource, /bottom-\[-2%\]/);
  assert.match(reasonsSource, /w-\[62%\]/);
  assert.match(reasonsSource, /lg:right-\[-3%\]/);
  assert.match(reasonsSource, /lg:bottom-\[-1%\]/);
  assert.match(reasonsSource, /lg:w-\[52%\]/);
  assert.match(reasonsSource, /opacity: showReasons \? 0\.22 : 0/);
  assert.match(reasonsSource, /mixBlendMode: reasonVisual\.visualBlendMode/);
  assert.match(reasonsSource, /right-\[-6%\] top-\[10%\]/);
  assert.match(reasonsSource, /text-\[clamp\(7rem,9vw,11rem\)\]/);
  assert.match(reasonsSource, /leading-\[0\.8\]/);
  assert.match(reasonsSource, /opacity-\[0\.045\]/);
  assert.match(source, /visualSrc: "\/images\/hiring-teams\/reasons\/reason-screening\.png"/);
  assert.match(source, /visualSrc: "\/images\/hiring-teams\/reasons\/reason-outcome-data\.png"/);
  assert.match(source, /visualSrc: "\/images\/hiring-teams\/reasons\/reason-offer\.png"/);
  assert.match(source, /visualSrc: "\/images\/hiring-teams\/reasons\/reason-compliance\.png"/);
  assert.match(source, /visualSrc: "\/images\/hiring-teams\/reasons\/reason-launch\.png"/);
  assert.match(source, /const HIRING_REASON_CARD_BACKGROUNDS = \[/);
  assert.match(source, /const HIRING_REASON_CARD_GLOWS = \[/);
  assert.match(source, /const HIRING_REASON_CARD_TEXT = "var\(--page-text\)";/);
  assert.match(source, /const HIRING_REASON_CARD_MUTED = "var\(--page-text-muted\)";/);
  assert.match(source, /background: HIRING_REASON_CARD_BACKGROUNDS\[0\]/);
  assert.match(source, /background: HIRING_REASON_CARD_BACKGROUNDS\[4\]/);
  assert.doesNotMatch(source, /#3467ff|#061a8f|#ffc34d|#e85d04|#9254de|#2e1065|#ff6b8a|#b5123f/);
  assert.doesNotMatch(source, /linear-gradient\(160deg, #0B3DFF|linear-gradient\(160deg, #FFB224|linear-gradient\(160deg, #7C3AED|linear-gradient\(160deg, #D9FF57|linear-gradient\(160deg, #FF4F6D/);
  assert.doesNotMatch(reasonsSource, /w-px origin-top|scale-y-0|scale-y-100|bg-\[var\(--reason-accent\)\]/);
  assert.doesNotMatch(reasonsSource, /sm:grid-cols-2|md:grid-cols-3/);
});

test("hiring teams page ends with a transparent anti-fit gallery before the footer", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(notForEveryonePath), true);
  notForEveryoneAssetPaths.forEach((assetPath) => {
    assert.equal(existsSync(assetPath), true);
  });

  const source = readFileSync(componentPath, "utf8");
  const sectionSource = readFileSync(notForEveryonePath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const ctaSource = sectionSource.slice(
    sectionSource.indexOf('className="cardCta'),
    sectionSource.indexOf("</Link>", sectionSource.indexOf('className="cardCta')),
  );
  const reasonsIndex = source.indexOf("<HiringTeamsReasonsSection copy={hiringTeamsExperience.reasons} />");
  const antiFitIndex = source.indexOf("<NotForEveryoneSection copy={hiringTeamsExperience.antiFit} />");
  const comparisonIndex = source.indexOf("<HiringTeamsComparisonSection copy={hiringTeamsExperience.comparison} />");

  assert.match(source, /NotForEveryoneSection,[\s\S]*type NotForEveryoneCopy/);
  assert.ok(reasonsIndex > -1);
  assert.ok(antiFitIndex > -1);
  assert.ok(comparisonIndex > -1);
  assert.ok(reasonsIndex < antiFitIndex);
  assert.ok(antiFitIndex < comparisonIndex);
  assert.match(sectionSource, /aria-labelledby="not-for-everyone-title"/);
  assert.match(sectionSource, /id="not-for-everyone-title"/);
  assert.match(sectionSource, /notForEveryoneSection/);
  assert.match(sectionSource, /notForEveryoneSection[^"]*bg-white/);
  assert.doesNotMatch(sectionSource, /radial-gradient\(circle_at_14%_38%|bg-\[var\(--page-bg-soft\)\]/);
  assert.match(sectionSource, /sectionTitle/);
  assert.match(sectionSource, /copy\.headingLine1/);
  assert.match(sectionSource, /copy\.headingEmphasis/);
  assert.match(sectionSource, /copy\.headingLine2/);
  assert.match(sectionSource, /lg:grid-cols-\[minmax\(0,880px\)_auto\]/);
  assert.match(sectionSource, /max-w-\[880px\]/);
  assert.match(sectionSource, /tracking-\[-0\.034em\]/);
  assert.match(sectionSource, /lg:text-\[clamp\(44px,4vw,58px\)\]/);
  assert.match(sectionSource, /color-mix\(in_srgb,var\(--page-text\)_72%,var\(--page-accent-strong\)\)_26%/);
  assert.match(sectionSource, /var\(--page-accent-violet\)_66%/);
  assert.doesNotMatch(sectionSource, /brandSuffix|headingAction|headingBrand|tracking-\[-0\.065em\]|5\.5vw,76px|4\.7vw,64px/);
  assert.match(sectionSource, /copy\.subtitle/);
  assert.doesNotMatch(sectionSource, /fitNote|fitNoteIcon|fitNoteText|copy\.noteAriaLabel|copy\.noteLabel|copy\.noteLine/);
  assert.match(sectionSource, /copy\.cards\.map/);
  assert.match(sectionSource, /copy\.bottomNoteTitle/);
  assert.match(sectionSource, /copy\.bottomNoteBody/);
  assert.doesNotMatch(sectionSource, /Four reasons|If you recognise yourself here|You hire one person every six months/);
  assert.match(translations, /Four reasons/);
  assert.match(translations, /NOT FOR EVERYONE\./);
  assert.match(translations, /You hire one person every six months\./);
  assert.match(translations, /AssumerAI is built for repeat hiring\./);
  assert.match(translations, /Soft red calendar and hiring folder representing rare one-off hiring\./);
  assert.match(translations, /Quattro motivi/);
  assert.match(translations, /Quatre raisons/);
  assert.match(sectionSource, /bottomNote/);
  assert.match(sectionSource, /bottomNoteIcon/);
  assert.match(sectionSource, /bottomNoteCopy/);
  assert.match(sectionSource, /"\\u2733"/);
  assert.match(sectionSource, /\/images\/hiring-teams\/not-for-everyone\/repeat-hiring-calendar\.png/);
  assert.match(sectionSource, /\/images\/hiring-teams\/not-for-everyone\/executive-search-king\.png/);
  assert.match(sectionSource, /\/images\/hiring-teams\/not-for-everyone\/decision-timer-clock\.png/);
  assert.match(sectionSource, /\/images\/hiring-teams\/not-for-everyone\/outreach-megaphone\.png/);
  assert.doesNotMatch(sectionSource, /\/images\/hiring-teams\/not-for-everyone\/[^"]+\.webp/);
  assert.doesNotMatch(sectionSource, /C:\\\\Users|C:\/Users/);
  assert.match(sectionSource, /from "framer-motion"/);
  assert.match(sectionSource, /useReducedMotion/);
  assert.match(sectionSource, /whileInView/);
  assert.match(sectionSource, /staggerChildren/);
  assert.match(sectionSource, /connectorPath/);
  assert.match(sectionSource, /strokeDasharray="4 8"/);
  assert.match(sectionSource, /stroke="var\(--page-border\)"/);
  assert.match(sectionSource, /motion-reduce:transition-none/);
  assert.match(sectionSource, /cardsGrid/);
  assert.match(sectionSource, /reasonItem/);
  assert.match(sectionSource, /reasonVisualBlob/);
  assert.match(sectionSource, /imageWrap/);
  assert.match(sectionSource, /reasonCard/);
  assert.match(sectionSource, /cardTitle/);
  assert.match(sectionSource, /cardBody/);
  assert.match(sectionSource, /cardCta/);
  assert.match(sectionSource, /focus-visible:ring-offset-white/);
  assert.match(sectionSource, /cardCtaUnderline/);
  assert.match(sectionSource, /viewBox="0 0 160 12"/);
  assert.match(sectionSource, /--underline-width/);
  assert.match(sectionSource, /--image-width/);
  assert.match(sectionSource, /clamp\(170px, 14vw, 220px\)/);
  assert.match(sectionSource, /clamp\(190px, 16vw, 245px\)/);
  assert.match(sectionSource, /clamp\(205px, 17vw, 260px\)/);
  assert.match(sectionSource, /clamp\(210px, 17vw, 270px\)/);
  assert.match(sectionSource, /href: "\/contact"/);
  assert.doesNotMatch(ctaSource, /before:absolute|after:absolute|before:bg-current|after:bg-current|after:scale-x|border-bottom|text-decoration:\s*underline/);
  assert.doesNotMatch(sectionSource, /font-instrument-serif|bg-slate-950|text-white|mask-image|decoration-2|underline-offset-8|text-\[clamp\(2\.5rem,9\.5vw,6rem\)\]|sm:text-\[clamp\(3rem,7vw,6rem\)\]|min-h-\[23\.5rem\]|min-h-\[24\.5rem\]|strokeDasharray="3 14"|strokeWidth="2"/);
});

test("hiring teams page adds the final compact comparison table before the footer", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(hiringTeamsComparisonPath), true);

  const source = readFileSync(componentPath, "utf8");
  const sectionSource = readFileSync(hiringTeamsComparisonPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const antiFitIndex = source.indexOf("<NotForEveryoneSection copy={hiringTeamsExperience.antiFit} />");
  const comparisonIndex = source.indexOf("<HiringTeamsComparisonSection copy={hiringTeamsExperience.comparison} />");

  assert.match(source, /HiringTeamsComparisonSection,[\s\S]*type HiringTeamsComparisonCopy/);
  assert.ok(antiFitIndex > -1);
  assert.ok(comparisonIndex > -1);
  assert.ok(antiFitIndex < comparisonIndex);
  assert.match(sectionSource, /aria-labelledby="hiring-teams-comparison-title"/);
  assert.match(sectionSource, /id="hiring-teams-comparison-title"/);
  assert.match(sectionSource, /comparisonSection/);
  assert.match(sectionSource, /comparisonInner/);
  assert.match(sectionSource, /comparisonCard/);
  assert.match(sectionSource, /comparisonScroller/);
  assert.match(sectionSource, /comparisonTable/);
  assert.match(sectionSource, /copy\.columns\.map/);
  assert.match(sectionSource, /copy\.rows\.map/);
  assert.match(sectionSource, /copy\.caption/);
  assert.match(sectionSource, /copy\.title/);
  assert.match(sectionSource, /copy\.subtitle/);
  assert.match(sectionSource, /<table/);
  assert.match(sectionSource, /<caption className="sr-only">/);
  assert.match(sectionSource, /scope="col"/);
  assert.match(sectionSource, /scope="row"/);
  assert.doesNotMatch(sectionSource, /How we line up against the alternatives\./);
  assert.match(translations, /How we line up against the alternatives\./);
  assert.match(translations, /No row was edited to make us win\. If a competitor is better at something, we say so\./);
  assert.match(translations, /AI interview \+ outcome pricing/);
  assert.match(translations, /LinkedIn \\u00b7 Indeed/);
  assert.match(translations, /Sapia \\u00b7 HireVue/);
  assert.match(translations, /Reverse \\u00b7 Adecco/);
  assert.match(translations, /Platform \\u20ac400 \+ \\u20ac200\/hire \+ lets speak performance/);
  assert.match(translations, /3\\u20135 days/);
  assert.match(translations, /\\u20ac1\.5K\\u2013\\u20ac4K/);
  assert.match(translations, /AI \+ human review/);
  assert.match(translations, /14-day SLA/);
  assert.match(translations, /Repeat commercial hiring/);
  assert.match(translations, /Low \\u2014 1 week/);
  assert.match(translations, /12-mo, closed loop/);
  assert.match(translations, /status: "positive"/);
  assert.match(translations, /status: "negative"/);
  assert.match(translations, /status: "neutral"/);
  assert.match(sectionSource, /useReducedMotion/);
  assert.match(sectionSource, /whileInView="visible"/);
  assert.match(sectionSource, /staggerChildren: 0\.035/);
  assert.match(sectionSource, /overflow-x-auto/);
  assert.match(sectionSource, /min-w-\[920px\]/);
  assert.match(sectionSource, /sticky left-0/);
  assert.match(sectionSource, /text-white/);
  assert.match(sectionSource, /var\(--page-dark\)/);
  assert.match(sectionSource, /var\(--page-dark-violet\)/);
  assert.match(sectionSource, /bg-\[linear-gradient\(180deg,var\(--page-lilac-surface\)_0%,var\(--page-blue-surface\)_100%\)\]/);
  assert.doesNotMatch(sectionSource, /min-h-\[100vh\]|h-\[100vh\]|100vh/);
});

test("hiring teams comparison table keeps mobile horizontal scrolling unobstructed", () => {
  assert.equal(existsSync(hiringTeamsComparisonPath), true);

  const sectionSource = readFileSync(hiringTeamsComparisonPath, "utf8");

  assert.match(sectionSource, /comparisonScroller[^"]*overflow-x-auto/);
  assert.match(sectionSource, /comparisonScroller relative overflow-x-auto/);
  assert.match(sectionSource, /comparisonStickyRailMask/);
  assert.match(sectionSource, /absolute inset-y-0 left-0 z-10/);
  assert.match(sectionSource, /min-w-\[820px\][^"]*sm:min-w-\[920px\]/);
  assert.match(sectionSource, /className="w-\[145px\] sm:w-\[22%\]"/);
  assert.match(sectionSource, /className="w-\[188px\] sm:w-\[19\.5%\]"/);
  assert.match(sectionSource, /sticky left-0/);
  assert.match(sectionSource, /shadow-\[8px_0_18px_var\(--page-shadow\)\]/);
  assert.match(sectionSource, /text-\[0\.72rem\]/);
  assert.doesNotMatch(sectionSource, /rounded-tl-\[20px\] bg-white\/90 px-4 py-4/);
  assert.match(sectionSource, /from-\[var\(--page-surface-strong\)\]/);
});

test("hiring teams special page sections are driven by localized copy", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(notForEveryonePath), true);
  assert.equal(existsSync(hiringTeamsComparisonPath), true);

  const source = readFileSync(componentPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const antiFitSource = readFileSync(notForEveryonePath, "utf8");
  const comparisonSource = readFileSync(hiringTeamsComparisonPath, "utf8");
  const italianBlock = translations.slice(
    translations.indexOf("const productPagesIt"),
    translations.indexOf("const productPagesFr"),
  );
  const frenchBlock = translations.slice(
    translations.indexOf("const productPagesFr"),
    translations.indexOf("const en ="),
  );

  assert.match(source, /type HiringTeamsExperienceCopy/);
  assert.match(source, /const hiringTeamsExperience = page\.hiringTeamsExperience;/);
  assert.match(source, /<HiringTeamsScrollHero copy=\{hiringTeamsExperience\.hero\} \/>/);
  assert.match(source, /<HiringTeamsReasonsSection copy=\{hiringTeamsExperience\.reasons\} \/>/);
  assert.match(source, /<NotForEveryoneSection copy=\{hiringTeamsExperience\.antiFit\} \/>/);
  assert.match(source, /<HiringTeamsComparisonSection copy=\{hiringTeamsExperience\.comparison\} \/>/);
  assert.match(antiFitSource, /copy\.cards\.map/);
  assert.match(comparisonSource, /copy\.rows\.map/);
  assert.doesNotMatch(antiFitSource, /Four reasons/);
  assert.doesNotMatch(comparisonSource, /How we line up against the alternatives\./);
  assert.match(italianBlock, /Sala controllo assunzioni/);
  assert.match(translations, /Cinque motivi\. Con numeri dietro ognuno\./);
  assert.match(translations, /Quattro motivi/);
  assert.match(translations, /Confronto tra AssumerAI/);
  assert.match(frenchBlock, /Salle de controle recrutement/);
  assert.match(translations, /Cinq raisons\. Avec des chiffres derriere chacune\./);
  assert.match(translations, /Quatre raisons/);
  assert.match(translations, /Comparaison d'AssumerAI/);
});

test("pricing product page uses the animated pricing cards for all three tiers", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(pricingCardsPath), true);

  const source = readFileSync(componentPath, "utf8");
  const cardSource = readFileSync(pricingCardsPath, "utf8");
  const globalCss = readFileSync(globalCssPath, "utf8");
  const pricingSectionSource = source.slice(
    source.indexOf("function PricingProductTiersSection"),
    source.indexOf("function HiringTeamsScrollHero"),
  );
  const roiSliderSource = pricingSectionSource.slice(
    pricingSectionSource.indexOf("function RoiSlider"),
  );

  assert.match(source, /import \{ Heading, Paragraph, Price, PricingWrapper \} from "@\/components\/ui\/aniamted-pricing-cards";/);
  assert.match(source, /const isPricingPage = slug === "pricing";/);
  assert.match(source, /isPricingPage \? \(\s*<PricingProductTiersSection[\s\S]*plans=\{t\.pricing\.plans\}/);
  assert.match(source, /function PricingProductTiersSection\(\{[\s\S]*plans[\s\S]*\}/);
  assert.match(source, /plans\.map\(\(plan, index\) => \(/);
  assert.match(source, /<PricingWrapper[\s\S]*key=\{plan\.name\}[\s\S]*contactHref="\/contact"/);
  assert.match(source, /<Heading>\{plan\.name\}<\/Heading>/);
  assert.match(source, /<Price>[\s\S]*\{plan\.price\}[\s\S]*plan\.cadence \?[\s\S]*\{plan\.cadence\}[\s\S]*: null[\s\S]*<\/Price>/);
  assert.match(source, /plan\.body \? <Paragraph>\{plan\.body\}<\/Paragraph> : null/);
  assert.match(pricingSectionSource, /function SavingsRoiCalculator/);
  assert.match(pricingSectionSource, /<SavingsRoiCalculator \/>/);
  assert.match(pricingSectionSource, /const \[hiresPerYear, setHiresPerYear\] = useState\(12\);/);
  assert.match(pricingSectionSource, /const platformAnnual = 400 \* 12;/);
  assert.match(pricingSectionSource, /const successFees = hiresPerYear \* 200;/);
  assert.match(pricingSectionSource, /const assumeraiCost = platformAnnual \+ successFees;/);
  assert.doesNotMatch(pricingSectionSource, /performanceFees/);
  assert.match(pricingSectionSource, /const annualSavings = baselineCost - assumeraiCost;/);
  assert.match(pricingSectionSource, /const roiPercent = Math\.round\(\(annualSavings \/ assumeraiCost\) \* 100\);/);
  assert.match(pricingSectionSource, /ariaLabel="Annual hires"/);
  assert.match(pricingSectionSource, /ariaLabel="Recruiter fee per hire"/);
  assert.match(pricingSectionSource, /ariaLabel="Screening hours per role"/);
  assert.match(pricingSectionSource, /aria-label=\{ariaLabel\}/);
  assert.match(pricingSectionSource, /Savings & ROI calculator/);
  assert.doesNotMatch(pricingSectionSource, /Savings model/);
  assert.match(pricingSectionSource, /against the \{"\\u20ac400"\} platform fee and \{"\\u20ac200"\} per-hire fee\. Performance: let&apos;s speak\./);
  assert.match(pricingSectionSource, /Annual savings/);
  assert.match(pricingSectionSource, /function RoiSlider/);
  assert.match(pricingSectionSource, /const sliderProgress = \(\(value - min\) \/ \(max - min\)\) \* 100;/);
  assert.match(pricingSectionSource, /"--slider-progress": `\$\{sliderProgress\}%`/);
  assert.match(pricingSectionSource, /pointer-events-none absolute left-\[var\(--slider-progress\)\]/);
  assert.match(pricingSectionSource, /bg-\[linear-gradient\(90deg,var\(--page-accent-pink\)_0%,var\(--page-accent-strong\)_55%,var\(--page-accent-blue\)_100%\)\]/);
  assert.match(pricingSectionSource, /Array\.from\(\{ length: 5 \}\)/);
  assert.match(pricingSectionSource, /opacity-0/);
  assert.match(pricingSectionSource, /mx-auto mt-10 max-w-\[980px\]/);
  assert.match(pricingSectionSource, /text-2xl font-light leading-\[1\.04\][\s\S]*sm:text-3xl/);
  assert.match(pricingSectionSource, /mt-3 max-w-\[38rem\] text-sm font-normal leading-6/);
  assert.match(pricingSectionSource, /mt-5 grid gap-3/);
  assert.match(roiSliderSource, /bg-white px-3 py-3/);
  assert.match(roiSliderSource, /h-7/);
  assert.match(roiSliderSource, /h-\[2px\]/);
  assert.match(roiSliderSource, /size-4/);
  assert.doesNotMatch(roiSliderSource, /h-10|size-5|text-base font-bold|mt-5 block/);
  assert.doesNotMatch(pricingSectionSource, /accent-\[var\(--page-accent-strong\)\]/);
  assert.match(source, /!isCandidatesPage && !isHiringTeamsPage && !isPricingPage/);
  assert.match(source, /!isHiringTeamsPage && !isPricingPage/);
  assert.match(cardSource, /export const PricingWrapper/);
  assert.match(cardSource, /animate-\[waves_7s_linear_infinite\]/);
  assert.match(cardSource, /rounded-\[8px\]/);
  assert.match(cardSource, /var\(--font-geist-sans\)/);
  assert.match(globalCss, /@keyframes waves/);
  assert.match(pricingSectionSource, /className="relative isolate min-h-\[calc\(100svh-5rem\)\][^"]*bg-white/);
  assert.doesNotMatch(pricingSectionSource, /bg-\[radial-gradient|radial-gradient\(circle_at_18%_18%|linear-gradient\(180deg,var\(--page-bg-soft\)_0%,var\(--page-bg\)_78%\)|bg-white\/70/);
  assert.match(pricingSectionSource, /text-\[2\.6rem\][\s\S]*font-light[\s\S]*leading-\[1\.04\][\s\S]*tracking-normal[\s\S]*sm:text-\[3\.5rem\][\s\S]*lg:text-\[4\.1rem\]/);
  assert.match(pricingSectionSource, /text-base[\s\S]*font-normal[\s\S]*leading-\[1\.55\][\s\S]*text-\[color:var\(--page-text-muted\)\][\s\S]*sm:text-lg/);
  assert.doesNotMatch(pricingSectionSource, /text-\[3\.3rem\]|sm:text-\[4\.8rem\]|lg:text-\[5\.4rem\]|text-xl|sm:text-\[1\.45rem\]/);
  assert.doesNotMatch(pricingSectionSource, /border-\[var\(--page-border\)\]|bg-white\/75|px-4 py-2 text-xs font-bold uppercase text-\[color:var\(--page-accent-strong\)\]/);
  assert.doesNotMatch(pricingSectionSource, /\{eyebrow\}/);
  assert.doesNotMatch(cardSource, /bg-purple-500|rounded-2xl|text-\[clamp\(0\.1rem,20vw,1\.25rem\)\]/);
});

test("candidate scroll flow is clean and reveals the privacy copy before product nav", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(containerScrollPath), true);
  assert.equal(existsSync(textRevealPath), true);

  const source = readFileSync(componentPath, "utf8");
  const containerScrollSource = readFileSync(containerScrollPath, "utf8");
  const textRevealSource = readFileSync(textRevealPath, "utf8");
  const revealIndex = source.indexOf("<TextRevealByWord");
  const navIndex = source.indexOf("<nav");

  assert.ok(revealIndex > -1);
  assert.ok(navIndex > -1);
  assert.ok(revealIndex < navIndex);
  assert.match(source, /TextRevealByWord/);
  assert.match(source, /highlightPhrase=\{candidateExperience\.revealHighlight\}/);
  assert.match(containerScrollSource, /h-\[260svh\]/);
  assert.match(containerScrollSource, /useTransform\(scrollYProgress, \[0, 0\.42, 0\.72, 1\], \[1, 1\.08, 0\.84, 0\.62\]\)/);
  assert.match(containerScrollSource, /useTransform\(scrollYProgress, \[0, 0\.36, 0\.72, 1\], \[0, -96, -420, -760\]\)/);
  assert.match(containerScrollSource, /useTransform\(scrollYProgress, \[0, 0\.28, 0\.64, 1\], \[0, -2, -8, -14\]\)/);
  assert.match(containerScrollSource, /useTransform\(scrollYProgress, \[0, 0\.62, 1\], \["0px", "28px", "80px"\]\)/);
  assert.match(containerScrollSource, /y: titleY/);
  assert.match(containerScrollSource, /scale: titleScale/);
  assert.doesNotMatch(containerScrollSource, /translateY/);
  assert.match(textRevealSource, /useMotionValue/);
  assert.match(textRevealSource, /height: "460vh"/);
  assert.match(textRevealSource, /section\.offsetHeight - window\.innerHeight/);
  assert.match(textRevealSource, /const REVEAL_START_AT = 0\.12/);
  assert.match(textRevealSource, /const REVEAL_COMPLETE_AT = 0\.56/);
  assert.match(textRevealSource, /const REVEAL_HANDOFF_START_AT = 0\.78/);
  assert.match(textRevealSource, /const REVEAL_HANDOFF_COMPLETE_AT = 0\.9/);
  assert.match(textRevealSource, /handoffOpacity/);
  assert.match(textRevealSource, /handoffY/);
  assert.match(textRevealSource, /sticky top-0 z-10/);
  assert.match(textRevealSource, /style=\{\{ opacity: handoffOpacity, y: handoffY \}\}/);
  assert.match(textRevealSource, /bg-white/);
  assert.match(textRevealSource, /visibleCharacterIndex/);
  assert.match(textRevealSource, /#ff2d2d/);
  assert.doesNotMatch(containerScrollSource, /ContainerScrollCard/);
  assert.doesNotMatch(containerScrollSource, /border-4 border-\[#6c6c6c\]|bg-\[#222222\]|rotateX/);
});

test("text reveal fades the baseline word layer so mobile copy does not double-render", () => {
  assert.equal(existsSync(textRevealPath), true);

  const textRevealSource = readFileSync(textRevealPath, "utf8");

  assert.match(textRevealSource, /const backgroundOpacity = useTransform\(\s*progress,/);
  assert.match(textRevealSource, /<span className="sr-only">\{text\}<\/span>/);
  assert.match(textRevealSource, /aria-hidden="true"\s+className="relative mx-1\.5 inline-block md:mx-2\.5"/);
  assert.match(textRevealSource, /relative mx-1\.5 inline-block md:mx-2\.5/);
  assert.match(textRevealSource, /absolute left-0 top-0/);
  assert.match(textRevealSource, /hidden sm:inline/);
  assert.doesNotMatch(textRevealSource, /"absolute opacity-30"/);
});

test("candidate page has a text-only horizontal cards section after the reveal", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(candidateCardsPath), true);

  const source = readFileSync(componentPath, "utf8");
  const cardsSource = readFileSync(candidateCardsPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const revealIndex = source.indexOf("<TextRevealByWord");
  const cardsIndex = source.indexOf("<CandidateHorizontalCards");

  assert.ok(revealIndex > -1);
  assert.ok(cardsIndex > -1);
  assert.ok(revealIndex < cardsIndex);
  assert.match(cardsSource, /useMotionValue/);
  assert.match(cardsSource, /sectionHeight/);
  assert.match(cardsSource, /metricsRef/);
  assert.match(cardsSource, /const matchProgress = useMotionValue\(0\);/);
  assert.match(cardsSource, /matchProgress\.set\(rawProgress\);/);
  assert.match(cardsSource, /window\.innerWidth/);
  assert.match(cardsSource, /CARD_SCROLL_START = 0\.12/);
  assert.match(cardsSource, /CARD_SCROLL_END = 0\.82/);
  assert.match(cardsSource, /ResizeObserver/);
  assert.match(cardsSource, /trackRef\.current\.scrollWidth/);
  assert.doesNotMatch(cardsSource, /viewportRef\.current\.clientWidth/);
  assert.match(cardsSource, /className="relative -mt-\[38vh\] bg-white"/);
  assert.match(cardsSource, /next\/image/);
  assert.match(cardsSource, /export type CandidateHorizontalCardCopy/);
  assert.match(cardsSource, /cards: CandidateHorizontalCardCopy\[\]/);
  assert.match(cardsSource, /dontDoLabel/);
  assert.match(translations, /\/cards_for_candidates\/postal\.png/);
  assert.match(translations, /\/cards_for_candidates\/calendar\.png/);
  assert.match(translations, /\/cards_for_candidates\/studio\.png/);
  assert.match(translations, /\/cards_for_candidates\/interview\.png/);
  assert.match(translations, /\/cards_for_candidates\/scorecard\.png/);
  assert.match(translations, /Sign up/);
  assert.match(translations, /Registrazione/);
  assert.match(translations, /Inscription/);
  assert.match(translations, /It's a match/);
  assert.match(translations, /E un match/);
  assert.match(translations, /C'est un match/);
  assert.match(cardsSource, /MATCH_LABEL_GRADIENT/);
  assert.match(cardsSource, /linear-gradient\(90deg, #e8a9dc 0%, #e8a9dc 32%, #c9adeb 58%, #9fbbf2 100%\)/);
  assert.match(cardsSource, /bg-clip-text text-transparent/);
  assert.match(cardsSource, /bg-\[#f8fbff\]/);
  assert.match(cardsSource, /bg-\[#fbfdff\]/);
  assert.doesNotMatch(cardsSource, /#f4f1ea|#fff8f3/);
  assert.doesNotMatch(cardsSource, /text-\[#ff4f7b\]/);
  assert.doesNotMatch(cardsSource, /ffd5de|fff0bc|rgba\(255, 79, 123/);
  assert.match(cardsSource, /useTransform/);
  assert.match(cardsSource, /viewportHeight: DEFAULT_VIEWPORT_HEIGHT/);
  assert.match(cardsSource, /const viewportHeight = getStableViewportHeight\(viewportRef\.current\);/);
  assert.match(cardsSource, /section\.offsetHeight - metricsRef\.current\.viewportHeight/);
  assert.match(cardsSource, /viewportHeight \* \(cards\.length \+ 5\)/);
  assert.match(cardsSource, /setSectionHeight\(\(currentHeight\) =>/);
  assert.doesNotMatch(cardsSource, /window\.innerHeight \* \(cards\.length \+ 5\)/);
  assert.match(cardsSource, /-mt-\[38vh\]/);
  assert.match(
    cardsSource,
    /useTransform\(\s*matchProgress,\s*\[0\.78, 0\.82, 0\.96, 0\.995\]/,
  );
  assert.match(cardsSource, /\[\s*0,\s*1,\s*1,\s*0,?\s*\]/);
  assert.match(cardsSource, /useTransform\(matchProgress, \[0\.965, 1\]/);
  assert.match(cardsSource, /\{dontDoLabel\}/);
  assert.doesNotMatch(cardsSource, /Your profile keeps improving\./);
  assert.match(cardsSource, /text-lg font-medium/);
  assert.doesNotMatch(cardsSource, /01 Intake|02 Interview|03 Control|04 Scorecard|05 Dashboard/i);
  assert.match(cardsSource, /sticky top-0/);
  assert.match(cardsSource, /h-svh/);
  assert.doesNotMatch(cardsSource, /h-screen/);
  assert.match(cardsSource, /items-center/);
  assert.doesNotMatch(cardsSource, /items-start/);
  assert.match(cardsSource, /pt-24/);
  assert.match(cardsSource, /h-\[30vh\]/);
  assert.match(cardsSource, /right-8 top-1\/2 h-\[58%\] w-\[38%\]/);
  assert.match(cardsSource, /md:h-\[74%\] md:w-\[24%\]/);
  assert.doesNotMatch(cardsSource, /right-\[4\.75rem\] top-1\/2 h-\[68%\] w-\[22%\]/);
  assert.doesNotMatch(cardsSource, /md:right-24 md:h-\[72%\] md:w-\[32%\]/);
  assert.match(cardsSource, /w-\[min\(82vw,36rem\)\]/);
  assert.doesNotMatch(cardsSource, /<img/);
});

test("candidate page adds a compact two-column clarity section after the cards", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(candidateClarityPath), true);

  const source = readFileSync(componentPath, "utf8");
  const claritySource = readFileSync(candidateClarityPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const cardsIndex = source.indexOf("<CandidateHorizontalCards");
  const clarityIndex = source.indexOf("<CandidateClaritySection");

  assert.ok(cardsIndex > -1);
  assert.ok(clarityIndex > -1);
  assert.ok(cardsIndex < clarityIndex);
  assert.match(source, /CandidateClaritySection/);
  assert.match(claritySource, /copy\.eyebrow/);
  assert.doesNotMatch(claritySource, /Candidate signal/);
  assert.match(claritySource, /copy\.heading/);
  assert.match(claritySource, /copy\.columns\.map/);
  assert.match(translations, /What it is\. And just as importantly, what it isn't\./);
  assert.match(translations, /Che cos'e/);
  assert.match(translations, /Ce que c'est/);
  assert.match(claritySource, /bg-\[#f5f5f7\]/);
  assert.match(claritySource, /\[font-family:var\(--font-geist-sans\),sans-serif\]/);
  assert.match(claritySource, /rounded-\[8px\]/);
  assert.match(claritySource, /grid gap-px/);
  assert.match(claritySource, /grid-cols-2/);
  assert.match(claritySource, /py-14/);
  assert.match(claritySource, /lg:py-20/);
  assert.match(claritySource, /max-w-\[1040px\]/);
  assert.match(claritySource, /text-balance text-4xl font-light leading-\[1\.0\] tracking-normal/);
  assert.match(claritySource, /lg:text-6xl/);
  assert.match(claritySource, /mt-8/);
  assert.doesNotMatch(claritySource, /tracking-\[0\.16em\]/);
  assert.doesNotMatch(claritySource, /sm:grid-cols-\[0\.28fr_1fr\]/);
  assert.doesNotMatch(claritySource, /lg:py-32|lg:text-\[5\.75rem\]|max-w-\[1180px\]/);
  assert.doesNotMatch(claritySource, /Check|CheckCircle|XCircle|CircleX|lucide-react/);
  assert.doesNotMatch(claritySource, /✓|✔|✕|✖|×/);
});

test("candidate page replaces the capability grid with the expanding cards section", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(candidateExpandingCardsPath), true);

  const source = readFileSync(componentPath, "utf8");
  const sectionSource = readFileSync(candidateExpandingCardsPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const clarityIndex = source.indexOf("<CandidateClaritySection");
  const expandingSectionIndex = source.indexOf("<CandidateExpandingCardsSection");
  const finalCtaIndex = source.indexOf("page.finalCta");

  assert.match(source, /CandidateExpandingCardsSection/);
  assert.ok(clarityIndex > -1);
  assert.ok(finalCtaIndex > -1);
  assert.ok(expandingSectionIndex > -1);
  assert.ok(clarityIndex < expandingSectionIndex);
  assert.ok(expandingSectionIndex < finalCtaIndex);
  assert.match(source, /<CandidateExpandingCardsSection copy=\{candidateExperience\.privacy\} \/>\s*<CandidateCommitmentsSection copy=\{candidateExperience\.commitments\} \/>/);
  assert.doesNotMatch(source, /\{isCandidatesPage && <CandidateExpandingCardsSection \/>}/);
  assert.match(sectionSource, /copy\.eyebrow/);
  assert.match(sectionSource, /copy\.heading/);
  assert.match(sectionSource, /copy\.body/);
  assert.match(sectionSource, /copy\.items\.map/);
  assert.match(translations, /Your data stays yours\./);
  assert.match(translations, /I tuoi dati restano tuoi\./);
  assert.match(translations, /Vos donnees restent les votres\./);
  assert.match(sectionSource, /ExpandingCards/);
  assert.match(sectionSource, /CardItem/);
  assert.match(sectionSource, /https:\/\/images\.unsplash\.com\//);
  assert.match(sectionSource, /defaultActiveIndex=\{0\}/);
});

test("expanding cards ui component exposes the requested responsive interaction", () => {
  assert.equal(existsSync(expandingCardsPath), true);

  const source = readFileSync(expandingCardsPath, "utf8");

  assert.match(source, /"use client";/);
  assert.match(source, /export interface CardItem/);
  assert.match(source, /export const ExpandingCards = React\.forwardRef/);
  assert.match(source, /items: CardItem\[\]/);
  assert.match(source, /defaultActiveIndex\?: number/);
  assert.match(source, /useState<number \| null>/);
  assert.match(source, /window\.innerWidth >= 768/);
  assert.match(source, /gridTemplateColumns/);
  assert.match(source, /gridTemplateRows/);
  assert.match(source, /onMouseEnter/);
  assert.match(source, /onFocus/);
  assert.match(source, /onClick/);
  assert.match(source, /<img/);
  assert.match(source, /group-data-\[active=true\]/);
});

test("candidate page adds commitments after the expanding privacy cards", () => {
  assert.equal(existsSync(componentPath), true);
  assert.equal(existsSync(candidateCommitmentsPath), true);

  const source = readFileSync(componentPath, "utf8");
  const commitmentsSource = readFileSync(candidateCommitmentsPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const expandingSectionIndex = source.indexOf("<CandidateExpandingCardsSection");
  const commitmentsIndex = source.indexOf("<CandidateCommitmentsSection");
  const finalCtaIndex = source.indexOf("page.finalCta");

  assert.match(source, /CandidateCommitmentsSection/);
  assert.ok(expandingSectionIndex > -1);
  assert.ok(commitmentsIndex > -1);
  assert.ok(finalCtaIndex > -1);
  assert.ok(expandingSectionIndex < commitmentsIndex);
  assert.ok(commitmentsIndex < finalCtaIndex);
  assert.match(commitmentsSource, /copy\.eyebrow/);
  assert.match(commitmentsSource, /copy\.heading/);
  assert.match(commitmentsSource, /copy\.items\.map/);
  assert.match(translations, /Three commitments\. No fine print\./);
  assert.match(translations, /14 days/);
  assert.match(translations, /Response in 14 days, always\./);
  assert.match(translations, /removed from the platform/);
  assert.match(translations, /Max 2/);
  assert.match(translations, /Two human interviews after the AI\. No more\./);
  assert.match(translations, /No five-round gauntlets/);
  assert.match(translations, /Always/);
  assert.match(translations, /Feedback always - even on a no\./);
  assert.match(translations, /Every decision comes with a reason/);
  assert.doesNotMatch(commitmentsSource, /\[font-family:var\(--font-instrument-serif\),serif\]/);
  assert.doesNotMatch(commitmentsSource, /text-5xl italic/);
});

test("localized copy contains product page content", () => {
  const source = readFileSync(i18nPath, "utf8");
  const productPagesSource = source.slice(
    source.indexOf("const productPagesEn"),
    source.indexOf("const en ="),
  );

  assert.match(source, /productPages/);
  assert.match(source, /candidates:/);
  assert.match(source, /hiringTeams:/);
  assert.match(source, /pricing:/);
  assert.doesNotMatch(productPagesSource, /interview:/);
  assert.doesNotMatch(productPagesSource, /Interview Engine/);
  assert.doesNotMatch(productPagesSource, /Show the interview as a product/);
  assert.match(source, /You deserve a real conversation,/);
  assert.match(source, /not a silent inbox\./);
  assert.match(source, /Take your AI interview/);
  assert.match(source, /free · 20 minutes · no commitment/);
  assert.doesNotMatch(source, /Give candidates one calm place to do the work\./);
  assert.doesNotMatch(source, /The candidate product page turns the landing promise into a dedicated, inspectable product story\./);
  assert.doesNotMatch(source, /Start as a candidate/);
});
