import type { ModuleId, StarEvidenceElement } from "../../interview-flow/types";

/**
 * BARS (Behaviorally Anchored Rating Scales) domain model.
 *
 * This is the scientific backbone of the interview: every competency the system
 * scores must be defined here with explicit behavioral anchors, so that a verbal
 * answer is translated into a numeric score against pre-defined observable behavior
 * — never against an impression or "vibe".
 *
 * The four BARS bands follow the AssumerAI psychometric specification:
 *   below_standard   -> 1-3
 *   meets_standard   -> 4-6
 *   exceeds_standard -> 7-9
 *   exceptional      -> 10
 */

export type BarsLevel =
  | "below_standard"
  | "meets_standard"
  | "exceeds_standard"
  | "exceptional";

export type CompetencyTier = 1 | 2 | 3;

export type RedFlagSeverity = "low" | "medium" | "high";

export const BARS_SCORE_RANGES: Record<BarsLevel, readonly [number, number]> = {
  below_standard: [1, 3],
  meets_standard: [4, 6],
  exceeds_standard: [7, 9],
  exceptional: [10, 10],
};

export const STAR_ELEMENTS: readonly StarEvidenceElement[] = [
  "situation",
  "task",
  "action",
  "result",
];

export type FunnelPhase = "rapport" | "exploration" | "challenge" | "closing";

export interface BarsAnchor {
  readonly level: BarsLevel;
  readonly scoreRange: readonly [number, number];
  readonly descriptors: readonly string[];
}

export interface SbiQuestion {
  readonly id: string;
  readonly funnelPhase: FunnelPhase;
  readonly text: string;
  readonly targetStarElements: readonly StarEvidenceElement[];
  /** Targeted follow-up prompts keyed by the missing STAR element or signal. */
  readonly followUps?: Readonly<Record<string, string>>;
}

export interface RedFlagDefinition {
  readonly pattern: string;
  readonly severity: RedFlagSeverity;
}

export interface BarsCompetency {
  readonly id: string;
  readonly name: string;
  readonly tier: CompetencyTier;
  readonly description: string;
  readonly sbiQuestions: readonly SbiQuestion[];
  readonly bars: readonly BarsAnchor[];
  readonly redFlags: readonly RedFlagDefinition[];
  /** Interview module this competency is delivered within. */
  readonly moduleId?: ModuleId;
}

/** Per-STAR-element completeness map for a single answer. */
export type StarCompleteness = Record<StarEvidenceElement, boolean>;

export interface DetectedRedFlag {
  readonly pattern: string;
  readonly severity: RedFlagSeverity;
  readonly evidence_snippet: string;
}

export type EvaluatorFollowUpAction =
  | "next_question"
  | "ask_followup"
  | "redirect";

export interface EvaluatorFollowUpRecommendation {
  readonly action: EvaluatorFollowUpAction;
  readonly suggested_followup?: string;
  readonly missing_star_elements: readonly StarEvidenceElement[];
}

/**
 * Output of a single response evaluation. This is the auditable unit that links
 * an observed behavior to a numeric score against a behavioral anchor.
 */
export interface BarsEvaluation {
  readonly competency_id: string;
  readonly question_id: string;
  readonly star_completeness: StarCompleteness;
  readonly bars_score: number; // 1-10
  readonly bars_level: BarsLevel;
  readonly evidence_snippets: readonly string[];
  readonly red_flags: readonly DetectedRedFlag[];
  readonly followup_recommendation: EvaluatorFollowUpRecommendation;
  readonly confidence: number; // 0-1
  readonly source: "anthropic" | "deterministic_fallback";
  readonly provider_model?: string;
  readonly fallback_reason?: string;
  /** True when low confidence or high-severity flags require a human reviewer. */
  readonly human_review_required: boolean;
}

export function emptyStarCompleteness(): StarCompleteness {
  return { situation: false, task: false, action: false, result: false };
}

export function barsLevelForScore(score: number): BarsLevel {
  const clamped = Math.max(1, Math.min(10, Math.round(score)));
  if (clamped <= 3) return "below_standard";
  if (clamped <= 6) return "meets_standard";
  if (clamped <= 9) return "exceeds_standard";
  return "exceptional";
}

export function scoreWithinLevel(score: number, level: BarsLevel): boolean {
  const [min, max] = BARS_SCORE_RANGES[level];
  return score >= min && score <= max;
}

export function countCompleteStarElements(completeness: StarCompleteness): number {
  return STAR_ELEMENTS.reduce(
    (total, element) => total + (completeness[element] ? 1 : 0),
    0,
  );
}
