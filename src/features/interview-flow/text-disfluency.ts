/**
 * Text-only disfluency analysis (anti-cheating v2, intervention 3).
 *
 * WHY THIS DOES NOT VIOLATE safety.ts: this module reads EXCLUSIVELY the
 * transcript TEXT — the same input class the BARS evaluator already scores.
 * It never touches audio, prosody, pitch, pace, accent, or any vocal feature
 * (all forbidden by safety.ts), and it makes no inference about who the
 * candidate is. It counts EDITING ARTIFACTS of spontaneous speech in the
 * words themselves: fillers ("uh", "ehm"), false starts ("I- I"), and
 * self-corrections ("anzi", "I mean"). Spontaneous spoken answers contain
 * some; answers READ ALOUD from an external copilot's output tend to contain
 * none, turn after turn. That contrast — not any voice trait — is the signal.
 *
 * Like every integrity signal: descriptive context for the human reviewer,
 * NEVER an input to any score. Fairness guard: typed text-mode answers are
 * legitimately clean, so the consumer (integrity-signals.ts) only applies
 * this to voice-mode turns.
 */

/** Written fillers across the five interview languages. */
const FILLER_PATTERNS: readonly RegExp[] = [
  // en
  /\b(?:uh+|um+|er+|hmm+|y'?know|you know|i mean|like,|sort of|kind of|well,)\b/gi,
  // it
  /\b(?:ehm+|mmh+|cioè|tipo,|insomma|diciamo|boh|mah|allora,|ecco,)\b/gi,
  // fr
  /\b(?:euh+|bah|ben|enfin,|tu vois|disons|en fait,)\b/gi,
  // de
  /\b(?:äh+m?|hm+|halt|quasi,|sozusagen|na ja|also,)\b/gi,
  // es
  /\b(?:eh+m?|este,|o sea|pues,|bueno,|digamos|es que)\b/gi
];

/** Self-corrections and reformulations. */
const CORRECTION_PATTERNS: readonly RegExp[] = [
  /\b(?:no wait|wait,|scratch that|let me rephrase|or rather|actually,)\b/gi,
  /\b(?:anzi|no aspetta|volevo dire|mi correggo|o meglio)\b/gi,
  /\b(?:enfin non|je veux dire|plutôt)\b/gi,
  /\b(?:nein warte|ich meine|beziehungsweise)\b/gi,
  /\b(?:digo,|mejor dicho|quiero decir)\b/gi
];

/** False starts: a broken-off word or an immediately repeated word. */
const FALSE_START_PATTERN = /\b(\p{L}{1,12})-\s+\1?|\b(\p{L}{2,12})\s+\2\b/giu;

/** Trailing-off / hesitation punctuation ("...", "—" mid-sentence). */
const HESITATION_PUNCTUATION_PATTERN = /\.\.\.|…/g;

export interface TextDisfluencyMeasure {
  readonly wordCount: number;
  readonly markerCount: number;
  /** Markers per 100 words (0 when the answer is empty). */
  readonly markersPer100Words: number;
}

/** Pure, deterministic, text-only. */
export function measureTextDisfluency(answerText: string): TextDisfluencyMeasure {
  const text = (answerText ?? "").trim();
  const words = text.length === 0 ? [] : text.split(/\s+/);
  if (words.length === 0) {
    return { wordCount: 0, markerCount: 0, markersPer100Words: 0 };
  }

  let markerCount = 0;
  for (const pattern of [...FILLER_PATTERNS, ...CORRECTION_PATTERNS]) {
    markerCount += countMatches(text, pattern);
  }
  markerCount += countMatches(text, FALSE_START_PATTERN);
  markerCount += countMatches(text, HESITATION_PUNCTUATION_PATTERN);

  return {
    wordCount: words.length,
    markerCount,
    markersPer100Words: Math.round((markerCount / words.length) * 100 * 100) / 100
  };
}

/**
 * True when an answer is long enough to be informative AND reads "clean"
 * (near-zero disfluency). One such answer means nothing — articulate people
 * exist; the integrity summary only flags a STREAK of them.
 */
export function isHighFluencyAnswer(
  answerText: string,
  options?: { readonly minWords?: number; readonly maxMarkersPer100Words?: number }
): boolean {
  const minWords = options?.minWords ?? 40;
  const maxDensity = options?.maxMarkersPer100Words ?? 0.5;
  const measure = measureTextDisfluency(answerText);
  return measure.wordCount >= minWords && measure.markersPer100Words <= maxDensity;
}

function countMatches(text: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  return text.match(pattern)?.length ?? 0;
}
