/**
 * Text-to-speech provider for the conversational interviewer voice.
 *
 * Behind a feature flag (TTS_PROVIDER): `mock` (default) returns silent no-op
 * audio so everything runs offline and in tests; `elevenlabs` and `openai` call
 * their HTTP APIs. `fetchImpl` is injectable for tests, and a missing API key or
 * a failed request degrades gracefully to the mock — speech never blocks the
 * interview.
 */

export type TtsProviderName = "elevenlabs" | "openai" | "mock";

export type TtsFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface SynthesizeSpeechResult {
  readonly provider: TtsProviderName;
  readonly source: "provider" | "mock";
  readonly mimeType: string;
  readonly audioBytes: Uint8Array;
  readonly fallbackReason?: string;
}

export interface TtsProvider {
  readonly provider: TtsProviderName;
  synthesizeSpeech(text: string, language?: string): Promise<SynthesizeSpeechResult>;
}

export interface CreateTtsProviderOptions {
  readonly env?: Partial<Record<string, string | undefined>>;
  readonly fetchImpl?: TtsFetch;
  readonly apiKey?: string | null;
  readonly voiceId?: string;
  readonly model?: string;
}

const ELEVENLABS_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const DEFAULT_ELEVENLABS_VOICE = "Rachel";
const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini-tts";
const DEFAULT_OPENAI_VOICE = "alloy";

export function resolveTtsProviderName(
  env: Partial<Record<string, string | undefined>> = process.env
): TtsProviderName {
  const raw = env.TTS_PROVIDER?.trim().toLowerCase();
  if (raw === "elevenlabs" || raw === "openai") {
    return raw;
  }
  return "mock";
}

export function createTtsProvider(options: CreateTtsProviderOptions = {}): TtsProvider {
  const env = options.env ?? process.env;
  const requested = resolveTtsProviderName(env);
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as TtsFetch | undefined);

  if (requested === "mock" || !fetchImpl) {
    return createMockTtsProvider();
  }

  const apiKey = resolveApiKey(requested, options, env);
  if (!apiKey) {
    // No key configured: degrade to mock so the interview still runs.
    return createMockTtsProvider();
  }

  if (requested === "elevenlabs") {
    return createElevenLabsProvider({ apiKey, fetchImpl, options });
  }

  return createOpenAiProvider({ apiKey, fetchImpl, options });
}

function createMockTtsProvider(): TtsProvider {
  return {
    provider: "mock",
    async synthesizeSpeech(): Promise<SynthesizeSpeechResult> {
      return {
        provider: "mock",
        source: "mock",
        mimeType: "audio/mpeg",
        audioBytes: new Uint8Array(0),
      };
    },
  };
}

function createElevenLabsProvider(args: {
  apiKey: string;
  fetchImpl: TtsFetch;
  options: CreateTtsProviderOptions;
}): TtsProvider {
  const voiceId = args.options.voiceId ?? DEFAULT_ELEVENLABS_VOICE;
  const model = args.options.model ?? DEFAULT_ELEVENLABS_MODEL;

  return {
    provider: "elevenlabs",
    async synthesizeSpeech(text: string): Promise<SynthesizeSpeechResult> {
      try {
        const response = await args.fetchImpl(`${ELEVENLABS_ENDPOINT}/${encodeURIComponent(voiceId)}`, {
          method: "POST",
          headers: {
            "xi-api-key": args.apiKey,
            "content-type": "application/json",
            accept: "audio/mpeg",
          },
          body: JSON.stringify({ text, model_id: model }),
        });
        return await readAudioResponse(response, "elevenlabs");
      } catch (error) {
        return mockFallback("elevenlabs", error);
      }
    },
  };
}

function createOpenAiProvider(args: {
  apiKey: string;
  fetchImpl: TtsFetch;
  options: CreateTtsProviderOptions;
}): TtsProvider {
  const model = args.options.model ?? DEFAULT_OPENAI_MODEL;
  const voice = args.options.voiceId ?? DEFAULT_OPENAI_VOICE;

  return {
    provider: "openai",
    async synthesizeSpeech(text: string): Promise<SynthesizeSpeechResult> {
      try {
        const response = await args.fetchImpl(OPENAI_ENDPOINT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${args.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ model, input: text, voice, response_format: "mp3" }),
        });
        return await readAudioResponse(response, "openai");
      } catch (error) {
        return mockFallback("openai", error);
      }
    },
  };
}

async function readAudioResponse(
  response: Response,
  provider: TtsProviderName
): Promise<SynthesizeSpeechResult> {
  if (!response.ok) {
    return mockFallback(provider, new Error(`tts_request_failed_${response.status}`));
  }

  const buffer = await response.arrayBuffer();
  return {
    provider,
    source: "provider",
    mimeType: response.headers?.get?.("content-type") ?? "audio/mpeg",
    audioBytes: new Uint8Array(buffer),
  };
}

function mockFallback(provider: TtsProviderName, error: unknown): SynthesizeSpeechResult {
  return {
    provider,
    source: "mock",
    mimeType: "audio/mpeg",
    audioBytes: new Uint8Array(0),
    fallbackReason: error instanceof Error ? error.message : "tts_generation_failed",
  };
}

function resolveApiKey(
  provider: TtsProviderName,
  options: CreateTtsProviderOptions,
  env: Partial<Record<string, string | undefined>>
): string | null {
  if (options.apiKey !== undefined) {
    return options.apiKey && options.apiKey.trim().length > 0 ? options.apiKey.trim() : null;
  }
  const key = provider === "elevenlabs" ? env.ELEVENLABS_API_KEY : env.OPENAI_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}
