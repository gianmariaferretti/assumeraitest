/**
 * Tiny structured logger: one JSON line per event on stdout/stderr.
 *
 * Fields follow a small convention so logs are greppable and shippable:
 * level, msg, time, plus contextual fields (correlationId, route,
 * candidateId, workspaceId) whenever the caller has them. Dependency-free on
 * purpose — providers and route handlers can import it without dragging in
 * server-only modules, and it stays silent under NODE_ENV=test.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  readonly correlationId?: string;
  readonly route?: string;
  readonly candidateId?: string;
  readonly workspaceId?: string;
  readonly [key: string]: unknown;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function minLevelWeight(): number {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (configured === "debug" || configured === "info" || configured === "warn" || configured === "error") {
    return LEVEL_WEIGHT[configured];
  }

  return LEVEL_WEIGHT.info;
}

function isSilenced(): boolean {
  const inTestRun = process.env.NODE_ENV === "test" || Boolean(process.env.NODE_TEST_CONTEXT);
  return inTestRun && process.env.ASSUMERAI_LOG_IN_TESTS !== "true";
}

export function log(level: LogLevel, msg: string, fields: LogFields = {}): void {
  if (isSilenced() || LEVEL_WEIGHT[level] < minLevelWeight()) {
    return;
  }

  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...fields
  });

  if (level === "warn" || level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logDebug = (msg: string, fields?: LogFields): void => log("debug", msg, fields);
export const logInfo = (msg: string, fields?: LogFields): void => log("info", msg, fields);
export const logWarn = (msg: string, fields?: LogFields): void => log("warn", msg, fields);
export const logError = (msg: string, fields?: LogFields): void => log("error", msg, fields);

// ---------------------------------------------------------------------------
// LLM / transcription call telemetry
// ---------------------------------------------------------------------------

export type LlmCallOutcome = "ok" | "fallback" | "error";

export interface LlmTelemetryEvent {
  /** Which call site fired (e.g. bars_evaluator, interviewer_agent). */
  readonly site: string;
  readonly provider: "anthropic" | "deepgram";
  readonly model?: string;
  readonly latencyMs?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly outcome: LlmCallOutcome;
  /** Set when a deterministic fallback replaced the provider output. */
  readonly fallbackReason?: string;
  readonly correlationId?: string;
}

/**
 * One log line per provider call. Fallbacks and errors are WARN so silent
 * degradation is visible in production logs, never invisible.
 */
export function logLlmTelemetry(event: LlmTelemetryEvent): void {
  const fields: LogFields = {
    site: event.site,
    provider: event.provider,
    model: event.model,
    latency_ms: event.latencyMs === undefined ? undefined : Math.round(event.latencyMs),
    input_tokens: event.inputTokens,
    output_tokens: event.outputTokens,
    outcome: event.outcome,
    fallback_used: event.outcome === "fallback",
    fallback_reason: event.fallbackReason,
    correlationId: event.correlationId
  };

  if (event.outcome === "ok") {
    log("info", "llm_call", fields);
  } else {
    log("warn", event.outcome === "fallback" ? "llm_fallback" : "llm_call_failed", fields);
  }
}
