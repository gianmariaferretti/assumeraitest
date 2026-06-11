import { recordLlmUsage, type LlmUsageRecorder } from "../../../lib/llm-budget/core";
import { logLlmTelemetry } from "../../../lib/log";
import {
  clampDriverStrength,
  DRIVER_PROFILE_VERSION,
  JOB_DRIVER_LABELS,
  JOB_DRIVERS,
  type DriverProfile,
  type DriverSignal,
  type JobDriver,
} from "./types";

/**
 * Job-drivers evaluator (Phase 14) — DESCRIPTIVE, REVEALED-PREFERENCE ONLY.
 *
 * Extracts which career drivers an answer actually evidences (especially real
 * past trade-offs: what the candidate chose and what they gave up). It never
 * judges whether a driver mix is good — there is no correct set of drivers —
 * and the output is flag-only by design: nothing here ever enters a score.
 * Anti-proxy guardrail: drivers are read ONLY from what the candidate states
 * about how they want to work, never inferred from protected attributes.
 * Deterministic keyword fallback keeps the interview from ever blocking.
 */

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_DRIVERS_MODEL = "claude-sonnet-4-20250514";
const DRIVERS_TEMPERATURE = 0.1;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface JobDriversEvaluatorOptions {
  readonly apiKey?: string | null;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly recordUsage?: LlmUsageRecorder;
}

export interface EvaluateJobDriversInput {
  readonly questionId: string;
  readonly questionText: string;
  readonly answerText: string;
  readonly options?: JobDriversEvaluatorOptions;
  readonly now?: string;
}

function buildSystemPrompt(): string {
  const drivers = JOB_DRIVERS.map(
    (driver) => `${driver}: ${JOB_DRIVER_LABELS[driver]}`,
  ).join("; ");

  return [
    "You are a DESCRIPTIVE career-driver extractor for a structured interview. You never address the candidate.",
    "Identify which drivers ONE answer actually evidences, weighting revealed preference (real choices made, real things given up) over stated preference.",
    "DO NOT judge whether the drivers are good, ambitious, or appropriate. There is no correct set of drivers.",
    "Never produce a quality score, a recommendation, or a judgment — driver signals are flag-only by design.",
    `Drivers: ${drivers}.`,
    "Only report drivers the answer actually evidences; omit the rest.",
    "Never infer any driver from protected attributes (age, gender, family status, caregiving, health, religion, origin, accent, personality) — especially lifestyle_balance, which must come ONLY from what the candidate explicitly says about how they want to work.",
    'Return strict JSON: {"signals":[{"driver":"<id>","strength":<0..100>,"confidence":<0..1>,"evidence":["verbatim snippet"]}]}.',
  ].join(" ");
}

export async function evaluateJobDrivers(input: EvaluateJobDriversInput): Promise<DriverProfile> {
  const apiKey = input.options?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackProfile(input, "anthropic_api_key_missing");
  }
  const fetchImpl = input.options?.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    return fallbackProfile(input, "anthropic_fetch_unavailable");
  }
  const model =
    input.options?.model ?? process.env.ANTHROPIC_EVALUATOR_MODEL ?? DEFAULT_DRIVERS_MODEL;

  const startedAt = Date.now();
  try {
    const response = await fetchImpl(input.options?.endpoint ?? ANTHROPIC_API_ENDPOINT, {
      method: "POST",
      headers: {
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: input.options?.maxTokens ?? 800,
        temperature: DRIVERS_TEMPERATURE,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              task: "descriptive_job_driver_extraction",
              question_id: input.questionId,
              question: input.questionText,
              answer: input.answerText,
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      logLlmTelemetry({
        site: "job_drivers_evaluator",
        provider: "anthropic",
        model,
        latencyMs: Date.now() - startedAt,
        outcome: "error",
        fallbackReason: `anthropic_request_failed_${response.status}`,
      });
      return fallbackProfile(input, `anthropic_request_failed_${response.status}`);
    }

    const message = (await response.json()) as {
      content?: readonly { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    (input.options?.recordUsage ?? recordLlmUsage)({
      model,
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
    });
    logLlmTelemetry({
      site: "job_drivers_evaluator",
      provider: "anthropic",
      model,
      latencyMs: Date.now() - startedAt,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
      outcome: "ok",
    });

    return {
      version: DRIVER_PROFILE_VERSION,
      signals: parseSignals(extractText(message)),
      generatedAt: input.now ?? new Date().toISOString(),
      source: "anthropic",
    };
  } catch {
    return fallbackProfile(input, "job_drivers_generation_failed");
  }
}

function parseSignals(text: string): DriverSignal[] {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const parsed = JSON.parse(fenced?.[1] ?? text) as {
      signals?: readonly Record<string, unknown>[];
    };
    return (parsed.signals ?? []).flatMap((entry) => {
      const driver = entry.driver;
      if (
        typeof driver !== "string" ||
        !(JOB_DRIVERS as readonly string[]).includes(driver) ||
        typeof entry.strength !== "number"
      ) {
        return [];
      }
      return [
        {
          driver: driver as JobDriver,
          strength: clampDriverStrength(entry.strength),
          confidence:
            typeof entry.confidence === "number"
              ? Math.max(0, Math.min(1, entry.confidence))
              : 0.5,
          evidence: Array.isArray(entry.evidence)
            ? entry.evidence.filter((item): item is string => typeof item === "string").slice(0, 4)
            : [],
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Deterministic keyword fallback: coarse, low-confidence, descriptive. Only
 * fires on explicit work-preference phrasing, never on personal circumstances.
 */
const FALLBACK_SIGNALS: Readonly<Record<JobDriver, RegExp>> = {
  technical_mastery: /\b(master|deep dive|specialist|specializz|expertise|craft|approfondire)/i,
  leadership_track: /\b(lead(ing)? (a |the )?team|manage[dr]?|leadership|responsabilit|guidare)/i,
  autonomy_independence: /\b(autonom|independen|indipenden|my own way|freedom|libert)/i,
  security_stability: /\b(stabilit|security|sicurezza|predictab|long[- ]term contract|prevedib)/i,
  entrepreneurial_creation: /\b(start(ed)? from scratch|build(ing)? something new|entrepreneur|imprendito|da zero|founding)/i,
  service_impact: /\b(impact on (people|others)|help(ing)? (people|others)|service|aiutare|al servizio)/i,
  pure_challenge: /\b(hard(est)? problem|challenge|sfida|difficult problem|impossible)/i,
  lifestyle_balance: /\b(work[- ]life|balance|equilibrio|flessibilit|flexible hours|orari)/i,
};

function fallbackProfile(input: EvaluateJobDriversInput, reason: string): DriverProfile {
  logLlmTelemetry({
    site: "job_drivers_evaluator",
    provider: "anthropic",
    outcome: "fallback",
    fallbackReason: reason,
  });

  const signals = JOB_DRIVERS.flatMap((driver) => {
    const pattern = FALLBACK_SIGNALS[driver];
    if (!pattern.test(input.answerText)) {
      return []; // no explicit evidence — stay silent, never invent a driver
    }
    return [
      {
        driver,
        strength: 60,
        confidence: 0.3,
        evidence: [firstSentenceMatching(input.answerText, pattern)],
      } satisfies DriverSignal,
    ];
  });

  return {
    version: DRIVER_PROFILE_VERSION,
    signals,
    generatedAt: input.now ?? new Date().toISOString(),
    source: "deterministic_fallback",
  };
}

function firstSentenceMatching(text: string, pattern: RegExp): string {
  const sentence = text.split(/(?<=[.!?])\s+/).find((candidate) => pattern.test(candidate));
  return (sentence ?? text).trim().slice(0, 200);
}

function extractText(message: { content?: readonly { type: string; text?: string }[] }): string {
  return (
    message.content
      ?.filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n")
      .trim() ?? ""
  );
}

/** Merge a new evaluation into an existing profile (later items add drivers). */
export function mergeDriverProfiles(
  existing: DriverProfile | undefined,
  incoming: DriverProfile,
): DriverProfile {
  if (!existing) {
    return incoming;
  }
  const byDriver = new Map<JobDriver, DriverSignal>();
  for (const signal of existing.signals) {
    byDriver.set(signal.driver, signal);
  }
  for (const signal of incoming.signals) {
    const current = byDriver.get(signal.driver);
    // Keep the higher-confidence signal per driver.
    if (!current || signal.confidence >= current.confidence) {
      byDriver.set(signal.driver, signal);
    }
  }

  return {
    version: DRIVER_PROFILE_VERSION,
    signals: [...byDriver.values()],
    generatedAt: incoming.generatedAt,
    source:
      incoming.source === "anthropic" && existing.source === "anthropic"
        ? "anthropic"
        : incoming.source,
  };
}
