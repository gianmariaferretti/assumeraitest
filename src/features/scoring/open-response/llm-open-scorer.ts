import { recordLlmUsage, type LlmUsageRecorder } from "../../../lib/llm-budget/core";
import { logLlmTelemetry } from "../../../lib/log";
import { containsDisallowedQuestionText } from "../../interview-flow/safety";
import {
  buildModuleScoreResult,
  clampConfidence,
  clampScore0to100,
  type ModuleScoreResult,
  type ScoredCompetency,
} from "../module-scoring/scorer-types";

/**
 * LLM open-response scorer (Phase 1–2). Grades a free-text or transcribed
 * answer against named competencies on a 0–100 scale, with verbatim evidence
 * and an audit reason. Reused by: language writing (CEFR), AI-fluency open
 * scenario, data-interpretation open question, SJT justification, and language
 * speaking (which is scored from the TRANSCRIPT TEXT only — never accent,
 * prosody, or voice; that boundary is enforced in the prompt and is the same
 * rule as language-test-plan's disallowed signals).
 *
 * Safety: the prompt forbids assessing any protected attribute, accent, or
 * personality; the model's reason strings are re-checked with
 * `containsDisallowedQuestionText` and any hit drops the result to the
 * deterministic fallback. Like every scorer, a missing/failing provider
 * degrades to a neutral, low-confidence, human-review result — never a block.
 */

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const TEMPERATURE = 0.1;

export const OPEN_RESPONSE_SCORER_VERSION = "llm-open-response-scorer-v1";
const FALLBACK_NEUTRAL_SCORE = 50;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type OpenResponseMode = "writing" | "speaking" | "scenario" | "sjt";

export interface OpenResponseCompetencySpec {
  readonly competency_id: string;
  /** What this competency means; goes verbatim into the rubric the model sees. */
  readonly descriptor: string;
}

export interface OpenResponseScorerOptions {
  readonly apiKey?: string | null;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly recordUsage?: LlmUsageRecorder;
}

export interface OpenResponseScoringInput {
  readonly module_id: string;
  readonly mode: OpenResponseMode;
  readonly prompt: string;
  readonly response: string;
  readonly competencies: readonly OpenResponseCompetencySpec[];
  /** Interview language name, for register-appropriate grading (writing/speaking). */
  readonly language?: string;
  readonly options?: OpenResponseScorerOptions;
  readonly now?: string;
}

function buildSystemPrompt(input: OpenResponseScoringInput): string {
  const speakingNote =
    input.mode === "speaking"
      ? "This is a SPOKEN answer provided as a transcript. Score fluency, clarity, and intelligibility from the TEXT ONLY. NEVER assess or mention accent, pronunciation quality, voice, native-speaker status, or origin."
      : "";
  return [
    "You are a calibrated, fair assessment grader. You grade ONE open answer against the given competencies.",
    "Score each competency 0–100 with a short, concrete reason and a verbatim evidence quote from the answer.",
    "NEVER assess or infer protected attributes (age, gender, nationality, ethnicity, religion, health, family status), accent, emotions, biometrics, or personality.",
    "A weak answer is an evidence gap for human review, never a judgment of the person. Set needs_human_review when confidence is low or evidence is thin.",
    speakingNote,
    input.language ? `The answer is expected in ${input.language}.` : "",
    'Return strict JSON: {"competencies":[{"competency_id":"...","score":<0-100>,"confidence":<0-1>,"evidence":["..."],"reason":"...","needs_human_review":<bool>}]}.',
  ]
    .filter(Boolean)
    .join(" ");
}

export async function scoreOpenResponse(
  input: OpenResponseScoringInput,
): Promise<ModuleScoreResult> {
  const apiKey = input.options?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const fetchImpl = input.options?.fetchImpl ?? globalThis.fetch;
  if (!apiKey || !fetchImpl || input.response.trim().length === 0) {
    return fallback(input, "open_response_provider_unavailable");
  }

  const model = input.options?.model ?? process.env.ANTHROPIC_EVALUATOR_MODEL ?? DEFAULT_MODEL;
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
        max_tokens: input.options?.maxTokens ?? 1024,
        temperature: TEMPERATURE,
        system: buildSystemPrompt(input),
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              mode: input.mode,
              prompt: input.prompt,
              answer: input.response,
              competencies: input.competencies.map((competency) => ({
                competency_id: competency.competency_id,
                descriptor: competency.descriptor,
              })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      logLlmTelemetry({
        site: "open_response_scorer",
        provider: "anthropic",
        model,
        latencyMs: Date.now() - startedAt,
        outcome: "error",
        fallbackReason: `anthropic_request_failed_${response.status}`,
      });
      return fallback(input, `anthropic_request_failed_${response.status}`);
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
      site: "open_response_scorer",
      provider: "anthropic",
      model,
      latencyMs: Date.now() - startedAt,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
      outcome: "ok",
    });

    const parsed = parseScores(extractText(message), input.competencies);
    if (!parsed) {
      return fallback(input, "open_response_unparseable");
    }
    return buildModuleScoreResult({
      module_id: input.module_id,
      scorer_type: "language",
      scorer_version: OPEN_RESPONSE_SCORER_VERSION,
      competency_scores: parsed,
      used_fallback: false,
      now: input.now,
    });
  } catch {
    return fallback(input, "open_response_generation_failed");
  }
}

function parseScores(
  text: string,
  competencies: readonly OpenResponseCompetencySpec[],
): ScoredCompetency[] | null {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const parsed = JSON.parse(fenced?.[1] ?? text) as {
      competencies?: readonly Record<string, unknown>[];
    };
    const known = new Set(competencies.map((competency) => competency.competency_id));
    const scored = (parsed.competencies ?? []).flatMap((entry): ScoredCompetency[] => {
      const competencyId = entry.competency_id;
      if (typeof competencyId !== "string" || !known.has(competencyId)) {
        return [];
      }
      const reason = typeof entry.reason === "string" ? entry.reason : "";
      const evidence = Array.isArray(entry.evidence)
        ? entry.evidence.filter((item): item is string => typeof item === "string")
        : [];
      // Safety re-check: a reason or evidence that trips the protected-trait
      // filter invalidates the whole result (drops to deterministic fallback).
      if (containsDisallowedQuestionText(reason) || evidence.some(containsDisallowedQuestionText)) {
        throw new Error("open_response_safety_violation");
      }
      return [
        {
          competency_id: competencyId,
          score: clampScore0to100(typeof entry.score === "number" ? entry.score : 0),
          confidence: clampConfidence(typeof entry.confidence === "number" ? entry.confidence : 0.5),
          evidence: evidence.slice(0, 4),
          reason:
            (reason || "Scored against the competency descriptor.") +
            " Recommendation for human review, not an automated decision.",
          needs_human_review: entry.needs_human_review === true,
        },
      ];
    });
    return scored.length > 0 ? scored : null;
  } catch {
    return null;
  }
}

function fallback(input: OpenResponseScoringInput, reason: string): ModuleScoreResult {
  logLlmTelemetry({
    site: "open_response_scorer",
    provider: "anthropic",
    outcome: "fallback",
    fallbackReason: reason,
  });
  const competencyScores: ScoredCompetency[] = input.competencies.map((competency) => ({
    competency_id: competency.competency_id,
    score: FALLBACK_NEUTRAL_SCORE,
    confidence: 0,
    evidence: [],
    reason:
      "Open-response grading is temporarily unavailable; this competency is routed to a human reviewer with no automated score.",
    needs_human_review: true,
  }));
  return buildModuleScoreResult({
    module_id: input.module_id,
    scorer_type: "language",
    scorer_version: OPEN_RESPONSE_SCORER_VERSION,
    competency_scores: competencyScores,
    used_fallback: true,
    now: input.now,
  });
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
