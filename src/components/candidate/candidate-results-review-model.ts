import {
  assessInterviewSessionEvidence,
  type InterviewSessionEvidenceAssessment
} from "@/features/interview-evaluation";
import type { InterviewSession } from "@/features/interview-flow";

import {
  buildCandidateDashboardView,
  demoCandidateDashboardSeed,
  type CandidateDashboardMatch,
  type CandidateDashboardSeed
} from "./candidate-dashboard-model";

export type CandidateResultsReviewMetric = {
  readonly label: string;
  readonly value: string;
  readonly meaning: string;
  readonly detail: string;
};

export type CandidateResultsReviewAction = {
  readonly label: string;
  readonly href: string;
  readonly detail: string;
};

export type CandidateResultsEvidenceItem = {
  readonly label: string;
  readonly text: string;
  readonly detail: string;
  readonly source: "resume" | "interview" | "match" | "review";
};

export type CandidateResultsEvidenceGroup = {
  readonly title: string;
  readonly summary: string;
  readonly items: readonly CandidateResultsEvidenceItem[];
};

export type CandidateResultsReviewModelOptions = {
  readonly interviewSession?: InterviewSession | null;
};

export type CandidateResultsReviewModel = {
  readonly candidateId: string;
  readonly candidateName: string;
  readonly reviewTargetId: string;
  readonly reviewTargetType: "interview_scorecard";
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly outcomeLabel: string;
  readonly outcomeDetail: string;
  readonly readinessLabel: string;
  readonly metrics: readonly CandidateResultsReviewMetric[];
  readonly evidenceGroups: readonly CandidateResultsEvidenceGroup[];
  readonly missingEvidence: readonly string[];
  readonly safeguards: readonly string[];
  readonly consentStateLabel: string;
  readonly consentStateDetail: string;
  readonly requestReviewLabel: string;
  readonly requestReviewDetail: string;
  readonly matchPreviews: readonly CandidateDashboardMatch[];
  readonly actions: readonly CandidateResultsReviewAction[];
};

export const candidateResultsReviewSeed: CandidateDashboardSeed = {
  ...demoCandidateDashboardSeed,
  interviewStatus: "completed",
  headline: "Private evidence summary for candidate review"
};

export function buildCandidateResultsReviewModel(
  seed: CandidateDashboardSeed = candidateResultsReviewSeed,
  options: CandidateResultsReviewModelOptions = {}
): CandidateResultsReviewModel {
  const dashboardView = buildCandidateDashboardView(seed);
  const primaryMatch = dashboardView.matches[0];
  const interviewSession = options.interviewSession ?? null;
  const interviewAssessment = interviewSession
    ? assessInterviewSessionEvidence(interviewSession)
    : null;
  const interviewComplete = interviewSession
    ? interviewSession.status === "completed"
    : seed.interviewStatus === "completed";
  const interviewEvidenceNeedsReview =
    Boolean(interviewAssessment) &&
    interviewComplete &&
    !interviewAssessment?.evidenceSupported;
  const sessionQuestionCount = interviewSession?.questions.length ?? 0;
  const answeredQuestionCount = interviewSession?.responses.length ?? 0;
  const interviewScore = interviewAssessment
    ? interviewAssessment.overallScore
    : typeof seed.interviewScore === "number"
      ? seed.interviewScore
      : null;
  const interviewConfidence = interviewAssessment
    ? interviewAssessment.confidenceScore
    : typeof seed.interviewConfidence === "number"
      ? seed.interviewConfidence
      : null;
  const missingEvidence = buildMissingEvidence(
    seed,
    primaryMatch?.gaps ?? [],
    interviewSession,
    interviewAssessment
  );
  const metrics = buildResultMetrics({
    seed,
    interviewAssessment,
    interviewConfidence,
    interviewComplete,
    interviewEvidenceNeedsReview,
    interviewScore,
    interviewSession
  });

  return {
    candidateId: interviewSession?.candidateId ?? "candidate_results_device",
    candidateName: seed.candidateName,
    reviewTargetId: interviewSession?.sessionId ?? "interview_session_results_device",
    reviewTargetType: "interview_scorecard",
    eyebrow: "Private candidate result",
    title: interviewEvidenceNeedsReview
      ? "Interview evidence needs context"
      : interviewComplete
        ? "Your review is ready"
        : "Finish the interview to unlock results",
    summary: interviewEvidenceNeedsReview
      ? "This private summary found thin or off-topic interview answers. It is not a hiring decision, and employers still see nothing until you accept a match."
      : interviewComplete
        ? "This is a private evidence summary. It is not a hiring decision and it is not visible to employers until you accept a match."
        : "This page is private and not a hiring decision. Complete the interview before final score explanations, matching, or employer visibility can start.",
    outcomeLabel: "Recommended next step",
    outcomeDetail: interviewEvidenceNeedsReview
      ? "The interview answers did not provide enough role-relevant evidence. Add clearer examples or request human review before sharing any match."
      : interviewComplete
        ? "Review the evidence. If something looks wrong or incomplete, request human review or add more context."
        : "Complete the remaining questions first. Incomplete evidence is treated as a review state, not as candidate quality.",
    readinessLabel: interviewSession
      ? interviewEvidenceNeedsReview
        ? "Interview evidence needs review"
        : interviewComplete
          ? "Ready for candidate review"
          : "Finish the interview before review"
      : dashboardView.readinessLabel,
    metrics,
    evidenceGroups: buildEvidenceGroups(
      seed,
      dashboardView.matches,
      interviewSession,
      interviewAssessment
    ),
    missingEvidence,
    safeguards: [
      "No automatic rejection is allowed from these scores.",
      "A human reviewer must make any employer-side decision.",
      "Employer visibility stays blocked until candidate consent is recorded.",
      "Raw interview media is excluded from employer sharing."
    ],
    consentStateLabel: "Employer cannot see this yet",
    consentStateDetail:
      "Your profile, scorecard, transcript, and match explanation stay private until you accept sharing for a specific company and role.",
    requestReviewLabel: "Request human review",
    requestReviewDetail:
      "Ask a human reviewer to check the score, confidence, missing evidence, and any context the model may have missed.",
    matchPreviews: dashboardView.matches,
    actions: [
      {
        label: "Data controls",
        href: "/candidate/data",
        detail: "Export, delete, retention, and review requests."
      },
      {
        label: interviewEvidenceNeedsReview ? "Add context" : "Continue interview",
        href: "/candidate/interview",
        detail: interviewEvidenceNeedsReview
          ? "Add clearer examples or retake thin answers before sharing."
          : sessionQuestionCount > 0 && answeredQuestionCount < sessionQuestionCount
            ? "Finish the remaining interview questions."
            : "Add more evidence before sharing any match."
      },
      {
        label: "Review matches",
        href: "/candidate/matches",
        detail: "Nothing is shared until you accept."
      }
    ]
  };
}

function buildResultMetrics({
  seed,
  interviewAssessment,
  interviewConfidence,
  interviewComplete,
  interviewEvidenceNeedsReview,
  interviewScore,
  interviewSession
}: {
  readonly seed: CandidateDashboardSeed;
  readonly interviewAssessment: InterviewSessionEvidenceAssessment | null;
  readonly interviewConfidence: number | null;
  readonly interviewComplete: boolean;
  readonly interviewEvidenceNeedsReview: boolean;
  readonly interviewScore: number | null;
  readonly interviewSession: InterviewSession | null;
}): readonly CandidateResultsReviewMetric[] {
  const baseMetrics: CandidateResultsReviewMetric[] = [
    {
      label: "Resume evidence",
      value: seed.profileConfirmed ? String(seed.resumeScore) : "Locked",
      meaning: "How much role-relevant evidence was found in the CV.",
      detail: seed.profileConfirmed
        ? `${seed.resumeParserConfidence}% profile extraction confidence. This is not a pass/fail verdict.`
        : "Upload and confirm the profile before resume evidence is scored."
    }
  ];

  if (interviewSession) {
    baseMetrics.push({
      label: "Interview progress",
      value: `${interviewSession.responses.length}/${interviewSession.questions.length}`,
      meaning: "Completed responses available for score explanation.",
      detail: interviewEvidenceNeedsReview
        ? `${interviewAssessment?.weakResponseCount ?? 0} responses need clearer examples before match sharing.`
        : interviewComplete
          ? "All planned interview answers are available for candidate review."
          : "Finish the interview before final score explanations are ready."
    });
  }

  baseMetrics.push(
    {
      label: "Interview evidence",
      value: interviewScore === null || !interviewComplete ? "Pending" : String(interviewScore),
      meaning: "How much answer evidence supports the role modules.",
      detail: interviewEvidenceNeedsReview
        ? "Saved answers were too short or off-topic to support a strong interview evidence score."
        : interviewScore === null || !interviewComplete
          ? "Complete the interview before this result is available."
          : "Questions are scored only from answer evidence and role requirements."
    },
    {
      label: "Confidence",
      value:
        interviewConfidence === null || !interviewComplete
          ? "Pending"
          : `${interviewConfidence}%`,
      meaning: "How complete the evidence is.",
      detail:
        "Low confidence means the result needs human review or more evidence. It is not a negative candidate outcome."
    }
  );

  return baseMetrics;
}

function buildEvidenceGroups(
  seed: CandidateDashboardSeed,
  matches: readonly CandidateDashboardMatch[],
  interviewSession: InterviewSession | null,
  interviewAssessment: InterviewSessionEvidenceAssessment | null
): readonly CandidateResultsEvidenceGroup[] {
  const resumeEvidenceItem = buildResumeEvidenceItem(seed);
  const interviewItems = buildInterviewEvidenceItems(interviewSession, interviewAssessment, seed);

  return [
    {
      title: "Evidence reviewed",
      summary:
        "These are the candidate-private evidence points used for explanation. They support review, not automated hiring decisions.",
      items: interviewSession?.responses.length
        ? [...interviewItems, resumeEvidenceItem]
        : [resumeEvidenceItem, ...interviewItems]
    },
    {
      title: "Match explanation",
      summary:
        "Potential matches stay candidate-visible until you explicitly accept a scoped share.",
      items: buildMatchEvidenceItems(matches[0], interviewAssessment)
    }
  ];
}

function buildResumeEvidenceItem(seed: CandidateDashboardSeed): CandidateResultsEvidenceItem {
  return {
    label: "Resume evidence",
    text: seed.profileConfirmed
      ? `${seed.resumeScore}/100 resume evidence with ${seed.resumeParserConfidence}% profile extraction confidence.`
      : "Resume evidence is locked until the profile is confirmed.",
    detail: "The resume score is role-evidence support only and is not a pass/fail decision.",
    source: "resume"
  };
}

function buildInterviewEvidenceItems(
  interviewSession: InterviewSession | null,
  interviewAssessment: InterviewSessionEvidenceAssessment | null,
  seed: CandidateDashboardSeed
): readonly CandidateResultsEvidenceItem[] {
  const assessmentByResponseId = new Map(
    interviewAssessment?.responseAssessments.map((assessment) => [
      assessment.responseId,
      assessment
    ]) ?? []
  );

  if (!interviewSession?.responses.length) {
    return [
      {
        label: "Interview answer evidence",
        text:
          seed.interviewStatus === "completed"
            ? "No saved interview session was found on this device."
            : "Interview answer evidence is not complete yet.",
        detail:
          "Final answer-level evidence appears here after the interview session is saved on this device.",
        source: "interview"
      }
    ];
  }

  return interviewSession.responses.slice(0, 4).map((response, index) => {
    const question = interviewSession.questions.find(
      (candidateQuestion) => candidateQuestion.id === response.questionId
    );
    const responseAssessment = assessmentByResponseId.get(response.id);

    return {
      label: question?.moduleId
        ? `${formatModuleLabel(question.moduleId)}${
            responseAssessment?.evidenceSupported ? "" : " - needs context"
          }`
        : `Answer ${index + 1}`,
      text: response.answerText,
      detail:
        responseAssessment?.reviewNote ??
        question?.prompt ??
        "Candidate answer evidence from the completed interview.",
      source: "interview" as const
    };
  });
}

function buildMatchEvidenceItems(
  primaryMatch: CandidateDashboardMatch | undefined,
  interviewAssessment: InterviewSessionEvidenceAssessment | null
): readonly CandidateResultsEvidenceItem[] {
  if (!primaryMatch) {
    return [
      {
        label: "Matches pending",
        text: "No candidate-visible matches are ready yet.",
        detail: "Missing matches are a workflow state, not a negative candidate outcome.",
        source: "match"
      }
    ];
  }

  const resumeEvidence = primaryMatch.evidence
    .filter((evidence) => evidence.toLowerCase().startsWith("resume:"))
    .slice(0, 2)
    .map((evidence) => ({
      label: "Resume-only preview",
      text: evidence,
      detail:
        "Based on confirmed profile and resume evidence. Employers still see nothing until candidate consent.",
      source: "match" as const
    }));

  if (!interviewAssessment?.evidenceSupported) {
    return [
      ...resumeEvidence,
      {
        label: "Interview evidence gap",
        text: "Interview evidence is not strong enough to support match claims yet.",
        detail:
          "Add clearer examples or request human review before relying on interview-backed match explanations.",
        source: "match" as const
      },
      ...primaryMatch.gaps.slice(0, 2).map((gap) => ({
        label: "Missing evidence",
        text: gap,
        detail: `${primaryMatch.companyName} remains blocked from visibility until candidate consent.`,
        source: "match" as const
      }))
    ];
  }

  return [
    ...resumeEvidence,
    {
      label: "Interview support",
      text: `Interview: candidate provided role-relevant answer evidence across ${interviewAssessment.usableResponseCount} of ${interviewAssessment.totalResponseCount} responses.`,
      detail:
        "Employer sharing is limited to accepted company-role matches with a recorded consent snapshot.",
      source: "match"
    },
    ...primaryMatch.gaps.slice(0, 1).map((gap) => ({
      label: "Remaining gap",
      text: gap,
      detail: "This gap remains visible for candidate review before any sharing decision.",
      source: "match" as const
    }))
  ];
}

function buildMissingEvidence(
  seed: CandidateDashboardSeed,
  matchGaps: readonly string[],
  interviewSession: InterviewSession | null,
  interviewAssessment: InterviewSessionEvidenceAssessment | null
): readonly string[] {
  const missingEvidence = new Set<string>();

  if (interviewSession && interviewSession.status !== "completed") {
    missingEvidence.add("Complete the interview before final score explanations are ready.");
  }

  for (const gap of interviewAssessment?.missingEvidence ?? []) {
    missingEvidence.add(gap);
  }

  for (const gap of matchGaps) {
    missingEvidence.add(gap);
  }

  if ((interviewAssessment?.confidenceScore ?? seed.interviewConfidence ?? 0) < 75) {
    missingEvidence.add("More interview answer evidence would improve confidence.");
  }

  if (seed.resumeParserConfidence < 90) {
    missingEvidence.add("A candidate correction pass may improve profile extraction confidence.");
  }

  if (missingEvidence.size === 0) {
    missingEvidence.add("No major missing evidence is flagged for this result.");
  }

  return [...missingEvidence].slice(0, 5);
}

function formatModuleLabel(moduleId: string): string {
  return moduleId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
