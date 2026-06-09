import {
  DEFAULT_MATCH_SHARING_CATEGORIES,
  EXCLUDED_MATCH_SHARING_CATEGORIES
} from "@/features/matching/candidate-match-consent";
import type { CandidateOnboardingState } from "@/features/candidate-flow/onboarding-state";
import type { PrivacyDataCategory } from "@/features/privacy/consent";

export type CandidateMatchStatus = "awaiting_candidate" | "accepted" | "declined";

export type CompanyMatchFeedbackStatus =
  | "company_advanced"
  | "company_hold"
  | "company_declined";

export interface CompanyMatchFeedback {
  readonly matchId: string;
  readonly status: CompanyMatchFeedbackStatus;
  readonly reason: string;
  readonly nextStep?: string;
  readonly followUpAt?: string;
  readonly decidedAt?: string;
  readonly companyName?: string;
  readonly roleTitle?: string;
}

export interface CandidateMatchTimelineStep {
  readonly key: "candidate_accepted" | "company_reviewing" | "company_feedback";
  readonly label: string;
  readonly detail: string;
  readonly state: "complete" | "current" | "pending" | "unresolved";
}

export interface CandidateDashboardMatchDecision {
  readonly decision: "accepted" | "declined";
  readonly decidedAt: string;
  readonly consentRecordId: string | null;
  readonly auditEventId: string;
  readonly sharingSnapshotId?: string;
}

export interface CandidateDashboardSharingPreview {
  readonly consentRequired: true;
  readonly dataCategories: readonly PrivacyDataCategory[];
  readonly excludedCategories: readonly PrivacyDataCategory[];
  readonly sharedWith: string;
  readonly purpose: string;
}

export interface CandidateDashboardMatch {
  readonly matchId: string;
  readonly companyId: string;
  readonly roleId: string;
  readonly roleTitle: string;
  readonly companyName: string;
  readonly matchScore: number;
  readonly confidence: number;
  readonly status: CandidateMatchStatus;
  readonly consentRecordId?: string;
  readonly sharingSnapshotId?: string;
  readonly candidateDecision?: CandidateDashboardMatchDecision;
  readonly sharingPreview: CandidateDashboardSharingPreview;
  readonly reasons: readonly string[];
  readonly evidence: readonly string[];
  readonly gaps: readonly string[];
  readonly companyFeedback?: CompanyMatchFeedback;
}

export interface CandidateDashboardSeed {
  readonly candidateName: string;
  readonly headline: string;
  readonly profileConfirmed: boolean;
  readonly resumeParserConfidence: number;
  readonly resumeScore: number;
  readonly interviewStatus: "not_started" | "in_progress" | "completed";
  readonly interviewScore?: number;
  readonly interviewConfidence?: number;
  readonly rawCvDeleteAfter: string;
  readonly rawMediaRetentionHours: number;
  readonly exportRequested: boolean;
  readonly deletionRequested: boolean;
  readonly matches: readonly CandidateDashboardMatch[];
}

export interface CandidateDashboardView {
  readonly candidateName: string;
  readonly headline: string;
  readonly readinessLabel: string;
  readonly scoreTiles: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
    readonly detail: string;
  }>;
  readonly privacySummary: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  readonly matches: readonly CandidateDashboardMatch[];
  readonly employerVisibleMatchIds: readonly string[];
}

export const defaultCandidateSharingPreview: CandidateDashboardSharingPreview = {
  consentRequired: true,
  dataCategories: DEFAULT_MATCH_SHARING_CATEGORIES,
  excludedCategories: EXCLUDED_MATCH_SHARING_CATEGORIES,
  sharedWith: "Only this company and role after acceptance",
  purpose: "Employer visibility and human review"
};

export const demoCandidateDashboardSeed: CandidateDashboardSeed = {
  candidateName: "Mila Novak",
  headline: "Early-career tech risk analyst",
  profileConfirmed: true,
  resumeParserConfidence: 86,
  resumeScore: 78,
  interviewStatus: "in_progress",
  interviewScore: 74,
  interviewConfidence: 68,
  rawCvDeleteAfter: "2026-06-16",
  rawMediaRetentionHours: 24,
  exportRequested: false,
  deletionRequested: false,
  matches: [
    {
      matchId: "match_tech_risk_001",
      companyId: "company_fake_ey_like_001",
      roleId: "role_fake_tech_risk_001",
      roleTitle: "Tech Risk Analyst",
      companyName: "EY-style advisory team",
      matchScore: 83,
      confidence: 74,
      status: "awaiting_candidate",
      sharingPreview: defaultCandidateSharingPreview,
      reasons: [
        "Risk analysis evidence matches the calibrated role bar",
        "English communication is above the role threshold",
        "SQL and client scenario evidence are present"
      ],
      evidence: [
        "Resume: audit internship with measurable process improvement",
        "Interview evidence is attached only after supported transcript review",
        "Language communication evidence is attached only after supported transcript review"
      ],
      gaps: ["More evidence needed for production Python work"]
    },
    {
      matchId: "match_sdr_002",
      companyId: "company_fake_workflow_startup_001",
      roleId: "role_fake_sdr_dach_001",
      roleTitle: "SDR DACH",
      companyName: "Workflow startup",
      matchScore: 72,
      confidence: 63,
      status: "awaiting_candidate",
      sharingPreview: defaultCandidateSharingPreview,
      reasons: [
        "German and English preference fit is promising",
        "Customer-facing examples support outbound learning potential"
      ],
      evidence: [
        "Resume: customer support project with measured response improvement",
        "Interview evidence is attached only after supported transcript review"
      ],
      gaps: ["Needs stronger evidence for pipeline discipline"]
    }
  ]
};

export const candidateEntryDashboardSeed: CandidateDashboardSeed = {
  candidateName: "Candidate",
  headline: "Start with one candidate-owned path from CV upload to matches",
  profileConfirmed: false,
  resumeParserConfidence: 0,
  resumeScore: 0,
  interviewStatus: "not_started",
  rawCvDeleteAfter: "Pending upload",
  rawMediaRetentionHours: 24,
  exportRequested: false,
  deletionRequested: false,
  matches: []
};

export function candidateCanShareMatch(match: CandidateDashboardMatch): boolean {
  return (
    match.status === "accepted" &&
    Boolean(match.consentRecordId) &&
    match.candidateDecision?.decision === "accepted" &&
    Boolean(match.candidateDecision.sharingSnapshotId)
  );
}

export function buildCandidateOnboardingStateFromDashboard(
  seed: CandidateDashboardSeed
): CandidateOnboardingState {
  const matches = seed.matches.map(ensureMatchDefaults);
  const employerVisibleMatchCount = matches.filter(candidateCanShareMatch).length;
  const pendingMatchDecisionCount = matches.filter(
    (match) => match.status === "awaiting_candidate"
  ).length;
  const resumeUploaded =
    seed.profileConfirmed || seed.resumeParserConfidence > 0 || seed.resumeScore > 0;

  return {
    purposeDisclosureAccepted: true,
    resumeUploaded,
    profileConfirmed: seed.profileConfirmed,
    processingConsentRecorded: seed.profileConfirmed,
    interviewStatus: seed.interviewStatus,
    scorecardReviewed:
      seed.interviewStatus === "completed" &&
      seed.profileConfirmed &&
      typeof seed.interviewScore === "number",
    matchCount: seed.matches.length,
    pendingMatchDecisionCount,
    employerVisibleMatchCount
  };
}

export function buildCandidateDashboardView(
  seed: CandidateDashboardSeed
): CandidateDashboardView {
  const matches = seed.matches.map(ensureMatchDefaults);
  const employerVisibleMatchIds = matches
    .filter(candidateCanShareMatch)
    .map((match) => match.matchId);
  const readinessLabel = seed.profileConfirmed
    ? seed.interviewStatus === "completed"
      ? "Ready for candidate-approved matches"
      : "Profile confirmed, interview in progress"
    : resumeScoreIsLocked(seed)
      ? "Start with CV upload and profile confirmation"
      : "Profile review needed";

  return {
    candidateName: seed.candidateName,
    headline: seed.headline,
    readinessLabel,
    matches,
    employerVisibleMatchIds,
    scoreTiles: [
      {
        label: "Resume",
        value: seed.profileConfirmed ? String(seed.resumeScore) : "Locked",
        detail: seed.profileConfirmed
          ? `${seed.resumeParserConfidence}% profile extraction confidence`
          : "Upload and confirm profile before scoring"
      },
      {
        label: "Interview",
        value: seed.interviewScore ? String(seed.interviewScore) : "Pending",
        detail: seed.interviewConfidence
          ? `${seed.interviewConfidence}% confidence`
          : "Awaiting first completed session"
      },
      {
        label: "Employer visible",
        value: String(employerVisibleMatchIds.length),
        detail: "Only accepted matches with consent"
      }
    ],
    privacySummary: [
      { label: "Raw CV delete after", value: seed.rawCvDeleteAfter },
      {
        label: "Raw media retention",
        value: `${seed.rawMediaRetentionHours} hours after scoring`
      },
      {
        label: "Data export",
        value: seed.exportRequested ? "Requested" : "Available"
      },
      {
        label: "Deletion request",
        value: seed.deletionRequested ? "Requested" : "Available"
      }
    ]
  };
}

function resumeScoreIsLocked(seed: CandidateDashboardSeed): boolean {
  return !seed.profileConfirmed && seed.resumeParserConfidence === 0;
}

export function updateCandidateMatchDecision(
  matches: readonly CandidateDashboardMatch[],
  matchId: string,
  status: CandidateMatchStatus,
  consentRecordId?: string,
  metadata: {
    decidedAt?: string;
    auditEventId?: string;
    sharingSnapshotId?: string;
  } = {}
): CandidateDashboardMatch[] {
  return matches.map((match) =>
    match.matchId === matchId
      ? applyCandidateDecision(match, status, consentRecordId, metadata)
      : match
  );
}

export function buildCandidateMatchTimeline(
  match: CandidateDashboardMatch
): readonly CandidateMatchTimelineStep[] {
  const candidateAccepted =
    match.status === "accepted" ||
    match.candidateDecision?.decision === "accepted" ||
    Boolean(match.companyFeedback);
  const feedback = match.companyFeedback;

  return [
    {
      key: "candidate_accepted",
      label: "Candidate accepted",
      detail: candidateAccepted
        ? "You chose to share this company-role match."
        : "No company can review this match until you accept sharing.",
      state: candidateAccepted ? "complete" : "pending"
    },
    {
      key: "company_reviewing",
      label: "Company reviewing",
      detail: candidateAccepted
        ? "A person reviews the shared match context before any next step."
        : "This starts only after your consent.",
      state: feedback
        ? feedback.status === "company_hold"
          ? "unresolved"
          : "complete"
        : candidateAccepted
          ? "current"
          : "pending"
    },
    buildCompanyFeedbackTimelineStep(feedback)
  ];
}

function ensureMatchDefaults(match: CandidateDashboardMatch): CandidateDashboardMatch {
  return {
    ...match,
    sharingPreview: match.sharingPreview ?? defaultCandidateSharingPreview
  };
}

function buildCompanyFeedbackTimelineStep(
  feedback?: CompanyMatchFeedback
): CandidateMatchTimelineStep {
  if (feedback?.status === "company_advanced") {
    return {
      key: "company_feedback",
      label: "Advanced by company",
      detail: feedback.nextStep
        ? `Next step: ${feedback.nextStep}`
        : "The company marked this match for a next conversation.",
      state: "complete"
    };
  }

  if (feedback?.status === "company_hold") {
    return {
      key: "company_feedback",
      label: "Still under review",
      detail: feedback.followUpAt
        ? `Follow-up: ${feedback.followUpAt}`
        : "The company has not resolved this review yet.",
      state: "unresolved"
    };
  }

  if (feedback?.status === "company_declined") {
    return {
      key: "company_feedback",
      label: "Not moving forward",
      detail: feedback.reason,
      state: "complete"
    };
  }

  return {
    key: "company_feedback",
    label: "Company update",
    detail: "No company feedback has been posted yet.",
    state: "pending"
  };
}

function applyCandidateDecision(
  match: CandidateDashboardMatch,
  status: CandidateMatchStatus,
  consentRecordId: string | undefined,
  metadata: {
    decidedAt?: string;
    auditEventId?: string;
    sharingSnapshotId?: string;
  }
): CandidateDashboardMatch {
  if (status === "awaiting_candidate") {
    return {
      ...match,
      status,
      consentRecordId: undefined,
      sharingSnapshotId: undefined,
      candidateDecision: undefined
    };
  }

  const decidedAt = metadata.decidedAt ?? new Date().toISOString();
  const auditEventId =
    metadata.auditEventId ??
    `audit_candidate_match_decision_${sanitizeForId(match.matchId)}`;

  if (status === "accepted") {
    const resolvedConsentRecordId =
      consentRecordId ?? `consent_${sanitizeForId(match.matchId)}`;
    const sharingSnapshotId =
      metadata.sharingSnapshotId ?? `snapshot_${sanitizeForId(match.matchId)}`;

    return {
      ...match,
      status,
      consentRecordId: resolvedConsentRecordId,
      sharingSnapshotId,
      candidateDecision: {
        decision: "accepted",
        decidedAt,
        consentRecordId: resolvedConsentRecordId,
        auditEventId,
        sharingSnapshotId
      }
    };
  }

  return {
    ...match,
    status,
    consentRecordId: undefined,
    sharingSnapshotId: undefined,
    candidateDecision: {
      decision: "declined",
      decidedAt,
      consentRecordId: null,
      auditEventId
    }
  };
}

function sanitizeForId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
