/**
 * Peer-cohort Z-score normalization — Phase 3 of the scoring rigor upgrade.
 *
 * An 8 for a junior SDR is not an 8 for a CTO. Z-scores express a raw score as
 * standard deviations from the peer population (same role_family + seniority) so
 * candidates across roles become comparable.
 *
 * Pre-revenue honesty: with a small population we DO NOT fabricate norms. The
 * cohort is labelled insufficient / emerging / established and the interpretation
 * string says so, mirroring how serious psychometric vendors flag "preliminary".
 */

export type PeerCohortStatus = "insufficient" | "emerging" | "established";

export interface PeerCohortStats {
  cohortId: string;
  roleFamily: string;
  seniority: string;
  sampleSize: number;
  meanScore: number | null;
  stdevScore: number | null;
  cohortStatus: PeerCohortStatus;
  lastComputedAt: string;
  version: "peer-cohort-v0";
}

export const COHORT_INSUFFICIENT_BELOW = 10;
export const COHORT_ESTABLISHED_AT_OR_ABOVE = 30;
export const PEER_COHORT_VERSION = "peer-cohort-v0";

export function cohortId(roleFamily: string, seniority: string): string {
  return `${roleFamily}|${seniority}`;
}

export function classifyCohortStatus(sampleSize: number): PeerCohortStatus {
  if (sampleSize < COHORT_INSUFFICIENT_BELOW) {
    return "insufficient";
  }
  if (sampleSize < COHORT_ESTABLISHED_AT_OR_ABOVE) {
    return "emerging";
  }
  return "established";
}

export function computePeerCohortStats(
  rolesScores: ReadonlyArray<{ score: number }>,
  roleFamily: string,
  seniority: string,
  now: string = new Date().toISOString(),
): PeerCohortStats {
  const scores = rolesScores
    .map((row) => row.score)
    .filter((score) => Number.isFinite(score));
  const sampleSize = scores.length;
  const status = classifyCohortStatus(sampleSize);

  const base: PeerCohortStats = {
    cohortId: cohortId(roleFamily, seniority),
    roleFamily,
    seniority,
    sampleSize,
    meanScore: null,
    stdevScore: null,
    cohortStatus: status,
    lastComputedAt: now,
    version: PEER_COHORT_VERSION,
  };

  if (status === "insufficient") {
    return base;
  }

  const mean = scores.reduce((sum, score) => sum + score, 0) / sampleSize;
  const variance =
    scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / Math.max(1, sampleSize - 1);
  const stdev = Math.sqrt(variance);

  return { ...base, meanScore: round2(mean), stdevScore: round2(stdev) };
}

export function zScoreVsCohort(
  score: number,
  stats: PeerCohortStats,
): { z: number | null; interpretation: string } {
  if (stats.cohortStatus === "insufficient" || stats.meanScore === null || stats.stdevScore === null) {
    return {
      z: null,
      interpretation: `Peer cohort too small for normative comparison (n=${stats.sampleSize}). Showing raw score only.`,
    };
  }

  if (stats.stdevScore === 0) {
    return {
      z: null,
      interpretation: `Peer cohort has no score variance yet (n=${stats.sampleSize}). Showing raw score only.`,
    };
  }

  const z = round2((score - stats.meanScore) / stats.stdevScore);

  if (stats.cohortStatus === "emerging") {
    return { z, interpretation: `Preliminary norming (n=${stats.sampleSize}).` };
  }

  return { z, interpretation: `Normed against ${stats.sampleSize} peer candidates.` };
}

/**
 * Recompute cohort stats for every (role_family, seniority) bucket present in the
 * score rows. Intended to be invoked manually or via an admin/cron job — not
 * automated in the MVP.
 */
export function recomputeAllCohortStats(
  scoreRows: ReadonlyArray<{ score: number; roleFamily: string; seniority: string }>,
  now: string = new Date().toISOString(),
): PeerCohortStats[] {
  const byCohort = new Map<string, { roleFamily: string; seniority: string; scores: number[] }>();
  for (const row of scoreRows) {
    const key = cohortId(row.roleFamily, row.seniority);
    const bucket = byCohort.get(key) ?? { roleFamily: row.roleFamily, seniority: row.seniority, scores: [] };
    bucket.scores.push(row.score);
    byCohort.set(key, bucket);
  }

  return [...byCohort.values()].map((bucket) =>
    computePeerCohortStats(
      bucket.scores.map((score) => ({ score })),
      bucket.roleFamily,
      bucket.seniority,
      now,
    ),
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
