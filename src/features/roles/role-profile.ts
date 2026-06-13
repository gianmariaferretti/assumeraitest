import { findProtectedRequirementSignals } from "./protected-attributes";

export const ROLE_STATUSES = ["draft", "open", "paused", "closed"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const HARD_GATE_TYPES = [
  "certification",
  "language",
  "work_authorization",
  "location_timezone",
  "availability",
] as const;
export const ROLE_MATCH_WEIGHT_KEYS = [
  "RoleSkillFit",
  "ExperienceDomainFit",
  "InterviewEvidenceFit",
  "LanguageLocationAvailabilityFit",
  "CandidatePreferenceFit",
  "CompanyBarFit",
  "GrowthPotentialFit",
  "EducationCredentialFit",
  "MatchConfidence",
] as const;
export const MODULE_REQUIREMENT_LEVELS = [
  "required",
  "optional",
  "auto_trigger",
  "blocked",
] as const;

export type RoleStatus = (typeof ROLE_STATUSES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type CefrLevel = (typeof CEFR_LEVELS)[number];
export type HardGateType = (typeof HARD_GATE_TYPES)[number];
export type RoleMatchWeightKey = (typeof ROLE_MATCH_WEIGHT_KEYS)[number];
export type ModuleRequirementLevel = (typeof MODULE_REQUIREMENT_LEVELS)[number];

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; issues: ValidationIssue[] };

export interface CompensationRange {
  currency?: string;
  min?: number;
  max?: number;
}

export interface RequiredLanguage {
  language: string;
  minimum_level: CefrLevel;
}

export interface HardGate {
  gate_type: HardGateType;
  description: string;
  lawful_basis_note: string;
  role_essential: boolean;
}

export interface RoleRequirements {
  required_skills: string[];
  nice_to_have_skills: string[];
  required_languages?: RequiredLanguage[];
  certifications?: string[];
  work_authorization_constraints?: string[];
  hard_gates: HardGate[];
}

export interface ModuleRequirement {
  module_id: string;
  level: ModuleRequirementLevel;
  auto_trigger_keywords?: string[];
  rationale?: string;
  /**
   * Module ids that must be COMPLETED before this module unlocks. Until they
   * are, the unlock engine reports `locked_pending_prerequisite` with a
   * candidate-readable reason. Used to gate the journey (e.g. CORE before any
   * unlockable module).
   */
  unlocks_after?: string[];
}

export interface RoleCalibration {
  version: string;
  score_bars: Record<string, number>;
  weights: Record<string, number>;
  required_evidence?: string[];
  interview_modules?: string[];
  module_plan?: ModuleRequirement[];
  created_by: string;
  created_at: string;
  audit_event_id: string;
}

export interface DailyWorkReality {
  client_facing_percentage?: number;
  meeting_load?: "low" | "moderate" | "high";
  travel_required?: "none" | "rare" | "moderate" | "frequent";
  solo_vs_team_work?: string;
  ambiguity_level?: "low" | "moderate" | "high";
  delivery_pace?: "steady" | "fast" | "urgent";
  notes?: string;
}

export interface RoleProfile {
  role_id: string;
  company_id: string;
  title: string;
  status: RoleStatus;
  seniority?: string;
  role_type?: string;
  location_constraints?: string[];
  work_modes?: WorkMode[];
  compensation_range?: CompensationRange;
  requirements: RoleRequirements;
  daily_work_reality?: DailyWorkReality;
  calibration: RoleCalibration;
  created_at: string;
  updated_at: string;
}

export function validateRoleProfile(input: unknown): ValidationResult<RoleProfile> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [{ code: "role_profile.invalid", path: "", message: "Role profile must be an object." }],
    };
  }

  requireString(input, "role_id", issues);
  requireString(input, "company_id", issues);
  requireString(input, "title", issues);
  requireString(input, "created_at", issues);
  requireString(input, "updated_at", issues);

  if (!isOneOf(input.status, ROLE_STATUSES)) {
    issues.push({
      code: "role_profile.status",
      path: "status",
      message: "Role status must be draft, open, paused, or closed.",
    });
  }

  validateOptionalStringArray(input.location_constraints, "location_constraints", issues);
  validateOptionalEnumArray(input.work_modes, WORK_MODES, "work_modes", issues);
  validateCompensation(input.compensation_range, issues);
  validateRequirements(input.requirements, input.location_constraints, issues);
  validateDailyWorkReality(input.daily_work_reality, issues);
  validateCalibration(input.calibration, issues);

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: input as unknown as RoleProfile, warnings: [] };
}

function validateRequirements(
  requirements: unknown,
  locationConstraints: unknown,
  issues: ValidationIssue[],
) {
  if (!isRecord(requirements)) {
    issues.push({
      code: "requirements.invalid",
      path: "requirements",
      message: "Role requirements must be an object.",
    });
    return;
  }

  validateStringArray(requirements.required_skills, "requirements.required_skills", issues);
  validateStringArray(requirements.nice_to_have_skills, "requirements.nice_to_have_skills", issues);
  validateOptionalStringArray(requirements.certifications, "requirements.certifications", issues);
  validateOptionalStringArray(
    requirements.work_authorization_constraints,
    "requirements.work_authorization_constraints",
    issues,
  );
  validateRequiredLanguages(requirements.required_languages, issues);
  validateHardGates(requirements, locationConstraints, issues);
  scanRequirementText(requirements, issues);
}

function validateRequiredLanguages(value: unknown, issues: ValidationIssue[]) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    issues.push({
      code: "requirements.required_languages",
      path: "requirements.required_languages",
      message: "Required languages must be an array.",
    });
    return;
  }

  value.forEach((language, index) => {
    if (!isRecord(language)) {
      issues.push({
        code: "requirements.required_language.invalid",
        path: `requirements.required_languages.${index}`,
        message: "Required language must be an object.",
      });
      return;
    }

    requireString(language, "language", issues, `requirements.required_languages.${index}.language`);
    if (!isOneOf(language.minimum_level, CEFR_LEVELS)) {
      issues.push({
        code: "requirements.required_language.level",
        path: `requirements.required_languages.${index}.minimum_level`,
        message: "Required language level must be CEFR-like A1 through C2.",
      });
    }
  });
}

function validateHardGates(
  requirements: Record<string, unknown>,
  locationConstraints: unknown,
  issues: ValidationIssue[],
) {
  const hardGates = requirements.hard_gates;
  if (!Array.isArray(hardGates)) {
    issues.push({
      code: "hard_gate.invalid",
      path: "requirements.hard_gates",
      message: "Hard gates must be an array.",
    });
    return;
  }

  hardGates.forEach((gate, index) => {
    const gatePath = `requirements.hard_gates.${index}`;
    if (!isRecord(gate)) {
      issues.push({
        code: "hard_gate.invalid",
        path: gatePath,
        message: "Hard gate must be an object.",
      });
      return;
    }

    if (!isOneOf(gate.gate_type, HARD_GATE_TYPES)) {
      issues.push({
        code: "hard_gate.type",
        path: `${gatePath}.gate_type`,
        message: "Hard gate type is not supported.",
      });
    }

    requireString(gate, "description", issues, `${gatePath}.description`);
    requireString(gate, "lawful_basis_note", issues, `${gatePath}.lawful_basis_note`);

    if (gate.role_essential !== true) {
      issues.push({
        code: "hard_gate.not_role_essential",
        path: `${gatePath}.role_essential`,
        message: "Hard gates must be lawful and role-essential.",
      });
    }

    if (typeof gate.lawful_basis_note !== "string" || gate.lawful_basis_note.trim().length < 12) {
      issues.push({
        code: "hard_gate.lawful_basis_required",
        path: `${gatePath}.lawful_basis_note`,
        message: "Hard gates require a specific lawful basis note.",
      });
    }

    validateHardGateAlignment(gate, gatePath, requirements, locationConstraints, issues);
  });
}

function validateHardGateAlignment(
  gate: Record<string, unknown>,
  gatePath: string,
  requirements: Record<string, unknown>,
  locationConstraints: unknown,
  issues: ValidationIssue[],
) {
  if (gate.gate_type === "language" && !hasItems(requirements.required_languages)) {
    issues.push({
      code: "hard_gate.language_without_requirement",
      path: `${gatePath}.gate_type`,
      message: "Language hard gates require a matching required language.",
    });
  }

  if (gate.gate_type === "certification" && !hasItems(requirements.certifications)) {
    issues.push({
      code: "hard_gate.certification_without_requirement",
      path: `${gatePath}.gate_type`,
      message: "Certification hard gates require a matching certification requirement.",
    });
  }

  if (gate.gate_type === "work_authorization" && !hasItems(requirements.work_authorization_constraints)) {
    issues.push({
      code: "hard_gate.work_authorization_without_constraint",
      path: `${gatePath}.gate_type`,
      message: "Work authorization hard gates require explicit authorization constraints.",
    });
  }

  if (gate.gate_type === "location_timezone" && !hasItems(locationConstraints)) {
    issues.push({
      code: "hard_gate.location_without_constraint",
      path: `${gatePath}.gate_type`,
      message: "Location or timezone hard gates require explicit role location constraints.",
    });
  }
}

function validateCalibration(value: unknown, issues: ValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push({
      code: "calibration.invalid",
      path: "calibration",
      message: "Calibration must be an object.",
    });
    return;
  }

  requireString(value, "version", issues, "calibration.version");
  requireString(value, "created_by", issues, "calibration.created_by");
  requireString(value, "created_at", issues, "calibration.created_at");

  if (typeof value.audit_event_id !== "string" || value.audit_event_id.trim().length === 0) {
    issues.push({
      code: "calibration.audit_required",
      path: "calibration.audit_event_id",
      message: "Calibration requires an audit event ID.",
    });
  }

  validateScoreBars(value.score_bars, issues);
  validateWeights(value.weights, issues);
  validateOptionalStringArray(value.required_evidence, "calibration.required_evidence", issues);
  validateOptionalStringArray(value.interview_modules, "calibration.interview_modules", issues);
  issues.push(...validateModulePlan(value.module_plan, "calibration.module_plan"));
}

/**
 * Validate a module plan (the three-list job profile: required / optional /
 * auto_trigger / blocked). Returns the issues it finds so it can be reused both
 * standalone and inside {@link validateCalibration}. An absent plan is valid:
 * the {@link toModulePlan} adapter derives one from legacy interview_modules.
 */
export function validateModulePlan(value: unknown, basePath = "module_plan"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (value === undefined) {
    return issues;
  }

  if (!Array.isArray(value)) {
    issues.push({
      code: "module_plan.invalid",
      path: basePath,
      message: `${basePath} must be an array.`,
    });
    return issues;
  }

  value.forEach((entry, index) => {
    const path = `${basePath}.${index}`;
    if (!isRecord(entry)) {
      issues.push({
        code: "module_plan.entry_invalid",
        path,
        message: "Module requirement must be an object.",
      });
      return;
    }

    if (typeof entry.module_id !== "string" || entry.module_id.trim().length === 0) {
      issues.push({
        code: "module_plan.module_id",
        path: `${path}.module_id`,
        message: "Module requirement module_id must be a non-empty string.",
      });
    }

    if (!isOneOf(entry.level, MODULE_REQUIREMENT_LEVELS)) {
      issues.push({
        code: "module_plan.level",
        path: `${path}.level`,
        message: "Module requirement level must be required, optional, auto_trigger, or blocked.",
      });
    }

    if (entry.auto_trigger_keywords !== undefined) {
      validateStringArray(entry.auto_trigger_keywords, `${path}.auto_trigger_keywords`, issues);
    }

    if (entry.unlocks_after !== undefined) {
      validateStringArray(entry.unlocks_after, `${path}.unlocks_after`, issues);
    }

    if (entry.rationale !== undefined && typeof entry.rationale !== "string") {
      issues.push({
        code: "module_plan.rationale",
        path: `${path}.rationale`,
        message: "Module requirement rationale must be a string when provided.",
      });
    }
  });

  return issues;
}

function validateDailyWorkReality(value: unknown, issues: ValidationIssue[]) {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    issues.push({
      code: "daily_work_reality.invalid",
      path: "daily_work_reality",
      message: "Daily work reality must be an object when provided.",
    });
    return;
  }

  if (
    value.client_facing_percentage !== undefined &&
    (typeof value.client_facing_percentage !== "number" ||
      value.client_facing_percentage < 0 ||
      value.client_facing_percentage > 100)
  ) {
    issues.push({
      code: "daily_work_reality.client_facing_percentage",
      path: "daily_work_reality.client_facing_percentage",
      message: "Client-facing percentage must be a number from 0 to 100.",
    });
  }

  validateOptionalEnumValue(value.meeting_load, ["low", "moderate", "high"], "daily_work_reality.meeting_load", issues);
  validateOptionalEnumValue(
    value.travel_required,
    ["none", "rare", "moderate", "frequent"],
    "daily_work_reality.travel_required",
    issues,
  );
  validateOptionalEnumValue(
    value.ambiguity_level,
    ["low", "moderate", "high"],
    "daily_work_reality.ambiguity_level",
    issues,
  );
  validateOptionalEnumValue(
    value.delivery_pace,
    ["steady", "fast", "urgent"],
    "daily_work_reality.delivery_pace",
    issues,
  );

  for (const [field, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue !== "string") {
      continue;
    }

    for (const signal of findProtectedRequirementSignals(fieldValue)) {
      issues.push({
        code: "requirement.protected_attribute",
        path: `daily_work_reality.${field}`,
        message: `Daily work reality contains disallowed ${signal.signal} signal: "${signal.matchedText}".`,
      });
    }
  }
}

function validateScoreBars(value: unknown, issues: ValidationIssue[]) {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    issues.push({
      code: "calibration.score_bars",
      path: "calibration.score_bars",
      message: "Calibration score bars must be a non-empty object.",
    });
    return;
  }

  for (const [key, score] of Object.entries(value)) {
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
      issues.push({
        code: "calibration.score_bar_range",
        path: `calibration.score_bars.${key}`,
        message: "Calibration score bars must be numbers from 0 to 100.",
      });
    }
  }
}

function validateWeights(value: unknown, issues: ValidationIssue[]) {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    issues.push({
      code: "calibration.weights",
      path: "calibration.weights",
      message: "Calibration weights must be a non-empty object.",
    });
    return;
  }

  const missingKeys = ROLE_MATCH_WEIGHT_KEYS.filter((key) => typeof value[key] !== "number");
  if (missingKeys.length > 0) {
    issues.push({
      code: "calibration.weight_keys",
      path: "calibration.weights",
      message: `Calibration weights are missing: ${missingKeys.join(", ")}.`,
    });
  }

  let sum = 0;
  for (const [key, weight] of Object.entries(value)) {
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || weight > 1) {
      issues.push({
        code: "calibration.weight_range",
        path: `calibration.weights.${key}`,
        message: "Calibration weights must be numbers from 0 to 1.",
      });
      continue;
    }
    sum += weight;
  }

  if (Math.abs(sum - 1) > 0.001) {
    issues.push({
      code: "calibration.weights_sum",
      path: "calibration.weights",
      message: "Calibration weights must sum to 1.",
    });
  }
}

function validateCompensation(value: unknown, issues: ValidationIssue[]) {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    issues.push({
      code: "compensation.invalid",
      path: "compensation_range",
      message: "Compensation range must be an object.",
    });
    return;
  }

  if (value.currency !== undefined && typeof value.currency !== "string") {
    issues.push({
      code: "compensation.currency",
      path: "compensation_range.currency",
      message: "Compensation currency must be a string.",
    });
  }

  for (const key of ["min", "max"] as const) {
    if (value[key] !== undefined && (typeof value[key] !== "number" || value[key] < 0)) {
      issues.push({
        code: "compensation.amount",
        path: `compensation_range.${key}`,
        message: "Compensation amounts must be non-negative numbers.",
      });
    }
  }

  if (
    typeof value.min === "number" &&
    typeof value.max === "number" &&
    value.max < value.min
  ) {
    issues.push({
      code: "compensation.range",
      path: "compensation_range.max",
      message: "Compensation maximum must be greater than or equal to minimum.",
    });
  }
}

function scanRequirementText(requirements: Record<string, unknown>, issues: ValidationIssue[]) {
  const textFields: Array<{ path: string; value: unknown }> = [];

  collectStringArrayText(requirements.required_skills, "requirements.required_skills", textFields);
  collectStringArrayText(requirements.nice_to_have_skills, "requirements.nice_to_have_skills", textFields);
  collectStringArrayText(requirements.certifications, "requirements.certifications", textFields);
  collectStringArrayText(
    requirements.work_authorization_constraints,
    "requirements.work_authorization_constraints",
    textFields,
  );

  if (Array.isArray(requirements.hard_gates)) {
    requirements.hard_gates.forEach((gate, index) => {
      if (!isRecord(gate)) {
        return;
      }

      textFields.push(
        { path: `requirements.hard_gates.${index}.description`, value: gate.description },
        { path: `requirements.hard_gates.${index}.lawful_basis_note`, value: gate.lawful_basis_note },
      );
    });
  }

  for (const { path, value } of textFields) {
    if (typeof value !== "string") {
      continue;
    }

    const signals = findProtectedRequirementSignals(value);
    for (const signal of signals) {
      issues.push({
        code: "requirement.protected_attribute",
        path,
        message: `Requirement contains disallowed ${signal.signal} signal: "${signal.matchedText}".`,
      });
    }
  }
}

function collectStringArrayText(
  value: unknown,
  path: string,
  textFields: Array<{ path: string; value: unknown }>,
) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((item, index) => textFields.push({ path: `${path}.${index}`, value: item }));
}

function validateStringArray(value: unknown, path: string, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({
      code: "array.required",
      path,
      message: `${path} must be an array.`,
    });
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      issues.push({
        code: "array.string",
        path: `${path}.${index}`,
        message: `${path} items must be non-empty strings.`,
      });
    }
  });
}

function validateOptionalStringArray(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value === undefined) {
    return;
  }

  validateStringArray(value, path, issues);
}

function validateOptionalEnumArray<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
  issues: ValidationIssue[],
) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    issues.push({
      code: "array.required",
      path,
      message: `${path} must be an array.`,
    });
    return;
  }

  value.forEach((item, index) => {
    if (!isOneOf(item, allowed)) {
      issues.push({
        code: "array.enum",
        path: `${path}.${index}`,
        message: `${path} has an unsupported value.`,
      });
    }
  });
}

function validateOptionalEnumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
  issues: ValidationIssue[],
) {
  if (value === undefined) {
    return;
  }

  if (!isOneOf(value, allowed)) {
    issues.push({
      code: "enum.unsupported",
      path,
      message: `${path} has an unsupported value.`,
    });
  }
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
  path = key,
) {
  if (typeof record[key] !== "string" || record[key].trim().length === 0) {
    issues.push({
      code: "string.required",
      path,
      message: `${path} must be a non-empty string.`,
    });
  }
}

function hasItems(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
