import type {
  CefrLevel,
  DeclaredCefrLevel,
  DisallowedLanguageSignalKind,
  RoleLanguageRequirement,
} from "./index";
import type { CandidateProfile } from "../resume-parsing/contracts";

export const LANGUAGE_TEST_PLAN_VERSION = "language-test-plan-v0.1.0";

export const LANGUAGE_TEST_PLAN_COMPONENTS = [
  "grammar_vocabulary",
  "reading_comprehension",
  "spoken_production",
] as const;

export const LANGUAGE_TEST_PLAN_DISALLOWED_SIGNALS: readonly DisallowedLanguageSignalKind[] = [
  "accent",
  "native_status",
  "nationality",
  "voice_tone",
  "emotion",
  "personality",
  "biometric",
];

export type LanguageTestPlanComponent = (typeof LANGUAGE_TEST_PLAN_COMPONENTS)[number];

export type LanguageTestPlanReason = "declared_by_candidate" | "role_required";

export type LanguageTestPromptLevelBand = "A1_A2" | "B1_B2" | "C1_C2";

export type LanguageTestPlanReviewReasonKind =
  | "missing_declared_language_level"
  | "required_language_missing"
  | "role_language_declared_below_minimum";

export interface LanguageTestPromptGuidance {
  readonly level_band: LanguageTestPromptLevelBand;
  readonly guidance: string;
}

export interface LanguageTestPlanReviewReason {
  readonly language: string;
  readonly reason: LanguageTestPlanReviewReasonKind;
  readonly declared_level?: DeclaredCefrLevel;
  readonly minimum_level?: CefrLevel;
}

export interface LanguageTestPlan {
  readonly language: string;
  readonly declared_level: CefrLevel;
  readonly target_level: CefrLevel;
  readonly reason: readonly LanguageTestPlanReason[];
  readonly components: readonly LanguageTestPlanComponent[];
  readonly prompt_guidance: LanguageTestPromptGuidance;
  readonly disallowed_signals: readonly DisallowedLanguageSignalKind[];
  readonly human_review_required: boolean;
  readonly review_reasons: readonly LanguageTestPlanReviewReason[];
}

export interface LanguageTestPlanInput {
  readonly candidate_id: string;
  readonly languages: CandidateProfile["languages"];
  readonly required_languages?: readonly RoleLanguageRequirement[];
  readonly generated_at: string;
  readonly audit_event_id: string;
  readonly version?: string;
}

export interface LanguageTestPlanResult {
  readonly candidate_id: string;
  readonly plans: readonly LanguageTestPlan[];
  readonly review_reasons: readonly LanguageTestPlanReviewReason[];
  readonly human_review_required: boolean;
  readonly version: string;
  readonly generated_at: string;
  readonly audit_event_id: string;
}

const VALID_CEFR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const PROMPT_GUIDANCE_BY_BAND: Record<LanguageTestPromptLevelBand, string> = {
  A1_A2: "A1/A2: use simple daily/work phrases and concrete routine task prompts.",
  B1_B2:
    "B1/B2: use workplace communication prompts with meetings, priorities, handoffs, and clarifications.",
  C1_C2:
    "C1/C2: use complex stakeholder/abstract work discussion prompts covering tradeoffs, strategy, ambiguity, and negotiation.",
};

export function createLanguageTestPlan(input: LanguageTestPlanInput): LanguageTestPlanResult {
  const requirementByLanguage = new Map<string, RoleLanguageRequirement>();
  for (const requirement of input.required_languages ?? []) {
    requirementByLanguage.set(normalizeLanguage(requirement.language), requirement);
  }

  const candidateLanguages = new Set<string>();
  const plans: LanguageTestPlan[] = [];
  const reviewReasons: LanguageTestPlanReviewReason[] = [];

  for (const language of input.languages) {
    const normalizedLanguage = normalizeLanguage(language.language);
    if (normalizedLanguage.length === 0) {
      continue;
    }

    candidateLanguages.add(normalizedLanguage);

    if (!isCefrLevel(language.declared_level)) {
      reviewReasons.push({
        language: language.language,
        reason: "missing_declared_language_level",
        declared_level: language.declared_level ?? "unknown",
      });
      continue;
    }

    const requirement = requirementByLanguage.get(normalizedLanguage);
    const planReviewReasons = buildPlanReviewReasons(language.language, language.declared_level, requirement);

    plans.push({
      language: language.language,
      declared_level: language.declared_level,
      target_level: resolveTargetLevel(language.declared_level, requirement),
      reason: requirement
        ? ["declared_by_candidate", "role_required"]
        : ["declared_by_candidate"],
      components: [...LANGUAGE_TEST_PLAN_COMPONENTS],
      prompt_guidance: buildPromptGuidance(resolveTargetLevel(language.declared_level, requirement)),
      disallowed_signals: [...LANGUAGE_TEST_PLAN_DISALLOWED_SIGNALS],
      human_review_required: planReviewReasons.length > 0,
      review_reasons: planReviewReasons,
    });
    reviewReasons.push(...planReviewReasons);
  }

  for (const requirement of input.required_languages ?? []) {
    if (!candidateLanguages.has(normalizeLanguage(requirement.language))) {
      reviewReasons.push({
        language: requirement.language,
        reason: "required_language_missing",
        minimum_level: requirement.minimum_level,
      });
    }
  }

  return {
    candidate_id: input.candidate_id,
    plans,
    review_reasons: reviewReasons,
    human_review_required: reviewReasons.length > 0,
    version: input.version ?? LANGUAGE_TEST_PLAN_VERSION,
    generated_at: input.generated_at,
    audit_event_id: input.audit_event_id,
  };
}

function buildPlanReviewReasons(
  language: string,
  declaredLevel: CefrLevel,
  requirement?: RoleLanguageRequirement,
): LanguageTestPlanReviewReason[] {
  if (!requirement || compareCefrLevels(declaredLevel, requirement.minimum_level) >= 0) {
    return [];
  }

  return [
    {
      language,
      reason: "role_language_declared_below_minimum",
      declared_level: declaredLevel,
      minimum_level: requirement.minimum_level,
    },
  ];
}

function resolveTargetLevel(
  declaredLevel: CefrLevel,
  requirement?: RoleLanguageRequirement,
): CefrLevel {
  if (!requirement) {
    return declaredLevel;
  }

  return compareCefrLevels(declaredLevel, requirement.minimum_level) >= 0
    ? declaredLevel
    : requirement.minimum_level;
}

function buildPromptGuidance(targetLevel: CefrLevel): LanguageTestPromptGuidance {
  const levelBand = resolvePromptLevelBand(targetLevel);

  return {
    level_band: levelBand,
    guidance: PROMPT_GUIDANCE_BY_BAND[levelBand],
  };
}

function resolvePromptLevelBand(level: CefrLevel): LanguageTestPromptLevelBand {
  if (level === "A1" || level === "A2") {
    return "A1_A2";
  }
  if (level === "B1" || level === "B2") {
    return "B1_B2";
  }
  return "C1_C2";
}

function isCefrLevel(level: DeclaredCefrLevel | undefined): level is CefrLevel {
  return VALID_CEFR_LEVELS.includes(level as CefrLevel);
}

function compareCefrLevels(left: CefrLevel, right: CefrLevel): number {
  return VALID_CEFR_LEVELS.indexOf(left) - VALID_CEFR_LEVELS.indexOf(right);
}

function normalizeLanguage(language: string): string {
  return language.trim().toLocaleLowerCase();
}
