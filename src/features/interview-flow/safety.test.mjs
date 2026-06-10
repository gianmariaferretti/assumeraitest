import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const { containsDisallowedQuestionText, DISALLOWED_PROMPT_PATTERNS } = loadFromRepoRoot(
  "src/features/interview-flow/safety.ts",
);

// ---------------------------------------------------------------------------
// Table shape: one table, grouped by category, language-tagged regexes
// ---------------------------------------------------------------------------

test("every category carries patterns for all five interview languages", () => {
  const expectedCategories = [
    "age",
    "family_pregnancy",
    "health_disability",
    "religion",
    "origin_citizenship",
    "gender",
    "union_political",
    "biometric_accent",
  ];
  assert.deepEqual(
    DISALLOWED_PROMPT_PATTERNS.map((entry) => entry.category),
    expectedCategories,
  );

  for (const entry of DISALLOWED_PROMPT_PATTERNS) {
    const languages = entry.patterns.map((item) => item.language).sort();
    assert.deepEqual(
      languages,
      ["de", "en", "es", "fr", "it"],
      `category ${entry.category} must cover en/it/fr/de/es`,
    );
    assert.ok(entry.reason.length > 0, entry.category);
  }
});

// ---------------------------------------------------------------------------
// Positive cases: protected-trait questions are caught in every language
// ---------------------------------------------------------------------------

const POSITIVE_CASES = {
  age: {
    en: "How old are you?",
    it: "Quanti anni hai?",
    fr: "Quel âge avez-vous ?",
    de: "Wie alt sind Sie?",
    es: "¿Cuántos años tienes?",
  },
  family_pregnancy: {
    en: "Do you have children?",
    it: "Sei sposata o hai figli?",
    fr: "Êtes-vous mariée ? Avez-vous des enfants ?",
    de: "Sind Sie verheiratet und haben Sie Kinder?",
    es: "¿Está casada o embarazada?",
  },
  health_disability: {
    en: "Do you have any medical conditions?",
    it: "Hai problemi di salute o una disabilità?",
    fr: "Avez-vous des problèmes de santé ou un handicap ?",
    de: "Haben Sie eine Krankheit oder Behinderung?",
    es: "¿Tiene alguna enfermedad o discapacidad?",
  },
  religion: {
    en: "Which religion do you practice?",
    it: "Di che religione sei?",
    fr: "Allez-vous à l'église ?",
    de: "Welcher Konfession gehören Sie an?",
    es: "¿Qué religión practica usted?",
  },
  origin_citizenship: {
    en: "What is your citizenship status?",
    it: "Qual è la tua nazionalità? Hai il permesso di soggiorno?",
    fr: "Quelle est votre nationalité ? Avez-vous un permis de travail ?",
    de: "Welche Staatsangehörigkeit haben Sie?",
    es: "¿Cuál es su nacionalidad? ¿Tiene permiso de trabajo?",
  },
  gender: {
    en: "What is your gender?",
    it: "Qual è il tuo sesso?",
    fr: "Quel est votre sexe ?",
    de: "Welches Geschlecht haben Sie?",
    es: "¿Cuál es su identidad de género?",
  },
  union_political: {
    en: "What is your party affiliation?",
    it: "Sei iscritto a un sindacato? Quali sono le tue opinioni politiche?",
    fr: "Êtes-vous membre d'un syndicat ou d'un parti politique ?",
    de: "Sind Sie in einer Gewerkschaft? Welcher Partei gehören Sie an?",
    es: "¿Pertenece a un sindicato? ¿Cuál es su afiliación política?",
  },
  biometric_accent: {
    en: "Are you a native speaker? We score voice tone.",
    it: "Sei madrelingua? Valutiamo il tuo accento e la personalità.",
    fr: "Le français est-il votre langue maternelle ? Nous évaluons la prononciation.",
    de: "Sind Sie Muttersprachler? Wir bewerten Akzent und Persönlichkeit.",
    es: "¿Es hablante nativo? Evaluamos el acento y la personalidad.",
  },
};

for (const [category, byLanguage] of Object.entries(POSITIVE_CASES)) {
  test(`${category}: protected-trait questions are caught in every language`, () => {
    for (const [language, text] of Object.entries(byLanguage)) {
      assert.equal(
        containsDisallowedQuestionText(text),
        true,
        `[${category}/${language}] should be caught: ${text}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Negative cases: role-relevant phrasing must NOT be caught
// ---------------------------------------------------------------------------

const NEGATIVE_CASES = [
  // The spec's canonical pair: experience years are fine, age is not.
  ["it", "Quanti anni di esperienza hai con Python?"],
  ["it", "Dopo tre anni di esperienza nel ruolo, quale risultato ti rende orgoglioso?"],
  ["en", "Tell me about a specific past example where you handled a customer escalation."],
  ["en", "How many years of experience do you have with SQL?"],
  ["fr", "Combien d'années d'expérience avez-vous avec React ?"],
  ["de", "Wie viele Jahre Erfahrung haben Sie mit Kubernetes?"],
  ["es", "¿Cuántos años de experiencia tiene con SQL?"],
  // Innocent collocations that share words with protected categories.
  ["it", "Che genere di progetti preferisci gestire?"],
  ["it", "Raccontami le politiche aziendali di sicurezza che hai applicato."],
  ["it", "Sono partito da un'analisi dei requisiti del cliente."],
  ["it", "Ho visto il tuo portfolio: raccontami il progetto più complesso."],
  ["fr", "Vous avez agi en toute bonne foi avec le client : racontez-moi la situation."],
  ["fr", "Décrivez une promotion interne que vous avez obtenue grâce à un résultat mesurable."],
  ["de", "Beschreiben Sie die Verhandlung mit der dritten Vertragspartei."],
  ["es", "¿Qué género musical de campaña funcionó mejor en su proyecto de marketing?"],
  ["es", "Describe una negociación con un partido interesado del proyecto."],
];

test("role-relevant behavioral phrasing is never caught (per-language negatives)", () => {
  for (const [language, text] of NEGATIVE_CASES) {
    assert.equal(
      containsDisallowedQuestionText(text),
      false,
      `[${language}] should NOT be caught: ${text}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Cross-language: every pattern set runs on every text
// ---------------------------------------------------------------------------

test("a protected question is caught regardless of the session language", () => {
  // An Italian session can still receive a German protected question; the
  // filter checks every language's patterns on every text.
  assert.equal(containsDisallowedQuestionText("Wie alt bist du?"), true);
  assert.equal(containsDisallowedQuestionText("¿Está embarazada?"), true);
  assert.equal(containsDisallowedQuestionText("Quelle est votre nationalité ?"), true);
});
