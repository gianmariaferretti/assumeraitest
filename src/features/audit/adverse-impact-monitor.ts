/**
 * Adverse impact monitor — Phase 5 of the scoring rigor upgrade.
 *
 * Implements the EEOC (1978) four-fifths rule as an early-warning system for the
 * EU AI Act Annex III §4 obligation to monitor bias output of high-risk hiring
 * systems. It works ONLY on neutral proxies the system already has (role family,
 * seniority, interview language, CV school class, city class) — never on direct
 * protected attributes, which AssumerAI does not collect by design.
 *
 * For each dimension and cohort value: selection_rate = advanced / applied; the
 * reference is the cohort with the highest selection rate (the conservative EEOC
 * convention); ratio = rate / reference_rate; ratio < 0.8 fails the four-fifths
 * rule. Cohorts with too few applicants are flagged warn (signal too noisy).
 */

export type CohortDimension =
  | "role_family"
  | "seniority"
  | "interview_language"
  | "cv_school_class"
  | "city_class";

export const COHORT_DIMENSIONS: readonly CohortDimension[] = [
  "role_family",
  "seniority",
  "interview_language",
  "cv_school_class",
  "city_class",
];

export const FOUR_FIFTHS_THRESHOLD = 0.8;
export const WARN_THRESHOLD = 0.9;
export const MIN_COHORT_APPLICANTS = 5;

export interface DecisionRecord {
  candidateId: string;
  decision: "advance" | "hold" | "decline";
  cohortValues: Partial<Record<CohortDimension, string>>;
  decidedAt: string;
}

export interface AdverseImpactRow {
  cohortDimension: CohortDimension;
  cohortValue: string;
  referenceValue: string;
  nApplied: number;
  nSelected: number;
  selectionRate: number;
  ratioVsReference: number;
  status: "pass" | "warn" | "fail";
}

export function computeAdverseImpact(
  decisions: readonly DecisionRecord[],
  options?: { dimensions?: readonly CohortDimension[] },
): { rows: readonly AdverseImpactRow[]; computedAt: string } {
  const dimensions = options?.dimensions ?? COHORT_DIMENSIONS;
  const rows: AdverseImpactRow[] = [];

  for (const dimension of dimensions) {
    rows.push(...computeDimension(dimension, decisions));
  }

  // Worst (lowest ratio) first so reviewers see problems at the top.
  rows.sort((a, b) => a.ratioVsReference - b.ratioVsReference);

  return { rows, computedAt: new Date().toISOString() };
}

function computeDimension(
  dimension: CohortDimension,
  decisions: readonly DecisionRecord[],
): AdverseImpactRow[] {
  const byValue = new Map<string, { applied: number; selected: number }>();
  for (const decision of decisions) {
    const value = decision.cohortValues[dimension];
    if (value === undefined || value === "") {
      continue;
    }
    const bucket = byValue.get(value) ?? { applied: 0, selected: 0 };
    bucket.applied += 1;
    if (decision.decision === "advance") {
      bucket.selected += 1;
    }
    byValue.set(value, bucket);
  }

  if (byValue.size === 0) {
    return [];
  }

  const entries = [...byValue.entries()].map(([value, counts]) => ({
    value,
    applied: counts.applied,
    selected: counts.selected,
    rate: counts.applied > 0 ? counts.selected / counts.applied : 0,
  }));

  // Reference = highest selection rate (tie-break by more applicants, then name).
  const reference = [...entries].sort(
    (a, b) => b.rate - a.rate || b.applied - a.applied || a.value.localeCompare(b.value),
  )[0];

  return entries.map((entry) => {
    const ratio = reference.rate > 0 ? entry.rate / reference.rate : 1;
    return {
      cohortDimension: dimension,
      cohortValue: entry.value,
      referenceValue: reference.value,
      nApplied: entry.applied,
      nSelected: entry.selected,
      selectionRate: round4(entry.rate),
      ratioVsReference: round4(ratio),
      status: classifyStatus(entry.applied, ratio),
    };
  });
}

function classifyStatus(nApplied: number, ratio: number): "pass" | "warn" | "fail" {
  if (nApplied < MIN_COHORT_APPLICANTS) {
    // Too few applicants to judge: surface as warn, never fail on noise.
    return "warn";
  }
  if (ratio < FOUR_FIFTHS_THRESHOLD) {
    return "fail";
  }
  if (ratio < WARN_THRESHOLD) {
    return "warn";
  }
  return "pass";
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
