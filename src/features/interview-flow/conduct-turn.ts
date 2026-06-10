import {
  generateInterviewerTurn,
  type ConversationTurn,
  type InterviewerAgentOptions,
  type InterviewerPersona,
  type InterviewerTurnSource,
} from "./interviewer-agent";
import { advanceModule } from "./session-state";
import type { FunnelDecision, FunnelDecisionKind } from "./funnel-state-machine";
import {
  evaluateResponseEnsemble,
  type EnsembleBarsEvaluation,
  type EnsembleEvaluatorOptions,
} from "../scoring/bars/ensemble-evaluator";
import type { BarsCompetency, BarsEvaluation, BarsLevel } from "../scoring/bars/types";
import type {
  InterviewArcStage,
  InterviewSession,
  StarEvidenceElement,
  TurnScoringMode,
} from "./types";

/**
 * Conduct one interview turn end-to-end. This is the seam that wires the three
 * psychometric functions together while keeping each one ignorant of the others:
 *
 *   1. The funnel state machine decides what happens next (deterministic).
 *   2. The interviewer agent says the next single line (warm, high temperature).
 *   3. The BARS evaluator scores the candidate's answer (consistent, low temp).
 *
 * It never blocks: every Anthropic call has a deterministic fallback, and every
 * generated line is safety-filtered inside the interviewer agent.
 */

const EVALUATOR_SCORING_VERSION = "bars-evaluator-v0";

const DEFAULT_STAR_TARGET: readonly StarEvidenceElement[] = [
  "situation",
  "task",
  "action",
  "result",
];

export interface ConductTurnCandidateAnswer {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface ConductTurnInput {
  session: InterviewSession;
  moduleId: string;
  /** The competency this turn assesses (shared by evaluator and interviewer). */
  competency: BarsCompetency;
  /** Present when the candidate has just answered; absent to open the module. */
  candidateAnswer?: ConductTurnCandidateAnswer;
  /** Text of the next planned primary question (from the planner). */
  plannedQuestionText?: string;
  /** STAR elements the current question targets. */
  currentQuestionStarTarget?: readonly StarEvidenceElement[];
  /** A short CV anchor for the rapport phase. */
  cvHook?: string;
  transcript?: ConversationTurn[];
  hasMorePrimaryQuestions?: boolean;
  hasMoreCompetencies?: boolean;
  elapsedSecondsForTurn?: number;
  /** Realistic-arc stage of the answered question (Phase 11). */
  arcStage?: InterviewArcStage;
  /** How this turn's evaluation enters competency scores (default full). */
  scoringMode?: TurnScoringMode;
  persona?: InterviewerPersona;
  now?: string;
  evaluatorOptions?: EnsembleEvaluatorOptions;
  interviewerOptions?: InterviewerAgentOptions;
}

/**
 * Audit record for one BARS evaluator call. Snake-cased to drop straight into
 * the `interview_evaluator_runs` table from migration 20260603090000.
 */
export interface InterviewEvaluatorRunRecord {
  interview_session_id: string;
  candidate_id: string;
  question_id: string;
  competency_id: string;
  module_id: string;
  bars_score: number;
  bars_level: BarsLevel;
  star_situation: boolean;
  star_task: boolean;
  star_action: boolean;
  star_result: boolean;
  confidence: number;
  human_review_required: boolean;
  source: "anthropic" | "deterministic_fallback";
  provider_model: string | null;
  fallback_reason: string | null;
  scoring_version: string;
  replicate_group_id: string | null;
  red_flag_count: number;
  high_severity_red_flag_count: number;
  /** Realistic-arc stage of the answered question (Phase 11). */
  arc_stage: InterviewArcStage | null;
  /** baseline_only runs NEVER enter competency scores; low_weight is reduced. */
  scoring_mode: TurnScoringMode;
}

export interface ConductTurnResult {
  session: InterviewSession;
  interviewerText: string;
  interviewerSource: InterviewerTurnSource;
  evaluation?: EnsembleBarsEvaluation;
  /** Aggregate ensemble run record. */
  evaluatorRun?: InterviewEvaluatorRunRecord;
  /** Every individual rater run, sharing the ensemble replicate_group_id. */
  evaluatorRuns?: InterviewEvaluatorRunRecord[];
  decision: FunnelDecision;
  nextAction: FunnelDecisionKind;
}

export async function conductTurn(input: ConductTurnInput): Promise<ConductTurnResult> {
  const starTarget = input.currentQuestionStarTarget ?? DEFAULT_STAR_TARGET;

  let evaluation: EnsembleBarsEvaluation | undefined;
  let evaluatorRun: InterviewEvaluatorRunRecord | undefined;
  let evaluatorRuns: InterviewEvaluatorRunRecord[] | undefined;

  // 1 + 3. If the candidate answered, score it (ensemble: N raters) before
  // deciding what comes next, so the funnel sees the observed STAR evidence.
  if (input.candidateAnswer) {
    evaluation = await evaluateResponseEnsemble(
      {
        competency: input.competency,
        questionId: input.candidateAnswer.questionId,
        questionText: input.candidateAnswer.questionText,
        targetStarElements: starTarget,
        answerText: input.candidateAnswer.answerText,
      },
      input.evaluatorOptions,
    );
    const replicateGroupId = evaluation.replicate_group_id;
    evaluatorRun = buildEvaluatorRunRecord(input, evaluation, replicateGroupId);
    // Persist every individual rater run for audit, sharing the replicate group.
    evaluatorRuns = evaluation.individual_runs.map((run) =>
      buildEvaluatorRunRecord(input, run, replicateGroupId),
    );
  }

  // 2. Advance the deterministic funnel (records STAR evidence + applies the
  // decision to the module's funnel state).
  const advanced = advanceModule(input.session, input.moduleId, {
    observedStar: evaluation?.star_completeness,
    currentQuestionStarTarget: starTarget,
    hasMorePrimaryQuestions: input.hasMorePrimaryQuestions,
    hasMoreCompetencies: input.hasMoreCompetencies,
    elapsedSecondsForTurn: input.elapsedSecondsForTurn,
  });
  const session = advanced.session;
  const decision = advanced.decision;

  // 4. Produce the single interviewer line for that decision (safety-filtered,
  // deterministic fallback inside the agent).
  const interviewerTurn = await generateInterviewerTurn({
    decision,
    state: session.module_sessions[input.moduleId].funnelState,
    competency: input.competency,
    plannedQuestionText: input.plannedQuestionText,
    missingStarSummary: decision.missingStarElements,
    cvHook: input.cvHook,
    transcript: input.transcript,
    interviewLanguage: session.interviewLanguage,
    persona: input.persona,
    options: input.interviewerOptions,
  });

  return {
    session,
    interviewerText: interviewerTurn.text,
    interviewerSource: interviewerTurn.source,
    evaluation,
    evaluatorRun,
    evaluatorRuns,
    decision,
    nextAction: decision.kind,
  };
}

function buildEvaluatorRunRecord(
  input: ConductTurnInput,
  evaluation: BarsEvaluation,
  replicateGroupId: string | null = null,
): InterviewEvaluatorRunRecord {
  const session = input.session;
  const highSeverity = evaluation.red_flags.filter((flag) => flag.severity === "high").length;

  return {
    interview_session_id: session.sessionId,
    candidate_id: session.candidateId,
    question_id: evaluation.question_id,
    competency_id: evaluation.competency_id,
    module_id: input.moduleId,
    bars_score: evaluation.bars_score,
    bars_level: evaluation.bars_level,
    star_situation: evaluation.star_completeness.situation,
    star_task: evaluation.star_completeness.task,
    star_action: evaluation.star_completeness.action,
    star_result: evaluation.star_completeness.result,
    confidence: evaluation.confidence,
    human_review_required: evaluation.human_review_required,
    source: evaluation.source,
    provider_model: evaluation.provider_model ?? null,
    fallback_reason: evaluation.fallback_reason ?? null,
    scoring_version: EVALUATOR_SCORING_VERSION,
    replicate_group_id: replicateGroupId,
    red_flag_count: evaluation.red_flags.length,
    high_severity_red_flag_count: highSeverity,
    arc_stage: input.arcStage ?? null,
    scoring_mode: input.scoringMode ?? "full",
  };
}
