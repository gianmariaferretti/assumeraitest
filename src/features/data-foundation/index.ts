import { findProtectedRequirementSignals } from "../roles/protected-attributes";

export const DATA_FOUNDATION_VERSION = "data-foundation-v1";

export const MINIMUM_V1_DATA_REQUIREMENTS = [
  "candidate_confirmed_profile",
  "candidate_explicit_work_preferences",
  "role_daily_work_reality",
  "company_verified_identity",
  "skills_occupation_taxonomy",
  "governed_source_registry",
  "outcome_event_tracking",
] as const;

const PROHIBITED_SIGNAL_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: "direct_age", pattern: /\bage\b|\bdate\s+of\s+birth\b|\bbirth\s*date\b/i },
  { code: "native_status_or_accent", pattern: /\baccent\b|\bnative\s+speaker\b|\bmother\s+tongue\b/i },
  { code: "biometric_or_face", pattern: /\bbiometric\b|\bface\b|\bfacial\b/i },
  { code: "emotion", pattern: /\bemotion\b|\bfacial\s+expression\b/i },
  { code: "personality", pattern: /\bpersonality\b|\bintrovert(?:ed)?\b|\bextrovert(?:ed)?\b/i },
  { code: "protected_attribute", pattern: /\bgender\b|\brace\b|\bethnicity\b|\breligion\b|\bdisability\b|\bpregnancy\b|\bhealth\b|\bsexual\s+orientation\b|\bfamily\s+status\b|\bcaregiv(?:er|ing)\b|\bnationality\b/i },
];

const RAW_MEDIA_SCORING_PATTERN =
  /\braw\b.*\b(?:video|audio|media)\b|\b(?:video|audio|media)\b.*\b(?:emotion|personality|face|facial|biometric|accent)\b/i;

export interface DataFoundationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface DataFoundationSourceUse {
  readonly source_id: string;
  readonly allowed_for_product_context: boolean;
  readonly allowed_for_scoring: boolean;
  readonly requires_review_before_scoring: boolean;
  readonly reason: string;
}

export interface DataFoundationReadiness {
  readonly version: typeof DATA_FOUNDATION_VERSION;
  readonly minimum_requirements: readonly (typeof MINIMUM_V1_DATA_REQUIREMENTS)[number][];
  readonly matching_inputs: {
    readonly preference_fit_evidence: readonly string[];
  };
  readonly source_uses: readonly DataFoundationSourceUse[];
}

export type DataFoundationReadinessResult =
  | { readonly ok: true; readonly value: DataFoundationReadiness; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly issues: readonly DataFoundationIssue[] };

export interface GovernedSourceLike {
  readonly source_id: string;
  readonly tier?: string;
  readonly license_review_status?: string;
  readonly scoring_gate?: string;
  readonly allowed_uses?: readonly string[];
  readonly disallowed_uses?: readonly string[];
  readonly requires_human_review?: boolean;
}

export function validateDataFoundationReadiness(input: unknown): DataFoundationReadinessResult {
  const issues: DataFoundationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          code: "data_foundation.invalid",
          path: "",
          message: "Data foundation readiness packet must be an object.",
        },
      ],
    };
  }

  if (input.version !== DATA_FOUNDATION_VERSION) {
    issues.push({
      code: "data_foundation.version",
      path: "version",
      message: `Data foundation version must be ${DATA_FOUNDATION_VERSION}.`,
    });
  }

  validateCandidateProfile(input.candidate_profile, issues);
  validateRoleProfile(input.role_profile, issues);
  validateCompanyProfile(input.company_profile, issues);
  validateSkillTaxonomy(input.skill_taxonomy, issues);
  validateIdentityTables(input.identity_tables, issues);
  const sourceUses = validateSourceRegistry(input.source_registry, issues);
  validateOutcomeTracking(input.outcome_tracking, issues);
  validateScoringFeatureCandidates(input.scoring_feature_candidates, issues);
  scanObjectText(input, issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      version: DATA_FOUNDATION_VERSION,
      minimum_requirements: MINIMUM_V1_DATA_REQUIREMENTS,
      matching_inputs: {
        preference_fit_evidence: buildPreferenceFitEvidence(input),
      },
      source_uses: sourceUses,
    },
    warnings: [],
  };
}

export function classifyDataSourceUse(input: GovernedSourceLike): DataFoundationSourceUse {
  const allowedUses = input.allowed_uses ?? [];
  const disallowedUses = joinLower(input.disallowed_uses);
  const scoringGate = String(input.scoring_gate ?? "").toLowerCase();
  const licenseReviewStatus = String(input.license_review_status ?? "").toLowerCase();

  const allowedForProductContext =
    allowedUses.length > 0 &&
    !disallowedUses.includes("product context") &&
    !disallowedUses.includes("candidate-facing context");
  const approvedLicense = licenseReviewStatus === "approved-public";
  const explicitlyApprovedForScoring =
    approvedLicense && !scoringGate.includes("not-approved") && scoringGate.includes("approved");

  return {
    source_id: input.source_id,
    allowed_for_product_context: allowedForProductContext,
    allowed_for_scoring: explicitlyApprovedForScoring,
    requires_review_before_scoring: !explicitlyApprovedForScoring || input.requires_human_review !== false,
    reason: explicitlyApprovedForScoring
      ? "Source is approved by licence and scoring gate, but scoring use still needs versioned implementation controls."
      : "Source is available for context only until governance, legal, fairness, and scoring-version review clear it.",
  };
}

function validateCandidateProfile(input: unknown, issues: DataFoundationIssue[]) {
  if (!isRecord(input)) {
    issue(issues, "data_foundation.candidate_profile", "candidate_profile", "Candidate profile data is required.");
    return;
  }

  if (input.confirmed_by_candidate !== true) {
    issue(
      issues,
      "data_foundation.candidate_not_confirmed",
      "candidate_profile.confirmed_by_candidate",
      "Candidate profile must be confirmed by the candidate before scoring or matching readiness.",
    );
  }

  const evidence = input.evidence;
  if (!isRecord(evidence)) {
    issue(issues, "data_foundation.candidate_evidence", "candidate_profile.evidence", "Candidate evidence is required.");
  } else {
    requireNonEmptyArray(evidence.work_history, "candidate_profile.evidence.work_history", issues);
    requireNonEmptyArray(evidence.skills, "candidate_profile.evidence.skills", issues);
    requireNonEmptyArray(evidence.education, "candidate_profile.evidence.education", issues);
    requireNonEmptyArray(evidence.languages, "candidate_profile.evidence.languages", issues);
  }

  const preferences = input.preferences;
  if (!isRecord(preferences)) {
    issue(
      issues,
      "data_foundation.candidate_preferences",
      "candidate_profile.preferences",
      "Candidate explicit work preferences are required.",
    );
  } else {
    requireNonEmptyArray(preferences.target_roles, "candidate_profile.preferences.target_roles", issues);
    requireNonEmptyArray(preferences.work_modes, "candidate_profile.preferences.work_modes", issues);
    requireNonEmptyArray(preferences.negative_preferences, "candidate_profile.preferences.negative_preferences", issues);
    requireString(preferences.client_facing_preference, "candidate_profile.preferences.client_facing_preference", issues);
    requireString(preferences.travel_preference, "candidate_profile.preferences.travel_preference", issues);
    requireString(preferences.meeting_load_preference, "candidate_profile.preferences.meeting_load_preference", issues);
    requireString(preferences.deep_work_preference, "candidate_profile.preferences.deep_work_preference", issues);
  }

  const consentState = input.consent_state;
  if (!isRecord(consentState) || consentState.employer_visibility_without_candidate_acceptance !== false) {
    issue(
      issues,
      "data_foundation.consent_boundary",
      "candidate_profile.consent_state",
      "Employer visibility must stay false until candidate accepts a company-role match.",
    );
  }
}

function validateRoleProfile(input: unknown, issues: DataFoundationIssue[]) {
  if (!isRecord(input)) {
    issue(issues, "data_foundation.role_profile", "role_profile", "Role profile data is required.");
    return;
  }

  requireNonEmptyArray(input.required_skills, "role_profile.required_skills", issues);
  requireNonEmptyArray(input.nice_to_have_skills, "role_profile.nice_to_have_skills", issues);
  requireNonEmptyArray(input.hard_gates, "role_profile.hard_gates", issues);

  const dailyWorkReality = input.daily_work_reality;
  if (!isRecord(dailyWorkReality)) {
    issue(
      issues,
      "data_foundation.role_daily_work_reality",
      "role_profile.daily_work_reality",
      "Role daily work reality is required before matching.",
    );
  } else {
    for (const field of [
      "client_facing_percentage",
      "meeting_load",
      "travel_required",
      "solo_vs_team_work",
      "ambiguity_level",
      "delivery_pace",
    ] as const) {
      if (dailyWorkReality[field] === undefined || dailyWorkReality[field] === null || dailyWorkReality[field] === "") {
        issue(
          issues,
          "data_foundation.role_daily_work_reality",
          `role_profile.daily_work_reality.${field}`,
          "Role daily work reality is incomplete.",
        );
      }
    }
  }

  if (!isRecord(input.calibration)) {
    issue(
      issues,
      "data_foundation.role_calibration",
      "role_profile.calibration",
      "Role calibration must define strong, acceptable, and weak evidence examples.",
    );
  }
}

function validateCompanyProfile(input: unknown, issues: DataFoundationIssue[]) {
  if (!isRecord(input)) {
    issue(issues, "data_foundation.company_profile", "company_profile", "Company profile data is required.");
    return;
  }

  const legalIdentity = input.legal_identity;
  if (!isRecord(legalIdentity)) {
    issue(
      issues,
      "data_foundation.company_verified_identity",
      "company_profile.legal_identity",
      "Verified company legal identity is required.",
    );
  } else {
    requireString(legalIdentity.legal_name, "company_profile.legal_identity.legal_name", issues);
    requireString(legalIdentity.website, "company_profile.legal_identity.website", issues);
    requireString(legalIdentity.country, "company_profile.legal_identity.country", issues);
    requireString(legalIdentity.registry_id, "company_profile.legal_identity.registry_id", issues);
  }

  requireString(input.team_structure, "company_profile.team_structure", issues);
  requireNonEmptyArray(input.hiring_process, "company_profile.hiring_process", issues);

  if (!isRecord(input.work_style_questionnaire)) {
    issue(
      issues,
      "data_foundation.company_work_style",
      "company_profile.work_style_questionnaire",
      "Company-provided work-style questionnaire is required.",
    );
  }
}

function validateSkillTaxonomy(input: unknown, issues: DataFoundationIssue[]) {
  if (!isRecord(input)) {
    issue(issues, "data_foundation.skill_taxonomy", "skill_taxonomy", "Skills and occupation taxonomy is required.");
    return;
  }

  requireString(input.taxonomy_id, "skill_taxonomy.taxonomy_id", issues);
  requireNonEmptyArray(input.source_ids, "skill_taxonomy.source_ids", issues);
  requireNonEmptyArray(input.skill_aliases, "skill_taxonomy.skill_aliases", issues);
  requireNonEmptyArray(input.occupation_mappings, "skill_taxonomy.occupation_mappings", issues);
}

function validateIdentityTables(input: unknown, issues: DataFoundationIssue[]) {
  if (!isRecord(input)) {
    issue(issues, "data_foundation.identity_tables", "identity_tables", "University and company identity source lists are required.");
    return;
  }

  requireNonEmptyArray(input.university_sources, "identity_tables.university_sources", issues);
  requireNonEmptyArray(input.company_sources, "identity_tables.company_sources", issues);

  const unknownUniversityPolicy = input.unknown_university_policy;
  if (!isRecord(unknownUniversityPolicy)) {
    issue(
      issues,
      "data_foundation.unknown_university_policy",
      "identity_tables.unknown_university_policy",
      "Unknown university neutral fallback policy is required.",
    );
    return;
  }

  if (
    unknownUniversityPolicy.score !== 50 ||
    typeof unknownUniversityPolicy.confidence !== "number" ||
    unknownUniversityPolicy.confidence > 30 ||
    unknownUniversityPolicy.enrichment_needed !== true ||
    unknownUniversityPolicy.manual_review_required !== true
  ) {
    issue(
      issues,
      "data_foundation.unknown_university_policy",
      "identity_tables.unknown_university_policy",
      "Unknown universities must use neutral score 50, low confidence, enrichment needed, and manual review.",
    );
  }
}

function validateSourceRegistry(input: unknown, issues: DataFoundationIssue[]): DataFoundationSourceUse[] {
  if (!isRecord(input) || !Array.isArray(input.sources) || input.sources.length === 0) {
    issue(
      issues,
      "data_foundation.source_registry",
      "source_registry.sources",
      "A governed source registry with at least one source is required.",
    );
    return [];
  }

  return input.sources.map((source, index) => {
    if (!isRecord(source) || typeof source.source_id !== "string") {
      issue(
        issues,
        "data_foundation.source_registry",
        `source_registry.sources.${index}`,
        "Every source registry record must have a source_id.",
      );
      return classifyDataSourceUse({ source_id: `invalid-source-${index}` });
    }

    if (source.requires_human_review !== true) {
      issue(
        issues,
        "data_foundation.source_human_review",
        `source_registry.sources.${index}.requires_human_review`,
        "External source records must require human review before scoring or calibration use.",
      );
    }

    const use = classifyDataSourceUse(source as unknown as GovernedSourceLike);
    if (use.allowed_for_scoring) {
      issue(
        issues,
        "data_foundation.source_scoring_gate",
        `source_registry.sources.${index}.scoring_gate`,
        "Readiness packets must not pre-approve external sources for scoring.",
      );
    }

    return use;
  });
}

function validateOutcomeTracking(input: unknown, issues: DataFoundationIssue[]) {
  if (!isRecord(input)) {
    issue(issues, "data_foundation.outcome_tracking", "outcome_tracking", "Outcome event tracking is required.");
    return;
  }

  if (input.consent_gated !== true) {
    issue(
      issues,
      "data_foundation.outcome_consent",
      "outcome_tracking.consent_gated",
      "Outcome tracking must remain consent-gated.",
    );
  }

  requireNonEmptyArray(input.events, "outcome_tracking.events", issues);
}

function validateScoringFeatureCandidates(input: unknown, issues: DataFoundationIssue[]) {
  if (!Array.isArray(input)) {
    issue(
      issues,
      "data_foundation.scoring_features",
      "scoring_feature_candidates",
      "Scoring feature candidates are required to document intended use.",
    );
    return;
  }

  input.forEach((feature, index) => {
    if (!isRecord(feature)) {
      return;
    }

    const text = [
      feature.feature_id,
      feature.label,
      feature.data_domain,
      feature.intended_use,
      feature.source,
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" ");

    if (RAW_MEDIA_SCORING_PATTERN.test(text)) {
      issue(
        issues,
        "data_foundation.raw_media_scoring",
        `scoring_feature_candidates.${index}`,
        "Raw media, face, emotion, biometric, accent, or personality signals must not be scoring features.",
      );
    }
  });
}

function scanObjectText(input: unknown, issues: DataFoundationIssue[], path = "") {
  if (typeof input === "string") {
    scanText(input, path, issues);
    return;
  }

  if (Array.isArray(input)) {
    input.forEach((item, index) => scanObjectText(item, issues, appendPath(path, String(index))));
    return;
  }

  if (isRecord(input)) {
    Object.entries(input).forEach(([key, value]) => scanObjectText(value, issues, appendPath(path, key)));
  }
}

function scanText(text: string, path: string, issues: DataFoundationIssue[]) {
  const protectedSignals = findProtectedRequirementSignals(text);
  for (const signal of protectedSignals) {
    issue(
      issues,
      "data_foundation.prohibited_signal",
      path,
      `Disallowed ${signal.signal} signal found: "${signal.matchedText}".`,
    );
  }

  for (const { code, pattern } of PROHIBITED_SIGNAL_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[0]) {
      issue(
        issues,
        "data_foundation.prohibited_signal",
        path,
        `Disallowed ${code} signal found: "${match[0]}".`,
      );
    }
  }
}

function buildPreferenceFitEvidence(input: Record<string, unknown>): string[] {
  const evidence: string[] = [];
  const candidateProfile = isRecord(input.candidate_profile) ? input.candidate_profile : {};
  const preferences = isRecord(candidateProfile.preferences) ? candidateProfile.preferences : {};
  const roleProfile = isRecord(input.role_profile) ? input.role_profile : {};
  const dailyWorkReality = isRecord(roleProfile.daily_work_reality) ? roleProfile.daily_work_reality : {};
  const companyProfile = isRecord(input.company_profile) ? input.company_profile : {};

  const preferredFamilies = arrayToLower(preferences.preferred_role_families);
  const negativePreferences = arrayToLower(preferences.negative_preferences);
  if (preferredFamilies.some((item) => item.includes("product")) && negativePreferences.includes("consulting")) {
    evidence.push("Candidate explicitly prefers product engineering over consulting.");
  }

  if (
    (preferences.client_facing_preference === "low" || preferences.client_facing_preference === "avoid") &&
    typeof dailyWorkReality.client_facing_percentage === "number" &&
    dailyWorkReality.client_facing_percentage <= 20
  ) {
    evidence.push("Role has low client-facing load.");
  }

  if (typeof companyProfile.team_structure === "string" && companyProfile.team_structure.trim().length > 0) {
    evidence.push(`Company team structure is ${companyProfile.team_structure}.`);
  }

  return evidence;
}

function requireString(value: unknown, path: string, issues: DataFoundationIssue[]) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issue(issues, "data_foundation.required", path, `${path} is required.`);
  }
}

function requireNonEmptyArray(value: unknown, path: string, issues: DataFoundationIssue[]) {
  if (!Array.isArray(value) || value.length === 0) {
    issue(issues, "data_foundation.required", path, `${path} must be a non-empty array.`);
  }
}

function issue(issues: DataFoundationIssue[], code: string, path: string, message: string) {
  issues.push({ code, path, message });
}

function appendPath(path: string, key: string) {
  return path ? `${path}.${key}` : key;
}

function joinLower(value: readonly string[] | undefined) {
  return (value ?? []).join(" ").toLowerCase();
}

function arrayToLower(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase())
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
