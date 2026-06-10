import type { DimensionDraft, MatchingScoreInput } from "../engine-types";
import {
  average,
  clamp,
  containsNormalized,
  hasLocationOverlap,
  hasOverlap,
  tokenOverlap,
} from "../engine-utils";

export function getCandidatePreferenceFit(input: MatchingScoreInput): DimensionDraft {
  const candidate = input.candidate;
  const role = input.role;
  const company = input.company;
  const roleMatch = tokenOverlap(candidate.preferences.target_roles, [role.title, role.role_type]);
  const locationMatch = hasLocationOverlap(candidate, role) ? 1 : 0;
  const workModeMatch = hasOverlap(candidate.preferences.work_modes, role.work_modes ?? []) ? 1 : 0;
  const companySizeMatch = company?.size
    ? containsNormalized(candidate.preferences.company_sizes ?? [], company.size)
    : false;
  const industryMatch = company?.industry
    ? containsNormalized(candidate.preferences.industries ?? [], company.industry)
    : false;
  const score = clamp(
    ((roleMatch ? 1 : 0) +
      locationMatch +
      workModeMatch +
      (companySizeMatch ? 1 : 0) +
      (industryMatch ? 1 : 0)) *
      20,
    0,
    100,
  );

  return {
    score,
    confidence: company?.enrichment
      ? average([80, company.enrichment.identity_confidence])
      : 80,
    evidence: [
      roleMatch ? "Candidate target roles overlap this role." : "",
      locationMatch ? "Candidate location preferences overlap this role." : "",
      workModeMatch ? "Candidate work-mode preferences overlap this role." : "",
      companySizeMatch ? "Candidate company-size preference overlaps this company." : "",
      industryMatch ? "Candidate industry preference overlaps this company." : "",
      company?.enrichment
        ? `Company enrichment from ${company.enrichment.source_id} is used only for candidate-facing company context and preference fit.`
        : "",
      ...(company?.enrichment?.evidence ?? []),
    ],
    missing_data: [
      roleMatch ? "" : "Target-role preference overlap is limited.",
      company ? "" : "Company profile was not provided.",
      company && !company.enrichment
        ? "Company enrichment is unavailable; company context needs review."
        : "",
    ],
  };
}
