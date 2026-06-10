import type {
  CandidateProfile,
  DimensionDraft,
  EvidenceObject,
  LanguageEvaluation,
  LanguageEvaluationOptions,
  RoleProfile,
  UpstreamScoreDimension,
} from "./engine-types";

/** Shared deterministic helpers for dimensions, gates, and the engine core. */

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function evaluateRequiredLanguages(
  candidate: CandidateProfile,
  role: RoleProfile,
  options: LanguageEvaluationOptions = {},
): LanguageEvaluation {
  const requiredLanguages = role.requirements.required_languages ?? [];

  if (requiredLanguages.length === 0) {
    return {
      passed: true,
      evidence: ["No role-essential language requirement configured."],
      missing: [],
      failed: [],
      score: 80,
      confidence: 75,
    };
  }

  const results = requiredLanguages.map((requirement) => {
    const candidateLanguage = candidate.languages.find(
      (language) => normalize(language.language) === normalize(requirement.language),
    );
    const assessedLevel = candidateLanguage?.assessed_level;
    const declaredLevel = candidateLanguage?.declared_level;
    const hasAssessedLevel = Boolean(assessedLevel && assessedLevel !== "unknown");
    const bestLevel = hasAssessedLevel ? assessedLevel : declaredLevel;
    const meetsMinimum = bestLevel ? compareCefr(bestLevel, requirement.minimum_level) >= 0 : false;
    const passed =
      meetsMinimum && (!options.requireAssessedForPass || hasAssessedLevel);
    const missingAssessed = !assessedLevel || assessedLevel === "unknown";
    const failure =
      !candidateLanguage || !bestLevel
        ? `${requirement.language} ${requirement.minimum_level} required, candidate evidence not found`
        : options.requireAssessedForPass && !hasAssessedLevel
          ? `${requirement.language} ${requirement.minimum_level} requires assessed communication evidence, candidate declaration ${bestLevel} is not enough for a role-essential hard gate`
          : `${requirement.language} ${requirement.minimum_level} required, candidate evidence ${bestLevel}`;

    return {
      requirement,
      passed,
      candidateLanguage,
      bestLevel,
      missingAssessed,
      failure,
    };
  });

  const passedCount = results.filter((result) => result.passed).length;
  const score = (passedCount / requiredLanguages.length) * 100;
  const missing = results
    .filter((result) => result.missingAssessed)
    .map((result) => `Assessed level for ${result.requirement.language} is not available.`);
  const failed = results
    .filter((result) => !result.passed)
    .map((result) => result.failure);

  return {
    passed: failed.length === 0,
    evidence: results
      .filter((result) => result.passed)
      .flatMap((result) => [
        `${result.requirement.language} meets ${result.requirement.minimum_level} requirement using ${
          result.bestLevel
        } evidence.`,
        ...(result.candidateLanguage?.evidence ?? []),
      ]),
    missing,
    failed,
    score,
    confidence: missing.length ? 65 : 85,
  };
}

export function compareCefr(candidateLevel: string, requiredLevel: string): number {
  return CEFR_LEVELS.indexOf(candidateLevel) - CEFR_LEVELS.indexOf(requiredLevel);
}

export function candidateHasSkill(candidate: CandidateProfile, skill: string): boolean {
  const skillNeedle = normalize(skill);
  const skillNames = candidate.skills.map((candidateSkill) => candidateSkill.name);
  if (containsNormalized(skillNames, skill)) {
    return true;
  }

  return candidate.experience.some((experience) =>
    [
      experience.title,
      experience.industry,
      experience.function,
      ...(experience.responsibilities ?? []),
      ...(experience.measurable_impact ?? []),
      ...(experience.tools ?? []),
    ]
      .filter(isString)
      .some((value) => normalize(value).includes(skillNeedle)),
  );
}

export function collectEvidenceForSkills(candidate: CandidateProfile, skills: string[]): string[] {
  return skills.flatMap((skill) => {
    const matchingSkill = candidate.skills.find(
      (candidateSkill) => normalize(candidateSkill.name) === normalize(skill),
    );

    return matchingSkill?.evidence ?? [];
  });
}

export function hasLocationOverlap(candidate: CandidateProfile, role: RoleProfile): boolean {
  const candidateLocations = [
    candidate.contact?.location,
    ...(candidate.preferences.locations ?? []),
  ].filter(isString);
  const roleLocations = role.location_constraints ?? [];

  return hasOverlap(candidateLocations, roleLocations);
}

export function hasOverlap(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0) {
    return false;
  }

  return left.some((leftValue) =>
    right.some(
      (rightValue) =>
        normalize(leftValue).includes(normalize(rightValue)) ||
        normalize(rightValue).includes(normalize(leftValue)),
    ),
  );
}

export function tokenOverlap(left: string[], right: Array<string | undefined>): boolean {
  const rightText = normalize(right.filter(Boolean).join(" "));

  return left.some((leftValue) => {
    const tokens = normalize(leftValue)
      .split(" ")
      .filter((token) => token.length > 2);

    return tokens.some((token) => rightText.includes(token));
  });
}

export function containsNormalized(values: string[], expected: string): boolean {
  const normalizedExpected = normalize(expected);

  return values.some((value) => normalize(value).includes(normalizedExpected));
}

export function hasAffirmativeWorkAuthorizationEvidence(value: string | undefined): boolean {
  const normalized = normalize(value);

  if (!normalized) {
    return false;
  }

  if (
    normalized.includes("does not require sponsorship") ||
    normalized.includes("no sponsorship required")
  ) {
    return true;
  }

  const negativePatterns = [
    "no authorization",
    "not authorized",
    "need sponsorship",
    "needs sponsorship",
    "requires sponsorship",
    "unknown",
    "not sure",
    "none"
  ];
  if (negativePatterns.some((pattern) => normalized.includes(pattern))) {
    return false;
  }

  const affirmativePatterns = [
    "authorized",
    "eligible",
    "right to work",
    "work permit",
    "valid visa",
    "visa valid",
    "permanent resident",
    "citizen"
  ];

  return affirmativePatterns.some((pattern) => normalized.includes(pattern));
}

export function normalizeEvidence(evidence?: Array<string | EvidenceObject>): string[] {
  return (
    evidence
      ?.map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item.snippet;
      })
      .filter(isString) ?? []
  );
}

export function fromUpstreamDimension(dimension: UpstreamScoreDimension): DimensionDraft {
  return {
    score: dimension.score ?? 0,
    confidence: dimension.confidence ?? 60,
    evidence: normalizeEvidence(dimension.evidence),
    missing_data: dimension.missing_data ?? [],
  };
}

export function confidenceFromEvidence(evidenceCount: number): number {
  return clamp(55 + evidenceCount * 8, 45, 90);
}

export function average(values: number[]): number {
  const cleanValues = values.filter(isNumber);
  if (cleanValues.length === 0) {
    return 0;
  }

  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

export function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sanitizeForId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
