import { containsEmployerPresupposingText } from "./platform-neutrality";
import type {
  InterviewQuestion,
  QuestionBankValidationResult,
  QuestionSafetyResult,
  QuestionSafetyViolation
} from "./types";

/**
 * Multilingual protected-trait filter. Interviews run in EN/IT/FR/DE/ES, so
 * every category carries language-tagged regexes; every pattern in every
 * language is checked against every text (a question can mix languages).
 *
 * Pattern-writing notes:
 * - JS `\b` is ASCII-only: it breaks next to accented characters, so patterns
 *   never place `\b` adjacent to an accented letter (e.g. /émotion/ instead of
 *   /\bémotion\b/).
 * - Patterns target trait QUESTIONS, not innocent collocations: "quanti anni
 *   hai" is caught while "quanti anni di esperienza" is not; "opinioni
 *   politiche" is caught while "politiche aziendali" is not; "identità di
 *   genere" is caught while "che genere di progetti" is not.
 */

export type SafetyCategory =
  | "age"
  | "family_pregnancy"
  | "health_disability"
  | "religion"
  | "origin_citizenship"
  | "gender"
  | "union_political"
  | "biometric_accent";

export type SafetyPatternLanguage = "en" | "it" | "fr" | "de" | "es";

export interface LanguageTaggedPattern {
  readonly language: SafetyPatternLanguage;
  readonly pattern: RegExp;
}

export interface DisallowedPromptCategory {
  readonly category: SafetyCategory;
  readonly reason: string;
  readonly patterns: readonly LanguageTaggedPattern[];
}

export const DISALLOWED_PROMPT_PATTERNS: readonly DisallowedPromptCategory[] = [
  {
    category: "age",
    reason: "direct age question",
    patterns: [
      { language: "en", pattern: /\bhow old\b|\bage\b|\bdate of birth\b|\bborn\b/i },
      {
        language: "it",
        pattern:
          /\bquanti anni (hai|ha|avete)\b|\bche et[aà] (hai|ha)|\b(tua|sua) et[aà]|\bdata di nascita\b|\bquando (sei|è) nat/i
      },
      {
        language: "fr",
        pattern: /\bquel [aâ]ge|\bvotre [aâ]ge|\bdate de naissance\b|êtes-vous né/i
      },
      {
        language: "de",
        pattern:
          /\bwie alt (bist|sind)\b|\bgeburtsdatum\b|\bwann (bist|sind) (du|sie) geboren\b|\b(dein|ihr) alter\b/i
      },
      {
        language: "es",
        pattern:
          /\bcu[aá]ntos a[nñ]os (tienes|tiene)\b|\bqu[eé] edad (tienes|tiene)\b|\b(tu|su) edad\b|\bfecha de nacimiento\b/i
      }
    ]
  },
  {
    category: "family_pregnancy",
    reason: "family or caregiver status question",
    patterns: [
      {
        language: "en",
        pattern:
          /\bmarried\b|\bspouse\b|\bchildren\b|\bfamily status\b|\bpregnan|\bparental status\b|\bcaregiver\b/i
      },
      {
        language: "it",
        pattern:
          /\bsposat|\bconiuge\b|\bfigli\b|\bfiglie\b|\bincint|\bgravidanza\b|\bstato civile\b|\bstato di famiglia\b/i
      },
      {
        language: "fr",
        pattern:
          /êtes[- ]vous mari[ée]|\bconjoint|\benfants\b|\benceinte\b|\bgrossesse\b|\bsituation familiale\b/i
      },
      {
        language: "de",
        pattern:
          /\bverheiratet\b|\behe(partner|frau|mann)|\bkinder\b|\bschwanger|\bfamilienstand\b/i
      },
      {
        language: "es",
        pattern:
          /\bcasad[oa]s?\b|\bc[oó]nyuge|\bhijos\b|\bhijas\b|\bembaraz|\bestado civil\b/i
      }
    ]
  },
  {
    category: "health_disability",
    reason: "health or disability question",
    patterns: [
      { language: "en", pattern: /\bhealth\b|\bmedical\b|\bdisab/i },
      {
        language: "it",
        pattern: /\bsalute\b|\bmalatti|\bdisabilit|\binvalidit|\bcondizioni mediche\b/i
      },
      { language: "fr", pattern: /\bsant[ée]|\bmaladie|\bhandicap/i },
      { language: "de", pattern: /\bgesundheit|\bkrankheit|\bbehinderung/i },
      { language: "es", pattern: /\bsalud\b|\benfermedad|\bdiscapacidad/i }
    ]
  },
  {
    category: "religion",
    reason: "religion question",
    patterns: [
      {
        language: "en",
        pattern: /\breligion\b|\bchurch\b|\bmosque\b|\bsynagogue\b|\bfaith\b/i
      },
      {
        language: "it",
        pattern: /\breligion|\bchiesa\b|\bmoschea\b|\bsinagoga\b|\bdi che fede\b/i
      },
      {
        language: "fr",
        pattern: /\breligion|église|\bmosqu[ée]e|\bcroyances? religieuses?/i
      },
      {
        language: "de",
        pattern:
          /\breligion|\bkonfession|\bkirche\b|\bmoschee\b|\bsynagoge\b|\bglaubensrichtung/i
      },
      {
        language: "es",
        pattern: /\breligi[oó]n|\biglesia\b|\bmezquita\b|\bsinagoga\b|\bcreencias religiosas\b/i
      }
    ]
  },
  {
    category: "origin_citizenship",
    reason: "protected origin or immigration-status question",
    patterns: [
      {
        language: "en",
        pattern:
          /\brace\b|\bethnic|\bnationality\b|\bcitizenship\b|\bpassport\b|\bvisa\b|\bwork authorization\b|\bwork authorisation\b/i
      },
      {
        language: "it",
        pattern:
          /\brazza\b|\betnia\b|\betnic[oa]|\bnazionalit|\bcittadinanza\b|\bpassaporto\b|\bvisto di lavoro\b|\bpermesso di soggiorno\b|\bpaese (di origine|d'origine)\b|\bdi dove (sei|viene)\b/i
      },
      {
        language: "fr",
        pattern:
          /\bnationalit[ée]|\bcitoyennet[ée]|\bpasseport\b|\bpermis de travail\b|\bpays d'origine\b|\bethnie\b|\bethnique|\bd'o[uù] venez[- ]vous/i
      },
      {
        language: "de",
        pattern:
          /\bstaatsangeh[oö]rigkeit|\bstaatsb[uü]rgerschaft|\bnationalit[aä]t|\breisepass\b|\barbeitserlaubnis\b|\bherkunft|\bethnisch|\bwoher (kommst du|kommen sie)\b/i
      },
      {
        language: "es",
        pattern:
          /\bnacionalidad|\bciudadan[ií]a|\bpasaporte\b|\bpermiso de trabajo\b|\bpa[ií]s de origen\b|étnic[oa]|\bde d[oó]nde (eres|es|viene)\b/i
      }
    ]
  },
  {
    category: "gender",
    reason: "gender or pregnancy question",
    patterns: [
      { language: "en", pattern: /\bgender\b|\bsex\b|\bpregnan/i },
      { language: "it", pattern: /\bsesso\b|\bidentit[aà] di genere|\bincint/i },
      { language: "fr", pattern: /\bsexe\b|\bidentit[ée] de genre|\benceinte\b/i },
      { language: "de", pattern: /\bgeschlecht|\bschwanger/i },
      { language: "es", pattern: /\bsexo\b|\bidentidad de g[ée]nero|\bembaraz/i }
    ]
  },
  {
    category: "union_political",
    reason: "protected association question",
    patterns: [
      { language: "en", pattern: /\bunion\b|\bpolitical\b|\bparty affiliation\b/i },
      {
        language: "it",
        pattern:
          /\bsindacat|\bpartito politico\b|\bappartenenza politica\b|\bopinioni politiche\b|\bidee politiche\b/i
      },
      {
        language: "fr",
        pattern:
          /\bsyndicat|\bparti politique\b|\bopinions politiques\b|\baffiliation politique\b/i
      },
      {
        language: "de",
        pattern:
          /\bgewerkschaft|\bwelcher partei\b|\bpolitische[nr]? (partei|einstellung|meinung|gesinnung)|\bparteizugeh[oö]rigkeit/i
      },
      {
        language: "es",
        pattern:
          /\bsindicat|\bpartido pol[ií]tico\b|\bafiliaci[oó]n pol[ií]tica|\bopiniones pol[ií]ticas/i
      }
    ]
  },
  {
    category: "biometric_accent",
    reason: "biometric, accent, emotion, or personality signal",
    patterns: [
      {
        language: "en",
        pattern:
          /\baccent\b|\bnative speaker\b|\bmother tongue\b|\bfirst language\b|\bpronunciation\b|\bvoice tone\b|\bface\b|\bfacial expression\b|\bemotion\b|\bbiometric\b|\bpersonality\b/i
      },
      {
        language: "it",
        pattern:
          /\baccento\b|\bmadrelingua\b|\blingua madre\b|\bpronuncia\b|\btono di voce\b|\bespression[ei] facciali?|\bemozion|\bpersonalit[aà]|\bbiometri/i
      },
      {
        language: "fr",
        pattern:
          /\blangue maternelle\b|\blocuteur natif|\bprononciation\b|\bton de (la )?voix|\bexpression faciale|émotion|\bpersonnalit[ée]|\bbiom[ée]tri/i
      },
      {
        language: "de",
        pattern:
          /\bakzent\b|\bmuttersprach|\baussprache\b|\bstimmlage\b|\bgesichtsausdruck|\bemotion|\bpers[oö]nlichkeit|\bbiometrisch/i
      },
      {
        language: "es",
        pattern:
          /\bacento\b|\blengua materna\b|\bhablante nativ[oa]|\bpronunciaci[oó]n|\btono de voz\b|\bexpresi[oó]n facial|\bemoci[oó]n|\bpersonalidad\b|\bbiom[ée]tric/i
      }
    ]
  }
];

const REQUIRED_DISALLOWED_SIGNALS = [
  "Protected characteristics",
  "Accent, facial expression, emotion, biometric, or personality scoring"
];

function inspectText(questionId: string, field: string, value: string): QuestionSafetyViolation[] {
  const violations = DISALLOWED_PROMPT_PATTERNS.flatMap(({ patterns, reason }) =>
    patterns.some(({ pattern }) => pattern.test(value)) ? [{ questionId, field, reason }] : []
  );

  // Platform neutrality: the interviewer represents AssumerAI, never an
  // employer, so no question may presuppose a specific company.
  if (containsEmployerPresupposingText(value)) {
    violations.push({
      questionId,
      field,
      reason: "employer-presupposing phrasing (platform interview is employer-neutral)"
    });
  }

  return violations;
}

export function containsDisallowedQuestionText(value: string): boolean {
  return DISALLOWED_PROMPT_PATTERNS.some(({ patterns }) =>
    patterns.some(({ pattern }) => pattern.test(value))
  );
}

export function inspectQuestionSafety(question: InterviewQuestion): QuestionSafetyResult {
  const inspectedFields: Array<{ field: string; value: string }> = [
    { field: "prompt", value: question.prompt },
    ...question.expectedSignals.map((value, index) => ({ field: `expectedSignals[${index}]`, value })),
    ...question.evidenceRequirements.map((value, index) => ({
      field: `evidenceRequirements[${index}]`,
      value
    }))
  ];
  const violations = inspectedFields.flatMap(({ field, value }) =>
    inspectText(question.id, field, value)
  );

  return { safe: violations.length === 0, violations };
}

export function validateQuestionBank(questions: InterviewQuestion[]): QuestionBankValidationResult {
  const violations: QuestionSafetyViolation[] = [];

  for (const question of questions) {
    if (!question.id) {
      violations.push({ questionId: "(missing)", field: "id", reason: "question id is required" });
    }
    if (question.version !== "interview-question-v0") {
      violations.push({
        questionId: question.id,
        field: "version",
        reason: "question version must be interview-question-v0"
      });
    }
    if (!question.prompt.trim()) {
      violations.push({ questionId: question.id, field: "prompt", reason: "prompt is required" });
    }
    if (question.rubric.length === 0) {
      violations.push({ questionId: question.id, field: "rubric", reason: "rubric is required" });
    }
    if (question.expectedSignals.length === 0) {
      violations.push({
        questionId: question.id,
        field: "expectedSignals",
        reason: "expected signals are required"
      });
    }
    if (question.evidenceRequirements.length === 0) {
      violations.push({
        questionId: question.id,
        field: "evidenceRequirements",
        reason: "evidence requirements are required"
      });
    }
    if (question.followUpRules.length === 0) {
      violations.push({
        questionId: question.id,
        field: "followUpRules",
        reason: "follow-up rules are required"
      });
    }
    for (const requiredSignal of REQUIRED_DISALLOWED_SIGNALS) {
      if (!question.disallowedSignals.includes(requiredSignal)) {
        violations.push({
          questionId: question.id,
          field: "disallowedSignals",
          reason: `missing disallowed signal: ${requiredSignal}`
        });
      }
    }

    violations.push(...inspectQuestionSafety(question).violations);
  }

  return { valid: violations.length === 0, violations };
}

export function assertQuestionBankAllowed(questions: InterviewQuestion[]): void {
  const validation = validateQuestionBank(questions);

  if (!validation.valid) {
    const reasons = validation.violations
      .map((violation) => `${violation.questionId}.${violation.field}: ${violation.reason}`)
      .join("; ");
    throw new Error(`Interview question bank contains disallowed or incomplete questions: ${reasons}`);
  }
}
