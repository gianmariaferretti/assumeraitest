import { findProtectedRequirementSignals } from "../roles/protected-attributes";

export const COMPANY_WORK_MODES = ["remote", "hybrid", "onsite"] as const;

export type CompanyWorkMode = (typeof COMPANY_WORK_MODES)[number];

export interface CompanyProfile {
  company_id: string;
  name: string;
  industry: string;
  size_band: string;
  headquarters_country: string;
  operating_countries: string[];
  work_modes_supported: CompanyWorkMode[];
  hiring_policy_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfileValidationIssue {
  code: string;
  path: string;
  message: string;
}

export type CompanyProfileValidationResult =
  | { ok: true; value: CompanyProfile; warnings: string[] }
  | { ok: false; issues: CompanyProfileValidationIssue[] };

export function validateCompanyProfile(input: unknown): CompanyProfileValidationResult {
  const issues: CompanyProfileValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          code: "company_profile.invalid",
          path: "",
          message: "Company profile must be an object.",
        },
      ],
    };
  }

  for (const field of [
    "company_id",
    "name",
    "industry",
    "size_band",
    "headquarters_country",
    "created_at",
    "updated_at",
  ] as const) {
    requireString(input, field, issues);
  }

  validateStringArray(input.operating_countries, "operating_countries", issues);
  validateWorkModes(input.work_modes_supported, issues);
  validateHiringPolicyNotes(input.hiring_policy_notes, issues);

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: input as unknown as CompanyProfile, warnings: [] };
}

function validateHiringPolicyNotes(value: unknown, issues: CompanyProfileValidationIssue[]) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string") {
    issues.push({
      code: "company_profile.hiring_policy_notes",
      path: "hiring_policy_notes",
      message: "Hiring policy notes must be a string.",
    });
    return;
  }

  const protectedSignals = findProtectedRequirementSignals(value);
  for (const signal of protectedSignals) {
    issues.push({
      code: "company_profile.protected_attribute",
      path: "hiring_policy_notes",
      message: `Company profile notes contain disallowed ${signal.signal} signal: "${signal.matchedText}".`,
    });
  }
}

function validateWorkModes(value: unknown, issues: CompanyProfileValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({
      code: "company_profile.work_modes",
      path: "work_modes_supported",
      message: "Supported work modes must be an array.",
    });
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string" || !COMPANY_WORK_MODES.includes(item as CompanyWorkMode)) {
      issues.push({
        code: "company_profile.work_mode",
        path: `work_modes_supported.${index}`,
        message: "Unsupported company work mode.",
      });
    }
  });
}

function validateStringArray(value: unknown, path: string, issues: CompanyProfileValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({
      code: "company_profile.array",
      path,
      message: `${path} must be an array.`,
    });
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      issues.push({
        code: "company_profile.array_string",
        path: `${path}.${index}`,
        message: `${path} items must be non-empty strings.`,
      });
    }
  });
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  issues: CompanyProfileValidationIssue[],
) {
  if (typeof record[key] !== "string" || record[key].trim().length === 0) {
    issues.push({
      code: "company_profile.string_required",
      path: key,
      message: `${key} must be a non-empty string.`,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
