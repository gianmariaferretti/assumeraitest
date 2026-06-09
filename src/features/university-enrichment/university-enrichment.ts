import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import universitySeed from "../../../data-sources/enrichment/university-seed.json";

export type UniversityTier =
  | "tier-1-global-leading"
  | "tier-2-strong-international"
  | "tier-3-regional-specialized"
  | "tier-4-recognized-limited-data"
  | "tier-5-unknown-insufficient-data";

export interface UniversitySignal {
  readonly institution_id: string;
  readonly canonical_name: string;
  readonly country?: string;
  readonly tier: UniversityTier;
  readonly score: number;
  readonly confidence: number;
  readonly source_id: string;
  readonly source_version: string;
  readonly ranking_year?: string;
  readonly license_review_status: string;
  readonly scoring_approved: boolean;
  readonly enrichment_needed: boolean;
  readonly manual_review_required: boolean;
  readonly retrieved_at: string;
  readonly stale_after: string;
  readonly evidence: readonly string[];
}

export interface EducationWithUniversitySignal {
  readonly institution: string;
  readonly institution_canonical?: string;
  readonly ranking_confidence?: number;
  readonly enrichment_needed?: boolean;
  readonly university_signal?: unknown;
}

type EnrichedEducation<TEducation> = TEducation & {
  readonly institution_canonical?: string;
  readonly ranking_confidence?: number;
  readonly enrichment_needed?: boolean;
  readonly university_signal?: UniversitySignal;
};

interface UniversitySeedRecord {
  readonly institution_id: string;
  readonly canonical_name: string;
  readonly aliases: readonly string[];
  readonly country: string;
  readonly tier: UniversityTier;
  readonly score: number;
  readonly confidence: number;
  readonly source_id: string;
  readonly source_version: string;
  readonly ranking_year: string;
  readonly license_review_status: string;
  readonly scoring_approved: boolean;
  readonly manual_review_required: boolean;
  readonly retrieved_at: string;
  readonly stale_after: string;
  readonly evidence: readonly string[];
}

interface UniversitySeedDataset {
  readonly dataset_id: string;
  readonly dataset_version: string;
  readonly generated_at?: string;
  readonly records: readonly UniversitySeedRecord[];
}

const UNIVERSITY_SEED = universitySeed as UniversitySeedDataset;
const UNIVERSITY_RANKING_SNAPSHOT_ENV = "ASSUMERAI_UNIVERSITY_RANKING_SNAPSHOT";
let cachedExternalDatasets: readonly UniversitySeedDataset[] | undefined;

export function enrichCandidateProfileUniversities<
  TProfile extends { readonly education: readonly EducationWithUniversitySignal[] },
>(profile: TProfile): TProfile {
  return {
    ...profile,
    education: profile.education.map(enrichEducationRecord),
  } as TProfile;
}

export function enrichEducationRecord<TEducation extends EducationWithUniversitySignal>(
  education: TEducation,
): EnrichedEducation<TEducation> {
  const match = findUniversitySeedRecord(education.institution);

  if (!match) {
    const signal = buildUnknownUniversitySignal(education.institution);

    return {
      ...education,
      institution_canonical: education.institution_canonical ?? education.institution,
      ranking_confidence: signal.confidence,
      enrichment_needed: true,
      university_signal: signal,
    };
  }

  const signal: UniversitySignal = {
    institution_id: match.institution_id,
    canonical_name: match.canonical_name,
    country: match.country,
    tier: match.tier,
    score: match.score,
    confidence: match.confidence,
    source_id: match.source_id,
    source_version: match.source_version,
    ranking_year: match.ranking_year,
    license_review_status: match.license_review_status,
    scoring_approved: match.scoring_approved,
    enrichment_needed: !match.scoring_approved,
    manual_review_required: match.manual_review_required,
    retrieved_at: match.retrieved_at,
    stale_after: match.stale_after,
    evidence: match.evidence,
  };

  return {
    ...education,
    institution_canonical: match.canonical_name,
    ranking_confidence: signal.confidence,
    enrichment_needed: signal.enrichment_needed,
    university_signal: signal,
  };
}

export function findUniversitySeedRecord(
  institutionName: string,
): UniversitySeedRecord | undefined {
  const normalizedName = normalizeInstitution(institutionName);

  for (const dataset of getUniversityDatasets()) {
    const match = dataset.records.find((record) =>
      record.aliases.some((alias) => normalizeInstitution(alias) === normalizedName),
    );

    if (match) {
      return match;
    }
  }

  return undefined;
}

export function buildUnknownUniversitySignal(institutionName: string): UniversitySignal {
  return {
    institution_id: "university-unknown",
    canonical_name: institutionName || "Unknown institution",
    tier: "tier-5-unknown-insufficient-data",
    score: 50,
    confidence: 25,
    source_id: UNIVERSITY_SEED.dataset_id,
    source_version: UNIVERSITY_SEED.dataset_version,
    license_review_status: "not-found-in-local-seed",
    scoring_approved: false,
    enrichment_needed: true,
    manual_review_required: true,
    retrieved_at: universitySeed.generated_at,
    stale_after: "2026-08-17",
    evidence: [
      "Institution was not found in the governed local enrichment seed.",
      "Unknown universities use neutral prior with manual enrichment review.",
    ],
  };
}

function normalizeInstitution(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\buniversity\b/g, "univ")
    .trim()
    .replace(/\s+/g, " ");
}

function getUniversityDatasets(): readonly UniversitySeedDataset[] {
  return [...getExternalUniversityDatasets(), UNIVERSITY_SEED];
}

function getExternalUniversityDatasets(): readonly UniversitySeedDataset[] {
  if (cachedExternalDatasets) {
    return cachedExternalDatasets;
  }

  const snapshotPath = process.env[UNIVERSITY_RANKING_SNAPSHOT_ENV]?.trim();
  if (!snapshotPath) {
    cachedExternalDatasets = [];
    return cachedExternalDatasets;
  }

  const safeSnapshotPath = snapshotPath.replace(/\\/g, "/");
  if (
    safeSnapshotPath.startsWith("/") ||
    /^[a-z]:\//i.test(safeSnapshotPath) ||
    safeSnapshotPath.split("/").includes("..")
  ) {
    cachedExternalDatasets = [];
    return cachedExternalDatasets;
  }

  const resolvedPath = join(process.cwd(), "data-sources", "snapshots", safeSnapshotPath);

  if (!existsSync(resolvedPath)) {
    cachedExternalDatasets = [];
    return cachedExternalDatasets;
  }

  try {
    const payload = JSON.parse(readFileSync(resolvedPath, "utf8")) as UniversitySeedDataset;
    cachedExternalDatasets = Array.isArray(payload.records) ? [payload] : [];
  } catch {
    cachedExternalDatasets = [];
  }

  return cachedExternalDatasets;
}
