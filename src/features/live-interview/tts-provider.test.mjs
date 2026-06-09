import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const cache = new Map();

function load(absPath) {
  if (cache.has(absPath)) return cache.get(absPath);
  const source = readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absPath,
  }).outputText;
  const mod = { exports: {} };
  cache.set(absPath, mod.exports);
  const dir = path.dirname(absPath);
  const requireShim = (req) => {
    let target = path.resolve(dir, req);
    if (!target.endsWith(".ts")) target += ".ts";
    return load(target);
  };
  vm.runInNewContext(
    output,
    { exports: mod.exports, module: mod, require: requireShim, process, console },
    { filename: absPath },
  );
  cache.set(absPath, mod.exports);
  return mod.exports;
}

const { createTtsProvider, resolveTtsProviderName } = load(
  path.join(rootDir, "src/features/live-interview/tts-provider.ts"),
);

test("defaults to the mock provider with no provider/key configured", async () => {
  const provider = createTtsProvider({ env: {} });
  assert.equal(provider.provider, "mock");

  const result = await provider.synthesizeSpeech("Hello", "en");
  assert.equal(result.source, "mock");
  assert.equal(result.audioBytes.length, 0);
});

test("falls back to mock when a provider is requested without a key", () => {
  const provider = createTtsProvider({ env: { TTS_PROVIDER: "elevenlabs" }, apiKey: null });
  assert.equal(provider.provider, "mock");
});

test("resolveTtsProviderName only accepts known providers", () => {
  assert.equal(resolveTtsProviderName({ TTS_PROVIDER: "openai" }), "openai");
  assert.equal(resolveTtsProviderName({ TTS_PROVIDER: "elevenlabs" }), "elevenlabs");
  assert.equal(resolveTtsProviderName({ TTS_PROVIDER: "espeak" }), "mock");
  assert.equal(resolveTtsProviderName({}), "mock");
});

test("builds the correct ElevenLabs request with an injected fetch", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
  };

  const provider = createTtsProvider({
    env: { TTS_PROVIDER: "elevenlabs" },
    apiKey: "test-key",
    voiceId: "Marta",
    fetchImpl,
  });
  assert.equal(provider.provider, "elevenlabs");

  const result = await provider.synthesizeSpeech("Ciao, iniziamo.", "it");

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.elevenlabs\.io\/v1\/text-to-speech\/Marta/);
  assert.equal(calls[0].init.headers["xi-api-key"], "test-key");
  assert.match(calls[0].init.body, /Ciao, iniziamo\./);
  assert.equal(result.source, "provider");
  assert.equal(result.audioBytes.length, 3);
});

test("a failed provider request degrades to safe mock audio", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 500,
    headers: { get: () => null },
    arrayBuffer: async () => new ArrayBuffer(0),
  });

  const provider = createTtsProvider({
    env: { TTS_PROVIDER: "openai" },
    apiKey: "k",
    fetchImpl,
  });

  const result = await provider.synthesizeSpeech("Hello");
  assert.equal(result.source, "mock");
  assert.ok(result.fallbackReason);
});
