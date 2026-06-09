/**
 * LLM budget guard core: token accounting, EUR cost estimation, and the daily
 * budget decision. Pure and dependency-free; the Postgres-backed store lives in
 * ./store.ts. Anthropic call sites report usage through the global recorder
 * seam below so providers never import server-only modules (keeps their
 * deterministic-fallback tests runnable offline).
 */

export interface LlmUsageEvent {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface LlmDailyUsageRow {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly calls: number;
}

export interface LlmUsageStore {
  readDailyTotals(usageDate: string): Promise<LlmDailyUsageRow[]>;
  recordUsage(usageDate: string, usage: LlmUsageEvent): Promise<void>;
}

export type LlmUsageRecorder = (usage: LlmUsageEvent) => void;

/** Estimated prices in EUR per million tokens, by model family. */
export const LLM_MODEL_PRICES_EUR_PER_MTOK: readonly {
  readonly match: RegExp;
  readonly inputEurPerMTok: number;
  readonly outputEurPerMTok: number;
}[] = [
  { match: /opus/i, inputEurPerMTok: 15, outputEurPerMTok: 75 },
  { match: /sonnet/i, inputEurPerMTok: 3, outputEurPerMTok: 15 },
  { match: /haiku/i, inputEurPerMTok: 1, outputEurPerMTok: 5 }
];

/** Conservative default for unknown models (priced like Sonnet). */
export const LLM_DEFAULT_PRICE_EUR_PER_MTOK = {
  inputEurPerMTok: 3,
  outputEurPerMTok: 15
} as const;

export const LLM_DAILY_BUDGET_EUR_DEFAULT = 25;

export function estimateLlmCostEur(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const price =
    LLM_MODEL_PRICES_EUR_PER_MTOK.find((entry) => entry.match.test(model)) ??
    LLM_DEFAULT_PRICE_EUR_PER_MTOK;

  return (
    (Math.max(inputTokens, 0) / 1_000_000) * price.inputEurPerMTok +
    (Math.max(outputTokens, 0) / 1_000_000) * price.outputEurPerMTok
  );
}

export function estimateDailyCostEur(rows: readonly LlmDailyUsageRow[]): number {
  return rows.reduce(
    (total, row) => total + estimateLlmCostEur(row.model, row.inputTokens, row.outputTokens),
    0
  );
}

export interface LlmBudgetDecision {
  readonly allowed: boolean;
  readonly estimatedCostEur: number;
  readonly budgetEur: number;
}

/** The cutoff: spending at or above the daily budget blocks further API calls. */
export function decideLlmBudget(
  rows: readonly LlmDailyUsageRow[],
  budgetEur: number
): LlmBudgetDecision {
  const estimatedCostEur = estimateDailyCostEur(rows);

  return {
    allowed: estimatedCostEur < budgetEur,
    estimatedCostEur,
    budgetEur
  };
}

export function readLlmDailyBudgetEurFromEnv(value: string | undefined): number {
  if (!value) {
    return LLM_DAILY_BUDGET_EUR_DEFAULT;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return LLM_DAILY_BUDGET_EUR_DEFAULT;
  }

  return parsed;
}

/** UTC calendar day used as the budget window key. */
export function usageDateFor(now?: string): string {
  const date = now ? new Date(now) : new Date();
  return date.toISOString().slice(0, 10);
}

/** Retry-After value for a 503: seconds until the UTC budget window resets. */
export function secondsUntilUtcMidnight(now?: string): number {
  const nowMs = now ? Date.parse(now) : Date.now();
  const next = new Date(nowMs);
  next.setUTCHours(24, 0, 0, 0);

  return Math.max(1, Math.ceil((next.getTime() - nowMs) / 1000));
}

// ---------------------------------------------------------------------------
// Global recorder seam (providers -> store, without a server-only import)
// ---------------------------------------------------------------------------

const memoryUsage = new Map<string, Map<string, LlmDailyUsageRow>>();

export function createInMemoryLlmUsageStore(): LlmUsageStore {
  return {
    async readDailyTotals(usageDate) {
      return [...(memoryUsage.get(usageDate)?.values() ?? [])];
    },

    async recordUsage(usageDate, usage) {
      const day = memoryUsage.get(usageDate) ?? new Map<string, LlmDailyUsageRow>();
      const current = day.get(usage.model) ?? {
        model: usage.model,
        inputTokens: 0,
        outputTokens: 0,
        calls: 0
      };
      day.set(usage.model, {
        model: usage.model,
        inputTokens: current.inputTokens + Math.max(usage.inputTokens, 0),
        outputTokens: current.outputTokens + Math.max(usage.outputTokens, 0),
        calls: current.calls + 1
      });
      memoryUsage.set(usageDate, day);
    }
  };
}

/** Test-only helper: clear in-memory usage between cases. */
export function clearInMemoryLlmUsage(): void {
  memoryUsage.clear();
}

const inMemoryStore = createInMemoryLlmUsageStore();

let globalRecorder: LlmUsageRecorder = (usage) => {
  void inMemoryStore.recordUsage(usageDateFor(), usage).catch(() => undefined);
};

/**
 * Replace the global usage recorder. ./store.ts registers the Postgres-backed
 * recorder when a route imports the llm-budget index; until then usage lands in
 * the in-memory store (local dev / tests).
 */
export function setGlobalLlmUsageRecorder(recorder: LlmUsageRecorder): void {
  globalRecorder = recorder;
}

/**
 * Fire-and-forget usage hook called by every Anthropic call site after a
 * successful response. Never throws and never blocks the caller.
 */
export function recordLlmUsage(usage: LlmUsageEvent): void {
  if (!usage.model || (usage.inputTokens <= 0 && usage.outputTokens <= 0)) {
    return;
  }
  try {
    globalRecorder(usage);
  } catch {
    // Usage accounting must never break a candidate-facing call.
  }
}

/** Read today's totals from the in-memory store (used by tests and local dev). */
export async function readInMemoryDailyTotals(usageDate: string): Promise<LlmDailyUsageRow[]> {
  return inMemoryStore.readDailyTotals(usageDate);
}

export function getInMemoryLlmUsageStore(): LlmUsageStore {
  return inMemoryStore;
}
