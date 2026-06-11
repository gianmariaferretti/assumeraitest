import type { DimensionDraft, MatchingScoreInput } from "../engine-types";

/**
 * Values alignment on declared work-style dimensions (Phase 13).
 *
 * Compares the candidate's DESCRIPTIVE work-style profile (from the interview
 * SJT dilemmas) against the expectations THIS company declared in its role
 * wizard. Neither pole of any dimension is better: the score measures
 * distance from the company's own declared key, with transparent
 * per-dimension reasoning. When either side is missing, the dimension stays
 * neutral (50) with explicit missing_data — never a penalty.
 */

const NEUTRAL_SCORE = 50;

export function getValuesAlignmentFit(input: MatchingScoreInput): DimensionDraft {
  const profile = input.workStyleProfile;
  const key = input.role.calibration?.work_style_key;

  if (!key || key.entries.length === 0) {
    return {
      score: NEUTRAL_SCORE,
      confidence: 40,
      evidence: [],
      missing_data: [
        "The company has not declared work-style expectations for this role; values alignment stays neutral.",
      ],
    };
  }
  if (!profile || profile.classifications.length === 0) {
    return {
      score: NEUTRAL_SCORE,
      confidence: 40,
      evidence: [],
      missing_data: [
        "No work-style profile is available for the candidate yet; values alignment stays neutral.",
      ],
    };
  }

  const classificationByDimension = new Map(
    profile.classifications.map((classification) => [classification.dimension, classification]),
  );

  const evidence: string[] = [];
  const missing: string[] = [];
  const alignments: number[] = [];
  const confidences: number[] = [];

  for (const entry of key.entries) {
    const classification = classificationByDimension.get(entry.dimension);
    if (!classification) {
      missing.push(
        `values alignment (${entry.dimension}): no interview evidence for this dimension yet — explore in the human interview.`,
      );
      continue;
    }

    // Positions live on -100..+100; max distance 200 -> alignment 0..100.
    const distance = Math.abs(classification.position - entry.position);
    const alignment = Math.round(100 - distance / 2);
    alignments.push(alignment);
    confidences.push(classification.confidence);

    // Transparent per-dimension reasoning, citing the company's own statement.
    evidence.push(
      `values alignment (${entry.dimension}): candidate at ${classification.position}, role declared ${entry.position} ("${entry.statement}") — ${alignment}/100.`,
    );
  }

  if (alignments.length === 0) {
    return {
      score: NEUTRAL_SCORE,
      confidence: 40,
      evidence: [],
      missing_data: missing.length
        ? missing
        : ["No overlapping work-style dimensions between profile and role key."],
    };
  }

  const score = alignments.reduce((sum, value) => sum + value, 0) / alignments.length;
  const meanConfidence =
    confidences.reduce((sum, value) => sum + value, 0) / confidences.length;

  return {
    score,
    confidence: Math.round(40 + meanConfidence * 50),
    evidence,
    missing_data: missing,
  };
}
