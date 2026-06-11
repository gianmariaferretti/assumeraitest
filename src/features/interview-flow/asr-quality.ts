/**
 * ASR-quality safeguards (Phase 12).
 *
 * Nobody may be penalized for transcription quality: per-turn Deepgram
 * confidence is recorded (voice mode only), and when a module's average falls
 * below the review threshold the module's evaluation is automatically routed
 * to human review with the neutral reason "low transcription confidence".
 */

export const ASR_CONFIDENCE_REVIEW_THRESHOLD_DEFAULT = 0.8;

export const LOW_ASR_CONFIDENCE_REVIEW_REASON = "low transcription confidence";

/** Parse and clamp a client-reported ASR confidence; undefined when invalid. */
export function parseAsrConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.min(value, 1);
}

export function readAsrThresholdFromEnv(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    return ASR_CONFIDENCE_REVIEW_THRESHOLD_DEFAULT;
  }

  return parsed;
}

/**
 * Module-average confidence over voice turns only. Text-mode turns carry no
 * confidence (null) and are excluded; a module with no voice turns yields
 * undefined (nothing to review).
 */
export function averageAsrConfidence(
  values: readonly (number | null | undefined)[]
): number | undefined {
  const voiceValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  if (voiceValues.length === 0) {
    return undefined;
  }

  return voiceValues.reduce((sum, value) => sum + value, 0) / voiceValues.length;
}

/** True when the module's evaluation must be routed to human review. */
export function shouldRouteForAsrReview(
  moduleAverageConfidence: number | undefined,
  threshold: number
): boolean {
  return moduleAverageConfidence !== undefined && moduleAverageConfidence < threshold;
}

/**
 * Coarse confidence band for fairness monitoring (adverse impact cohort
 * dimension): score distributions must not differ systematically by
 * transcription quality without investigation.
 */
export function asrConfidenceBand(
  moduleAverageConfidence: number | undefined
): "text_mode" | "high" | "medium" | "low" {
  if (moduleAverageConfidence === undefined) {
    return "text_mode";
  }
  if (moduleAverageConfidence >= 0.9) {
    return "high";
  }
  if (moduleAverageConfidence >= 0.8) {
    return "medium";
  }

  return "low";
}

/**
 * Strip spoken disfluencies and obvious transcription artifacts so heuristics
 * (and tests) judge CONTENT only: filler tokens, immediate word repetitions,
 * and false starts never change a score.
 */
export function stripDisfluencies(text: string): string {
  return (
    text
      // Filler tokens in the five interview languages.
      .replace(/\b(ehm+|uh+m*|um+|er+m*|hmm+|mmm+|äh+m*|eh+|euh+|este+|allora,?|cioè,?|tipo,?)\b/gi, " ")
      // Immediate word repetitions ("the the", "io io").
      .replace(/\b(\p{L}+)(\s+\1\b)+/giu, "$1")
      // False starts marked by a dash or restart ("I wan— I wanted").
      .replace(/\b\p{L}+[—-]\s+/gu, " ")
      .replace(/\s+([.,;:!?])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}
