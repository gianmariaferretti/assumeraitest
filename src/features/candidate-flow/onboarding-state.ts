export type CandidateInterviewOnboardingStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type CandidateOnboardingStepId =
  | "purpose_disclosure"
  | "resume_upload"
  | "profile_confirmation"
  | "interview_preparation"
  | "interview"
  | "score_review"
  | "match_consent";

export type CandidateOnboardingStepStatus = "complete" | "current" | "locked";

export interface CandidateOnboardingState {
  readonly purposeDisclosureAccepted: boolean;
  readonly resumeUploaded: boolean;
  readonly profileConfirmed: boolean;
  readonly processingConsentRecorded: boolean;
  readonly interviewPreparationViewed?: boolean;
  readonly interviewStatus: CandidateInterviewOnboardingStatus;
  readonly scorecardReviewed: boolean;
  readonly matchCount: number;
  readonly pendingMatchDecisionCount: number;
  readonly employerVisibleMatchCount: number;
}

export interface CandidateOnboardingStep {
  readonly id: CandidateOnboardingStepId;
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly status: CandidateOnboardingStepStatus;
}

export interface CandidateOnboardingAction {
  readonly href: string;
  readonly label: string;
  readonly detail: string;
}

export interface CandidateOnboardingView {
  readonly steps: readonly CandidateOnboardingStep[];
  readonly currentStep: CandidateOnboardingStep;
  readonly nextAction: CandidateOnboardingAction;
  readonly progressPercent: number;
  readonly canGenerateScorecard: boolean;
  readonly canGenerateMatches: boolean;
  readonly employerVisibleMatchCount: number;
  readonly privacyBoundary: string;
  readonly guardrails: readonly string[];
}

type StepDefinition = Omit<CandidateOnboardingStep, "status">;

const stepDefinitions: readonly StepDefinition[] = [
  {
    id: "purpose_disclosure",
    label: "Purpose and privacy",
    description: "Read the Privacy Policy and Terms of Service before resume upload.",
    href: "/candidate"
  },
  {
    id: "resume_upload",
    label: "Upload CV",
    description: "Upload a resume that stays candidate-owned with raw CV retention.",
    href: "/candidate/resume"
  },
  {
    id: "profile_confirmation",
    label: "Confirm profile",
    description: "Correct parsed profile data and consent to processing before scoring.",
    href: "/candidate/profile/confirm"
  },
  {
    id: "interview_preparation",
    label: "Prepare",
    description: "Review interview modules and scoring boundaries before starting.",
    href: "/candidate/interview/prepare"
  },
  {
    id: "interview",
    label: "Interview",
    description: "Complete or resume the text interview used for evidence review.",
    href: "/candidate/interview"
  },
  {
    id: "score_review",
    label: "Review explanations",
    description: "Review score evidence, confidence, missing data, and challenge paths.",
    href: "/candidate#scorecard"
  },
  {
    id: "match_consent",
    label: "Match consent",
    description: "Accept or decline company matches before employers can see anything.",
    href: "/candidate#matches"
  }
];

export function createNewCandidateOnboardingState(): CandidateOnboardingState {
  return {
    purposeDisclosureAccepted: false,
    resumeUploaded: false,
    profileConfirmed: false,
    processingConsentRecorded: false,
    interviewStatus: "not_started",
    scorecardReviewed: false,
    matchCount: 0,
    pendingMatchDecisionCount: 0,
    employerVisibleMatchCount: 0
  };
}

export function buildCandidateOnboardingView(
  state: CandidateOnboardingState
): CandidateOnboardingView {
  const currentStepId = resolveCurrentStepId(state);
  const steps = stepDefinitions.map((step) => ({
    ...step,
    status: resolveStepStatus(step.id, currentStepId, state)
  }));
  const currentStep =
    steps.find((step) => step.id === currentStepId) ?? steps[steps.length - 1];
  const completeStepCount = steps.filter((step) => step.status === "complete").length;
  const canGenerateScorecard =
    state.profileConfirmed &&
    state.processingConsentRecorded &&
    state.interviewStatus === "completed";
  const canGenerateMatches = canGenerateScorecard && state.scorecardReviewed;

  return {
    steps,
    currentStep,
    nextAction: buildNextAction(currentStep, state),
    progressPercent: Math.round((completeStepCount / steps.length) * 100),
    canGenerateScorecard,
    canGenerateMatches,
    employerVisibleMatchCount: state.employerVisibleMatchCount,
    privacyBoundary:
      "No employer can view this candidate until a company match is accepted with consent.",
    guardrails: buildGuardrails(state, canGenerateScorecard, canGenerateMatches)
  };
}

function resolveCurrentStepId(
  state: CandidateOnboardingState
): CandidateOnboardingStepId {
  if (!state.purposeDisclosureAccepted) {
    return "purpose_disclosure";
  }

  if (!state.resumeUploaded) {
    return "resume_upload";
  }

  if (!state.profileConfirmed || !state.processingConsentRecorded) {
    return "profile_confirmation";
  }

  if (!state.interviewPreparationViewed && state.interviewStatus === "not_started") {
    return "interview_preparation";
  }

  if (state.interviewStatus !== "completed") {
    return "interview";
  }

  if (!state.scorecardReviewed) {
    return "score_review";
  }

  return "match_consent";
}

function resolveStepStatus(
  stepId: CandidateOnboardingStepId,
  currentStepId: CandidateOnboardingStepId,
  state: CandidateOnboardingState
): CandidateOnboardingStepStatus {
  if (isStepComplete(stepId, state)) {
    return "complete";
  }

  if (stepId === currentStepId) {
    return "current";
  }

  return "locked";
}

function isStepComplete(
  stepId: CandidateOnboardingStepId,
  state: CandidateOnboardingState
): boolean {
  switch (stepId) {
    case "purpose_disclosure":
      return state.purposeDisclosureAccepted;
    case "resume_upload":
      return state.resumeUploaded;
    case "profile_confirmation":
      return state.profileConfirmed && state.processingConsentRecorded;
    case "interview_preparation":
      return state.interviewPreparationViewed === true || state.interviewStatus !== "not_started";
    case "interview":
      return state.interviewStatus === "completed";
    case "score_review":
      return state.scorecardReviewed;
    case "match_consent":
      return state.matchCount > 0 && state.pendingMatchDecisionCount === 0;
  }
}

function buildNextAction(
  currentStep: CandidateOnboardingStep,
  state: CandidateOnboardingState
): CandidateOnboardingAction {
  if (currentStep.id === "interview" && state.interviewStatus === "in_progress") {
    return {
      href: currentStep.href,
      label: "Resume interview",
      detail: currentStep.description
    };
  }

  const labels: Record<CandidateOnboardingStepId, string> = {
    purpose_disclosure: "Review purpose and privacy",
    resume_upload: "Upload CV",
    profile_confirmation: "Confirm parsed profile",
    interview_preparation: "Prepare for interview",
    interview: "Start interview",
    score_review: "Review score explanations",
    match_consent: "Review company matches"
  };

  return {
    href: currentStep.href,
    label: labels[currentStep.id],
    detail: currentStep.description
  };
}

function buildGuardrails(
  state: CandidateOnboardingState,
  canGenerateScorecard: boolean,
  canGenerateMatches: boolean
): string[] {
  const guardrails = [
    "Employer access stays denied until candidate match acceptance records consent.",
    "Low confidence means manual review is needed, not a negative candidate signal."
  ];

  if (!state.profileConfirmed || !state.processingConsentRecorded) {
    guardrails.unshift(
      "Scoring stays locked until profile confirmation and processing consent are both recorded."
    );
  } else if (!canGenerateScorecard) {
    guardrails.unshift(
      "Score explanations stay locked until the candidate completes the interview."
    );
  } else if (!canGenerateMatches) {
    guardrails.unshift(
      "Company matches stay candidate-only until score explanations are reviewed."
    );
  }

  return guardrails;
}
