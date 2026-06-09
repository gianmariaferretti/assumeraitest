"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import {
  createInterviewSession,
  currentQuestion,
  deriveResponseAnalysisFlags,
  recordInterviewResponse,
  resumeInterviewSession,
  serializeInterviewSession,
  type CandidateInterviewLanguageCode,
  type InterviewQuestion,
  type ResponseAnalysisFlags,
  type InterviewSession
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
import type { CandidateProfile } from "@/features/resume-parsing";

import { CandidateViewfinder } from "./CandidateViewfinder";
import { InterviewFocusStyles } from "./InterviewFocusStyles";
import { VoiceTranscriptionControl } from "./VoiceTranscriptionControl";
import { candidateInterviewPreviewRole } from "./interview-preview-role";

const STORAGE_KEY = "assumerai:candidate-interview-session:v0";
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
  readonly analysisFlagsOverride?: ResponseAnalysisFlags;
  readonly skipTransition?: boolean;
};

type QuestionPlanAudit = {
  readonly source: string;
  readonly providerModel?: string;
  readonly fallbackReason?: string;
  readonly generatedAt: string;
};

interface CreateLocalSessionOptions {
  readonly candidateProfile?: CandidateProfile;
  readonly interviewLanguage: CandidateInterviewLanguageCode;
  readonly questionBank?: InterviewQuestion[];
}

interface InterviewSessionClientProps {
  readonly initialCandidateProfile?: CandidateProfile;
  readonly initialInterviewLanguage: CandidateInterviewLanguageCode;
  readonly initialQuestionBank?: InterviewQuestion[];
  readonly initialQuestionPlanAudit?: QuestionPlanAudit;
}

function createLocalSession(options: CreateLocalSessionOptions): InterviewSession {
  return createInterviewSession({
    candidateId: options.candidateProfile?.candidate_id ?? "candidate_local",
    interviewLanguage: options.interviewLanguage,
    roleProfile: candidateInterviewPreviewRole,
    candidateProfile: options.questionBank ? undefined : options.candidateProfile,
    questionBank: options.questionBank,
    sessionId: `interview_session_local_${Date.now().toString(36)}`
  });
}

function savedSessionMatchesInitialQuestions(
  savedSession: InterviewSession,
  initialSession: InterviewSession
): boolean {
  return (
    savedSession.candidateId === initialSession.candidateId &&
    savedSession.roleId === initialSession.roleId &&
    savedSession.interviewLanguage === initialSession.interviewLanguage &&
    savedSession.questions.length === initialSession.questions.length &&
    savedSession.questions.every((question, index) => {
      const initialQuestion = initialSession.questions[index];
      return question.id === initialQuestion?.id && question.prompt === initialQuestion.prompt;
    })
  );
}

async function persistInterviewSnapshotToServer(payload: {
  readonly session: InterviewSession;
  readonly providerSession: LiveInterviewProviderSession;
  readonly questionPlan: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch("/candidate/interview/session-snapshot", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    // Local browser autosave remains the immediate recovery path if the network drops.
  }
}

function clearSavedInterviewFromDevice(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(PROVIDER_STORAGE_KEY);
  clearInterviewCompletedOnDevice();
}

function loadSavedSession(initialSession: InterviewSession): InterviewSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    const savedSession = resumeInterviewSession(saved);
    if (!savedSessionMatchesInitialQuestions(savedSession, initialSession)) {
      clearSavedInterviewFromDevice();
      return null;
    }

    return savedSession;
  } catch {
    clearSavedInterviewFromDevice();
    throw new Error("Saved interview could not be restored, so it was cleared.");
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
  initialCandidateProfile,
  initialInterviewLanguage,
  initialQuestionBank,
  initialQuestionPlanAudit
}: InterviewSessionClientProps) {
  const copy = resolveCandidateFlowCopy(initialInterviewLanguage).interview;
  const snapshotPersistenceTimerRef = useRef<number | null>(null);
  const sessionOptions = useMemo(
    () => ({
      candidateProfile: initialCandidateProfile,
      interviewLanguage: initialInterviewLanguage,
      questionBank: initialQuestionBank
    }),
    [initialCandidateProfile, initialInterviewLanguage, initialQuestionBank]
  );
  const initialSession = useMemo(() => createLocalSession(sessionOptions), [sessionOptions]);
  const [session, setSession] = useState<InterviewSession>(initialSession);
  const [providerSession, setProviderSession] = useState<LiveInterviewProviderSession>(() =>
    createProviderFor(initialSession)
  );
  const [capturedTranscript, setCapturedTranscript] = useState("");
  const [error, setError] = useState("");
  const [isVoiceCaptureActive, setIsVoiceCaptureActive] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
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
    !answerIsLocked &&
    !isVoiceCaptureActive &&
    !responseWindowExpired &&
    capturedTranscript.trim().length > 0 &&
    !transition &&
    !isPreparingQuestion;

  useEffect(() => {
    try {
      const saved = loadSavedSession(initialSession);
      if (saved) {
        setSession(saved);
        setProviderSession(loadSavedProviderSession(saved.sessionId) ?? createProviderFor(saved));
        setLastSavedAt(saved.updatedAt);
        if (saved.status === "completed") {
          markInterviewCompletedOnDevice();
        } else {
          clearInterviewCompletedOnDevice();
        }
      } else {
        clearInterviewCompletedOnDevice();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.restoreFailed);
    }
    setIsHydrated(true);
  }, [copy.restoreFailed, initialSession]);

  useEffect(() => {
    return () => {
      if (snapshotPersistenceTimerRef.current !== null) {
        window.clearTimeout(snapshotPersistenceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeInterviewSession(session));
        window.localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(providerSession));
        setLastSavedAt(new Date().toISOString());
        if (snapshotPersistenceTimerRef.current !== null) {
          window.clearTimeout(snapshotPersistenceTimerRef.current);
        }
        snapshotPersistenceTimerRef.current = window.setTimeout(() => {
          void persistInterviewSnapshotToServer({
            session,
            providerSession,
            questionPlan: {
              ...(initialQuestionPlanAudit ?? { source: "client_snapshot" }),
              interviewLanguage: session.interviewLanguage,
              questions: session.questions
            }
          });
        }, 350);
      } catch {
        setError(copy.autosaveFailed);
      }
    }
  }, [copy.autosaveFailed, initialQuestionPlanAudit, isHydrated, providerSession, session]);

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

  const saveCapturedAnswer = useCallback((options: SaveCapturedAnswerOptions = {}) => {
    if (!question) {
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

    try {
      const answerText = (options.answerTextOverride ?? capturedTranscript).trim();
      if (!answerText) {
        setError(copy.transcriptNotReady);
        return false;
      }

      const answeredAt = new Date().toISOString();
      const updated = recordInterviewResponse(session, {
        questionId: question.id,
        answerText,
        answeredAt,
        analysisFlags: options.analysisFlagsOverride ?? deriveResponseAnalysisFlags(answerText)
      });
      if (updated.status === "completed") {
        markInterviewCompletedOnDevice();
      }

      setSession(updated);
      setProviderSession((current) => {
        const withCandidateTranscript = appendLiveTranscriptEvent(current, {
          speaker: "candidate",
          kind: "answer",
          text: answerText,
          questionId: question.id,
          at: answeredAt
        });
        return updated.status === "completed"
          ? syncLiveInterviewProviderWithQuestion(withCandidateTranscript, updated, answeredAt)
          : withCandidateTranscript;
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.answerCouldNotSave);
      return false;
    }
  }, [
    capturedTranscript,
    copy,
    expireCurrentProviderSession,
    providerSession,
    question,
    session
  ]);

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

    saveCapturedAnswer({
      answerTextOverride: createTimedOutResponseText(timedOutResponse.transcript),
      analysisFlagsOverride: {},
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
    try {
      const saved = loadSavedSession(initialSession);
      if (!saved) {
        setError(copy.savedNotFound);
        return;
      }

      setSession(saved);
      setProviderSession(loadSavedProviderSession(saved.sessionId) ?? createProviderFor(saved));
      setCapturedTranscript("");
      setIsVoiceCaptureActive(false);
      setTimedOutResponse(null);
      setResponseAttempt(1);
      setTransition(null);
      setError("");
      setLastSavedAt(saved.updatedAt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.restoreFailed);
    }
  }

  function resetSession() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(copy.confirmStartOver)
    ) {
      return;
    }

    const freshSession = createLocalSession(sessionOptions);
    setSession(freshSession);
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
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(PROVIDER_STORAGE_KEY);
    }
    clearInterviewCompletedOnDevice();
  }

  function captureTranscribedAnswer(transcript: string) {
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
                {questionIsVisible ? (
                  <VoiceTranscriptionControl
                    activeQuestionId={activeVoiceQuestionId}
                    disabled={
                      answerIsLocked ||
                      (!isVoiceCaptureActive && capturedTranscript.trim().length > 0)
                    }
                    interviewLanguage={session.interviewLanguage}
                    maxDurationSeconds={LIVE_INTERVIEW_RESPONSE_WINDOW_SECONDS}
                    onCaptureActiveChange={setIsVoiceCaptureActive}
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
                    onClick={() => saveCapturedAnswer()}
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
