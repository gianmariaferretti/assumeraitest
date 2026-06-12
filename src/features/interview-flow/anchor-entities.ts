import { recordLlmUsage, type LlmUsageRecorder } from "../../lib/llm-budget/core";
import { logLlmTelemetry } from "../../lib/log";
import { inspectQuestionSafety } from "./safety";
import type { InterviewQuestion, QuestionSafetyViolation } from "./types";

/**
 * Anchor entities for grounded follow-ups (anti-cheating v2, intervention 1).
 *
 * THE REAL MOAT against external "answer copilot" overlays is not surveillance
 * — it is making the conversation hard to outsource. A generic follow-up
 * ("tell me more") can be answered by any LLM; a follow-up anchored on a
 * concrete entity the candidate JUST said ("you mentioned the Kafka migration
 * — what did you do when the consumer lagged?") forces the candidate to stay
 * inside their own story, turn after turn. Copying each question into an
 * external tool and reading the answer back gets slower, more visibly
 * unnatural, and less coherent the more the thread is anchored.
 *
 * Extraction is deterministic-first (pure text heuristics, offline-safe) with
 * an OPTIONAL LLM pass behind the same Anthropic provider pattern used by the
 * interviewer agent (injectable fetchImpl, budget recorder, telemetry,
 * deterministic fallback on any failure).
 *
 * Safety: anchors are the candidate's own concrete words (technologies,
 * metrics, named decisions). Anything matching the protected-trait filter is
 * dropped, and every follow-up built on an anchor is re-checked with
 * inspectQuestionSafety before it can reach the candidate.
 */

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_ANCHOR_MODEL = "claude-3-5-haiku-20241022";

export const MAX_ANCHOR_ENTITIES = 3;
const MIN_ANCHOR_LENGTH = 2;
const MAX_ANCHOR_LENGTH = 40;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface AnchorExtractionOptions {
  readonly apiKey?: string | null;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly recordUsage?: LlmUsageRecorder;
}

/** Common sentence-starting words that look like proper nouns but are not. */
const CAPITALIZED_STOPWORDS = new Set(
  [
    // en
    "the", "then", "when", "after", "before", "during", "first", "finally", "so", "but", "and",
    "i", "we", "they", "it", "this", "that", "there", "here", "also", "once", "later", "well",
    "yes", "no", "my", "our", "in", "on", "at", "for", "with", "what", "how", "why",
    // it
    "il", "la", "lo", "le", "gli", "un", "una", "poi", "quando", "dopo", "prima", "durante",
    "quindi", "ma", "e", "io", "noi", "loro", "questo", "quella", "anche", "alla", "fine",
    "ho", "abbiamo", "era", "sono", "nel", "alla", "del", "della", "per", "con", "come",
    // fr
    "le", "les", "des", "puis", "quand", "après", "avant", "pendant", "donc", "mais", "et",
    "je", "nous", "ils", "cette", "aussi", "ensuite", "alors", "dans", "pour", "avec",
    // de
    "der", "die", "das", "dann", "als", "nach", "vor", "während", "also", "aber", "und",
    "ich", "wir", "sie", "es", "diese", "auch", "danach", "dort", "hier", "im", "am",
    // es
    "el", "los", "las", "luego", "cuando", "después", "antes", "durante", "entonces", "pero",
    "y", "yo", "nosotros", "ellos", "esto", "esa", "también", "al", "en", "por", "con"
  ].map((word) => word.toLowerCase())
);

/** Tech-shaped tokens: inner capitals, digits, dots, or all-caps acronyms. */
const TECH_TOKEN_PATTERN = /^(?:[A-Z]{2,}[A-Za-z0-9.-]*|[A-Za-z]+\d[\w.-]*|[A-Za-z]+\.[a-z]{1,4}|[a-z]+[A-Z][\w.-]*)$/;

/** Metrics the candidate cited: percentages, durations, money, magnitudes. */
const METRIC_PATTERN = /\b\d+(?:[.,]\d+)?\s?(?:%|ms|s\b|sec|min|h\b|k\b|K\b|M\b|GB|MB|€|\$|£)/g;

/**
 * Deterministic anchor extraction: 1-3 concrete entities (technologies,
 * named things, metrics, quoted terms) from the candidate's last answer.
 * Pure, offline, language-agnostic enough for the five interview languages.
 */
export function extractAnchorEntities(answerText: string): string[] {
  const text = (answerText ?? "").trim();
  if (text.length === 0) {
    return [];
  }

  const ranked: { anchor: string; rank: number }[] = [];
  const push = (raw: string, rank: number) => {
    const anchor = raw.trim().replace(/^["'«]+|["'»,.;:!?]+$/g, "");
    if (anchor.length < MIN_ANCHOR_LENGTH || anchor.length > MAX_ANCHOR_LENGTH) {
      return;
    }
    if (CAPITALIZED_STOPWORDS.has(anchor.toLowerCase())) {
      return;
    }
    ranked.push({ anchor, rank });
  };

  // 1. Tech-shaped tokens anywhere (PostgreSQL, K8s, GPT-4, Node.js, AWS).
  for (const token of text.split(/[\s/()[\]{}]+/)) {
    const cleaned = token.replace(/^["'«]+|["'»,.;:!?]+$/g, "");
    if (TECH_TOKEN_PATTERN.test(cleaned)) {
      push(cleaned, 0);
    }
  }

  // 2. Metrics the candidate cited (a copilot rarely keeps these coherent).
  for (const match of text.match(METRIC_PATTERN) ?? []) {
    push(match, 1);
  }

  // 3. Quoted terms ("two-step rollout").
  for (const match of text.match(/["'«]([^"'»]{2,40})["'»]/g) ?? []) {
    push(match.replace(/^["'«]|["'»]$/g, ""), 1);
  }

  // 4. Capitalized words NOT at a sentence start (proper nouns: Acme, Berlino).
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const words = sentence.split(/\s+/);
    for (let index = 1; index < words.length; index += 1) {
      const cleaned = words[index].replace(/^["'«(]+|["'»),.;:!?]+$/g, "");
      if (/^[A-ZÀ-Þ][a-zà-ÿ]{2,}$/.test(cleaned)) {
        push(cleaned, 2);
      }
    }
  }

  return dedupeAnchors(ranked);
}

function dedupeAnchors(ranked: readonly { anchor: string; rank: number }[]): string[] {
  const seen = new Set<string>();
  return [...ranked]
    .sort((a, b) => a.rank - b.rank)
    .filter(({ anchor }) => {
      const key = anchor.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map(({ anchor }) => anchor)
    .filter((anchor) => isAnchorSafe(anchor))
    .slice(0, MAX_ANCHOR_ENTITIES);
}

/** An anchor must never be (or contain) a protected-trait term. */
export function isAnchorSafe(anchor: string): boolean {
  return followUpTextSafetyViolations(anchor).length === 0;
}

/**
 * Optional LLM extraction behind the same provider pattern as the interviewer
 * agent. Any failure — no key, no fetch, HTTP error, bad JSON — degrades to
 * the deterministic extractor, so the turn never blocks. LLM anchors must
 * appear VERBATIM in the answer (guards against hallucinated entities) and
 * pass the same safety filter.
 */
export async function extractAnchorEntitiesViaProvider(
  input: { readonly answerText: string },
  options?: AnchorExtractionOptions
): Promise<string[]> {
  const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  if (!apiKey || !fetchImpl || input.answerText.trim().length === 0) {
    return extractAnchorEntities(input.answerText);
  }

  const model = options?.model ?? DEFAULT_ANCHOR_MODEL;
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(options?.endpoint ?? ANTHROPIC_API_ENDPOINT, {
      method: "POST",
      headers: {
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 200,
        temperature: 0,
        system: [
          "Extract up to 3 concrete anchor entities from ONE interview answer: a technology, a metric, a named decision or artifact the candidate mentioned.",
          "Each anchor must be a VERBATIM substring of the answer.",
          "NEVER extract personal or protected attributes (age, nationality, family, health, religion, gender, accent, emotions).",
          'Return strict JSON: {"anchors":["..."]}.'
        ].join(" "),
        messages: [{ role: "user", content: JSON.stringify({ answer: input.answerText }) }]
      })
    });
    if (!response.ok) {
      logLlmTelemetry({
        site: "anchor_extractor",
        provider: "anthropic",
        model,
        latencyMs: Date.now() - startedAt,
        outcome: "error",
        fallbackReason: `anthropic_request_failed_${response.status}`
      });
      return extractAnchorEntities(input.answerText);
    }
    const message = (await response.json()) as {
      content?: readonly { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    (options?.recordUsage ?? recordLlmUsage)({
      model,
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0
    });
    logLlmTelemetry({
      site: "anchor_extractor",
      provider: "anthropic",
      model,
      latencyMs: Date.now() - startedAt,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
      outcome: "ok"
    });

    const text =
      message.content
        ?.filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join("\n") ?? "";
    const parsed = JSON.parse(text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text) as {
      anchors?: unknown;
    };
    const anchors = (Array.isArray(parsed.anchors) ? parsed.anchors : [])
      .filter((anchor): anchor is string => typeof anchor === "string")
      .map((anchor) => anchor.trim())
      .filter(
        (anchor) =>
          anchor.length >= MIN_ANCHOR_LENGTH &&
          anchor.length <= MAX_ANCHOR_LENGTH &&
          input.answerText.toLowerCase().includes(anchor.toLowerCase()) &&
          isAnchorSafe(anchor)
      )
      .slice(0, MAX_ANCHOR_ENTITIES);

    return anchors.length > 0 ? anchors : extractAnchorEntities(input.answerText);
  } catch {
    logLlmTelemetry({
      site: "anchor_extractor",
      provider: "anthropic",
      outcome: "fallback",
      fallbackReason: "anchor_extraction_failed"
    });
    return extractAnchorEntities(input.answerText);
  }
}

/**
 * Run a generated follow-up line through the full question safety inspection
 * (protected traits + employer neutrality) by wrapping it in a synthetic
 * InterviewQuestion. Used as a gate BEFORE any anchored follow-up is emitted.
 */
export function followUpTextSafetyViolations(text: string): QuestionSafetyViolation[] {
  const syntheticQuestion: InterviewQuestion = {
    id: "generated_follow_up",
    version: "interview-question-v0",
    moduleId: "motivation",
    roleFamily: "operations",
    difficulty: "baseline",
    prompt: text,
    rubric: ["follow-up"],
    expectedSignals: [],
    disallowedSignals: [],
    evidenceRequirements: [],
    timeTargetSeconds: 60,
    followUpRules: []
  };
  return inspectQuestionSafety(syntheticQuestion).violations;
}
