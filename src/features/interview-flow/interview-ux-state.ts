import { currentQuestion } from "./session-state";
import type { CandidateFlowCopy } from "./candidate-flow-copy";
import type { FollowUpReason, InterviewSession, ModuleId } from "./types";

export type InterviewUxModuleStatus = "completed" | "current" | "upcoming";

export interface InterviewUxModuleCard {
  id: ModuleId;
  title: string;
  focus: string;
  status: InterviewUxModuleStatus;
  answeredQuestions: number;
  totalQuestions: number;
  requiredEvidence: string[];
}

export interface InterviewUxScoringConnection {
  evidenceTitle: string;
  evidenceItems: string[];
  rubricItems: string[];
  confidenceNote: string;
  humanReviewNote: string;
  consentNote: string;
}

export interface InterviewUxState {
  progressLabel: string;
  transitionLabel: string;
  nextStepLabel: string;
  saveStateLabel: string;
  moduleCards: InterviewUxModuleCard[];
  scoringConnection: InterviewUxScoringConnection;
}

export interface CreateInterviewUxStateOptions {
  lastSavedAt?: string | null;
  copy?: CandidateFlowCopy["interview"]["ux"];
}

const FOLLOW_UP_LABELS: Record<FollowUpReason, string> = {
  clarify_evidence: "clarify evidence",
  validate_role_requirement: "validate a role requirement",
  resolve_contradiction: "resolve a contradiction",
  increase_confidence: "increase confidence"
};

function formatSavedAt(savedAt?: string | null): string {
  if (!savedAt) {
    return "Autosave ready";
  }

  const timePart = savedAt.match(/T(\d{2}:\d{2})/)?.[1];
  return `Autosaved ${timePart ?? savedAt}`;
}

function uniqueItems(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function progressLabel(
  session: InterviewSession,
  copy?: CandidateFlowCopy["interview"]["ux"]
): string {
  if (session.status === "completed") {
    return copy?.interviewComplete ?? "Interview complete";
  }

  return `${copy?.question ?? "Question"} ${Math.min(session.responses.length + 1, session.questions.length)} ${copy?.of ?? "of"} ${session.questions.length}`;
}

function moduleStatus(session: InterviewSession, moduleIndex: number): InterviewUxModuleStatus {
  if (session.status === "completed" || moduleIndex < session.currentModuleIndex) {
    return "completed";
  }

  if (moduleIndex === session.currentModuleIndex) {
    return "current";
  }

  return "upcoming";
}

function transitionLabel(
  session: InterviewSession,
  copy?: CandidateFlowCopy["interview"]["ux"]
): string {
  if (session.status === "completed") {
    return copy?.allAnswersSaved ?? "All answers saved for candidate review and human-overseen scoring.";
  }

  const question = currentQuestion(session);
  if (question?.followUpReason) {
    return copy?.followUpAdded ?? `Follow-up added to ${FOLLOW_UP_LABELS[question.followUpReason]}.`;
  }

  if (session.responses.length === 0) {
    return copy?.startFirstQuestion ?? "Start with the first role-relevant question.";
  }

  return copy?.answerSavedContinue ?? "Answer saved. Continue to the next role-relevant step.";
}

function nextStepLabel(
  session: InterviewSession,
  copy?: CandidateFlowCopy["interview"]["ux"]
): string {
  if (session.status === "completed") {
    return copy?.continueToScores ?? "Continue to private score explanations before reviewing company sharing choices.";
  }

  const question = currentQuestion(session);
  if (question?.followUpReason) {
    return copy?.addEvidenceThenReturn ?? "Add the requested additional evidence, then the interview returns to the planned module path.";
  }

  return copy?.answerThenMoves ?? "Answer this question, then AssumerAI saves it and moves you to the next role-relevant step.";
}

function scoringConnection(
  session: InterviewSession,
  copy?: CandidateFlowCopy["interview"]["ux"]
): InterviewUxScoringConnection {
  if (session.status === "completed") {
    return {
      evidenceTitle: copy?.scoreExplanationPreview ?? "Score explanation preview",
      evidenceItems: uniqueItems(session.questions.flatMap((question) => question.evidenceRequirements)).slice(0, 5),
      rubricItems: uniqueItems(session.questions.flatMap((question) => question.rubric)).slice(0, 5),
      confidenceNote:
        copy?.confidenceComplete ??
        "Confidence is shown separately from score quality so thin evidence creates review work, not an automatic negative outcome.",
      humanReviewNote:
        copy?.humanReviewComplete ??
        "Human reviewers inspect evidence, confidence, missing data, and role calibration before any employer action.",
      consentNote:
        copy?.consentComplete ??
        "You review the score explanation and each company match before any employer can see interview evidence."
    };
  }

  const question = currentQuestion(session);
  const isConfidenceFollowUp = question?.followUpReason === "increase_confidence";

  return {
    evidenceTitle: copy?.answerCanSupport ?? "What this answer can support",
    evidenceItems: question?.evidenceRequirements ?? [],
    rubricItems: question?.rubric ?? [],
    confidenceNote: isConfidenceFollowUp
      ? copy?.confidenceFollowUp ??
        "This follow-up increases score confidence. Low confidence means review needed, not a negative score."
      : copy?.confidenceActive ??
        "Clear, specific evidence raises confidence; missing details create review notes, not automatic rejection.",
    humanReviewNote:
      copy?.humanReviewActive ??
      "Scores remain recommendations with evidence for human review, not automated hiring decisions.",
    consentNote:
      copy?.consentActive ??
      "Employers cannot see this interview, transcript, or score explanation until you accept a company match."
  };
}

export function createInterviewUxState(
  session: InterviewSession,
  options: CreateInterviewUxStateOptions = {}
): InterviewUxState {
  const copy = options.copy;
  return {
    progressLabel: progressLabel(session, copy),
    transitionLabel: transitionLabel(session, copy),
    nextStepLabel: nextStepLabel(session, copy),
    saveStateLabel: formatSavedAt(options.lastSavedAt),
    moduleCards: session.modulePlan.map((plannedModule, index) => {
      const questions = session.questions.filter((question) => question.moduleId === plannedModule.id);
      const answeredQuestions = session.responses.filter(
        (response) => response.moduleId === plannedModule.id
      ).length;

      return {
        id: plannedModule.id,
        title: plannedModule.title,
        focus: plannedModule.roleSpecificFocus,
        status: moduleStatus(session, index),
        answeredQuestions,
        totalQuestions: questions.length,
        requiredEvidence: plannedModule.requiredEvidence
      };
    }),
    scoringConnection: scoringConnection(session, copy)
  };
}
