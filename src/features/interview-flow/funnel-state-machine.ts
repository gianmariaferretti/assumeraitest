import type { StarEvidenceElement } from "./types";
import type { FunnelPhase, StarCompleteness } from "../scoring/bars/types";
import { STAR_ELEMENTS } from "../scoring/bars/types";

/**
 * Funnel state machine.
 *
 * The interviewer agent must NOT decide on its own where it is in the
 * conversation. Structure is enforced here, deterministically, so the LLM
 * stays warm and human while the protocol stays rigid and auditable. This is
 * what gives the interview "structure without the candidate feeling it".
 *
 * Funnel sequence per the AssumerAI psychometric specification:
 *   1. rapport     - opening, build rapport, anchor on the CV
 *   2. exploration - targeted behavioral questions (one competency at a time)
 *   3. challenge   - harder probes (never before exploration evidence exists)
 *   4. closing     - candidate motivation and candidate's own questions
 */

export const FUNNEL_SEQUENCE: readonly FunnelPhase[] = [
  "rapport",
  "exploration",
  "challenge",
  "closing",
];

export interface FunnelPhaseBudget {
  /** Minimum seconds to spend before the phase may advance. */
  readonly minSeconds: number;
  /** Hard ceiling; the phase auto-advances when exceeded. */
  readonly maxSeconds: number;
  /** Minimum primary questions to ask in this phase before advancing. */
  readonly minQuestions: number;
}

export const DEFAULT_PHASE_BUDGETS: Record<FunnelPhase, FunnelPhaseBudget> = {
  rapport: { minSeconds: 45, maxSeconds: 120, minQuestions: 1 },
  exploration: { minSeconds: 180, maxSeconds: 420, minQuestions: 2 },
  challenge: { minSeconds: 90, maxSeconds: 300, minQuestions: 1 },
  closing: { minSeconds: 30, maxSeconds: 120, minQuestions: 1 },
};

export interface FollowUpLimits {
  readonly maxFollowUpsPerQuestion: number;
  readonly maxFollowUpsPerCompetency: number;
}

export const DEFAULT_FOLLOW_UP_LIMITS: FollowUpLimits = {
  maxFollowUpsPerQuestion: 2,
  maxFollowUpsPerCompetency: 4,
};

export interface CompetencyProgress {
  readonly competencyId: string;
  /** Primary (non-follow-up) questions already asked for this competency. */
  primaryQuestionsAsked: number;
  /** Follow-ups asked for the current primary question. */
  followUpsForCurrentQuestion: number;
  /** Total follow-ups across the competency. */
  followUpsForCompetency: number;
  /** STAR evidence accumulated for the current primary question. */
  star: StarCompleteness;
}

export interface FunnelState {
  phase: FunnelPhase;
  phaseElapsedSeconds: number;
  phaseQuestionsAsked: number;
  competency: CompetencyProgress;
}

export type FunnelDecisionKind =
  | "ask_primary_question"
  | "ask_follow_up"
  | "advance_phase"
  | "next_competency"
  | "complete_interview";

export interface FunnelDecision {
  readonly kind: FunnelDecisionKind;
  readonly phase: FunnelPhase;
  readonly reason: string;
  /** When ask_follow_up: which STAR elements still need probing. */
  readonly missingStarElements?: readonly StarEvidenceElement[];
}

export function createFunnelState(competencyId: string): FunnelState {
  return {
    phase: "rapport",
    phaseElapsedSeconds: 0,
    phaseQuestionsAsked: 0,
    competency: {
      competencyId,
      primaryQuestionsAsked: 0,
      followUpsForCurrentQuestion: 0,
      followUpsForCompetency: 0,
      star: { situation: false, task: false, action: false, result: false },
    },
  };
}

export function missingStarElements(
  star: StarCompleteness,
  target: readonly StarEvidenceElement[] = STAR_ELEMENTS,
): StarEvidenceElement[] {
  return target.filter((element) => !star[element]);
}

function phaseIndex(phase: FunnelPhase): number {
  return FUNNEL_SEQUENCE.indexOf(phase);
}

function isLastPhase(phase: FunnelPhase): boolean {
  return phaseIndex(phase) === FUNNEL_SEQUENCE.length - 1;
}

export function nextPhase(phase: FunnelPhase): FunnelPhase | null {
  const index = phaseIndex(phase);
  if (index === -1 || index === FUNNEL_SEQUENCE.length - 1) {
    return null;
  }
  return FUNNEL_SEQUENCE[index + 1];
}

export interface FunnelDecisionInput {
  readonly state: FunnelState;
  /** STAR target for the current primary question. */
  readonly currentQuestionStarTarget: readonly StarEvidenceElement[];
  /** Whether more primary questions remain for the current competency. */
  readonly hasMorePrimaryQuestions: boolean;
  /** Whether more competencies remain in the interview plan. */
  readonly hasMoreCompetencies: boolean;
  readonly budgets?: Record<FunnelPhase, FunnelPhaseBudget>;
  readonly followUpLimits?: FollowUpLimits;
}

/**
 * The single source of truth for "what does the interviewer do next?".
 * Pure and deterministic — fully unit-testable, no LLM involved.
 */
export function decideNext(input: FunnelDecisionInput): FunnelDecision {
  const budgets = input.budgets ?? DEFAULT_PHASE_BUDGETS;
  const limits = input.followUpLimits ?? DEFAULT_FOLLOW_UP_LIMITS;
  const { state } = input;
  const budget = budgets[state.phase];
  const { competency } = state;

  // 1. If the current primary question still lacks STAR evidence and we have
  //    follow-up budget, probe the missing elements before moving on.
  const missing = missingStarElements(competency.star, input.currentQuestionStarTarget);
  const canFollowUp =
    competency.followUpsForCurrentQuestion < limits.maxFollowUpsPerQuestion &&
    competency.followUpsForCompetency < limits.maxFollowUpsPerCompetency;

  if (
    state.phase !== "rapport" &&
    state.phase !== "closing" &&
    competency.primaryQuestionsAsked > 0 &&
    missing.length > 0 &&
    canFollowUp
  ) {
    return {
      kind: "ask_follow_up",
      phase: state.phase,
      reason: `STAR incomplete: missing ${missing.join(", ")}`,
      missingStarElements: missing,
    };
  }

  // 2. Decide whether the current phase has satisfied its budget.
  const phaseSatisfied =
    state.phaseQuestionsAsked >= budget.minQuestions &&
    state.phaseElapsedSeconds >= budget.minSeconds;
  const phaseExhausted = state.phaseElapsedSeconds >= budget.maxSeconds;

  // 3. If the phase is not satisfied, keep asking primary questions in it.
  if (!phaseSatisfied && !phaseExhausted) {
    if (state.phase === "exploration" || state.phase === "challenge") {
      if (input.hasMorePrimaryQuestions) {
        return {
          kind: "ask_primary_question",
          phase: state.phase,
          reason: "phase budget not yet satisfied; continue probing competency",
        };
      }
    } else {
      // rapport / closing have their own single prompt
      return {
        kind: "ask_primary_question",
        phase: state.phase,
        reason: `${state.phase} phase prompt`,
      };
    }
  }

  // 4. Phase satisfied or exhausted -> advance, or finish the competency.
  if (!isLastPhase(state.phase)) {
    return {
      kind: "advance_phase",
      phase: nextPhase(state.phase) as FunnelPhase,
      reason: phaseExhausted ? "phase time ceiling reached" : "phase budget satisfied",
    };
  }

  // 5. Closing phase satisfied -> next competency or end the interview.
  if (input.hasMoreCompetencies) {
    return {
      kind: "next_competency",
      phase: "rapport",
      reason: "competency complete; moving to next competency",
    };
  }

  return {
    kind: "complete_interview",
    phase: "closing",
    reason: "all competencies and phases complete",
  };
}

/** Apply a decision to the state, returning a new immutable-ish snapshot. */
export function applyDecision(
  state: FunnelState,
  decision: FunnelDecision,
  elapsedSecondsForTurn: number,
): FunnelState {
  const next: FunnelState = {
    phase: state.phase,
    phaseElapsedSeconds: state.phaseElapsedSeconds + Math.max(0, elapsedSecondsForTurn),
    phaseQuestionsAsked: state.phaseQuestionsAsked,
    competency: { ...state.competency, star: { ...state.competency.star } },
  };

  switch (decision.kind) {
    case "ask_primary_question":
      next.phaseQuestionsAsked += 1;
      next.competency.primaryQuestionsAsked += 1;
      next.competency.followUpsForCurrentQuestion = 0;
      next.competency.star = {
        situation: false,
        task: false,
        action: false,
        result: false,
      };
      return next;

    case "ask_follow_up":
      next.competency.followUpsForCurrentQuestion += 1;
      next.competency.followUpsForCompetency += 1;
      return next;

    case "advance_phase":
      next.phase = decision.phase;
      next.phaseElapsedSeconds = 0;
      next.phaseQuestionsAsked = 0;
      return next;

    case "next_competency":
      // The caller supplies the next competency id via resetCompetency().
      next.phase = "rapport";
      next.phaseElapsedSeconds = 0;
      next.phaseQuestionsAsked = 0;
      return next;

    case "complete_interview":
      return next;

    default:
      return next;
  }
}

export function resetCompetency(state: FunnelState, competencyId: string): FunnelState {
  return {
    ...state,
    phase: "rapport",
    phaseElapsedSeconds: 0,
    phaseQuestionsAsked: 0,
    competency: {
      competencyId,
      primaryQuestionsAsked: 0,
      followUpsForCurrentQuestion: 0,
      followUpsForCompetency: 0,
      star: { situation: false, task: false, action: false, result: false },
    },
  };
}

/** Merge newly observed STAR evidence into the current competency progress. */
export function recordStarEvidence(
  state: FunnelState,
  observed: Partial<StarCompleteness>,
): FunnelState {
  return {
    ...state,
    competency: {
      ...state.competency,
      star: {
        situation: state.competency.star.situation || Boolean(observed.situation),
        task: state.competency.star.task || Boolean(observed.task),
        action: state.competency.star.action || Boolean(observed.action),
        result: state.competency.star.result || Boolean(observed.result),
      },
    },
  };
}
