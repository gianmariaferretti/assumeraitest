import { resolveCandidateInterviewLanguage } from "../interview-flow";

export interface DeepgramListenWebSocketUrlInput {
  readonly baseUrl?: string;
  readonly language?: string;
  readonly model?: string;
  readonly endpointingMs?: number;
}

export type DeepgramBrowserAuthMode = "bearer" | "token";

export interface DeepgramWebSocketProtocolsInput {
  readonly authMode: DeepgramBrowserAuthMode;
  readonly credential: string;
}

export interface DeepgramTranscriptEvent {
  readonly transcript: string;
  readonly isFinal: boolean;
  readonly speechFinal: boolean;
  readonly confidence: number | null;
}

type JsonRecord = Record<string, unknown>;

const DEEPGRAM_LISTEN_WEBSOCKET_URL = "wss://api.deepgram.com/v1/listen";
const DEFAULT_DEEPGRAM_MODEL = "nova-3";
const DEFAULT_DEEPGRAM_LANGUAGE = "en-US";
const DEFAULT_ENDPOINTING_MS = 700;
const GENERIC_STARTUP_ERROR =
  "Live transcription could not start. Pause and try again when ready.";

export function buildDeepgramListenWebSocketUrl({
  baseUrl = DEEPGRAM_LISTEN_WEBSOCKET_URL,
  language = DEFAULT_DEEPGRAM_LANGUAGE,
  model = DEFAULT_DEEPGRAM_MODEL,
  endpointingMs = DEFAULT_ENDPOINTING_MS
}: DeepgramListenWebSocketUrlInput): string {
  const url = new URL(baseUrl);
  url.searchParams.set("model", model);
  url.searchParams.set("language", language);
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("endpointing", String(endpointingMs));
  return url.toString();
}

export function buildDeepgramWebSocketProtocols({
  authMode,
  credential
}: DeepgramWebSocketProtocolsInput): [DeepgramBrowserAuthMode, string] {
  const trimmedCredential = credential.trim();
  if (!trimmedCredential) {
    throw new Error("A Deepgram browser credential is required for live transcription.");
  }

  return [authMode, trimmedCredential];
}

export function resolveDeepgramLanguageForInterviewLanguage(value: unknown): string {
  return resolveCandidateInterviewLanguage(value).deepgramLanguage;
}

export function readDeepgramTranscriptEvent(value: unknown): DeepgramTranscriptEvent | null {
  if (!isJsonRecord(value) || value.type !== "Results") {
    return null;
  }

  const channel = value.channel;
  if (!isJsonRecord(channel) || !Array.isArray(channel.alternatives)) {
    return null;
  }

  const [alternative] = channel.alternatives;
  if (!isJsonRecord(alternative)) {
    return null;
  }

  const transcript = readNonEmptyString(alternative.transcript);
  if (!transcript) {
    return null;
  }

  return {
    transcript,
    isFinal: value.is_final === true,
    speechFinal: value.speech_final === true,
    confidence: readPositiveNumber(alternative.confidence)
  };
}

export function readLiveTranscriptionStartupErrorMessage(caught: unknown): string {
  if (isJsonRecord(caught)) {
    if (caught.name === "NotAllowedError" || caught.name === "SecurityError") {
      return "Microphone permission was blocked. Allow microphone access and try again.";
    }
    if (caught.name === "NotFoundError" || caught.name === "DevicesNotFoundError") {
      return "No microphone was found. Connect or select a microphone and try again.";
    }
    if (caught.name === "NotReadableError" || caught.name === "TrackStartError") {
      return "Microphone is busy or unavailable. Close other apps using it and try again.";
    }
  }

  if (caught instanceof Error && caught.message.trim()) {
    return caught.message.trim();
  }

  return GENERIC_STARTUP_ERROR;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
