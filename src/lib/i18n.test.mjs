import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");
const layoutPath = path.join(rootDir, "src", "app", "layout.tsx");

function getLanguageBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(start, -1, `expected ${startMarker}`);
  assert.notEqual(end, -1, `expected ${endMarker}`);

  return source.slice(start, end);
}

function getObjectBlock(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `expected ${marker}`);

  const openIndex = source.indexOf("{", markerIndex);
  assert.notEqual(openIndex, -1, `expected object for ${marker}`);

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return source.slice(openIndex, index + 1);
  }

  assert.fail(`expected closing brace for ${marker}`);
}

test("i18n provider supports English, Italian, and French language selection", () => {
  assert.ok(existsSync(i18nPath), "expected i18n provider module to exist");

  const source = readFileSync(i18nPath, "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /code: "en"/);
  assert.match(source, /code: "it"/);
  assert.match(source, /code: "fr"/);
  assert.match(source, /Italiano/);
  assert.match(source, /Fran(?:ç|\\u00e7)ais/);
  assert.match(source, /localStorage/);
  assert.match(source, /document\.documentElement\.lang/);
  assert.match(source, /brand:\s*"Assumerai"/);
  assert.doesNotMatch(source, /brand:\s*"AssumerAI"/);
  assert.match(source, /L'app per il lavoro/);
  assert.match(source, /L'app emploi/);
  assert.match(source, /auth:\s*\{/);
  assert.match(source, /welcomeBack:\s*"Welcome back"/);
  assert.match(source, /welcomeBack:\s*"Bentornato"/);
  assert.match(source, /welcomeBack:\s*"Bon retour"/);
  assert.match(source, /emailInvalid:\s*"Enter a valid email and password\."/);
  assert.match(source, /errorMessage:\s*"Something went wrong\. Please try again\."/);
  assert.match(source, /userAccount:\s*"User account"/);
  assert.match(source, /signOut:\s*"Sign out"/);
  assert.match(source, /userAccount:\s*"Account utente"/);
  assert.match(source, /signOut:\s*"Esci"/);
  assert.match(source, /userAccount:\s*"Compte utilisateur"/);
  assert.match(source, /signOut:\s*"Se deconnecter"/);
});

test("company auth and profile account copy is localized for every language", () => {
  const source = readFileSync(i18nPath, "utf8");

  assert.match(source, /accountTypeLabel:\s*"Account type"/);
  assert.match(source, /candidateAccount:\s*"Candidate"/);
  assert.match(source, /companyAccount:\s*"Company"/);
  assert.match(source, /accountTypeLabel:\s*"Tipo di account"/);
  assert.match(source, /companyAccount:\s*"Azienda"/);
  assert.match(source, /accountTypeLabel:\s*"Type de compte"/);
  assert.match(source, /companyAccount:\s*"Entreprise"/);
  assert.match(source, /profile:\s*\{/);
  assert.match(source, /candidate:\s*\{[\s\S]*eyebrow:\s*"Candidate profile"/);
  assert.match(source, /company:\s*\{[\s\S]*eyebrow:\s*"Company profile"/);
  assert.match(source, /settings:\s*\{[\s\S]*signOutTitle:\s*"Sign out"/);
  assert.match(source, /company:\s*\{[\s\S]*eyebrow:\s*"Profilo azienda"/);
  assert.match(source, /company:\s*\{[\s\S]*eyebrow:\s*"Profil entreprise"/);
});

test("company dashboard copy is localized for every language", () => {
  const source = readFileSync(i18nPath, "utf8");
  const languageBlocks = {
    en: getObjectBlock(
      getLanguageBlock(source, "const en = {", "const it: TranslationContent = {"),
      "companyDashboard:",
    ),
    it: getObjectBlock(
      getLanguageBlock(source, "const it: TranslationContent = {", "const fr: TranslationContent = {"),
      "companyDashboard:",
    ),
    fr: getObjectBlock(
      getLanguageBlock(source, "const fr: TranslationContent = {", "export const translations"),
      "companyDashboard:",
    ),
  };
  const requiredCompanyDashboardKeys = [
    "workspaceLabel",
    "actions",
    "finishSetup",
    "createFirstRole",
    "onboarding",
    "metrics",
    "activeRoles",
    "acceptedCandidates",
    "overdueReviews",
    "unresolvedHolds",
    "firstRun",
    "fallbackTitle",
    "fallbackBody",
    "backToProfile",
    "panels",
    "candidateQueues",
    "queues",
    "role",
    "match",
    "reviewDueAt",
    "nav",
    "search",
    "rolePipeline",
    "scheduleReview",
    "analytics",
  ];

  assert.match(source, /companyDashboard:\s*\{/);
  assert.match(source, /workspaceLabel:\s*"Company workspace"/);
  assert.match(source, /finishSetup:\s*"Finish company setup"/);
  assert.match(source, /firstRunTitle:\s*"Set up one role, then review candidates as they accept sharing\."/);
  assert.match(source, /candidateQueue:\s*"Candidate queue"/);
  assert.match(source, /workspaceLabel:\s*"Workspace aziendale"/);
  assert.match(source, /finishSetup:\s*"Completa setup aziendale"/);
  assert.match(source, /firstRunTitle:\s*"Configura un ruolo, poi rivedi i candidati quando accettano la condivisione\."/);
  assert.match(source, /candidateQueue:\s*"Coda candidati"/);
  assert.match(source, /workspaceLabel:\s*"Espace entreprise"/);
  assert.match(source, /finishSetup:\s*"Terminer la configuration"/);
  assert.match(source, /firstRunTitle:\s*"Configurez un role, puis examinez les candidats lorsqu'ils acceptent le partage\."/);
  assert.match(source, /candidateQueue:\s*"File candidats"/);

  const missingKeysByLanguage = {};

  for (const [language, block] of Object.entries(languageBlocks)) {
    const missingKeys = requiredCompanyDashboardKeys.filter(
      (key) => !new RegExp(`${key}:`).test(block),
    );
    if (missingKeys.length > 0) {
      missingKeysByLanguage[language] = missingKeys;
    }
  }

  assert.deepEqual(missingKeysByLanguage, {}, "expected localized companyDashboard keys");
});

test("company onboarding, role intake, and review copy is localized", () => {
  const source = readFileSync(i18nPath, "utf8");

  assert.match(source, /companyOnboarding:\s*\{/);
  assert.match(source, /title:\s*"Confirm the workspace profile"/);
  assert.match(source, /domain:\s*"Company domain"/);
  assert.match(source, /companyOnboarding:\s*\{[\s\S]*title:\s*"Conferma il profilo workspace"/);
  assert.match(source, /domain:\s*"Dominio azienda"/);
  assert.match(source, /companyOnboarding:\s*\{[\s\S]*title:\s*"Confirmez le profil workspace"/);
  assert.match(source, /domain:\s*"Domaine entreprise"/);

  assert.match(source, /companyRoleWizard:\s*\{/);
  assert.match(source, /eyebrow:\s*"Structured role intake"/);
  assert.match(source, /submit:\s*"Create role"/);
  assert.match(source, /companyRoleWizard:\s*\{[\s\S]*eyebrow:\s*"Intake ruolo strutturato"/);
  assert.match(source, /companyRoleWizard:\s*\{[\s\S]*eyebrow:\s*"Intake role structure"/);

  assert.match(source, /companyReview:\s*\{/);
  assert.match(source, /evidenceReview:\s*"Evidence review"/);
  assert.match(source, /rawMediaExcluded:\s*"Raw interview media is not shared\."/);
  assert.match(source, /companyReview:\s*\{[\s\S]*evidenceReview:\s*"Review evidenze"/);
  assert.match(source, /companyReview:\s*\{[\s\S]*evidenceReview:\s*"Revue des preuves"/);
});

test("candidate product page copy is localized for Italian and French", () => {
  const source = readFileSync(i18nPath, "utf8");
  const italianBlock = source.slice(
    source.indexOf("const productPagesIt"),
    source.indexOf("const productPagesFr"),
  );
  const frenchBlock = source.slice(
    source.indexOf("const productPagesFr"),
    source.indexOf("const en ="),
  );

  assert.notEqual(italianBlock, "", "expected Italian product page translations");
  assert.notEqual(frenchBlock, "", "expected French product page translations");
  assert.match(italianBlock, /Spazio candidato/);
  assert.match(italianBlock, /un profilo che continua a lavorare\./);
  assert.match(italianBlock, /Fai il colloquio/);
  assert.match(frenchBlock, /Espace candidat/);
  assert.match(frenchBlock, /un profil qui continue a travailler\./);
  assert.match(frenchBlock, /Passer l'entretien/);
});

test("root layout wraps the site with the language provider", () => {
  const source = readFileSync(layoutPath, "utf8");

  assert.match(source, /title:\s*"Assumerai"/);
  assert.match(source, /other:\s*\{[\s\S]*google:\s*"notranslate"/);
  assert.match(source, /<html[\s\S]*translate="no"/);
  assert.match(source, /notranslate/);
  assert.match(source, /LanguageProvider/);
  assert.match(source, /<LanguageProvider>[\s\S]*<Header \/>[\s\S]*<Footer \/>[\s\S]*<\/LanguageProvider>/);
});
