import {
  createInterviewUxState,
  currentQuestion,
  type InterviewSession
} from "../interview-flow";
import type {
  CreateLiveInterviewShellStateOptions,
  LiveInterviewAvatarMotionState,
  LiveInterviewSessionStatus,
  LiveInterviewProviderSession,
  LiveInterviewShellState,
  LiveInterviewTranscriptEvent
} from "./types";
import type { CandidateFlowCopy } from "../interview-flow/candidate-flow-copy";

const SENSITIVE_DISCLOSURE_PATTERN =
  /\b(accent|native speaker|face|facial|emotion|personality|biometric|age|years old|born|race|ethnic|religion|gender|disab|health|medical|pregnan|caregiv|family status|marital status|sexual orientation|nationality)\b/i;

const TERMINAL_PROVIDER_STATUSES = new Set<LiveInterviewSessionStatus>([
  "completed",
  "disconnected",
  "expired",
  "failed"
]);

type InterviewShellCopy = CandidateFlowCopy["interview"]["shell"];

function formatSavedAt(savedAt?: string | null, copy?: InterviewShellCopy): string {
  if (!savedAt) {
    return copy?.autosaveReady ?? "Autosave ready";
  }

  const timePart = savedAt.match(/T(\d{2}:\d{2})/)?.[1];
  return `${copy?.autosaved ?? "Autosaved"} ${timePart ?? savedAt}`;
}

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function motionState(
  interviewSession: InterviewSession,
  providerSession: LiveInterviewProviderSession
): LiveInterviewAvatarMotionState {
  if (interviewSession.status === "completed" || isTerminalProviderSession(providerSession)) {
    return "complete";
  }

  if (providerSession.status === "paused") {
    return "paused";
  }

  return "listening";
}

function statusLabel(
  interviewSession: InterviewSession,
  providerSession: LiveInterviewProviderSession,
  copy?: InterviewShellCopy
): string {
  if (interviewSession.status === "completed" || providerSession.status === "completed") {
    return copy?.completeStatus ?? "Complete";
  }

  if (providerSession.status === "expired") {
    return copy?.expired ?? "Expired";
  }

  if (providerSession.status === "disconnected") {
    return copy?.disconnected ?? "Disconnected";
  }

  if (providerSession.status === "failed") {
    return copy?.needsReview ?? "Needs review";
  }

  if (providerSession.status === "paused") {
    return copy?.paused ?? "Paused";
  }

  if (providerSession.fallback.active) {
    return copy?.textFallback ?? "Text fallback";
  }

  return copy?.active ?? "Active";
}

function avatarDetail(
  interviewSession: InterviewSession,
  providerSession: LiveInterviewProviderSession,
  copy?: InterviewShellCopy
): string {
  if (interviewSession.status === "completed" || providerSession.status === "completed") {
    return copy?.completedDetail ?? "Your answers are saved for candidate review before any sharing choice.";
  }

  if (providerSession.status === "expired") {
    return copy?.expiredDetail ?? "This interview session expired. Start again when you are ready; expiration has no negative score impact.";
  }

  if (providerSession.status === "disconnected") {
    return copy?.disconnectedDetail ?? "The live connection ended. Continue only after review or restart; the disconnect has no negative score impact.";
  }

  if (providerSession.status === "failed") {
    return copy?.failedDetail ?? "The interview session hit a technical issue and needs review before scoring.";
  }

  if (providerSession.status === "paused") {
    return copy?.pausedDetail ?? "Paused by you. Resume when you are ready to continue the same question.";
  }

  if (providerSession.textFallbackEnabled) {
    return copy?.textFallbackDetail ?? "Text fallback is active. Type your answer and save it when ready.";
  }

  return copy?.mockDetail ?? "Mock mode is active, so no external avatar vendor or paid key is required.";
}

export function createLiveInterviewShellState(
  interviewSession: InterviewSession,
  providerSession: LiveInterviewProviderSession,
  options: CreateLiveInterviewShellStateOptions = {}
): LiveInterviewShellState {
  const copy = options.copy;
  const shellCopy = copy?.shell;
  const question = currentQuestion(interviewSession);
  const uxState = createInterviewUxState(interviewSession, {
    lastSavedAt: options.lastSavedAt,
    copy: copy?.ux
  });
  const activeModule = interviewSession.modulePlan[interviewSession.currentModuleIndex];
  const isComplete =
    interviewSession.status === "completed" || isTerminalProviderSession(providerSession);

  return {
    avatar: {
      name: providerSession.avatarName,
      statusLabel: statusLabel(interviewSession, providerSession, shellCopy),
      detail: avatarDetail(interviewSession, providerSession, shellCopy),
      motionState: motionState(interviewSession, providerSession)
    },
    question: {
      prompt: question?.prompt ?? shellCopy?.allQuestionsComplete ?? "All questions are complete.",
      moduleLabel: activeModule?.title ?? shellCopy?.interview ?? "Interview",
      progressLabel: uxState.progressLabel,
      isOnlyVisibleQuestion: true
    },
    transcriptDrawer: {
      isOpen: providerSession.transcriptDrawerOpen,
      title: shellCopy?.transcriptTitle ?? "Transcript",
      emptyLabel:
        shellCopy?.transcriptEmpty ?? "Transcript appears here as the mock interview progresses.",
      entries: providerSession.transcriptEvents
    },
    textFallback: {
      enabled: providerSession.textFallbackEnabled,
      label: providerSession.textFallbackEnabled
        ? shellCopy?.textFallbackOn ?? "Text fallback on"
        : shellCopy?.voiceFirst ?? "Voice first",
      helperText: providerSession.textFallbackEnabled
        ? shellCopy?.typeFallback ??
          "Type the answer in the fallback box. It is saved as transcript content."
        : shellCopy?.switchToText ??
          "Switch to text if speaking is not comfortable or available."
    },
    controls: {
      canPause: !isComplete && providerSession.status !== "paused",
      canResume: !isComplete && providerSession.status === "paused",
      canUseTextFallback: !isComplete && !providerSession.textFallbackEnabled,
      primaryActionLabel: providerSession.textFallbackEnabled
        ? shellCopy?.saveTypedAnswer ?? "Save typed answer"
        : shellCopy?.answerByVoice ?? "Answer by voice"
    },
    completion: {
      isComplete,
      title: isComplete
        ? shellCopy?.interviewComplete ?? "Interview complete"
        : shellCopy?.interviewInProgress ?? "Interview in progress",
      nextActionLabel: isComplete
        ? shellCopy?.reviewScoreExplanation ?? "Review score explanation"
        : shellCopy?.continueInterview ?? "Continue interview",
      detail: isComplete
        ? shellCopy?.completionDetail ??
          "Review explanations, confidence, missing evidence, and sharing choices before any employer access."
        : shellCopy?.progressDetail ??
          "Answer one question at a time. You can pause, resume, or use text fallback."
    },
    safetyNotice: providerSession.compliance.candidateTransparencyNotice,
    saveStateLabel: formatSavedAt(options.lastSavedAt, shellCopy)
  };
}

export function pauseLiveInterview(
  session: LiveInterviewProviderSession,
  now?: string
): LiveInterviewProviderSession {
  if (isTerminalProviderSession(session)) {
    return session;
  }

  return {
    ...session,
    status: "paused",
    updatedAt: nowIso(now)
  };
}

export function resumeLiveInterview(
  session: LiveInterviewProviderSession,
  now?: string
): LiveInterviewProviderSession {
  if (isTerminalProviderSession(session)) {
    return session;
  }

  return {
    ...session,
    status: session.fallback.active ? "fallback_active" : "active",
    updatedAt: nowIso(now)
  };
}

export function enableTextFallback(
  session: LiveInterviewProviderSession,
  now?: string
): LiveInterviewProviderSession {
  if (isTerminalProviderSession(session)) {
    return session;
  }

  const timestamp = nowIso(now);
  return {
    ...session,
    status: session.status === "paused" ? "paused" : "fallback_active",
    mode: "text",
    fallback: {
      active: true,
      mode: "text",
      reason: session.compliance.consent.mediaProcessingConsentSatisfied
        ? session.fallback.reason
        : "media_consent_missing",
      activatedAt: session.fallback.activatedAt ?? timestamp,
      message:
        "Text fallback is available without media consent and has no negative score impact.",
      noNegativeScoreImpact: true,
      humanReviewRequired: session.fallback.humanReviewRequired
    },
    textFallbackEnabled: true,
    updatedAt: timestamp
  };
}

export function setTranscriptDrawerOpen(
  session: LiveInterviewProviderSession,
  isOpen: boolean,
  now?: string
): LiveInterviewProviderSession {
  return {
    ...session,
    transcriptDrawerOpen: isOpen,
    updatedAt: nowIso(now)
  };
}

export function appendLiveTranscriptEvent(
  session: LiveInterviewProviderSession,
  input: {
    readonly speaker: LiveInterviewTranscriptEvent["speaker"];
    readonly kind: LiveInterviewTranscriptEvent["kind"];
    readonly text: string;
    readonly questionId?: string;
    readonly at?: string;
  }
): LiveInterviewProviderSession {
  const text = input.text.trim();
  if (!text) {
    throw new Error("Transcript text is required.");
  }

  const timestamp = nowIso(input.at);
  const transcriptEventId = `${session.providerSessionId}_transcript_${
    session.transcriptEvents.length + 1
  }`;
  const containsSensitiveCandidateDisclosure =
    input.speaker === "candidate" && SENSITIVE_DISCLOSURE_PATTERN.test(text);
  const event: LiveInterviewTranscriptEvent = {
    transcriptEventId,
    providerSessionId: session.providerSessionId,
    speaker: input.speaker,
    kind: input.kind,
    text,
    questionId: input.questionId,
    occurredAt: timestamp,
    evidenceHook: {
      evidenceId: `${transcriptEventId}_evidence`,
      source: "interview_transcript",
      transcriptEventId,
      scoringAllowed: true,
      rawMediaIncluded: false,
      allowedUse: "score_transcript_content_with_human_review",
      humanReviewRequired: containsSensitiveCandidateDisclosure
    },
    visibilityScope: containsSensitiveCandidateDisclosure
      ? "candidate_private_sensitive_review"
      : "candidate_private",
    containsSensitiveCandidateDisclosure
  };

  return {
    ...session,
    transcriptEvents: [...session.transcriptEvents, event],
    updatedAt: timestamp
  };
}

function isTerminalProviderSession(session: LiveInterviewProviderSession): boolean {
  return TERMINAL_PROVIDER_STATUSES.has(session.status);
}

export function syncLiveInterviewProviderWithQuestion(
  providerSession: LiveInterviewProviderSession,
  interviewSession: InterviewSession,
  now?: string
): LiveInterviewProviderSession {
  const timestamp = nowIso(now);
  if (interviewSession.status === "completed") {
    return {
      ...providerSession,
      status: "completed",
      updatedAt: timestamp,
      endedAt: timestamp,
      endReason: "completed",
      billingStoppedAt: timestamp,
      rawMedia: {
        ...providerSession.rawMedia,
        deleted: true,
        deletedAt: timestamp
      }
    };
  }

  const question = currentQuestion(interviewSession);
  if (!question) {
    return providerSession;
  }

  const alreadyCaptured = providerSession.transcriptEvents.some(
    (event) => event.speaker === "interviewer" && event.questionId === question.id
  );
  if (alreadyCaptured) {
    return {
      ...providerSession,
      status: providerSession.status === "paused" ? "paused" : providerSession.status
    };
  }

  return appendLiveTranscriptEvent(providerSession, {
    speaker: "interviewer",
    kind: "question",
    text: question.prompt,
    questionId: question.id,
    at: timestamp
  });
}
