import { assertQuestionBankAllowed } from "./safety";
import {
  localizeFollowUpPrompt,
  localizeInterviewQuestions,
  resolveCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "./interview-language";
import { createModulePlan, DEFAULT_MODULE_ORDER, selectQuestionBankForRole } from "./question-bank";
import { createResumeAwareQuestionPlan } from "./resume-question-planner";
import {
  applyDecision,
  createFunnelState,
  decideNext,
  recordStarEvidence,
  type FunnelDecision
} from "./funnel-state-machine";
import type { StarCompleteness } from "../scoring/bars/types";
import type {
  CreateInterviewSessionInput,
  FollowUpCaps,
  FollowUpCounts,
  FollowUpReason,
  GlobalInterviewStatus,
  InterviewQuestion,
  InterviewResponse,
  InterviewSession,
  ModuleSession,
  RecordInterviewResponseInput,
  ResponseAnalysisFlags,
  StarEvidenceElement
} from "./types";

const DEFAULT_FOLLOW_UP_CAPS: FollowUpCaps = {
  maxTotalFollowUps: 4,
  maxFollowUpsPerQuestion: 1,
  maxFollowUpsPerModule: 2
};
const MAX_QUESTION_RESPONSE_TARGET_SECONDS = 120;
const COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON = "complete_star_element";

type SessionFollowUpReason = FollowUpReason | typeof COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON;

const STAR_ELEMENT_PROMPTS: Record<
  CandidateInterviewLanguageCode,
  Record<StarEvidenceElement, string>
> = {
  en: {
    situation: "What was the situation or context behind that answer?",
    task: "What goal, responsibility, or problem were you accountable for?",
    action: "What did you personally do, decide, or build in that situation?",
    result: "What changed as a result, and what evidence or outcome should a reviewer rely on?"
  },
  it: {
    situation: "Qual era la situazione o il contesto dietro quella risposta?",
    task: "Quale obiettivo, responsabilita o problema era tuo?",
    action: "Che cosa hai fatto, deciso o costruito personalmente in quella situazione?",
    result: "Che cosa e' cambiato di conseguenza, e quale evidenza o risultato dovrebbe usare un reviewer?"
  },
  fr: {
    situation: "Quelle etait la situation ou le contexte derriere cette reponse?",
    task: "Quel objectif, responsabilite ou probleme etait sous votre responsabilite?",
    action: "Qu'avez-vous personnellement fait, decide ou construit dans cette situation?",
    result: "Qu'est-ce qui a change ensuite, et quelle preuve ou quel resultat un reviewer devrait-il utiliser?"
  }
};

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function createSessionId(): string {
  return `interview_session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mergeCaps(caps?: Partial<FollowUpCaps>): FollowUpCaps {
  return { ...DEFAULT_FOLLOW_UP_CAPS, ...caps };
}

function createFollowUpCounts(): FollowUpCounts {
  return {
    total: 0,
    byQuestion: {},
    byModule: {
      motivation: 0,
      language: 0,
      domain: 0,
      work_sample: 0,
      case: 0
    }
  };
}

function copyFollowUpCounts(counts: FollowUpCounts): FollowUpCounts {
  return {
    total: counts.total,
    byQuestion: { ...counts.byQuestion },
    byModule: { ...counts.byModule }
  };
}

function unansweredQuestion(questions: InterviewQuestion[], responses: InterviewResponse[]): InterviewQuestion | undefined {
  const answeredIds = new Set(responses.map((response) => response.questionId));
  return questions.find((question) => !answeredIds.has(question.id));
}

function moduleIndexFor(question: InterviewQuestion | undefined): number {
  if (!question) {
    return DEFAULT_MODULE_ORDER.length - 1;
  }

  return Math.max(0, DEFAULT_MODULE_ORDER.indexOf(question.moduleId));
}

function missingStarElementFor(flags: ResponseAnalysisFlags = {}): StarEvidenceElement | undefined {
  return flags.missingStarElements?.find((element) =>
    Object.prototype.hasOwnProperty.call(STAR_ELEMENT_PROMPTS.en, element)
  );
}

function persistedFollowUpReason(reason: SessionFollowUpReason): FollowUpReason {
  return reason === COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON ? "clarify_evidence" : reason;
}

function determineFollowUpReason(flags: ResponseAnalysisFlags = {}): SessionFollowUpReason | undefined {
  if (flags.contradiction) {
    return "resolve_contradiction";
  }
  if (flags.roleRequirementMissing) {
    return "validate_role_requirement";
  }
  if (missingStarElementFor(flags)) {
    return COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON;
  }
  if (flags.unsupportedClaim || flags.ambiguous) {
    return "clarify_evidence";
  }
  if (flags.lowConfidence) {
    return "increase_confidence";
  }

  return undefined;
}

function canAskFollowUp(
  session: InterviewSession,
  question: InterviewQuestion,
  counts: FollowUpCounts
): boolean {
  if (question.followUpReason) {
    return false;
  }
  if (counts.total >= session.caps.maxTotalFollowUps) {
    return false;
  }
  if ((counts.byQuestion[question.id] ?? 0) >= session.caps.maxFollowUpsPerQuestion) {
    return false;
  }
  if ((counts.byModule[question.moduleId] ?? 0) >= session.caps.maxFollowUpsPerModule) {
    return false;
  }

  return true;
}

function followUpPrompt(
  parentQuestion: InterviewQuestion,
  reason: SessionFollowUpReason,
  interviewLanguage: CandidateInterviewLanguageCode,
  missingStarElement?: StarEvidenceElement
): string {
  const roleRequirementTarget = parentQuestion.evidenceRequirements.find((requirement) =>
    requirement.startsWith("role requirement:")
  );
  const resumeEvidenceTarget = parentQuestion.evidenceRequirements.find((requirement) =>
    requirement.startsWith("resume ")
  );
  const evidenceTarget =
    reason === "validate_role_requirement"
      ? roleRequirementTarget ?? parentQuestion.evidenceRequirements[0] ?? "role-relevant evidence"
      : resumeEvidenceTarget ?? parentQuestion.evidenceRequirements[0] ?? "role-relevant evidence";
  if (reason !== COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON) {
    const localized = localizeFollowUpPrompt(
      parentQuestion,
      reason,
      evidenceTarget,
      interviewLanguage
    );

    if (localized) {
      return localized;
    }
  }

  switch (reason) {
    case COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON:
      return starFollowUpPrompt(missingStarElement ?? "action", evidenceTarget, interviewLanguage);
    case "clarify_evidence":
      return `Add one concrete example or artifact that supports your previous answer about ${evidenceTarget}.`;
    case "validate_role_requirement":
      return `Connect your previous answer to the role requirement for ${evidenceTarget}.`;
    case "resolve_contradiction":
      return "Clarify the sequence of events so a reviewer can understand the apparent conflict in your answers.";
    case "increase_confidence":
      return "Give a short step-by-step version of your answer with the evidence a reviewer should rely on.";
  }
}

function starFollowUpPrompt(
  missingStarElement: StarEvidenceElement,
  evidenceTarget: string,
  interviewLanguage: CandidateInterviewLanguageCode
): string {
  const prompt = STAR_ELEMENT_PROMPTS[interviewLanguage][missingStarElement];

  if (interviewLanguage === "it") {
    return `${prompt} Tienilo collegato alla tua risposta precedente su ${evidenceTarget}.`;
  }

  if (interviewLanguage === "fr") {
    return `${prompt} Gardez-le relie a votre reponse precedente sur ${evidenceTarget}.`;
  }

  return `${prompt} Keep it tied to your previous answer about ${evidenceTarget}.`;
}

function capQuestionResponseTarget(question: InterviewQuestion): InterviewQuestion {
  return {
    ...question,
    timeTargetSeconds: Math.min(question.timeTargetSeconds, MAX_QUESTION_RESPONSE_TARGET_SECONDS)
  };
}

function createFollowUpQuestion(
  parentQuestion: InterviewQuestion,
  reason: SessionFollowUpReason,
  followUpNumber: number,
  interviewLanguage: CandidateInterviewLanguageCode,
  missingStarElement?: StarEvidenceElement
): InterviewQuestion {
  return {
    ...parentQuestion,
    id: `${parentQuestion.id}-followup-${reason}-${followUpNumber}`,
    prompt: followUpPrompt(parentQuestion, reason, interviewLanguage, missingStarElement),
    difficulty: "baseline",
    timeTargetSeconds: Math.min(parentQuestion.timeTargetSeconds, MAX_QUESTION_RESPONSE_TARGET_SECONDS),
    followUpReason: persistedFollowUpReason(reason),
    followUpOfQuestionId: parentQuestion.id
  };
}

export function createInterviewSession(input: CreateInterviewSessionInput): InterviewSession {
  const timestamp = nowIso(input.now);
  const interviewLanguage = resolveCandidateInterviewLanguageCode(input.interviewLanguage);
  const baseQuestionBank =
    input.questionBank ?? selectQuestionBankForRole(input.roleProfile, undefined, interviewLanguage);
  assertQuestionBankAllowed(baseQuestionBank);
  const plannedQuestionBank = input.candidateProfile
    ? createResumeAwareQuestionPlan(
        baseQuestionBank,
        input.roleProfile,
        input.candidateProfile,
        interviewLanguage
      )
    : baseQuestionBank;
  const questionBank = (input.candidateProfile
    ? plannedQuestionBank
    : localizeInterviewQuestions(plannedQuestionBank, interviewLanguage)
  ).map(capQuestionResponseTarget);
  assertQuestionBankAllowed(questionBank);

  if (questionBank.length === 0) {
    throw new Error("Interview question bank must contain at least one allowed question.");
  }

  const modulePlan = createModulePlan(input.roleProfile, interviewLanguage);
  const moduleSessions = buildModuleSessions(questionBank, input.requiredModuleIds);

  return {
    sessionId: input.sessionId ?? createSessionId(),
    candidateId: input.candidateId,
    roleId: input.roleProfile.role_id,
    roleTitle: input.roleProfile.title ?? "Target role",
    interviewLanguage,
    status: "in_progress",
    mode: "text",
    version: "interview-session-v0",
    modulePlan,
    questions: questionBank,
    responses: [],
    currentQuestionId: questionBank[0]?.id ?? "",
    currentModuleIndex: moduleIndexFor(questionBank[0]),
    followUpCounts: createFollowUpCounts(),
    caps: mergeCaps(input.caps),
    module_sessions: moduleSessions,
    global_status: computeGlobalStatus(moduleSessions),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

/**
 * Group a flat question bank into independent per-module sub-sessions. Each
 * module gets its own funnel state, follow-up budget, and question list so it
 * can run and resume on its own (the async "Session Store").
 */
function buildModuleSessions(
  questions: InterviewQuestion[],
  requiredModuleIds?: string[]
): Record<string, ModuleSession> {
  const requiredSet = requiredModuleIds ? new Set(requiredModuleIds) : undefined;
  const moduleSessions: Record<string, ModuleSession> = {};
  const order: string[] = [];

  for (const question of questions) {
    if (!moduleSessions[question.moduleId]) {
      order.push(question.moduleId);
      moduleSessions[question.moduleId] = {
        moduleId: question.moduleId,
        state: "not_started",
        requiredForMatch: requiredSet ? requiredSet.has(question.moduleId) : true,
        questions: [],
        responses: [],
        currentQuestionId: "",
        followUpCounts: createFollowUpCounts(),
        funnelState: createFunnelState(question.moduleId)
      };
    }
    moduleSessions[question.moduleId].questions.push(question);
  }

  for (const moduleId of order) {
    moduleSessions[moduleId].currentQuestionId = moduleSessions[moduleId].questions[0]?.id ?? "";
  }

  return moduleSessions;
}

/**
 * Global status is "all_required_completed" only once every module flagged
 * `requiredForMatch` has reached the "completed" state. This is the gate the
 * matching engine reads before a candidate can be matched (Phase 5).
 */
export function computeGlobalStatus(
  moduleSessions: Record<string, ModuleSession>
): GlobalInterviewStatus {
  const required = Object.values(moduleSessions).filter((module) => module.requiredForMatch);
  const allRequiredComplete =
    required.length > 0 && required.every((module) => module.state === "completed");

  return allRequiredComplete ? "all_required_completed" : "in_progress";
}

/**
 * Record a candidate answer against a single module's sub-session. Other module
 * sub-sessions are left untouched; legacy top-level fields are mirrored from the
 * module that was just advanced (the active module).
 */
export function recordResponseForModule(
  session: InterviewSession,
  moduleId: string,
  input: RecordInterviewResponseInput
): InterviewSession {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    throw new Error(`Interview module session ${moduleId} was not found.`);
  }
  if (moduleSession.state === "completed") {
    throw new Error(`Cannot save an answer after module ${moduleId} is completed.`);
  }

  const answerText = input.answerText.trim();
  if (!answerText) {
    throw new Error("Interview answer text is required.");
  }

  const question = moduleSession.questions.find((item) => item.id === input.questionId);
  if (!question) {
    throw new Error(`Interview question ${input.questionId} was not found in module ${moduleId}.`);
  }
  if (moduleSession.responses.some((response) => response.questionId === question.id)) {
    throw new Error(`Interview question ${input.questionId} already has a saved response.`);
  }

  const answeredAt = nowIso(input.answeredAt);
  const responses: InterviewResponse[] = [
    ...moduleSession.responses,
    {
      id: `${session.sessionId}-${moduleId}-response-${moduleSession.responses.length + 1}`,
      questionId: question.id,
      moduleId: question.moduleId,
      answerText,
      answeredAt,
      followUpReason: question.followUpReason
    }
  ];
  const answeredIds = new Set(responses.map((response) => response.questionId));
  const nextQuestion = moduleSession.questions.find((item) => !answeredIds.has(item.id));
  const completed = !nextQuestion;

  const updatedModuleSession: ModuleSession = {
    ...moduleSession,
    state: completed ? "completed" : "in_progress",
    responses,
    currentQuestionId: nextQuestion?.id ?? "",
    startedAt: moduleSession.startedAt ?? answeredAt,
    completedAt: completed ? answeredAt : moduleSession.completedAt
  };

  return mirrorActiveModule(
    session,
    { ...session.module_sessions, [moduleId]: updatedModuleSession },
    moduleId,
    answeredAt
  );
}

/**
 * Insert a targeted STAR follow-up question into a module sub-session, right
 * after the question it probes. Used by the server-authoritative turn flow when
 * the funnel decides `ask_follow_up`: the follow-up becomes the module's current
 * question so the next answer is recorded against it. Returns undefined when the
 * follow-up budget disallows another probe (caller proceeds to the next primary).
 */
export function appendFollowUpQuestionForModule(
  session: InterviewSession,
  moduleId: string,
  missingStarElements: readonly StarEvidenceElement[],
  now?: string
): InterviewSession | undefined {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    throw new Error(`Interview module session ${moduleId} was not found.`);
  }

  const lastResponse = moduleSession.responses[moduleSession.responses.length - 1];
  if (!lastResponse) {
    return undefined;
  }
  const parentIndex = moduleSession.questions.findIndex(
    (question) => question.id === lastResponse.questionId
  );
  const parentQuestion = moduleSession.questions[parentIndex];
  if (!parentQuestion || !canAskFollowUp(session, parentQuestion, moduleSession.followUpCounts)) {
    return undefined;
  }

  const missingStarElement = missingStarElements.find((element) =>
    Object.prototype.hasOwnProperty.call(STAR_ELEMENT_PROMPTS.en, element)
  );
  const followUpCounts = copyFollowUpCounts(moduleSession.followUpCounts);
  const followUpNumber = (followUpCounts.byQuestion[parentQuestion.id] ?? 0) + 1;
  const followUpQuestion = createFollowUpQuestion(
    parentQuestion,
    missingStarElement ? COMPLETE_STAR_ELEMENT_FOLLOW_UP_REASON : "clarify_evidence",
    followUpNumber,
    session.interviewLanguage,
    missingStarElement
  );

  followUpCounts.total += 1;
  followUpCounts.byQuestion[parentQuestion.id] = followUpNumber;
  followUpCounts.byModule[parentQuestion.moduleId] =
    (followUpCounts.byModule[parentQuestion.moduleId] ?? 0) + 1;

  const questions = [...moduleSession.questions];
  questions.splice(parentIndex + 1, 0, followUpQuestion);

  const updatedModuleSession: ModuleSession = {
    ...moduleSession,
    state: "in_progress",
    questions,
    currentQuestionId: followUpQuestion.id,
    followUpCounts,
    completedAt: undefined
  };

  return mirrorActiveModule(
    session,
    { ...session.module_sessions, [moduleId]: updatedModuleSession },
    moduleId,
    nowIso(now)
  );
}

export interface AdvanceModuleInput {
  /** Newly observed STAR evidence from the latest evaluation. */
  observedStar?: Partial<StarCompleteness>;
  /** STAR elements the current primary question targets. */
  currentQuestionStarTarget?: readonly StarEvidenceElement[];
  hasMorePrimaryQuestions?: boolean;
  hasMoreCompetencies?: boolean;
  elapsedSecondsForTurn?: number;
}

export interface AdvanceModuleResult {
  session: InterviewSession;
  decision: FunnelDecision;
}

/**
 * Advance a module's funnel state machine by one turn. Records any observed STAR
 * evidence, asks the deterministic state machine what to do next, applies it,
 * and returns the decision so the caller (conduct-turn) can act on it.
 */
export function advanceModule(
  session: InterviewSession,
  moduleId: string,
  input: AdvanceModuleInput = {}
): AdvanceModuleResult {
  const moduleSession = session.module_sessions[moduleId];
  if (!moduleSession) {
    throw new Error(`Interview module session ${moduleId} was not found.`);
  }

  let funnelState = moduleSession.funnelState;
  if (input.observedStar) {
    funnelState = recordStarEvidence(funnelState, input.observedStar);
  }

  const decision = decideNext({
    state: funnelState,
    currentQuestionStarTarget: input.currentQuestionStarTarget ?? STAR_TARGET_DEFAULT,
    hasMorePrimaryQuestions: input.hasMorePrimaryQuestions ?? false,
    hasMoreCompetencies: input.hasMoreCompetencies ?? false
  });
  funnelState = applyDecision(funnelState, decision, input.elapsedSecondsForTurn ?? 0);

  const updatedModuleSession: ModuleSession = { ...moduleSession, funnelState };

  return {
    session: mirrorActiveModule(
      session,
      { ...session.module_sessions, [moduleId]: updatedModuleSession },
      moduleId,
      nowIso()
    ),
    decision
  };
}

const STAR_TARGET_DEFAULT: readonly StarEvidenceElement[] = [
  "situation",
  "task",
  "action",
  "result"
];

/**
 * Recompute global status and mirror the just-updated module into the legacy
 * top-level fields so existing routes and clients keep working unchanged.
 */
function mirrorActiveModule(
  session: InterviewSession,
  moduleSessions: Record<string, ModuleSession>,
  activeModuleId: string,
  updatedAt: string
): InterviewSession {
  const active = moduleSessions[activeModuleId];
  const globalStatus = computeGlobalStatus(moduleSessions);
  const activeCurrentQuestion = active.questions.find(
    (question) => question.id === active.currentQuestionId
  );

  return {
    ...session,
    module_sessions: moduleSessions,
    global_status: globalStatus,
    questions: active.questions,
    responses: active.responses,
    currentQuestionId: active.currentQuestionId,
    currentModuleIndex: moduleIndexFor(activeCurrentQuestion ?? active.questions[0]),
    followUpCounts: active.followUpCounts,
    status: globalStatus === "all_required_completed" ? "completed" : "in_progress",
    updatedAt
  };
}

export function recordInterviewResponse(
  session: InterviewSession,
  input: RecordInterviewResponseInput
): InterviewSession {
  if (session.status === "completed") {
    throw new Error("Cannot save an answer after the interview is completed.");
  }
  if (input.questionId !== session.currentQuestionId) {
    throw new Error("Responses must be saved against the current question.");
  }

  const answerText = input.answerText.trim();
  if (!answerText) {
    throw new Error("Interview answer text is required.");
  }

  const questionIndex = session.questions.findIndex((question) => question.id === input.questionId);
  const question = session.questions[questionIndex];
  if (!question) {
    throw new Error(`Interview question ${input.questionId} was not found in the session.`);
  }
  if (session.responses.some((response) => response.questionId === question.id)) {
    throw new Error(`Interview question ${input.questionId} already has a saved response.`);
  }

  const answeredAt = nowIso(input.answeredAt);
  const responses = [
    ...session.responses,
    {
      id: `${session.sessionId}-response-${session.responses.length + 1}`,
      questionId: question.id,
      moduleId: question.moduleId,
      answerText,
      answeredAt,
      followUpReason: question.followUpReason
    }
  ];
  const questions = [...session.questions];
  const followUpCounts = copyFollowUpCounts(session.followUpCounts);
  const missingStarElement = missingStarElementFor(input.analysisFlags);
  const followUpReason = determineFollowUpReason(input.analysisFlags);

  if (followUpReason && canAskFollowUp(session, question, followUpCounts)) {
    const followUpNumber = (followUpCounts.byQuestion[question.id] ?? 0) + 1;
    const followUpQuestion = createFollowUpQuestion(
      question,
      followUpReason,
      followUpNumber,
      session.interviewLanguage,
      missingStarElement
    );
    questions.splice(questionIndex + 1, 0, followUpQuestion);
    followUpCounts.total += 1;
    followUpCounts.byQuestion[question.id] = followUpNumber;
    followUpCounts.byModule[question.moduleId] = (followUpCounts.byModule[question.moduleId] ?? 0) + 1;

    return {
      ...session,
      questions,
      responses,
      currentQuestionId: followUpQuestion.id,
      currentModuleIndex: moduleIndexFor(followUpQuestion),
      followUpCounts,
      updatedAt: answeredAt
    };
  }

  const nextQuestion = unansweredQuestion(questions, responses);

  return {
    ...session,
    questions,
    responses,
    status: nextQuestion ? "in_progress" : "completed",
    currentQuestionId: nextQuestion?.id ?? "",
    currentModuleIndex: moduleIndexFor(nextQuestion),
    followUpCounts,
    updatedAt: answeredAt
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSessionShape(value: unknown): asserts value is InterviewSession {
  if (!isRecord(value)) {
    throw new Error("Saved interview session is not an object.");
  }
  if (typeof value.sessionId !== "string" || typeof value.candidateId !== "string") {
    throw new Error("Saved interview session is missing required identifiers.");
  }
  if (value.mode !== "text") {
    throw new Error("Only text interview sessions can be resumed by this flow.");
  }
  if (!Array.isArray(value.questions) || !Array.isArray(value.responses)) {
    throw new Error("Saved interview session is missing questions or responses.");
  }
  if (!isRecord(value.followUpCounts) || !isRecord(value.caps)) {
    throw new Error("Saved interview session is missing follow-up state.");
  }
}

export function serializeInterviewSession(session: InterviewSession): string {
  return JSON.stringify(session);
}

export function resumeInterviewSession(serializedSession: string): InterviewSession {
  const parsed: unknown = JSON.parse(serializedSession);
  assertSessionShape(parsed);
  assertQuestionBankAllowed(parsed.questions);

  // Backfill the per-module store for sessions serialized before Phase 3.
  const moduleSessions =
    parsed.module_sessions && Object.keys(parsed.module_sessions).length > 0
      ? parsed.module_sessions
      : buildModuleSessions(parsed.questions);

  return {
    ...parsed,
    interviewLanguage: resolveCandidateInterviewLanguageCode(parsed.interviewLanguage),
    module_sessions: moduleSessions,
    global_status: parsed.global_status ?? computeGlobalStatus(moduleSessions)
  };
}

export function deriveResponseAnalysisFlags(answerText: string): ResponseAnalysisFlags {
  const normalized = answerText.trim().toLowerCase();
  const wordCount = normalized ? normalized.split(/\s+/).length : 0;
  const hasEvidenceMarker = /\b(shipped|built|tested|measured|documented|because|for example|result|reduced|increased)\b/i.test(
    answerText
  );
  const hasBroadClaim = /\b(expert|always|never|best|guaranteed|perfect)\b/i.test(answerText);

  return {
    ambiguous: wordCount > 0 && wordCount < 24,
    lowConfidence: wordCount > 0 && wordCount < 12,
    unsupportedClaim: hasBroadClaim && !hasEvidenceMarker
  };
}

export function currentQuestion(session: InterviewSession): InterviewQuestion | undefined {
  return session.questions.find((question) => question.id === session.currentQuestionId);
}
