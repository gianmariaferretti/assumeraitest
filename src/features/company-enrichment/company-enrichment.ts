import companySeed from "../../../data-sources/enrichment/company-seed.json";

export interface CompanyEnrichmentSignal {
  readonly canonical_name: string;
  readonly identity_confidence: number;
  readonly candidate_context_score: number;
  readonly source_id: string;
  readonly source_version: string;
  readonly license_review_status: string;
  readonly allowed_use: string;
  readonly disallowed_use: string;
  readonly retrieved_at: string;
  readonly stale_after: string;
  readonly evidence: readonly string[];
}

export interface CompanyWithEnrichment {
  readonly company_id: string;
  readonly name?: string;
  readonly enrichment?: CompanyEnrichmentSignal;
}

interface CompanySeedRecord extends CompanyEnrichmentSignal {
  readonly company_id: string;
  readonly aliases: readonly string[];
}

interface CompanySeedDataset {
  readonly records: readonly CompanySeedRecord[];
}

const COMPANY_SEED = companySeed as CompanySeedDataset;

export function enrichCompanyProfile<TCompany extends CompanyWithEnrichment>(
  company: TCompany,
): TCompany {
  if (company.enrichment) {
    return company;
  }

  const record = findCompanySeedRecord(company);

  if (!record) {
    return company;
  }

  return {
    ...company,
    name: company.name ?? record.canonical_name,
    enrichment: {
      canonical_name: record.canonical_name,
      identity_confidence: record.identity_confidence,
      candidate_context_score: record.candidate_context_score,
      source_id: record.source_id,
      source_version: record.source_version,
      license_review_status: record.license_review_status,
      allowed_use: record.allowed_use,
      disallowed_use: record.disallowed_use,
      retrieved_at: record.retrieved_at,
      stale_after: record.stale_after,
      evidence: record.evidence,
    },
  };
}

export function findCompanySeedRecord(
  company: CompanyWithEnrichment,
): CompanySeedRecord | undefined {
  const normalizedId = normalizeCompany(company.company_id);
  const normalizedName = normalizeCompany(company.name ?? "");

  return COMPANY_SEED.records.find(
    (record) =>
      normalizeCompany(record.company_id) === normalizedId ||
      record.aliases.some((alias) => normalizeCompany(alias) === normalizedName),
  );
}

export function companyEnrichmentEvidence(
  company: CompanyWithEnrichment | undefined,
): string[] {
  if (!company?.enrichment) {
    return [];
  }

  return [
    `Company enrichment source ${company.enrichment.source_id} is used only for candidate-facing company context.`,
    ...company.enrichment.evidence,
  ];
}

function normalizeCompany(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
