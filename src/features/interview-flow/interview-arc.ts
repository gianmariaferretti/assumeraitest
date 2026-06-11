import {
  buildCanonicalQuestion,
  canonicalEntriesForStage,
  isCanonicalQuestionId,
  jobDriverEntries,
  resolveCanonicalLanguage,
  workStyleEntries,
  type CanonicalLanguage,
  type CanonicalSeniorityBand
} from "./canonical-questions";
import type {
  InterviewArcStage,
  InterviewQuestion,
  ModuleId,
  RoleFamily
} from "./types";

/**
 * Realistic interview arc (Phase 11).
 *
 * Every platform interview follows the arc of a real first-round interview —
 * opening (warm-up, baseline only) → role-family motivation → self-awareness
 * bridge (strengths + STAR probe) → behavioral core → situational → closing —
 * mapped onto the existing module/funnel structure:
 *
 *   motivation module  : opening, motivation, self_awareness (+ STAR probe)
 *   language/domain/work_sample modules : behavioral_core
 *   case module        : situational, closing
 *
 * The interviewer represents AssumerAI, never an employer: company-specific
 * judgment is applied by the matching engine AFTER the interview.
 */

export const ARC_STAGE_ORDER: readonly InterviewArcStage[] = [
  "opening",
  "motivation",
  "self_awareness",
  "behavioral_core",
  "situational",
  "closing"
];

export function arcStageRank(stage: InterviewArcStage): number {
  return ARC_STAGE_ORDER.indexOf(stage);
}

/** Arc stage of a module-derived (non-canonical) question. */
export function arcStageForModule(moduleId: ModuleId): InterviewArcStage {
  if (moduleId === "motivation") {
    return "motivation";
  }
  if (moduleId === "case") {
    return "situational";
  }

  return "behavioral_core";
}

/** Map a free-text role seniority onto the canonical bands. */
export function resolveSeniorityBand(
  seniority: string | undefined
): CanonicalSeniorityBand | undefined {
  const normalized = seniority?.trim().toLowerCase() ?? "";
  if (/junior|entry|intern|graduate|trainee|associate/.test(normalized)) {
    return "junior";
  }
  if (/senior|lead|principal|staff|head|manager|director|experienced/.test(normalized)) {
    return "experienced";
  }

  return undefined;
}

/**
 * STAR/SJT mix by seniority: junior profiles get more situational items
 * (stages d/e), experienced profiles more past-behavioral. The canonical bank
 * gates the extra items on the same bands.
 */
export function resolveStarSjtMix(seniority: CanonicalSeniorityBand | undefined): {
  readonly extraSituational: boolean;
  readonly extraBehavioral: boolean;
} {
  return {
    extraSituational: seniority === "junior",
    extraBehavioral: seniority === "experienced"
  };
}

export interface BuildInterviewArcInput {
  /** Module-derived questions (one per module, from the role question bank). */
  readonly moduleQuestions: readonly InterviewQuestion[];
  readonly roleFamily: RoleFamily;
  readonly seniority?: string;
  readonly language?: unknown;
}

/**
 * Assemble the full realistic-arc question sequence. Canonical items frame
 * the interview; the module questions form the behavioral core and the
 * situational scenario. The motivation module's own question is replaced by
 * the canonical opening/motivation/self-awareness block.
 */
export function buildInterviewArcQuestions(input: BuildInterviewArcInput): InterviewQuestion[] {
  const language: CanonicalLanguage = resolveCanonicalLanguage(input.language);
  const seniority = resolveSeniorityBand(input.seniority);
  const mix = resolveStarSjtMix(seniority);
  const selection = { roleFamily: input.roleFamily, seniority };

  const canonical = (stage: InterviewArcStage): InterviewQuestion[] =>
    canonicalEntriesForStage(stage, selection).map((entry) =>
      buildCanonicalQuestion(entry, language, input.roleFamily)
    );

  const tagged = input.moduleQuestions
    .filter((question) => !isCanonicalQuestionId(question.id))
    .map((question) => ({
      ...question,
      arcStage: question.arcStage ?? arcStageForModule(question.moduleId),
      scoringMode: question.scoringMode ?? "full"
    }));

  const behavioralCore = tagged.filter(
    (question) => question.moduleId !== "motivation" && question.moduleId !== "case"
  );
  const situational = tagged.filter((question) => question.moduleId === "case");

  const behavioralExtras = canonical("behavioral_core").filter((question) => {
    if (question.id === "canonical_failure_sales") {
      // Mandatory failure/rejection item for sales-family interviews.
      return input.roleFamily === "sales";
    }
    if (question.id === "canonical_behavioral_experienced") {
      return mix.extraBehavioral;
    }
    return false;
  });
  const situationalExtras = mix.extraSituational ? canonical("situational") : [];
  // Work-style SJT dilemmas (Phase 13): always included, descriptive only —
  // classified by the work-style evaluator, judged per-company at match time.
  const workStyle = workStyleEntries().map((entry) =>
    buildCanonicalQuestion(entry, language, input.roleFamily)
  );
  // Job-driver items (Phase 14): always included, descriptive and flag-only —
  // revealed preferences feed transparency insights, never a score.
  const jobDrivers = jobDriverEntries().map((entry) =>
    buildCanonicalQuestion(entry, language, input.roleFamily)
  );

  return [
    ...canonical("opening"),
    ...canonical("motivation"),
    ...jobDrivers,
    ...canonical("self_awareness"),
    ...behavioralCore,
    ...behavioralExtras,
    ...situational,
    ...situationalExtras,
    ...workStyle,
    ...canonical("closing")
  ];
}

export interface ArcOrderViolation {
  readonly questionId: string;
  readonly reason: string;
}

/** Verify a question plan follows the arc order (non-decreasing stages). */
export function validateArcOrder(questions: readonly InterviewQuestion[]): ArcOrderViolation[] {
  const violations: ArcOrderViolation[] = [];
  let highestRank = -1;

  for (const question of questions) {
    const stage = question.arcStage;
    if (!stage) {
      violations.push({ questionId: question.id, reason: "question is missing an arcStage" });
      continue;
    }
    const rank = arcStageRank(stage);
    if (rank < highestRank) {
      violations.push({
        questionId: question.id,
        reason: `stage ${stage} appears after a later arc stage`
      });
      continue;
    }
    highestRank = Math.max(highestRank, rank);
  }

  const stages = new Set(questions.map((question) => question.arcStage));
  for (const required of ["opening", "motivation", "self_awareness", "closing"] as const) {
    if (!stages.has(required)) {
      violations.push({ questionId: "(plan)", reason: `arc stage ${required} is missing` });
    }
  }
  const first = questions[0];
  if (first && first.arcStage !== "opening") {
    violations.push({ questionId: first.id, reason: "the interview must start with the opening" });
  }
  const last = questions[questions.length - 1];
  if (last && last.arcStage !== "closing") {
    violations.push({ questionId: last.id, reason: "the interview must end with the closing" });
  }
  if (first && first.scoringMode !== "baseline_only") {
    violations.push({
      questionId: first.id,
      reason: "the opening must be baseline_only (it never moves a competency score)"
    });
  }

  return violations;
}
