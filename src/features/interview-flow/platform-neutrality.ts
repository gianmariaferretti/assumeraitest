/**
 * Platform-interview neutrality (Phase 11).
 *
 * AssumerAI runs ONE platform interview per candidate BEFORE any matching;
 * the interviewer is a neutral AssumerAI career interviewer, never an
 * employer. No question may presuppose a specific company ("our company",
 * "why do you want to work with us") and no interviewer line may speak in an
 * employer's voice ("we at Acme"). Company-specific context lives on the
 * company side and is applied by the matching engine AFTER the interview.
 *
 * Same pattern-writing rules as safety.ts: JS \b is ASCII-only, so no \b is
 * placed adjacent to an accented character.
 */

export type NeutralityPatternLanguage = "en" | "it" | "fr" | "de" | "es";

export interface LanguageTaggedNeutralityPattern {
  readonly language: NeutralityPatternLanguage;
  readonly pattern: RegExp;
}

/**
 * Question-side violations: phrasings that presuppose a specific employer.
 * Checked on every question bank entry, planner output, and adaptation.
 */
export const EMPLOYER_PRESUPPOSING_PATTERNS: readonly LanguageTaggedNeutralityPattern[] = [
  {
    language: "en",
    pattern:
      /\bour company\b|\bour team\b|\bour organization\b|\bwork (with|for) us\b|\bjoin us\b|\bknow about us\b|\babout our\b|\bwhy us\b|\bapply (for|to) this (position|role|job)\b|\bapplied (for|to) this (position|role|job)\b|\bthis company\b/i
  },
  {
    language: "it",
    pattern:
      /\bla nostra (azienda|societ[aà]|impresa|organizzazione)|\bil nostro team\b|\blavorare (con|per|da) noi\b|\bunirsi a noi\b|\bperch[eé] (ha scelto|hai scelto|sceglierebbe) noi\b|\bcosa (sa|sai|conosce|conosci) di noi\b|\bperch[eé] (si [eè] candidat|ti sei candidat)|\bquesta (azienda|posizione)\b/i
  },
  {
    language: "fr",
    pattern:
      /\bnotre (entreprise|soci[ée]t[ée]|[ée]quipe|organisation)|\btravailler (avec|pour|chez) nous\b|\bnous rejoindre\b|\bpourquoi nous\b|\bque savez-vous (de|sur) nous\b|\bpourquoi avez-vous postul[ée]|\bcette entreprise\b|\bce poste\b/i
  },
  {
    language: "de",
    pattern:
      /\bunser(e|em|er)? (unternehmen|firma|team|organisation)\b|\bbei uns (arbeiten|zu arbeiten)\b|\bf[uü]r uns arbeiten\b|\bwarum wir\b|\bwas wissen sie [uü]ber uns\b|\bwarum haben sie sich beworben\b|\bdiese stelle\b|\bdieses unternehmen\b/i
  },
  {
    language: "es",
    pattern:
      /\bnuestra (empresa|compa[nñ][ií]a|organizaci[oó]n)|\bnuestro equipo\b|\btrabajar (con|para) nosotros\b|\bunirse a nosotros\b|\bpor qu[eé] nosotros\b|\bqu[eé] sabe de nosotros\b|\bpor qu[eé] se postul[oó]|\beste puesto\b|\besta empresa\b/i
  }
];

/**
 * Output-side violations: the interviewer speaking AS an employer. Checked on
 * every generated interviewer line before it can reach the candidate.
 */
export const EMPLOYER_VOICE_PATTERNS: readonly LanguageTaggedNeutralityPattern[] = [
  {
    language: "en",
    pattern:
      /\bwe at [A-Z]|\bhere at [A-Z]|\bat our company\b|\bour company\b|\bour team is (looking|hiring)\b|\bjoin our (team|company)\b|\bwe('| a)re hiring\b|\bwe would (love|like) to (hire|have) you\b/i
  },
  {
    language: "it",
    pattern:
      /\bnoi di [A-Z]|\bqui in [A-Z][a-z]+ (cerchiamo|assumiamo)\b|\bla nostra azienda\b|\bil nostro team (cerca|assume)\b|\bunisciti (a noi|al nostro team)\b|\bstiamo assumendo\b/i
  },
  {
    language: "fr",
    pattern:
      /\bnous,? chez [A-Z]|\bnotre entreprise\b|\bnotre [ée]quipe (recrute|recherche)\b|\brejoignez-nous\b|\bnous recrutons\b/i
  },
  {
    language: "de",
    pattern:
      /\bwir bei [A-Z]|\bunser unternehmen\b|\bunser team (sucht|stellt ein)\b|\bkomm zu uns\b|\bwir stellen ein\b/i
  },
  {
    language: "es",
    pattern:
      /\bnosotros en [A-Z]|\bnuestra empresa\b|\bnuestro equipo (busca|contrata)\b|\b[uú]nete a nosotros\b|\bestamos contratando\b/i
  }
];

/** True when a question text presupposes a specific employer. */
export function containsEmployerPresupposingText(value: string): boolean {
  return EMPLOYER_PRESUPPOSING_PATTERNS.some(({ pattern }) => pattern.test(value));
}

/** True when an interviewer line speaks in an employer's voice. */
export function containsEmployerVoice(value: string): boolean {
  return (
    EMPLOYER_VOICE_PATTERNS.some(({ pattern }) => pattern.test(value)) ||
    containsEmployerPresupposingText(value)
  );
}
