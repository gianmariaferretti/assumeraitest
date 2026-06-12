"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import {
  AUDIO_GAP_THRESHOLD_SECONDS,
  currentQuestion,
  type CandidateInterviewLanguageCode,
  type InterviewQuestion,
  type InterviewSession,
  type TurnIntegritySignals
} from "@/features/interview-flow";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import {
  LIVE_INTERVIEW_RESPONSE_WINDOW_SECONDS,
  RESPONSE_WINDOW_AUTOCONTINUE_SECONDS,
  appendLiveTranscriptEvent,
  canUseResponseSecondChance,
  createLiveInterviewShellState,
  createMockLiveInterviewProviderSession,
  createTimedOutResponseText,
  pauseLiveInterview,
  resumeLiveInterview,
  shouldRestoreLiveInterviewProviderSession,
  syncLiveInterviewProviderWithQuestion,
  type LiveInterviewProviderSession
} from "@/features/live-interview";

import { CandidateViewfinder } from "./CandidateViewfinder";
import { InterviewFocusStyles } from "./InterviewFocusStyles";
import { VoiceTranscriptionControl } from "./VoiceTranscriptionControl";

const PROVIDER_STORAGE_KEY = "assumerai:live-interview-provider-session:v0";
const QUESTION_PREPARATION_SECONDS = 10;

function markInterviewCompletedOnDevice(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    "assumerai_interview_completed=true; path=/candidate; SameSite=Lax";
}

function clearInterviewCompletedOnDevice(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    "assumerai_interview_completed=; path=/candidate; SameSite=Lax; max-age=0";
}

type QuestionTransition = {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
  readonly actionLabel: string;
};

type TimedOutResponseState = {
  readonly questionId: string;
  readonly transcript: string;
  readonly autoContinueRemaining: number;
};

type SaveCapturedAnswerOptions = {
  readonly answerTextOverride?: string;
  readonly skipTransition?: boolean;
};

type QuestionPlanAudit = {
  readonly source: string;
  readonly providerModel?: string;
  readonly fallbackReason?: string;
  readonly generatedAt: string;
};

/**
 * Server-issued turn ticket. The client never decides which question is asked;
 * it can only answer the turn the server issued.
 */
type ActiveTurn = {
  readonly turnId: string;
  readonly moduleId: string;
  readonly questionId: string;
  readonly questionText: string;
  readonly issuedAt: string;
};

interface InterviewSessionClientProps {
  readonly initialSession: InterviewSession;
  readonly initialInterviewLanguage: CandidateInterviewLanguageCode;
  /** Pre-interview mode choice: text is a first-class equivalent mode. */
  readonly initialInterviewMode?: "voice" | "text";
  readonly initialQuestionPlanAudit?: QuestionPlanAudit;
}

function emptyTurnIntegritySignals(): {
  tabHiddenCount: number;
  windowBlurCount: number;
  pasteCount: number;
  audioGapCount: number;
  maxAudioGapSeconds: number;
  largestPasteChars: number;
  pasteBurstCount: number;
} {
  return {
    tabHiddenCount: 0,
    windowBlurCount: 0,
    pasteCount: 0,
    audioGapCount: 0,
    maxAudioGapSeconds: 0,
    largestPasteChars: 0,
    pasteBurstCount: 0
  };
}

/** Pastes inside this window count as one "burst" (content shape, not biometrics). */
const PASTE_BURST_WINDOW_MS = 10_000;

function activeModuleIdFor(session: InterviewSession): string | null {
  const planOrder = session.modulePlan
    .map((module) => module.id)
    .filter((id) => id in session.module_sessions);
  const order = planOrder.length > 0 ? planOrder : Object.keys(session.module_sessions);
  return (
    order.find((id) => {
      const moduleSession = session.module_sessions[id];
      return moduleSession.state !== "completed" && moduleSession.state !== "skipped";
    }) ?? null
  );
}

async function persistProviderSnapshotToServer(
  providerSession: LiveInterviewProviderSession
): Promise<void> {
  try {
    // The server derives the interview session from its own persisted state;
    // the client only contributes the presentation-layer provider session.
    await fetch("/candidate/interview/session-snapshot", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ providerSession })
    });
  } catch {
    // Local provider autosave remains the immediate recovery path if the network drops.
  }
}

function loadSavedProviderSession(
  interviewSessionId: string
): LiveInterviewProviderSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    const providerSession = JSON.parse(saved) as LiveInterviewProviderSession;
    if (
      shouldRestoreLiveInterviewProviderSession(providerSession, {
        interviewSessionId
      })
    ) {
      return providerSession;
    }

    window.localStorage.removeItem(PROVIDER_STORAGE_KEY);
    return null;
  } catch {
    window.localStorage.removeItem(PROVIDER_STORAGE_KEY);
    return null;
  }
}

function createProviderFor(session: InterviewSession): LiveInterviewProviderSession {
  return createMockLiveInterviewProviderSession(session);
}

function syncQuestionAfterPreparation(
  providerSession: LiveInterviewProviderSession,
  session: InterviewSession,
  questionId: string
): LiveInterviewProviderSession {
  const alreadyCaptured = providerSession.transcriptEvents.some(
    (event) => event.speaker === "interviewer" && event.questionId === questionId
  );
  if (alreadyCaptured) {
    return providerSession;
  }

  return syncLiveInterviewProviderWithQuestion(providerSession, session, new Date().toISOString());
}

function isTerminalProviderStatus(status: LiveInterviewProviderSession["status"]): boolean {
  return ["completed", "disconnected", "expired", "failed"].includes(status);
}

function createQuestionTransition(
  nextQuestion: InterviewQuestion | undefined,
  copy: ReturnType<typeof resolveCandidateFlowCopy>["interview"]
): QuestionTransition | null {
  if (!nextQuestion) {
    return null;
  }

  if (nextQuestion.followUpReason) {
    return copy.transitionFollowUp;
  }

  return copy.transitionSaved;
}

export function InterviewSessionClient({
  initialSession,
  initialInterviewLanguage,
  initialInterviewMode = "voice",
  initialQuestionPlanAudit
}: InterviewSessionClientProps) {
  const isTextMode = initialInterviewMode === "text";
  const copy = resolveCandidateFlowCopy(initialInterviewLanguage).interview;
  void initialQuestionPlanAudit;
  const snapshotPersistenceTimerRef = useRef<number | null>(null);
  // Honest integrity signals for the current turn: coarse counters only —
  // no keystroke logging, no camera analysis, no biometrics (safety.ts
  // philosophy). Reset whenever a new server turn is issued.
  const integritySignalsRef = useRef(emptyTurnIntegritySignals());
  const pasteTimestampsRef = useRef<number[]>([]);
  const lastVoiceActivityAtRef = useRef<number | null>(null);
  // Deepgram per-utterance confidences for the current turn (voice mode only):
  // averaged into asrConfidence for review routing, never a score input.
  const asrConfidencesRef = useRef<number[]>([]);
  const [session, setSession] = useState<InterviewSession>(initialSession);
  const [activeTurn, setActiveTurn] = useState<ActiveTurn | null>(null);
  const [providerSession, setProviderSession] = useState<LiveInterviewProviderSession>(() =>
    createProviderFor(initialSession)
  );
  const [capturedTranscript, setCapturedTranscript] = useState("");
  const [error, setError] = useState("");
  const [isVoiceCaptureActive, setIsVoiceCaptureActive] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [transition, setTransition] = useState<QuestionTransition | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);
  const [preparationQuestionId, setPreparationQuestionId] = useState<string | null>(
    initialSession.currentQuestionId || null
  );
  const [preparationRemaining, setPreparationRemaining] = useState(QUESTION_PREPARATION_SECONDS);
  const [responseAttempt, setResponseAttempt] = useState(1);
  const [responseTimeRemainingLabel, setResponseTimeRemainingLabel] = useState<string | null>(null);
  const [usedSecondChancesByQuestion, setUsedSecondChancesByQuestion] = useState<
    Record<string, number>
  >({});
  const [timedOutResponse, setTimedOutResponse] = useState<TimedOutResponseState | null>(null);

  const question = currentQuestion(session);
  const currentQuestionId = question?.id ?? null;
  const shellState = useMemo(
    () => createLiveInterviewShellState(session, providerSession, { lastSavedAt, copy }),
    [copy, lastSavedAt, providerSession, session]
  );
  const answerIsLocked =
    providerSession.status === "paused" ||
    isTerminalProviderStatus(providerSession.status);
  const isPreparingQuestion =
    Boolean(currentQuestionId) &&
    preparationQuestionId === currentQuestionId &&
    preparationRemaining > 0 &&
    !transition &&
    !shellState.completion.isComplete;
  const questionIsVisible =
    Boolean(question) && !isPreparingQuestion && !transition && !shellState.completion.isComplete;
  const responseWindowExpired = timedOutResponse?.questionId === currentQuestionId;
  const secondChancesUsed = currentQuestionId
    ? (usedSecondChancesByQuestion[currentQuestionId] ?? 0)
    : 0;
  const secondChanceAvailable =
    Boolean(responseWindowExpired) &&
    canUseResponseSecondChance({ usedSecondChances: secondChancesUsed });
  const activeVoiceQuestionId = currentQuestionId
    ? `${currentQuestionId}:attempt-${responseAttempt}`
    : null;
  const visibleQuestionPrompt = questionIsVisible ? shellState.question.prompt : "";
  const showAllIsOpen = !isPanelCollapsed && questionIsVisible;
  const visibleTranscriptEntries = questionIsVisible ? shellState.transcriptDrawer.entries : [];
  const shouldRecordResponse =
    questionIsVisible &&
    !answerIsLocked &&
    !responseWindowExpired &&
    capturedTranscript.trim().length === 0;
  const canSaveAnswer =
    Boolean(question) &&
    Boolean(activeTurn) &&
    !answerIsLocked &&
    !isVoiceCaptureActive &&
    !isSubmitting &&
    !responseWindowExpired &&
    capturedTranscript.trim().length > 0 &&
    !transition &&
    !isPreparingQuestion;

  /**
   * Ask the server to open (or resume) the active module and hand back the
   * server-issued turn. State always flows server -> client; the client never
   * posts session state.
   */
  const syncActiveTurn = useCallback(
    async (targetSession: InterviewSession): Promise<boolean> => {
      const moduleId = activeModuleIdFor(targetSession);
      if (!moduleId) {
        setActiveTurn(null);
        return false;
      }

      try {
        const response = await fetch(`/candidate/interview/module/${moduleId}/start`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });
        const data = (await response.json().catch(() => null)) as {
          readonly session?: InterviewSession;
          readonly turn?: ActiveTurn | null;
          readonly error?: { readonly message?: string };
        } | null;
        if (!response.ok || !data?.session) {
          setError(data?.error?.message ?? copy.restoreFailed);
          return false;
        }

        setSession(data.session);
        setActiveTurn(data.turn ?? null);
        setLastSavedAt(data.session.updatedAt);
        return true;
      } catch {
        setError(copy.restoreFailed);
        return false;
      }
    },
    [copy.restoreFailed]
  );

  useEffect(() => {
    const savedProvider = loadSavedProviderSession(initialSession.sessionId);
    if (savedProvider) {
      setProviderSession(savedProvider);
    }
    if (initialSession.status === "completed") {
      markInterviewCompletedOnDevice();
    } else {
      clearInterviewCompletedOnDevice();
      void syncActiveTurn(initialSession);
    }
    setIsHydrated(true);
  }, [initialSession, syncActiveTurn]);

  useEffect(() => {
    return () => {
      if (snapshotPersistenceTimerRef.current !== null) {
        window.clearTimeout(snapshotPersistenceTimerRef.current);
      }
    };
  }, []);

  // Collect coarse focus/paste signals for the active turn (counts + paste
  // shape only — never the pasted content itself, never keystrokes).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        integritySignalsRef.current.tabHiddenCount += 1;
      }
    };
    const onWindowBlur = () => {
      integritySignalsRef.current.windowBlurCount += 1;
    };
    const onPaste = (event: ClipboardEvent) => {
      integritySignalsRef.current.pasteCount += 1;
      // Paste SHAPE: size of the largest single insertion and the densest
      // burst inside a short window. The pasted text is read for its length
      // only and immediately discarded.
      const pastedLength = event.clipboardData?.getData("text")?.length ?? 0;
      integritySignalsRef.current.largestPasteChars = Math.max(
        integritySignalsRef.current.largestPasteChars,
        pastedLength
      );
      const now = Date.now();
      pasteTimestampsRef.current = [
        ...pasteTimestampsRef.current.filter((at) => now - at <= PASTE_BURST_WINDOW_MS),
        now
      ];
      integritySignalsRef.current.pasteBurstCount = Math.max(
        integritySignalsRef.current.pasteBurstCount,
        pasteTimestampsRef.current.length
      );
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  // A fresh server turn starts a fresh signal window.
  useEffect(() => {
    integritySignalsRef.current = emptyTurnIntegritySignals();
    pasteTimestampsRef.current = [];
    lastVoiceActivityAtRef.current = null;
    asrConfidencesRef.current = [];
  }, [activeTurn?.turnId]);

  const recordAsrConfidence = useCallback((confidence: number) => {
    if (Number.isFinite(confidence) && confidence >= 0 && confidence <= 1) {
      asrConfidencesRef.current.push(confidence);
    }
  }, []);

  /** Track audio continuity: long gaps between transcript updates while recording. */
  const recordVoiceActivity = useCallback(() => {
    const now = Date.now();
    const last = lastVoiceActivityAtRef.current;
    if (last !== null) {
      const gapSeconds = (now - last) / 1000;
      if (gapSeconds >= AUDIO_GAP_THRESHOLD_SECONDS) {
        integritySignalsRef.current.audioGapCount += 1;
        integritySignalsRef.current.maxAudioGapSeconds = Math.max(
          integritySignalsRef.current.maxAudioGapSeconds,
          gapSeconds
        );
      }
    }
    lastVoiceActivityAtRef.current = now;
  }, []);

  const handleVoiceCaptureActiveChange = useCallback((active: boolean) => {
    setIsVoiceCaptureActive(active);
    lastVoiceActivityAtRef.current = active ? Date.now() : null;
  }, []);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(providerSession));
        if (snapshotPersistenceTimerRef.current !== null) {
          window.clearTimeout(snapshotPersistenceTimerRef.current);
        }
        snapshotPersistenceTimerRef.current = window.setTimeout(() => {
          void persistProviderSnapshotToServer(providerSession);
        }, 350);
      } catch {
        setError(copy.autosaveFailed);
      }
    }
  }, [copy.autosaveFailed, isHydrated, providerSession]);

  useEffect(() => {
    if (!currentQuestionId || transition || shellState.completion.isComplete) {
      return;
    }

    setCapturedTranscript("");
    setTimedOutResponse(null);
    setResponseAttempt(1);
    setResponseTimeRemainingLabel(null);
    setPreparationQuestionId(currentQuestionId);
    setPreparationRemaining(QUESTION_PREPARATION_SECONDS);
  }, [currentQuestionId, shellState.completion.isComplete, transition]);

  useEffect(() => {
    if (
      !isHydrated ||
      !currentQuestionId ||
      transition ||
      shellState.completion.isComplete ||
      preparationQuestionId !== currentQuestionId ||
      preparationRemaining <= 0
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPreparationRemaining((remaining) => Math.max(remaining - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    currentQuestionId,
    isHydrated,
    preparationQuestionId,
    preparationRemaining,
    shellState.completion.isComplete,
    transition
  ]);

  useEffect(() => {
    if (!questionIsVisible || !currentQuestionId) {
      return;
    }

    setProviderSession((current) =>
      syncQuestionAfterPreparation(current, session, currentQuestionId)
    );
  }, [currentQuestionId, questionIsVisible, session]);

  const expireCurrentProviderSession = useCallback((message: string) => {
    const expiredAt = new Date().toISOString();
    setProviderSession((current) =>
      isTerminalProviderStatus(current.status)
        ? current
        : {
            ...current,
            status: "expired",
            updatedAt: expiredAt,
            endedAt: expiredAt,
            endReason: "session_duration_cap_reached",
            billingStoppedAt: expiredAt,
            rawMedia: {
              ...current.rawMedia,
              stored: false,
              deleted: true,
              deletedAt: expiredAt
            }
          }
    );
    setIsVoiceCaptureActive(false);
    setResponseTimeRemainingLabel(null);
    setError(message);
  }, []);

  useEffect(() => {
    if (!isHydrated || isTerminalProviderStatus(providerSession.status)) {
      return;
    }

    const expiresAtMs = new Date(providerSession.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      return;
    }

    const expireMessage = copy.timedOut;
    const millisecondsUntilExpiry = expiresAtMs - Date.now();
    if (millisecondsUntilExpiry <= 0) {
      expireCurrentProviderSession(expireMessage);
      return;
    }

    const timer = window.setTimeout(
      () => expireCurrentProviderSession(expireMessage),
      Math.min(millisecondsUntilExpiry, 2_147_483_647)
    );

    return () => window.clearTimeout(timer);
  }, [
    copy.timedOut,
    expireCurrentProviderSession,
    isHydrated,
    providerSession.expiresAt,
    providerSession.status
  ]);

  const saveCapturedAnswer = useCallback(
    async (options: SaveCapturedAnswerOptions = {}): Promise<boolean> => {
      if (!question || isSubmitting) {
        return false;
      }

      if (providerSession.status === "paused") {
        setError(copy.resumeBeforeSaving);
        return false;
      }

      if (isTerminalProviderStatus(providerSession.status)) {
        setError(copy.endedReviewOrRestart);
        return false;
      }

      if (new Date() > new Date(providerSession.expiresAt)) {
        expireCurrentProviderSession(copy.timedOut);
        return false;
      }

      if (providerSession.transcriptEvents.length >= providerSession.caps.maxTranscriptEvents) {
        setProviderSession((current) => ({
          ...current,
          status: "expired",
          updatedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          endReason: "transcript_event_cap_reached",
          billingStoppedAt: new Date().toISOString()
        }));
        setError(copy.transcriptLimit);
        return false;
      }

      const answerText = (options.answerTextOverride ?? capturedTranscript).trim();
      if (!answerText) {
        setError(copy.transcriptNotReady);
        return false;
      }

      if (!activeTurn) {
        // No server-issued turn (e.g. after a disconnect): resync, then ask the
        // candidate to save again against the reissued turn.
        await syncActiveTurn(session);
        setError(copy.answerCouldNotSave);
        return false;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/candidate/interview/turn", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            moduleId: activeTurn.moduleId,
            turnId: activeTurn.turnId,
            candidateAnswer: { answerText },
            integritySignals: { ...integritySignalsRef.current } satisfies TurnIntegritySignals,
            ...(asrConfidencesRef.current.length > 0
              ? {
                  asrConfidence:
                    asrConfidencesRef.current.reduce((sum, value) => sum + value, 0) /
                    asrConfidencesRef.current.length
                }
              : {})
          })
        });
        const data = (await response.json().catch(() => null)) as {
          readonly session?: InterviewSession;
          readonly interviewerText?: string;
          readonly nextTurn?: ActiveTurn | null;
          readonly error?: { readonly message?: string };
        } | null;

        if (!response.ok || !data?.session) {
          if (response.status === 409) {
            // Stale or already-evaluated turn: resync to the server's view.
            await syncActiveTurn(session);
          }
          setError(data?.error?.message ?? copy.answerCouldNotSave);
          return false;
        }

        const updated = data.session;
        const answeredAt = new Date().toISOString();
        if (updated.status === "completed") {
          markInterviewCompletedOnDevice();
        }

        setSession(updated);
        setActiveTurn(data.nextTurn ?? null);
        setLastSavedAt(updated.updatedAt);
        setProviderSession((current) => {
          let next = appendLiveTranscriptEvent(current, {
            speaker: "candidate",
            kind: "answer",
            text: answerText,
            questionId: activeTurn.questionId,
            at: answeredAt
          });
          const interviewerText = data.interviewerText?.trim();
          if (interviewerText) {
            next = appendLiveTranscriptEvent(next, {
              speaker: "interviewer",
              kind: "system_note",
              text: interviewerText,
              questionId: activeTurn.questionId,
              at: answeredAt
            });
          }
          return updated.status === "completed"
            ? syncLiveInterviewProviderWithQuestion(next, updated, answeredAt)
            : next;
        });
        setCapturedTranscript("");
        setIsVoiceCaptureActive(false);
        setTimedOutResponse(null);
        setResponseTimeRemainingLabel(null);
        setResponseAttempt(1);
        setTransition(
          options.skipTransition ? null : createQuestionTransition(currentQuestion(updated), copy)
        );
        setError("");
        return true;
      } catch {
        setError(copy.answerCouldNotSave);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      activeTurn,
      capturedTranscript,
      copy,
      expireCurrentProviderSession,
      isSubmitting,
      providerSession,
      question,
      session,
      syncActiveTurn
    ]
  );

  const handleResponseTimeExpired = useCallback((transcript: string) => {
    if (!currentQuestionId) {
      return;
    }

    const trimmedTranscript = transcript.trim();
    setCapturedTranscript(trimmedTranscript);
    setResponseTimeRemainingLabel(null);
    setTimedOutResponse({
      questionId: currentQuestionId,
      transcript: trimmedTranscript,
      autoContinueRemaining: RESPONSE_WINDOW_AUTOCONTINUE_SECONDS
    });
    setIsVoiceCaptureActive(false);
    setError("");
  }, [currentQuestionId]);

  const continueAfterTimeout = useCallback(() => {
    if (!timedOutResponse) {
      return;
    }

    void saveCapturedAnswer({
      answerTextOverride: createTimedOutResponseText(timedOutResponse.transcript),
      skipTransition: true
    });
  }, [saveCapturedAnswer, timedOutResponse]);

  const startSecondChance = useCallback(() => {
    if (!currentQuestionId || !secondChanceAvailable) {
      return;
    }

    setUsedSecondChancesByQuestion((current) => ({
      ...current,
      [currentQuestionId]: (current[currentQuestionId] ?? 0) + 1
    }));
    setCapturedTranscript("");
    setTimedOutResponse(null);
    setResponseTimeRemainingLabel(null);
    setError("");
    setResponseAttempt((attempt) => attempt + 1);
  }, [currentQuestionId, secondChanceAvailable]);

  useEffect(() => {
    if (!responseWindowExpired || !timedOutResponse || !question) {
      return;
    }

    if (timedOutResponse.autoContinueRemaining <= 0) {
      continueAfterTimeout();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimedOutResponse((current) =>
        current && current.questionId === timedOutResponse.questionId
          ? {
              ...current,
              autoContinueRemaining: Math.max(current.autoContinueRemaining - 1, 0)
            }
          : current
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [continueAfterTimeout, question, responseWindowExpired, timedOutResponse]);

  function resumeSavedSession() {
    // Resume = resync with the server-authoritative session and its pending
    // turn; the locally saved provider session (transcript shell) is restored
    // separately on mount.
    void syncActiveTurn(session).then((synced) => {
      if (synced) {
        setCapturedTranscript("");
        setIsVoiceCaptureActive(false);
        setTimedOutResponse(null);
        setResponseAttempt(1);
        setTransition(null);
        setError("");
      }
    });
  }

  function resetSession() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(copy.confirmStartOver)
    ) {
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/candidate/interview/session/reset", {
          method: "POST",
          headers: { Accept: "application/json" }
        });
        const data = (await response.json().catch(() => null)) as {
          readonly session?: InterviewSession;
          readonly error?: { readonly message?: string };
        } | null;
        if (!response.ok || !data?.session) {
          setError(data?.error?.message ?? copy.restoreFailed);
          return;
        }

        const freshSession = data.session;
        setSession(freshSession);
        setActiveTurn(null);
        setProviderSession(createProviderFor(freshSession));
        setCapturedTranscript("");
        setIsVoiceCaptureActive(false);
        setTimedOutResponse(null);
        setResponseTimeRemainingLabel(null);
        setResponseAttempt(1);
        setUsedSecondChancesByQuestion({});
        setPreparationQuestionId(freshSession.currentQuestionId || null);
        setPreparationRemaining(QUESTION_PREPARATION_SECONDS);
        setTransition(null);
        setError("");
        setLastSavedAt(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(PROVIDER_STORAGE_KEY);
        }
        clearInterviewCompletedOnDevice();
        void syncActiveTurn(freshSession);
      } catch {
        setError(copy.restoreFailed);
      }
    })();
  }

  function captureTranscribedAnswer(transcript: string) {
    recordVoiceActivity();
    setCapturedTranscript(transcript.trim());
    setError("");
  }

  return (
    <main className="interview-focus-shell">
      <InterviewFocusStyles />
      <div className="interview-backdrop" aria-hidden="true" />
      <CandidateProgressRail current="interview" language={initialInterviewLanguage} />

      <section className="interview-focus-frame" aria-label={copy.workspaceLabel}>
        <header className="interview-focus-top">
          <div>
            <span className="session-kicker">{shellState.question.moduleLabel}</span>
            <h1>{shellState.question.progressLabel}</h1>
          </div>
          <p>{copy.workspaceLabel}</p>
        </header>

        <section className="conversation-stage" aria-live="polite">
          <div className="interview-call-grid">
            <section
              className="avatar-video-feed glass-video-pane"
              data-motion={shellState.avatar.motionState}
              aria-label={copy.interviewVideoAria}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/candidate-interview/avatar.png"
                alt={copy.avatarAlt}
                className="avatar-image"
              />

              {shellState.avatar.motionState === "paused" && (
                <div className="video-overlay paused-overlay">
                  <span>{copy.sessionPaused}</span>
                  <small>{copy.resumeWhenReady}</small>
                </div>
              )}

              {shellState.avatar.motionState === "complete" && (
                <div className="video-overlay complete-overlay">
                  <span>{copy.sessionComplete}</span>
                  <small>{copy.answersPrivate}</small>
                </div>
              )}

              <div className="avatar-name-tag">
                <span>{copy.interviewVideo}</span>
                <strong>{shellState.avatar.name || "Amara"}</strong>
              </div>
            </section>

            <CandidateViewfinder
              isPaused={providerSession.status === "paused"}
              isComplete={shellState.completion.isComplete}
              language={initialInterviewLanguage}
              responseTimeRemainingLabel={responseTimeRemainingLabel}
            >
              <div className="camera-control-stack">
                {questionIsVisible && isTextMode ? (
                  // Text mode: a first-class equivalent input. The typed answer
                  // replaces the transcript; everything downstream is
                  // mode-agnostic.
                  <textarea
                    aria-label={copy.transcribedResponse}
                    className="text-mode-answer"
                    disabled={answerIsLocked}
                    onChange={(event) => {
                      setCapturedTranscript(event.target.value);
                      setError("");
                    }}
                    placeholder={copy.spokenResponsePlaceholder}
                    rows={6}
                    value={capturedTranscript}
                  />
                ) : null}
                {questionIsVisible && !isTextMode ? (
                  <VoiceTranscriptionControl
                    activeQuestionId={activeVoiceQuestionId}
                    disabled={
                      answerIsLocked ||
                      (!isVoiceCaptureActive && capturedTranscript.trim().length > 0)
                    }
                    interviewLanguage={session.interviewLanguage}
                    maxDurationSeconds={LIVE_INTERVIEW_RESPONSE_WINDOW_SECONDS}
                    onAsrConfidence={recordAsrConfidence}
                    onCaptureActiveChange={handleVoiceCaptureActiveChange}
                    onError={setError}
                    onRemainingTimeChange={setResponseTimeRemainingLabel}
                    onTimeExpired={handleResponseTimeExpired}
                    onTranscript={captureTranscribedAnswer}
                    shouldRecord={shouldRecordResponse}
                  />
                ) : null}

                {responseWindowExpired && timedOutResponse ? (
                  <div className="response-window-expired-card" aria-live="polite">
                    <strong>{copy.answerTimeEnded}</strong>
                    <span>
                      {secondChanceAvailable
                        ? copy.microphoneOffSaveWithRetry.replace(
                            "{seconds}",
                            String(timedOutResponse.autoContinueRemaining)
                          )
                        : copy.microphoneOffSave.replace(
                            "{seconds}",
                            String(timedOutResponse.autoContinueRemaining)
                          )}
                    </span>
                    <div className="response-window-expired-actions">
                      {secondChanceAvailable ? (
                        <button
                          className="control-btn btn-secondary"
                          onClick={startSecondChance}
                          type="button"
                        >
                          {copy.tryAgain}
                        </button>
                      ) : null}
                      <button
                        className="control-btn btn-primary"
                        onClick={continueAfterTimeout}
                        type="button"
                      >
                        {copy.saveCaptured}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="candidate-control-row candidate-control-row--primary">
                  <button
                    disabled={!canSaveAnswer}
                    onClick={() => void saveCapturedAnswer()}
                    type="button"
                    className="submit-answer-btn"
                  >
                    {copy.save}
                  </button>
                  <button
                    className="control-btn btn-secondary"
                    disabled={!shellState.controls.canPause && !shellState.controls.canResume}
                    onClick={() =>
                      setProviderSession((current) =>
                        shellState.controls.canResume
                          ? resumeLiveInterview(current)
                          : pauseLiveInterview(current)
                      )
                    }
                    type="button"
                  >
                    {shellState.controls.canResume ? copy.continueInterview : copy.pauseInterview}
                  </button>
                </div>

                <details className="candidate-session-options">
                  <summary>{copy.options}</summary>
                  <div className="candidate-session-options-grid">
                    <button className="control-btn btn-outline" onClick={resumeSavedSession} type="button">
                      {copy.resumeSaved}
                    </button>
                    <button className="control-btn btn-danger" onClick={resetSession} type="button">
                      {copy.startOver}
                    </button>
                  </div>
                </details>

                {error ? <p className="interview-error-banner">{error}</p> : null}
              </div>
            </CandidateViewfinder>
          </div>

          {isPreparingQuestion && !shellState.completion.isComplete && !transition ? (
            <div className="question-preparation-card" aria-live="polite">
              <span className="question-label">{copy.prepare}</span>
              <p className="question-text">
                {copy.questionAppearsPrefix} {preparationRemaining}{" "}
                {preparationRemaining === 1
                  ? copy.questionAppearsSuffixSingular
                  : copy.questionAppearsSuffixPlural}
              </p>
            </div>
          ) : null}

          {questionIsVisible ? (
            <section className="floating-question-card" aria-label={copy.currentQuestion}>
              <div>
                <span className="question-label">{copy.currentQuestion}</span>
                <p className="question-text">{visibleQuestionPrompt}</p>
              </div>
              <button
                aria-expanded={showAllIsOpen}
                className="panel-toggle-button"
                onClick={() => setIsPanelCollapsed((current) => !current)}
                type="button"
              >
                {showAllIsOpen ? copy.hide : copy.showAll}
              </button>
            </section>
          ) : null}

          {showAllIsOpen ? (
            <section className="response-dock" aria-label={copy.transcriptAria}>
              <div className="transcript-container" aria-label={copy.transcript}>
                <div className="transcript-heading-row">
                  <span className="transcript-title">{copy.transcript}</span>
                  <span className="transcript-privacy-label">{copy.candidatePrivate}</span>
                </div>
                <div className="transcript-content">
                  {visibleTranscriptEntries.length > 0 ? (
                    <div className="chat-transcript-timeline">
                      {visibleTranscriptEntries.map((entry) => {
                        const isInterviewer = entry.speaker === "interviewer";
                        return (
                          <div
                            key={entry.transcriptEventId}
                            className={`chat-bubble-row ${
                              isInterviewer ? "from-interviewer" : "from-candidate"
                            }`}
                          >
                            <div className="chat-bubble-meta">
                              <strong>{isInterviewer ? "Amara" : copy.you}</strong>
                              <span className="bubble-time">
                                {entry.occurredAt
                                  ? new Date(entry.occurredAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })
                                  : ""}
                              </span>
                            </div>
                            <div className="chat-bubble-payload">
                              <p>{entry.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-transcript-state">
                      <p>{shellState.transcriptDrawer.emptyLabel}</p>
                    </div>
                  )}
                </div>
              </div>

              <section className="captured-response-readonly" aria-label={copy.transcribedResponse}>
                <div className="readonly-response-heading">
                  <span>{copy.transcribedResponse}</span>
                  <strong>{copy.readOnly}</strong>
                </div>
                <p>{capturedTranscript || copy.spokenResponsePlaceholder}</p>
              </section>
            </section>
          ) : null}

          {transition ? (
            <div className="interview-status-card">
              <span className="transition-eyebrow">{transition.eyebrow}</span>
              <h2>{transition.title}</h2>
              <p className="transition-detail">{transition.detail}</p>
              <button className="action-btn-primary" onClick={() => setTransition(null)} type="button">
                {transition.actionLabel}
              </button>
            </div>
          ) : null}

          {shellState.completion.isComplete ? (
            <div className="interview-status-card">
              <span className="completion-label">{copy.complete}</span>
              <h2>{shellState.completion.title}</h2>
              <p className="complete-detail">{shellState.completion.detail}</p>
              <div className="question-actions-row">
                <Link href="/candidate/results" className="action-btn-primary">
                  {shellState.completion.nextActionLabel || copy.continueFallback}
                </Link>
                <button className="action-btn-secondary" onClick={resetSession} type="button">
                  {copy.startAgain}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
