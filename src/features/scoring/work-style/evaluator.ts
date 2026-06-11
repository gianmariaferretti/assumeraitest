import { recordLlmUsage, type LlmUsageRecorder } from "../../../lib/llm-budget/core";
import { logLlmTelemetry } from "../../../lib/log";
import {
  clampWorkStylePosition,
  WORK_STYLE_DIMENSIONS,
  WORK_STYLE_POLES,
  WORK_STYLE_PROFILE_VERSION,
  type WorkStyleClassification,
  type WorkStyleDimension,
  type WorkStyleProfile,
} from "./types";

/**
 * Work-style evaluator (Phase 13) — DESCRIPTIVE ONLY.
 *
 * Classifies a candidate's SJT response on the bipolar work-style dimensions
 * with verbatim evidence and a confidence. It NEVER judges whether the
 * behavior is right: there is no right answer at interview time, and the
 * prompt forbids normative assessment explicitly. Runs as a small ensemble
 * (N raters with prompt jitter, median position, IQR-derived confidence),
 * the same reliability machinery as the BARS evaluator, with a deterministic
 * keyword fallback so the interview never blocks.
 */

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_WORK_STYLE_MODEL = "claude-sonnet-4-20250514";
const WORK_STYLE_TEMPERATURE = 0.1;
export const WORK_STYLE_ENSEMBLE_SIZE = 3;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface WorkStyleEvaluatorOptions {
  readonly apiKey?: string | null;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly recordUsage?: LlmUsageRecorder;
}

export interface EvaluateWorkStyleInput {
  readonly questionId: string;
  readonly questionText: string;
  readonly answerText: string;
  readonly options?: WorkStyleEvaluatorOptions;
  readonly now?: string;
}

const PROMPT_VARIANTS = [
  "",
  " Emphasis for this pass: anchor every classification on a verbatim quote.",
  " Emphasis for this pass: when the answer balances both poles, stay near 0 rather than forcing a lean.",
];

function buildSystemPrompt(variant: string): string {
  const dimensions = WORK_STYLE_DIMENSIONS.map(
    (dimension) =>
      `${dimension}: -100 = ${WORK_STYLE_POLES[dimension].first}, +100 = ${WORK_STYLE_POLES[dimension].second}`,
  ).join("; ");

  return [
    "You are a DESCRIPTIVE work-style classifier for a structured interview. You never address the candidate.",
    "Classify ONE answer on bipolar work-style dimensions. Neither pole is better.",
    "DO NOT assess whether the behavior is right, good, professional, or appropriate; classify the STYLE only.",
    "Never produce a quality score, a recommendation, or a judgment. There is no correct answer.",
    `Dimensions and pole meanings: ${dimensions}.`,
    "Only classify dimensions the answer actually evidences; omit the rest.",
    "Never infer or use protected attributes (age, gender, origin, health, family status, religion, accent, personality).",
    'Return strict JSON: {"classifications":[{"dimension":"<id>","position":<-100..100>,"confidence":<0..1>,"evidence":["verbatim snippet"]}]}.',
    variant,
  ].join(" ");
}

export async function evaluateWorkStyle(input: EvaluateWorkStyleInput): Promise<WorkStyleProfile> {
  const apiKey = input.options?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackProfile(input, "anthropic_api_key_missing");
  }
  const fetchImpl = input.options?.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    return fallbackProfile(input, "anthropic_fetch_unavailable");
  }
  const model =
    input.options?.model ?? process.env.ANTHROPIC_EVALUATOR_MODEL ?? DEFAULT_WORK_STYLE_MODEL;

  const raterRuns: WorkStyleClassification[][] = [];
  for (let rater = 0; rater < WORK_STYLE_ENSEMBLE_SIZE; rater += 1) {
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
          temperature: WORK_STYLE_TEMPERATURE,
          system: buildSystemPrompt(PROMPT_VARIANTS[rater % PROMPT_VARIANTS.length]),
          messages: [
            {
              role: "user",
              content: JSON.stringify({
                task: "descriptive_work_style_classification",
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
          site: "work_style_evaluator",
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
        site: "work_style_evaluator",
        provider: "anthropic",
        model,
        latencyMs: Date.now() - startedAt,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
        outcome: "ok",
      });
      raterRuns.push(parseClassifications(extractText(message)));
    } catch {
      return fallbackProfile(input, "work_style_generation_failed");
    }
  }

  return {
    version: WORK_STYLE_PROFILE_VERSION,
    classifications: mergeEnsemble(raterRuns),
    generatedAt: input.now ?? new Date().toISOString(),
    source: "anthropic",
  };
}

/** Median position per dimension across raters; confidence shrinks with IQR. */
function mergeEnsemble(
  raterRuns: readonly (readonly WorkStyleClassification[])[],
): WorkStyleClassification[] {
  const byDimension = new Map<WorkStyleDimension, WorkStyleClassification[]>();
  for (const run of raterRuns) {
    for (const classification of run) {
      const list = byDimension.get(classification.dimension) ?? [];
      list.push(classification);
      byDimension.set(classification.dimension, list);
    }
  }

  return [...byDimension.entries()]
    // A dimension must be seen by a majority of raters to be reported.
    .filter(([, items]) => items.length >= Math.ceil(WORK_STYLE_ENSEMBLE_SIZE / 2))
    .map(([dimension, items]) => {
      const positions = items.map((item) => item.position).sort((a, b) => a - b);
      const medianPosition = positions[Math.floor(positions.length / 2)];
      const spread = positions[positions.length - 1] - positions[0];
      const meanConfidence =
        items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
      // Disagreement (wide spread) lowers the reported confidence.
      const confidence = Math.max(0.1, Math.min(1, meanConfidence * (1 - spread / 400)));

      return {
        dimension,
        position: clampWorkStylePosition(medianPosition),
        confidence: Math.round(confidence * 100) / 100,
        evidence: dedupe(items.flatMap((item) => item.evidence)).slice(0, 4),
      };
    });
}

function parseClassifications(text: string): WorkStyleClassification[] {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const parsed = JSON.parse(fenced?.[1] ?? text) as {
      classifications?: readonly Record<string, unknown>[];
    };
    return (parsed.classifications ?? []).flatMap((entry) => {
      const dimension = entry.dimension;
      if (
        typeof dimension !== "string" ||
        !(WORK_STYLE_DIMENSIONS as readonly string[]).includes(dimension) ||
        typeof entry.position !== "number"
      ) {
        return [];
      }
      return [
        {
          dimension: dimension as WorkStyleDimension,
          position: clampWorkStylePosition(entry.position),
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
 * Deterministic keyword fallback: coarse, low-confidence, descriptive. The
 * interview never blocks on the provider; the profile remains explainable.
 */
const FALLBACK_SIGNALS: Readonly<
  Record<WorkStyleDimension, { readonly first: RegExp; readonly second: RegExp }>
> = {
  autonomy_escalation: {
    first: /\b(decide[dr]?|decido|on my own|da sol[oa]|without asking|autonom)/i,
    second: /\b(escalat|ask(ed)? my (manager|lead)|chiedo al|inform(ed)? my|align(ed)? with)/i,
  },
  speed_thoroughness: {
    first: /\b(ship|quickly|subito|fast|veloce|right away|deadline first)/i,
    second: /\b(double[- ]check|verify|verific|test(ed)? thoroughly|review(ed)? carefully|accurat)/i,
  },
  individual_collaboration: {
    first: /\b(by myself|i alone|da sol[oa]|i took it on|owned it personally)/i,
    second: /\b(team|colleagues?|colleg|together|insieme|paired|we decided)/i,
  },
  risk_caution: {
    first: /\b(risk|bet|scommess|experiment|tried anyway|gamble)/i,
    second: /\b(cautious|caution|prudent|safe option|backup plan|mitigat)/i,
  },
  structure_improvisation: {
    first: /\b(process|checklist|procedure|plan(ned)? first|struttura|metodo)/i,
    second: /\b(improvis|adapt(ed)? on the fly|figured it out as|al volo)/i,
  },
};

function fallbackProfile(input: EvaluateWorkStyleInput, reason: string): WorkStyleProfile {
  logLlmTelemetry({
    site: "work_style_evaluator",
    provider: "anthropic",
    outcome: "fallback",
    fallbackReason: reason,
  });

  const classifications = WORK_STYLE_DIMENSIONS.flatMap((dimension) => {
    const signals = FALLBACK_SIGNALS[dimension];
    const first = signals.first.test(input.answerText);
    const second = signals.second.test(input.answerText);
    if (first === second) {
      return []; // no evidence either way — stay silent, never invent a lean
    }
    return [
      {
        dimension,
        position: first ? -40 : 40,
        confidence: 0.3,
        evidence: [firstSentenceMatching(input.answerText, first ? signals.first : signals.second)],
      } satisfies WorkStyleClassification,
    ];
  });

  return {
    version: WORK_STYLE_PROFILE_VERSION,
    classifications,
    generatedAt: input.now ?? new Date().toISOString(),
    source: "deterministic_fallback",
  };
}

function firstSentenceMatching(text: string, pattern: RegExp): string {
  const sentence = text
    .split(/(?<=[.!?])\s+/)
    .find((candidate) => pattern.test(candidate));
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

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/** Merge a new evaluation into an existing profile (later items add dimensions). */
export function mergeWorkStyleProfiles(
  existing: WorkStyleProfile | undefined,
  incoming: WorkStyleProfile,
): WorkStyleProfile {
  if (!existing) {
    return incoming;
  }
  const byDimension = new Map<WorkStyleDimension, WorkStyleClassification>();
  for (const classification of existing.classifications) {
    byDimension.set(classification.dimension, classification);
  }
  for (const classification of incoming.classifications) {
    const current = byDimension.get(classification.dimension);
    // Keep the higher-confidence classification per dimension.
    if (!current || classification.confidence >= current.confidence) {
      byDimension.set(classification.dimension, classification);
    }
  }

  return {
    version: WORK_STYLE_PROFILE_VERSION,
    classifications: [...byDimension.values()],
    generatedAt: incoming.generatedAt,
    source: incoming.source === "anthropic" && existing.source === "anthropic"
      ? "anthropic"
      : incoming.source,
  };
}
