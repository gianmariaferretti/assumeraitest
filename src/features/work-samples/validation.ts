import { PROHIBITED_WORK_SAMPLE_SIGNALS, WORK_SAMPLE_LIBRARY } from "./catalog";
import type {
  ProhibitedWorkSampleSignal,
  RoleProfileLike,
  WorkSampleDefinition,
  WorkSampleValidationError,
  WorkSampleValidationResult,
} from "./types";

const VERSION_PATTERN = /^work-sample-v\d+\.\d+\.\d+$/;
const RUBRIC_VERSION_PATTERN = /^rubric-v\d+\.\d+\.\d+$/;
const SCORING_VERSION_PATTERN = /^work-sample-scoring-v\d+\.\d+\.\d+$/;
const MAX_MVP_TIMEBOX_MINUTES = 45;
const WEIGHT_TOLERANCE = 0.00001;
const CANONICAL_PROHIBITED = new Set<string>(PROHIBITED_WORK_SAMPLE_SIGNALS);

const PROHIBITED_CONTENT_PATTERNS: ReadonlyArray<{
  signal: ProhibitedWorkSampleSignal;
  pattern: RegExp;
}> = [
  {
    signal: "direct_age",
    pattern: /\b(age|young|younger|older|under\s+\d{2}|over\s+\d{2}|date of birth)\b/i,
  },
  {
    signal: "accent",
    pattern: /\b(accent|native accent|native speaker)\b/i,
  },
  {
    signal: "personality",
    pattern: /\b(personality|extroverted|introverted|introversion|extraversion)\b/i,
  },
  {
    signal: "protected_attribute",
    pattern:
      /\b(race|ethnicity|religion|gender|pregnancy|disability|sexual orientation|union membership)\b/i,
  },
  {
    signal: "health",
    pattern: /\b(health|medical|illness)\b/i,
  },
  {
    signal: "family_status",
    pattern: /\b(family status|caregiving|caregiver|children|married|parental)\b/i,
  },
  {
    signal: "nationality",
    pattern: /\b(nationality|citizenship|passport)\b/i,
  },
  {
    signal: "biometric",
    pattern: /\b(biometric|voice tone|facial expression)\b/i,
  },
  {
    signal: "emotion",
    pattern: /\b(emotion|emotional state)\b/i,
  },
  {
    signal: "face",
    pattern: /\b(face|facial)\b/i,
  },
];

export function validateWorkSampleCatalog(
  catalog: readonly WorkSampleDefinition[],
): WorkSampleValidationResult {
  const errors: WorkSampleValidationError[] = [];
  const seenIds = new Set<string>();
  const seenKinds = new Set<string>();

  for (const sample of catalog) {
    if (seenIds.has(sample.id)) {
      errors.push({
        code: "DUPLICATE_WORK_SAMPLE_ID",
        path: "id",
        workSampleId: sample.id,
        message: `Work sample id '${sample.id}' is duplicated.`,
      });
    }

    seenIds.add(sample.id);
    seenKinds.add(sample.kind);
    errors.push(...validateWorkSampleDefinition(sample).errors);
  }

  for (const requiredKind of ["coding", "writing", "analysis"]) {
    if (!seenKinds.has(requiredKind)) {
      errors.push({
        code: "CATALOG_KIND_MISSING",
        path: "kind",
        message: `Catalog must include a ${requiredKind} work sample.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateWorkSampleDefinition(
  sample: WorkSampleDefinition,
): WorkSampleValidationResult {
  const errors: WorkSampleValidationError[] = [];
  const addError = (code: string, path: string, message: string) => {
    errors.push({ code, path, message, workSampleId: sample.id });
  };

  if (!VERSION_PATTERN.test(sample.version)) {
    addError("WORK_SAMPLE_VERSION_INVALID", "version", "Work sample version must be semantic.");
  }

  if (!RUBRIC_VERSION_PATTERN.test(sample.rubric.version)) {
    addError("RUBRIC_VERSION_INVALID", "rubric.version", "Rubric version must be semantic.");
  }

  if (!SCORING_VERSION_PATTERN.test(sample.rubric.scoringVersion)) {
    addError(
      "SCORING_VERSION_INVALID",
      "rubric.scoringVersion",
      "Scoring version must be semantic and work-sample specific.",
    );
  }

  if (sample.timeboxMinutes > MAX_MVP_TIMEBOX_MINUTES) {
    addError(
      "WORK_SAMPLE_TOO_LONG",
      "timeboxMinutes",
      `MVP work samples must be ${MAX_MVP_TIMEBOX_MINUTES} minutes or shorter.`,
    );
  }

  if (sample.safeExecutionPlan.rawMediaRequired) {
    addError(
      "RAW_MEDIA_NOT_ALLOWED",
      "safeExecutionPlan.rawMediaRequired",
      "Work samples must grade submitted content, not raw audio or video.",
    );
  }

  for (const blockedCapability of ["network", "filesystem-write", "external-services"] as const) {
    if (sample.safeExecutionPlan.allowedCapabilities.includes(blockedCapability)) {
      addError(
        "UNSAFE_EXECUTION_CAPABILITY",
        "safeExecutionPlan.allowedCapabilities",
        `Safe execution cannot allow ${blockedCapability}.`,
      );
    }
  }

  if (!sample.safeExecutionPlan.requiresHumanReview) {
    addError(
      "HUMAN_REVIEW_REQUIRED",
      "safeExecutionPlan.requiresHumanReview",
      "Work sample outputs are recommendations and require human review.",
    );
  }

  if (sample.antiTrickQuestionNotes.length === 0) {
    addError(
      "ANTI_TRICK_NOTES_REQUIRED",
      "antiTrickQuestionNotes",
      "Work samples must document why the task is realistic and not a trick question.",
    );
  }

  if (sample.kind === "coding" && (!sample.coding || sample.coding.tests.length === 0)) {
    addError("CODING_TESTS_REQUIRED", "coding.tests", "Coding work samples must include tests.");
  }

  if (sample.kind !== "coding" && sample.coding) {
    addError("CODING_SPEC_UNEXPECTED", "coding", "Only coding work samples may include coding specs.");
  }

  if (sample.rubric.criteria.length < 3) {
    addError(
      "RUBRIC_CRITERIA_TOO_FEW",
      "rubric.criteria",
      "Rubrics must include at least three evidence-backed criteria.",
    );
  }

  const weightTotal = sample.rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (Math.abs(weightTotal - 1) > WEIGHT_TOLERANCE) {
    addError(
      "RUBRIC_WEIGHT_TOTAL",
      "rubric.criteria",
      `Rubric criteria weights must sum to 1. Received ${weightTotal.toFixed(5)}.`,
    );
  }

  sample.rubric.criteria.forEach((criterion, index) => {
    if (criterion.evidenceRequired.length === 0) {
      addError(
        "CRITERION_EVIDENCE_REQUIRED",
        `rubric.criteria.${index}.evidenceRequired`,
        "Every rubric criterion must require concrete evidence.",
      );
    }

    for (const signal of criterion.disallowedSignals) {
      const normalizedSignal = normalizeSignal(signal);
      if (CANONICAL_PROHIBITED.has(normalizedSignal)) {
        addError(
          "PROHIBITED_SIGNAL_REFERENCED",
          `rubric.criteria.${index}.disallowedSignals`,
          `Rubrics must use the central prohibited-signal policy instead of criterion-level '${signal}' references.`,
        );
      }
    }
  });

  for (const field of textFieldsForProhibitedSignalScan(sample)) {
    for (const prohibited of PROHIBITED_CONTENT_PATTERNS) {
      if (prohibited.pattern.test(field.value)) {
        addError(
          "PROHIBITED_SIGNAL_IN_CONTENT",
          field.path,
          `Work sample content references disallowed signal '${prohibited.signal}'.`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function selectWorkSamplesForRole(
  role: RoleProfileLike,
  catalog: readonly WorkSampleDefinition[] = WORK_SAMPLE_LIBRARY,
): WorkSampleDefinition[] {
  const roleText = roleSearchText(role);
  const roleType = role.role_type?.toLowerCase();

  return catalog
    .map((sample) => ({
      sample,
      score:
        familyMatchScore(sample, roleType) +
        skillMatchScore(sample, roleText) +
        moduleMatchScore(sample, roleText),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.sample.id.localeCompare(right.sample.id))
    .map((entry) => entry.sample);
}

function familyMatchScore(sample: WorkSampleDefinition, roleType: string | undefined): number {
  if (!roleType) {
    return 0;
  }

  return sample.metadata.roleFamilies.some((family) => family.toLowerCase() === roleType) ? 5 : 0;
}

function skillMatchScore(sample: WorkSampleDefinition, roleText: string): number {
  return sample.metadata.skillTags.reduce((score, tag) => {
    return roleText.includes(tag.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function moduleMatchScore(sample: WorkSampleDefinition, roleText: string): number {
  if (!roleText.includes("work-sample") && !roleText.includes(sample.kind)) {
    return 0;
  }

  return sample.kind === "coding" || sample.kind === "analysis" ? 1 : 0.5;
}

function roleSearchText(role: RoleProfileLike): string {
  return [
    role.role_id,
    role.title,
    role.role_type,
    ...(role.requirements?.required_skills ?? []),
    ...(role.requirements?.nice_to_have_skills ?? []),
    ...(role.requirements?.required_languages?.map((language) => language.language ?? "") ?? []),
    ...(role.calibration?.required_evidence ?? []),
    ...(role.calibration?.interview_modules ?? []),
    ...Object.keys(role.calibration?.score_bars ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeSignal(signal: string): string {
  return signal.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function textFieldsForProhibitedSignalScan(
  sample: WorkSampleDefinition,
): ReadonlyArray<{ path: string; value: string }> {
  return [
    { path: "title", value: sample.title },
    { path: "prompt", value: sample.prompt },
    { path: "candidateInstructions", value: sample.candidateInstructions },
    { path: "expectedOutput", value: sample.expectedOutput },
    ...sample.antiTrickQuestionNotes.map((value, index) => ({
      path: `antiTrickQuestionNotes.${index}`,
      value,
    })),
    ...sample.rubric.criteria.flatMap((criterion, index) => [
      { path: `rubric.criteria.${index}.label`, value: criterion.label },
      { path: `rubric.criteria.${index}.description`, value: criterion.description },
      { path: `rubric.criteria.${index}.scoringGuidance`, value: criterion.scoringGuidance },
    ]),
  ];
}
