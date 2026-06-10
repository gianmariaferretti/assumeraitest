import { containsDisallowedQuestionText } from "../../interview-flow/safety";
import type { StarEvidenceElement } from "../../interview-flow/types";
import { recordLlmUsage, type LlmUsageRecorder } from "../../../lib/llm-budget/core";
import { logLlmTelemetry } from "../../../lib/log";
import {
  barsLevelForScore,
  countCompleteStarElements,
  emptyStarCompleteness,
  scoreWithinLevel,
  STAR_ELEMENTS,
  type BarsCompetency,
  type BarsEvaluation,
  type BarsLevel,
  type DetectedRedFlag,
  type EvaluatorFollowUpRecommendation,
  type RedFlagSeverity,
  type StarCompleteness,
} from "./types";

/**
 * BARS Evaluator — Function 3 of the interview agent.
 *
 * Scores a single candidate answer against the behavioral anchors of one
 * competency. It NEVER talks to the candidate. Its output is an instruction to
 * the interviewer ("ask a follow-up on X" / "move on") plus an auditable score.
 *
 * Runs at low temperature for inter-rater consistency (target Cohen's K >= 0.70).
 * Falls back to a deterministic heuristic scorer when the API is unavailable, so
 * the interview never blocks and every score remains explainable.
 */

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_EVALUATOR_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MODEL_FALLBACKS = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-haiku-20241022",
];
const EVALUATOR_TEMPERATURE = 0.1;
const HIGH_CONFIDENCE_THRESHOLD = 0.5;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface BarsEvaluatorOptions {
  readonly apiKey?: string | null;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly temperature?: number;
  /** Usage hook for the daily LLM budget; defaults to the global recorder. */
  readonly recordUsage?: LlmUsageRecorder;
}

export type EvaluatorSystemPromptVariant = "default" | "evidence_first" | "star_first";

export interface EvaluateResponseInput {
  readonly competency: BarsCompetency;
  readonly questionId: string;
  readonly questionText: string;
  readonly targetStarElements: readonly StarEvidenceElement[];
  readonly answerText: string;
  readonly options?: BarsEvaluatorOptions;
  /**
   * Optional prompt jitter for ensemble raters. Adds exactly one emphasis line to
   * the system prompt — no new rubric content — to stimulate a different facet of
   * the same anchors. `default` is byte-identical to the original prompt.
   */
  readonly systemPromptVariant?: EvaluatorSystemPromptVariant;
}

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}

interface AnthropicMessageResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
  };
}

class EvaluatorOutputSafetyError extends Error {
  constructor() {
    super("evaluator_output_failed_safety_check");
  }
}

export async function evaluateResponseWithBars(
  input: EvaluateResponseInput,
): Promise<BarsEvaluation> {
  const deterministic = deterministicEvaluation(input, "anthropic_not_attempted");
  const apiKey = input.options?.apiKey ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return finalizeFallback(input, "anthropic_api_key_missing");
  }

  const fetchImpl = input.options?.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    return finalizeFallback(input, "anthropic_fetch_unavailable");
  }

  const modelCandidates = resolveModelCandidates(
    input.options?.model ??
      process.env.ANTHROPIC_EVALUATOR_MODEL ??
      process.env.ANTHROPIC_MODEL ??
      DEFAULT_EVALUATOR_MODEL,
  );

  let lastStatus: number | undefined;

  for (const model of modelCandidates) {
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
          max_tokens: input.options?.maxTokens ?? 1200,
          temperature: input.options?.temperature ?? EVALUATOR_TEMPERATURE,
          system: buildSystemPrompt(input.systemPromptVariant),
          messages: [
            {
              role: "user",
              content: JSON.stringify(buildUserPayload(input)),
            },
          ],
        }),
      });

      if (!response.ok) {
        lastStatus = response.status;
        logLlmTelemetry({
          site: "bars_evaluator",
          provider: "anthropic",
          model,
          latencyMs: Date.now() - startedAt,
          outcome: "error",
          fallbackReason: `anthropic_request_failed_${response.status}`,
        });
        if (response.status === 404 && model !== modelCandidates.at(-1)) {
          continue;
        }
        return finalizeFallback(input, `anthropic_request_failed_${response.status}`);
      }

      const message = (await response.json()) as AnthropicMessageResponse;
      (input.options?.recordUsage ?? recordLlmUsage)({
        model,
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      });
      logLlmTelemetry({
        site: "bars_evaluator",
        provider: "anthropic",
        model,
        latencyMs: Date.now() - startedAt,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
        outcome: "ok",
      });
      const parsed = parseJsonObject(extractTextContent(message));
      const evaluation = mapProviderEvaluation(input, parsed, model);
      return evaluation;
    } catch (error) {
      const reason =
        error instanceof EvaluatorOutputSafetyError
          ? "evaluator_output_failed_safety_check"
          : "evaluator_generation_failed";
      return finalizeFallback(input, reason);
    }
  }

  return finalizeFallback(
    input,
    lastStatus ? `anthropic_request_failed_${lastStatus}` : "evaluator_generation_failed",
  );

  // (deterministic kept for symmetry / explicit intent)
  void deterministic;
}

function finalizeFallback(input: EvaluateResponseInput, reason: string): BarsEvaluation {
  // Silent degradation must be visible: every fallback is a WARN log line.
  logLlmTelemetry({
    site: "bars_evaluator",
    provider: "anthropic",
    outcome: "fallback",
    fallbackReason: reason,
  });
  return deterministicEvaluation(input, reason);
}

function buildSystemPrompt(variant: EvaluatorSystemPromptVariant = "default"): string {
  return [
    "You are a structured behavioral interview RESPONSE EVALUATOR. You never address the candidate.",
    "You score ONE answer against ONE competency using its Behaviorally Anchored Rating Scale (BARS).",
    "Translate observed behavior to a 1-10 score strictly via the supplied anchors: below_standard 1-3, meets_standard 4-6, exceeds_standard 7-9, exceptional 10. No impressionistic or vibe-based scoring.",
    "First assess STAR completeness: did the answer establish Situation, Task, Action, Result? Mark each true/false from explicit evidence only.",
    "If a STAR element required by the question is missing, prefer followup_recommendation.action = 'ask_followup' with a single targeted follow-up that probes only the missing element. Do not invent the missing content.",
    "If the answer is off-topic or evades the question, use action = 'redirect'.",
    "If STAR is complete and the anchors are clearly matched, use action = 'next_question'.",
    "Detect red flags only from the supplied red_flag definitions; cite a short verbatim snippet as evidence for each.",
    "Never score, infer, or comment on protected attributes, age, nationality, citizenship, family or health status, religion, gender, personality, emotion, biometrics, face, voice tone, native-speaker status, or accent. If the answer contains such content, ignore it for scoring.",
    "A low score or low confidence means an evidence gap for human review, not a negative judgment of the person.",
    "confidence (0-1) reflects how many anchor descriptors of the assigned level are clearly satisfied by explicit evidence.",
    ...systemPromptVariantLines(variant),
    "Return STRICT JSON only, no prose, matching exactly this shape:",
    JSON.stringify(outputContract()),
  ].join(" ");
}

function systemPromptVariantLines(variant: EvaluatorSystemPromptVariant): string[] {
  if (variant === "evidence_first") {
    return [
      "Emphasis for this pass: weigh concrete, verifiable evidence first when matching the anchors; do not change the rubric, only the order of attention.",
    ];
  }
  if (variant === "star_first") {
    return [
      "Emphasis for this pass: assess STAR completeness most rigorously first when matching the anchors; do not change the rubric, only the order of attention.",
    ];
  }
  return [];
}

function outputContract(): Record<string, unknown> {
  return {
    star_completeness: { situation: true, task: true, action: true, result: true },
    bars_score: 0,
    bars_level: "meets_standard",
    evidence_snippets: ["short verbatim snippets from the answer"],
    red_flags: [{ pattern: "matched red flag pattern", severity: "low", evidence_snippet: "" }],
    followup_recommendation: {
      action: "next_question",
      suggested_followup: "single targeted follow-up if action is ask_followup",
      missing_star_elements: ["situation"],
    },
    confidence: 0.0,
  };
}

function buildUserPayload(input: EvaluateResponseInput): Record<string, unknown> {
  const { competency } = input;
  return {
    task: "bars_response_evaluation",
    competency: {
      id: competency.id,
      name: competency.name,
      description: competency.description,
      bars: competency.bars.map((anchor) => ({
        level: anchor.level,
        score_range: anchor.scoreRange,
        descriptors: anchor.descriptors,
      })),
      red_flags: competency.redFlags.map((flag) => ({
        pattern: flag.pattern,
        severity: flag.severity,
      })),
    },
    question: {
      id: input.questionId,
      text: input.questionText,
      required_star_elements: input.targetStarElements,
    },
    candidate_answer: input.answerText,
  };
}

function mapProviderEvaluation(
  input: EvaluateResponseInput,
  parsed: unknown,
  model: string,
): BarsEvaluation {
  const record = asRecord(parsed) ?? {};

  const star = readStarCompleteness(record.star_completeness);
  const rawScore = readNumber(record.bars_score);
  const score = clampScore(rawScore ?? deterministicScore(input, star));
  const level = reconcileLevel(record.bars_level, score);
  const evidence = readSafeSnippetArray(record.evidence_snippets);
  const redFlags = readRedFlags(record.red_flags, input.competency.redFlags);
  const followup = readFollowUp(record.followup_recommendation, star, input.targetStarElements);
  const confidence = clampUnit(readNumber(record.confidence) ?? estimateConfidence(input, star, score));

  const humanReview =
    confidence < HIGH_CONFIDENCE_THRESHOLD ||
    redFlags.some((flag) => flag.severity === "high");

  return {
    competency_id: input.competency.id,
    question_id: input.questionId,
    star_completeness: star,
    bars_score: score,
    bars_level: level,
    evidence_snippets: evidence,
    red_flags: redFlags,
    followup_recommendation: followup,
    confidence,
    source: "anthropic",
    provider_model: model,
    human_review_required: humanReview,
  };
}

/* ------------------------------------------------------------------ *
 * Deterministic fallback scorer
 * ------------------------------------------------------------------ */

function deterministicEvaluation(
  input: EvaluateResponseInput,
  fallbackReason: string,
): BarsEvaluation {
  const star = detectStarHeuristically(input.answerText);
  const score = deterministicScore(input, star);
  const level = barsLevelForScore(score);
  const redFlags = detectRedFlagsHeuristically(input);
  const missing = STAR_ELEMENTS.filter(
    (element) => input.targetStarElements.includes(element) && !star[element],
  );
  const followup: EvaluatorFollowUpRecommendation =
    missing.length > 0
      ? {
          action: "ask_followup",
          suggested_followup: defaultFollowUpFor(input.competency.id, missing[0]),
          missing_star_elements: missing,
        }
      : { action: "next_question", missing_star_elements: [] };

  // Deterministic fallback never claims high confidence: it always routes to review.
  const confidence = Math.min(0.45, 0.2 + 0.06 * countCompleteStarElements(star));

  return {
    competency_id: input.competency.id,
    question_id: input.questionId,
    star_completeness: star,
    bars_score: score,
    bars_level: level,
    evidence_snippets: firstSnippets(input.answerText, 2),
    red_flags: redFlags,
    followup_recommendation: followup,
    confidence,
    source: "deterministic_fallback",
    fallback_reason: fallbackReason,
    human_review_required: true,
  };
}

function deterministicScore(input: EvaluateResponseInput, star: StarCompleteness): number {
  const completeStar = countCompleteStarElements(star);
  const words = input.answerText.trim().split(/\s+/).filter(Boolean).length;
  const hasQuantifiedResult = /\b\d+([.,]\d+)?\s?(%|percent|k|€|\$|x|times|volte)\b/i.test(
    input.answerText,
  );
  const usesFirstPersonAction = /\b(i|io|ho|sono|gestii|gestito|ho fatto|managed|led|built|wrote)\b/i.test(
    input.answerText,
  );

  let score = 1;
  score += completeStar; // up to +4
  if (words >= 40) score += 1;
  if (usesFirstPersonAction) score += 1;
  if (hasQuantifiedResult) score += 1;
  if (completeStar === 4 && hasQuantifiedResult && words >= 80) score += 1;

  return clampScore(score);
}

function detectStarHeuristically(answer: string): StarCompleteness {
  const text = answer.toLowerCase();
  const star = emptyStarCompleteness();
  // Situation: temporal / contextual anchors
  star.situation =
    /\b(when|while|durante|quando|at the time|in (that|the) (project|role|team)|nel progetto|nel ruolo)\b/.test(
      text,
    ) || /\b(20\d\d|last (year|month|quarter)|l'anno scorso|mesi fa)\b/.test(text);
  // Task: responsibility framing
  star.task =
    /\b(my (job|task|role|responsibility)|i was responsible|dovevo|il mio compito|mi occupavo|avevo il compito)\b/.test(
      text,
    );
  // Action: first-person verbs of doing
  star.action =
    /\b(i (did|built|led|wrote|created|organi|managed|negotiat|fixed)|ho (fatto|costruito|gestito|scritto|creato|organizzato|risolto))\b/.test(
      text,
    );
  // Result: outcome / quantification
  star.result =
    /\b(result|outcome|as a result|in the end|we (closed|won|grew|reduced)|risultato|alla fine|abbiamo (chiuso|vinto|aumentato|ridotto))\b/.test(
      text,
    ) || /\b\d+([.,]\d+)?\s?(%|percent|k|€|\$)\b/.test(text);
  return star;
}

function detectRedFlagsHeuristically(input: EvaluateResponseInput): DetectedRedFlag[] {
  const text = input.answerText.toLowerCase();
  const detected: DetectedRedFlag[] = [];

  const blameOthers = /\b(it was (their|his|her) fault|colpa (loro|sua|del team)|non (è|e) colpa mia)\b/i;
  if (blameOthers.test(text)) {
    detected.push({
      pattern: "attributes failure to others",
      severity: "high",
      evidence_snippet: firstSnippets(input.answerText, 1)[0] ?? "",
    });
  }

  // Surface declared red flags that have a literal lexical hook in the answer.
  for (const flag of input.competency.redFlags) {
    const keyword = flag.pattern.split(/[\s>:]+/).find((token) => token.length > 4);
    if (keyword && text.includes(keyword.toLowerCase())) {
      detected.push({
        pattern: flag.pattern,
        severity: flag.severity,
        evidence_snippet: firstSnippets(input.answerText, 1)[0] ?? "",
      });
    }
  }

  return dedupeRedFlags(detected);
}

/* ------------------------------------------------------------------ *
 * Parsing helpers (mirrors the repo's resilient JSON handling)
 * ------------------------------------------------------------------ */

function readStarCompleteness(value: unknown): StarCompleteness {
  const record = asRecord(value) ?? {};
  return {
    situation: Boolean(record.situation),
    task: Boolean(record.task),
    action: Boolean(record.action),
    result: Boolean(record.result),
  };
}

function reconcileLevel(rawLevel: unknown, score: number): BarsLevel {
  const candidate = typeof rawLevel === "string" ? (rawLevel.trim() as BarsLevel) : null;
  if (candidate && scoreWithinLevel(score, candidate)) {
    return candidate;
  }
  // The numeric score is authoritative if the provider's label disagrees.
  return barsLevelForScore(score);
}

function readRedFlags(
  value: unknown,
  definitions: readonly { pattern: string; severity: RedFlagSeverity }[],
): DetectedRedFlag[] {
  const validSeverities: RedFlagSeverity[] = ["low", "medium", "high"];
  const definedPatterns = new Set(definitions.map((definition) => definition.pattern));

  const flags = readArray(value).flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    const pattern = readString(record.pattern);
    if (!pattern) return [];
    const severityRaw = readString(record.severity) as RedFlagSeverity | undefined;
    const severity = severityRaw && validSeverities.includes(severityRaw) ? severityRaw : "medium";
    const snippet = safeSnippet(record.evidence_snippet) ?? "";
    // Keep provider flags but prefer declared severity when the pattern is known.
    const declared = definitions.find((definition) => definition.pattern === pattern);
    return [
      {
        pattern,
        severity: declared?.severity ?? severity,
        evidence_snippet: snippet,
      },
    ];
  });

  void definedPatterns;
  return dedupeRedFlags(flags);
}

function readFollowUp(
  value: unknown,
  star: StarCompleteness,
  target: readonly StarEvidenceElement[],
): EvaluatorFollowUpRecommendation {
  const record = asRecord(value) ?? {};
  const actionRaw = readString(record.action);
  const missing = STAR_ELEMENTS.filter(
    (element) => target.includes(element) && !star[element],
  );

  const action =
    actionRaw === "ask_followup" || actionRaw === "redirect" || actionRaw === "next_question"
      ? actionRaw
      : missing.length > 0
        ? "ask_followup"
        : "next_question";

  const suggested = safeSnippet(record.suggested_followup);

  return {
    action,
    suggested_followup: action === "ask_followup" ? suggested : undefined,
    missing_star_elements: missing,
  };
}

function estimateConfidence(
  input: EvaluateResponseInput,
  star: StarCompleteness,
  score: number,
): number {
  const completeStar = countCompleteStarElements(star);
  const base = 0.4 + 0.12 * completeStar;
  const lengthBonus = input.answerText.trim().length > 200 ? 0.1 : 0;
  void score;
  return clampUnit(base + lengthBonus);
}

function defaultFollowUpFor(competencyId: string, missing: StarEvidenceElement): string {
  const map: Record<StarEvidenceElement, string> = {
    situation: "Aiutami a capire il contesto: quando è successo e chi era coinvolto?",
    task: "Di cosa eri responsabile tu in quella situazione?",
    action: "Cosa hai fatto tu personalmente, passo per passo?",
    result: "Com'è andata a finire? C'è un esito che puoi quantificare?",
  };
  void competencyId;
  return map[missing];
}

/* ------------------------------------------------------------------ *
 * Small utilities
 * ------------------------------------------------------------------ */

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function firstSnippets(text: string, count: number): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, count);
}

function safeSnippet(value: unknown): string | undefined {
  const text = readString(value);
  if (!text) return undefined;
  if (containsDisallowedQuestionText(text)) {
    // Drop any snippet that surfaces a protected-trait signal.
    return undefined;
  }
  return text;
}

function readSafeSnippetArray(value: unknown): string[] {
  return unique(readArray(value).flatMap((item) => safeSnippet(item) ?? []));
}

function dedupeRedFlags(flags: DetectedRedFlag[]): DetectedRedFlag[] {
  const seen = new Set<string>();
  const out: DetectedRedFlag[] = [];
  for (const flag of flags) {
    if (seen.has(flag.pattern)) continue;
    seen.add(flag.pattern);
    out.push(flag);
  }
  return out;
}

function extractTextContent(message: AnthropicMessageResponse): string {
  const text = message.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) {
    throw new Error("Evaluator response did not contain text JSON.");
  }
  return text;
}

function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Evaluator response was not valid JSON.");
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function resolveModelCandidates(primaryModel: string): string[] {
  return unique([
    primaryModel,
    ...parseModelList(process.env.ANTHROPIC_EVALUATOR_MODEL_FALLBACKS),
    ...parseModelList(process.env.ANTHROPIC_MODEL_FALLBACKS),
    ...DEFAULT_MODEL_FALLBACKS,
  ]);
}

function parseModelList(value: string | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.replace(/\s+/g, " ").trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
