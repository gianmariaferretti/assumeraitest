export type CandidateFlowRouteStatus = "implemented" | "planned";

export type CandidateFlowRouteKind = "linear" | "persistent-control";

export type CandidateFlowStepId =
  | "purpose-disclosure"
  | "resume-upload"
  | "profile-confirmation"
  | "interview-preparation"
  | "interview-device-check"
  | "text-interview"
  | "moving-forward"
  | "results-review"
  | "match-consent"
  | "data-controls";

export type LinearCandidateFlowStepId = Exclude<
  CandidateFlowStepId,
  "data-controls"
>;

export type CandidateMatchConsentState =
  | "not_generated"
  | "candidate_review"
  | "accepted"
  | "declined"
  | "revoked";

export interface CandidateFlowRoute {
  readonly id: CandidateFlowStepId;
  readonly label: string;
  readonly path: `/candidate${string}`;
  readonly kind: CandidateFlowRouteKind;
  readonly routeStatus: CandidateFlowRouteStatus;
  readonly candidateGoal: string;
  readonly entryGate: string;
  readonly completionSignal: string;
  readonly auditEvents: readonly string[];
  readonly employerVisibility: "none" | "accepted_match_only";
}

export interface CandidateFlowProgress {
  readonly purposeDisclosureAccepted: boolean;
  readonly resumeUploaded: boolean;
  readonly profileConfirmed: boolean;
  readonly processingConsentRecorded: boolean;
  readonly interviewPreparationViewed?: boolean;
  readonly interviewDeviceCheckCompleted?: boolean;
  readonly textInterviewCompleted: boolean;
  readonly movingForwardViewed?: boolean;
  readonly scorecardGenerated: boolean;
  readonly matchesGenerated: boolean;
}

export const candidateFlowRouteMap = [
  {
    id: "purpose-disclosure",
    label: "Purpose and privacy",
    path: "/candidate",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Read the privacy and terms disclosure before any resume data is provided.",
    entryGate: "candidate account exists or local MVP candidate session is active",
    completionSignal: "privacy policy and terms of service accepted after read-through",
    auditEvents: ["consent.changed"],
    employerVisibility: "none"
  },
  {
    id: "resume-upload",
    label: "Resume upload",
    path: "/candidate/resume",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Upload a CV with raw-file retention clearly stated.",
    entryGate: "purpose disclosure accepted",
    completionSignal: "resume document stored with candidate confirmation handoff",
    auditEvents: ["data.accessed"],
    employerVisibility: "none"
  },
  {
    id: "profile-confirmation",
    label: "Profile confirmation",
    path: "/candidate/profile/confirm",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Correct parsed data before scoring starts.",
    entryGate: "resume parse is available for candidate review",
    completionSignal: "profile confirmed and processing consent recorded",
    auditEvents: ["resume.parsed", "consent.changed"],
    employerVisibility: "none"
  },
  {
    id: "moving-forward",
    label: "Moving forward",
    path: "/candidate/interview/moving-forward",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Receive the private moving-forward transition after profile confirmation.",
    entryGate: "profile confirmed and processing consent recorded",
    completionSignal: "candidate continues to interview preparation as a separate step",
    auditEvents: ["data.accessed"],
    employerVisibility: "none"
  },
  {
    id: "interview-preparation",
    label: "Interview preparation",
    path: "/candidate/interview/prepare",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Understand interview modules and scoring boundaries before starting.",
    entryGate: "profile confirmed and processing consent recorded",
    completionSignal: "candidate continues into the interview or resumes an existing interview",
    auditEvents: ["data.accessed"],
    employerVisibility: "none"
  },
  {
    id: "interview-device-check",
    label: "Device check",
    path: "/candidate/interview/device-check",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Test camera and microphone locally before entering the live interview.",
    entryGate: "profile confirmed, processing consent recorded, and AI disclosure acknowledged",
    completionSignal: "candidate confirms camera and microphone are ready on this device",
    auditEvents: ["data.accessed"],
    employerVisibility: "none"
  },
  {
    id: "text-interview",
    label: "Text interview",
    path: "/candidate/interview",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Complete or resume the role-aware text interview.",
    entryGate: "profile confirmed and processing consent recorded",
    completionSignal: "interview session completed",
    auditEvents: ["data.accessed"],
    employerVisibility: "none"
  },
  {
    id: "results-review",
    label: "Results review",
    path: "/candidate/results",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Review score evidence, missing data, confidence, and challenge options.",
    entryGate: "scorecard generated with evidence, confidence, version, timestamp, and audit event",
    completionSignal: "candidate has viewed score explanations and available challenge paths",
    auditEvents: ["score.generated"],
    employerVisibility: "none"
  },
  {
    id: "match-consent",
    label: "Match consent",
    path: "/candidate/matches",
    kind: "linear",
    routeStatus: "implemented",
    candidateGoal: "Accept or decline company-role matches one at a time.",
    entryGate: "candidate-visible matches generated",
    completionSignal: "candidate decision recorded for each reviewed match",
    auditEvents: ["match.generated", "candidate.match_decision", "consent.changed"],
    employerVisibility: "accepted_match_only"
  },
  {
    id: "data-controls",
    label: "Data controls",
    path: "/candidate/data",
    kind: "persistent-control",
    routeStatus: "implemented",
    candidateGoal: "Export, correct, challenge, delete, or revoke future sharing where supported.",
    entryGate: "candidate identity is established",
    completionSignal: "candidate rights request, human-review request, or retention acknowledgement recorded",
    auditEvents: [
      "human_review.requested",
      "data_export.requested",
      "data_deletion.requested",
      "consent.changed"
    ],
    employerVisibility: "none"
  }
] as const satisfies readonly CandidateFlowRoute[];

export const implementedCandidateActionRoutes = candidateFlowRouteMap.filter(
  (route) =>
    route.routeStatus === "implemented" &&
    route.path !== "/candidate"
);

export function getCandidateFirstNextRoute(
  progress: CandidateFlowProgress
): CandidateFlowRoute {
  const incompleteRoute = candidateFlowRouteMap.find(
    (route) =>
      route.kind === "linear" &&
      !candidateLinearStepIsComplete(route.id, progress)
  );

  return incompleteRoute ?? getCandidateRoute("data-controls");
}

export function candidateMatchIsEmployerVisible({
  consentRecordId,
  consentState
}: {
  readonly consentRecordId?: string;
  readonly consentState: CandidateMatchConsentState;
}): boolean {
  return consentState === "accepted" && Boolean(consentRecordId);
}

export function getCandidateRoute(stepId: CandidateFlowStepId): CandidateFlowRoute {
  const route = candidateFlowRouteMap.find((candidateRoute) => candidateRoute.id === stepId);

  if (!route) {
    throw new Error(`Unknown candidate flow route: ${stepId}`);
  }

  return route;
}

function candidateLinearStepIsComplete(
  stepId: LinearCandidateFlowStepId,
  progress: CandidateFlowProgress
): boolean {
  switch (stepId) {
    case "purpose-disclosure":
      return progress.purposeDisclosureAccepted;
    case "resume-upload":
      return progress.resumeUploaded;
    case "profile-confirmation":
      return progress.profileConfirmed && progress.processingConsentRecorded;
    case "interview-preparation":
      return (
        progress.interviewPreparationViewed === true ||
        progress.interviewDeviceCheckCompleted === true ||
        progress.textInterviewCompleted
      );
    case "interview-device-check":
      return progress.interviewDeviceCheckCompleted === true || progress.textInterviewCompleted;
    case "text-interview":
      return progress.textInterviewCompleted;
    case "moving-forward":
      return (
        progress.movingForwardViewed === true ||
        progress.interviewPreparationViewed === true ||
        progress.interviewDeviceCheckCompleted === true ||
        progress.textInterviewCompleted
      );
    case "results-review":
      return progress.scorecardGenerated;
    case "match-consent":
      return progress.matchesGenerated;
  }
}
