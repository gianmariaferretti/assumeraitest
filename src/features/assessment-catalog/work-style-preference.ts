/**
 * Work-style preferences (module 18) — DESCRIPTIVE ONLY, never a trait score.
 *
 * This module is high-value but high-risk, so it deliberately does NOT produce a
 * 0–100 quality score and never enters the match score (catalog flag
 * `descriptive_only`). Forced-choice preferences are tallied into a fit profile
 * — a lean on each bipolar dimension with the candidate's own choices as
 * evidence — surfaced for human review and shown to the candidate, mirroring the
 * Phase 13/14 flag-only philosophy. There is no "correct" answer and no pass/fail.
 */

export const WORK_STYLE_PREFERENCE_DIMENSIONS = [
  "autonomy_vs_collaboration",
  "structure_vs_ambiguity",
  "fast_vs_thorough",
] as const;

export type WorkStylePreferenceDimension = (typeof WORK_STYLE_PREFERENCE_DIMENSIONS)[number];

export interface WorkStyleForcedChoice {
  readonly dimension: WorkStylePreferenceDimension;
  /** "a" leans to the first pole, "b" to the second. */
  readonly choice: "a" | "b";
  /** Verbatim option text the candidate picked (evidence). */
  readonly chosen_label: string;
}

export interface WorkStylePreferenceLean {
  readonly dimension: WorkStylePreferenceDimension;
  /** -1..+1: negative = first pole, positive = second pole, 0 = balanced. */
  readonly lean: number;
  readonly evidence: readonly string[];
}

export interface WorkStylePreferenceProfile {
  readonly descriptive_only: true;
  readonly needs_human_review: true;
  readonly leans: readonly WorkStylePreferenceLean[];
  readonly note: string;
}

export function summarizeWorkStylePreferences(
  choices: readonly WorkStyleForcedChoice[],
): WorkStylePreferenceProfile {
  const byDimension = new Map<WorkStylePreferenceDimension, { sum: number; n: number; evidence: string[] }>();
  for (const choice of choices) {
    const bucket = byDimension.get(choice.dimension) ?? { sum: 0, n: 0, evidence: [] };
    bucket.sum += choice.choice === "a" ? -1 : 1;
    bucket.n += 1;
    bucket.evidence.push(choice.chosen_label);
    byDimension.set(choice.dimension, bucket);
  }

  const leans: WorkStylePreferenceLean[] = [...byDimension.entries()].map(
    ([dimension, bucket]) => ({
      dimension,
      lean: bucket.n === 0 ? 0 : Math.round((bucket.sum / bucket.n) * 100) / 100,
      evidence: bucket.evidence,
    }),
  );

  return {
    descriptive_only: true,
    needs_human_review: true,
    leans,
    note:
      "Work-style preference profile for fit discussion only. Neither pole is better; this is never a trait score and never decides a match.",
  };
}
