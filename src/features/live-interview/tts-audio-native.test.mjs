import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const { createTtsProvider, resolveTtsProviderName } = loadFromRepoRoot(
  "src/features/live-interview/tts-provider.ts",
);

const SILENT_MP3_BASE64 = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00]).toString("base64");

test("openai-audio-native is selectable behind TTS_PROVIDER", () => {
  assert.equal(resolveTtsProviderName({ TTS_PROVIDER: "openai-audio-native" }), "openai-audio-native");
  // No regression on the existing names, default stays mock.
  assert.equal(resolveTtsProviderName({ TTS_PROVIDER: "elevenlabs" }), "elevenlabs");
  assert.equal(resolveTtsProviderName({ TTS_PROVIDER: "openai" }), "openai");
  assert.equal(resolveTtsProviderName({}), "mock");
  assert.equal(resolveTtsProviderName({ TTS_PROVIDER: "something-else" }), "mock");
});

test("the audio-native provider speaks the line via one audio-modality call", async () => {
  const requests = [];
  const provider = createTtsProvider({
    env: { TTS_PROVIDER: "openai-audio-native", OPENAI_API_KEY: "test-key" },
    fetchImpl: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { audio: { data: SILENT_MP3_BASE64 } } }],
        }),
      };
    },
  });

  assert.equal(provider.provider, "openai-audio-native");
  const result = await provider.synthesizeSpeech("Grazie, molto chiaro. E poi cosa è successo?", "Italian");

  assert.equal(result.source, "provider");
  assert.equal(result.mimeType, "audio/mpeg");
  assert.ok(result.audioBytes.length > 0, "base64 audio decoded to bytes");

  // The request is a chat completion with audio modality, NOT a TTS call:
  // the model generates the spoken delivery directly from the content.
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /chat\/completions/);
  assert.deepEqual(requests[0].body.modalities, ["text", "audio"]);
  assert.equal(requests[0].body.audio.format, "mp3");
  const userMessage = requests[0].body.messages.find((message) => message.role === "user");
  assert.equal(userMessage.content, "Grazie, molto chiaro. E poi cosa è successo?");
  const systemMessage = requests[0].body.messages.find((message) => message.role === "system");
  assert.match(systemMessage.content, /EXACTLY as written/);
  assert.match(systemMessage.content, /Italian/);
});

test("provider failures degrade silently to mock audio — speech never blocks", async () => {
  const failing = createTtsProvider({
    env: { TTS_PROVIDER: "openai-audio-native", OPENAI_API_KEY: "test-key" },
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  });
  const failed = await failing.synthesizeSpeech("Ciao");
  assert.equal(failed.source, "mock");
  assert.equal(failed.fallbackReason, "tts_request_failed_503");

  const noAudio = createTtsProvider({
    env: { TTS_PROVIDER: "openai-audio-native", OPENAI_API_KEY: "test-key" },
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: {} }] }) }),
  });
  const empty = await noAudio.synthesizeSpeech("Ciao");
  assert.equal(empty.source, "mock");
  assert.equal(empty.fallbackReason, "audio_native_no_audio_in_response");
});

test("without an API key the flow cleanly uses the offline mock", async () => {
  const provider = createTtsProvider({
    env: { TTS_PROVIDER: "openai-audio-native" },
    fetchImpl: async () => {
      throw new Error("must not be called");
    },
  });
  assert.equal(provider.provider, "mock");
  const result = await provider.synthesizeSpeech("Ciao");
  assert.equal(result.source, "mock");
  assert.equal(result.audioBytes.length, 0);
});
