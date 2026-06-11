"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildDeepgramListenWebSocketUrl,
  buildDeepgramWebSocketProtocols,
  resolveDeepgramLanguageForInterviewLanguage,
  readLiveTranscriptionStartupErrorMessage,
  readDeepgramTranscriptEvent
} from "@/features/live-interview/deepgram-live-transcription";
import { formatResponseWindowRemaining } from "@/features/live-interview/response-window";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";

type VoiceTranscriptionStatus = "idle" | "connecting" | "recording" | "finishing" | "ready" | "error";
type StopReason = "candidate" | "time_expired" | null;

interface VoiceTranscriptionControlProps {
  readonly activeQuestionId: string | null;
  readonly disabled: boolean;
  readonly interviewLanguage: CandidateInterviewLanguageCode;
  readonly maxDurationSeconds: number;
  /** Deepgram per-utterance confidence (final events only), for ASR-quality routing. */
  readonly onAsrConfidence?: (confidence: number) => void;
  readonly onCaptureActiveChange?: (active: boolean) => void;
  readonly onError: (message: string) => void;
  readonly onRemainingTimeChange?: (remainingLabel: string | null) => void;
  readonly onTimeExpired: (transcript: string) => void;
  readonly onTranscript: (transcript: string) => void;
  readonly shouldRecord: boolean;
}

const DEEPGRAM_TOKEN_ENDPOINT = "/candidate/interview/deepgram-token";
const DEEPGRAM_MEDIA_TIMESLICE_MS = 250;
const DEEPGRAM_CLOSE_TIMEOUT_MS = 1800;
const TRANSCRIPTION_MODEL = "nova-3";
type DeepgramBrowserCredential = {
  readonly authMode: "bearer" | "token";
  readonly credential: string;
};

export function VoiceTranscriptionControl({
  activeQuestionId,
  disabled,
  interviewLanguage,
  maxDurationSeconds,
  onAsrConfidence,
  onCaptureActiveChange,
  onError,
  onRemainingTimeChange,
  onTimeExpired,
  onTranscript,
  shouldRecord
}: VoiceTranscriptionControlProps) {
  const copy = resolveCandidateFlowCopy(interviewLanguage).interview.voice;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const responseWindowTimerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const shouldStreamRef = useRef(false);
  const stopReasonRef = useRef<StopReason>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const statusRef = useRef<VoiceTranscriptionStatus>("idle");
  const startedQuestionIdRef = useRef<string | null>(null);
  const startupRunIdRef = useRef(0);
  const [status, setStatusState] = useState<VoiceTranscriptionStatus>("idle");
  const [message, setMessage] = useState(copy.initial);
  const [, setRemainingSeconds] = useState(maxDurationSeconds);

  const updateStatus = useCallback((nextStatus: VoiceTranscriptionStatus) => {
    statusRef.current = nextStatus;
    setStatusState(nextStatus);
  }, []);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const clearResponseWindowTimer = useCallback(() => {
    if (responseWindowTimerRef.current !== null) {
      window.clearInterval(responseWindowTimerRef.current);
      responseWindowTimerRef.current = null;
    }
    onRemainingTimeChange?.(null);
  }, [onRemainingTimeChange]);

  const currentTranscript = useCallback(() => {
    return appendTranscript(finalTranscriptRef.current, interimTranscriptRef.current).trim();
  }, []);

  const cancelCurrentStartup = useCallback(() => {
    startupRunIdRef.current += 1;
    shouldStreamRef.current = false;
  }, []);

  const isCurrentStartup = useCallback((startupRunId: number) => {
    return startupRunIdRef.current === startupRunId && shouldStreamRef.current;
  }, []);

  const cleanupLiveResources = useCallback(() => {
    clearCompletionTimer();
    clearResponseWindowTimer();
    stopStream(streamRef.current);
    streamRef.current = null;
    mediaRecorderRef.current = null;

    const socket = webSocketRef.current;
    webSocketRef.current = null;
    if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
      socket.close();
    }
  }, [clearCompletionTimer, clearResponseWindowTimer]);

  const completeLiveTranscription = useCallback(
    (errorMessage?: string) => {
      if (statusRef.current === "ready" || statusRef.current === "error") {
        return;
      }

      const transcript = currentTranscript();
      const stopReason = stopReasonRef.current;
      cleanupLiveResources();
      cancelCurrentStartup();
      onCaptureActiveChange?.(false);

      if (errorMessage) {
        onError(errorMessage);
        updateStatus("error");
        setMessage(errorMessage);
        return;
      }

      if (!transcript && stopReason !== "time_expired") {
        const emptyMessage = copy.emptySpeech;
        onError(emptyMessage);
        updateStatus("error");
        setMessage(emptyMessage);
        return;
      }

      if (transcript) {
        onTranscript(transcript);
      }
      updateStatus("ready");
      if (stopReason === "time_expired") {
        onTimeExpired(transcript);
        setMessage(copy.answerTimeEnded);
        return;
      }

      setMessage(copy.answerCaptured);
    },
    [
      cancelCurrentStartup,
      cleanupLiveResources,
      copy.answerCaptured,
      copy.answerTimeEnded,
      copy.emptySpeech,
      currentTranscript,
      onCaptureActiveChange,
      onError,
      onTimeExpired,
      onTranscript,
      updateStatus
    ]
  );

  const startCompletionTimer = useCallback(() => {
    clearCompletionTimer();
    completionTimerRef.current = window.setTimeout(() => {
      completeLiveTranscription();
    }, DEEPGRAM_CLOSE_TIMEOUT_MS);
  }, [clearCompletionTimer, completeLiveTranscription]);

  const stopRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const expireResponseWindow = useCallback(() => {
    if (statusRef.current !== "recording") {
      return;
    }

    stopReasonRef.current = "time_expired";
    clearResponseWindowTimer();
    setRemainingSeconds(0);
    onRemainingTimeChange?.(formatResponseWindowRemaining(0));
    updateStatus("finishing");
    setMessage(copy.timeUp);
    stopRecorder();
  }, [clearResponseWindowTimer, copy.timeUp, onRemainingTimeChange, stopRecorder, updateStatus]);

  const startResponseWindowTimer = useCallback(() => {
    clearResponseWindowTimer();
    setRemainingSeconds(maxDurationSeconds);
    onRemainingTimeChange?.(formatResponseWindowRemaining(maxDurationSeconds));

    const startedAt = Date.now();
    responseWindowTimerRef.current = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const nextRemaining = Math.max(maxDurationSeconds - elapsedSeconds, 0);
      setRemainingSeconds(nextRemaining);
      onRemainingTimeChange?.(formatResponseWindowRemaining(nextRemaining));

      if (nextRemaining <= 0) {
        expireResponseWindow();
      }
    }, 250);
  }, [clearResponseWindowTimer, expireResponseWindow, maxDurationSeconds, onRemainingTimeChange]);

  useEffect(() => {
    if (status !== "recording") {
      setRemainingSeconds(maxDurationSeconds);
      onRemainingTimeChange?.(null);
    }
  }, [maxDurationSeconds, onRemainingTimeChange, status]);

  useEffect(() => {
    return () => {
      cancelCurrentStartup();
      startedQuestionIdRef.current = null;
      onCaptureActiveChange?.(false);
      stopRecorder();
      cleanupLiveResources();
    };
  }, [cancelCurrentStartup, cleanupLiveResources, onCaptureActiveChange, stopRecorder]);

  const connectLiveTranscription = useCallback(
    async (stream: MediaStream, startupRunId: number): Promise<WebSocket> => {
      const credential = await requestDeepgramCredential(copy);
      if (!isCurrentStartup(startupRunId)) {
        throw new Error(copy.stoppedBeforeStart);
      }

      const socket = new WebSocket(
        buildDeepgramListenWebSocketUrl({
          language: resolveDeepgramLanguageForInterviewLanguage(interviewLanguage),
          model: TRANSCRIPTION_MODEL
        }),
        buildDeepgramWebSocketProtocols(credential)
      );

      socket.addEventListener("message", (event) => {
        if (!isCurrentStartup(startupRunId)) {
          return;
        }

        const transcriptEvent = readDeepgramTranscriptEvent(readSocketJson(event.data));
        if (!transcriptEvent) {
          return;
        }

        if (transcriptEvent.isFinal) {
          finalTranscriptRef.current = appendTranscript(
            finalTranscriptRef.current,
            transcriptEvent.transcript
          );
          interimTranscriptRef.current = "";
          if (typeof transcriptEvent.confidence === "number") {
            onAsrConfidence?.(transcriptEvent.confidence);
          }
        } else {
          interimTranscriptRef.current = transcriptEvent.transcript;
        }

        const transcript = currentTranscript();
        if (transcript) {
          onTranscript(transcript);
        }
      });

      socket.addEventListener("error", () => {
        if (!isCurrentStartup(startupRunId)) {
          return;
        }
        if (stopReasonRef.current === "candidate" || stopReasonRef.current === "time_expired") {
          return;
        }

        completeLiveTranscription(copy.disconnected);
      });

      socket.addEventListener("close", () => {
        if (!isCurrentStartup(startupRunId)) {
          return;
        }

        completeLiveTranscription(
          stopReasonRef.current === "candidate" || stopReasonRef.current === "time_expired"
            ? undefined
            : copy.disconnected
        );
      });

      webSocketRef.current = socket;
      await waitForSocketOpen(socket, copy.socketFailed);
      if (!isCurrentStartup(startupRunId)) {
        socket.close();
        throw new Error(copy.stoppedBeforeStart);
      }

      streamRef.current = stream;
      return socket;
    },
    [completeLiveTranscription, copy, currentTranscript, interviewLanguage, isCurrentStartup, onAsrConfidence, onTranscript]
  );

  const startRecording = useCallback(async () => {
    if (disabled || status === "connecting" || status === "finishing") {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      updateStatus("error");
      setMessage(copy.unavailable);
      return;
    }

    const startupRunId = startupRunIdRef.current + 1;
    startupRunIdRef.current = startupRunId;
    let stream: MediaStream | null = null;

    try {
      shouldStreamRef.current = true;
      stopReasonRef.current = null;
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      onCaptureActiveChange?.(true);
      updateStatus("connecting");
      setMessage(copy.starting);

      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      if (!isCurrentStartup(startupRunId)) {
        stopStream(stream);
        streamRef.current = null;
        return;
      }

      const socket = await connectLiveTranscription(stream, startupRunId);
      if (!isCurrentStartup(startupRunId)) {
        socket.close();
        stopStream(stream);
        streamRef.current = null;
        return;
      }

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        closeDeepgramStream(socket);
        startCompletionTimer();
      });

      mediaRecorderRef.current = recorder;
      recorder.start(DEEPGRAM_MEDIA_TIMESLICE_MS);
      updateStatus("recording");
      setMessage(copy.listening);
      startResponseWindowTimer();
    } catch (caught) {
      if (!isCurrentStartup(startupRunId)) {
        stopStream(stream);
        return;
      }

      const errorMessage = readLiveTranscriptionStartupErrorMessage(caught);
      stopStream(stream ?? streamRef.current);
      streamRef.current = null;
      cancelCurrentStartup();
      onCaptureActiveChange?.(false);
      onError(errorMessage);
      updateStatus("error");
      setMessage(errorMessage);
    }
  }, [
    connectLiveTranscription,
    cancelCurrentStartup,
    copy.listening,
    copy.starting,
    copy.unavailable,
    disabled,
    isCurrentStartup,
    onError,
    onCaptureActiveChange,
    startCompletionTimer,
    startResponseWindowTimer,
    status,
    updateStatus
  ]);

  useEffect(() => {
    if (!activeQuestionId) {
      startedQuestionIdRef.current = null;
      return;
    }
    if (!shouldRecord || disabled) {
      return;
    }
    if (startedQuestionIdRef.current === activeQuestionId) {
      return;
    }

    startedQuestionIdRef.current = activeQuestionId;
    updateStatus("idle");
    setMessage(copy.starting);
    void startRecording();
  }, [activeQuestionId, copy.starting, disabled, shouldRecord, startRecording, updateStatus]);

  useEffect(() => {
    if (!disabled || statusRef.current !== "recording") {
      return;
    }

    stopReasonRef.current = "candidate";
    clearResponseWindowTimer();
    updateStatus("finishing");
    setMessage(copy.saving);
    stopRecorder();
  }, [clearResponseWindowTimer, copy.saving, disabled, stopRecorder, updateStatus]);

  const stopResponding = useCallback(() => {
    if (status !== "recording") {
      return;
    }

    stopReasonRef.current = "candidate";
    clearResponseWindowTimer();
    updateStatus("finishing");
    setMessage(copy.saving);
    stopRecorder();
  }, [clearResponseWindowTimer, copy.saving, status, stopRecorder, updateStatus]);

  const isRecording = status === "recording";
  const isBusy = status === "connecting" || status === "finishing";
  const buttonLabel = isRecording
    ? copy.doneSpeaking
    : isBusy
      ? copy.saving
      : status === "ready"
        ? copy.answerCaptured
        : copy.starting;

  return (
    <div className="voice-transcription-control" aria-live="polite">
      <button
        className="voice-transcription-btn"
        disabled={!isRecording || isBusy}
        onClick={stopResponding}
        type="button"
      >
        {buttonLabel}
      </button>
      <span data-status={status}>{message}</span>
    </div>
  );
}

async function requestDeepgramCredential(
  copy: ReturnType<typeof resolveCandidateFlowCopy>["interview"]["voice"]
): Promise<DeepgramBrowserCredential> {
  const response = await fetch(DEEPGRAM_TOKEN_ENDPOINT, { method: "POST" });
  const payload = (await response.json()) as {
    readonly auth_mode?: unknown;
    readonly credential?: unknown;
    readonly error?: { readonly message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? copy.couldNotStart);
  }

  const authMode = payload.auth_mode;
  const credential = payload.credential;
  if (authMode !== "bearer" && authMode !== "token") {
    throw new Error(copy.authModeMissing);
  }
  if (typeof credential !== "string" || !credential.trim()) {
    throw new Error(copy.credentialMissing);
  }

  return { authMode, credential: credential.trim() };
}

function pickMimeType(): string | undefined {
  const supportedTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
}

function waitForSocketOpen(socket: WebSocket, errorMessage: string): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error(errorMessage)), {
      once: true
    });
  });
}

function readSocketJson(data: MessageEvent["data"]): unknown {
  if (typeof data !== "string") {
    return null;
  }

  try {
    return JSON.parse(data) as unknown;
  } catch {
    return null;
  }
}

function closeDeepgramStream(socket: WebSocket) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "CloseStream" }));
  }
}

function appendTranscript(base: string, addition: string): string {
  const left = base.trim();
  const right = addition.trim();
  if (!left) {
    return right;
  }
  if (!right || left.endsWith(right)) {
    return left;
  }

  return `${left} ${right}`;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
