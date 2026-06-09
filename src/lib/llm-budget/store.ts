import { createAdminClient } from "@/lib/supabase/admin";

import {
  decideLlmBudget,
  getInMemoryLlmUsageStore,
  readLlmDailyBudgetEurFromEnv,
  setGlobalLlmUsageRecorder,
  usageDateFor,
  type LlmBudgetDecision,
  type LlmUsageStore
} from "./core";

/**
 * Postgres-backed daily usage store (llm_usage_daily, service-role only).
 * Increments go through the record_llm_usage() SQL function so concurrent
 * routes never lose counts.
 */
export function createSupabaseLlmUsageStore(
  admin: Pick<ReturnType<typeof createAdminClient>, "from" | "rpc">
): LlmUsageStore {
  return {
    async readDailyTotals(usageDate) {
      const { data, error } = await admin
        .from("llm_usage_daily")
        .select("model,input_tokens,output_tokens,calls")
        .eq("usage_date", usageDate);
      if (error || !data) {
        return [];
      }

      return (data as Record<string, unknown>[]).map((row) => ({
        model: String(row.model ?? "unknown"),
        inputTokens: Number(row.input_tokens ?? 0),
        outputTokens: Number(row.output_tokens ?? 0),
        calls: Number(row.calls ?? 0)
      }));
    },

    async recordUsage(usageDate, usage) {
      await admin.rpc("record_llm_usage", {
        p_usage_date: usageDate,
        p_model: usage.model,
        p_input_tokens: Math.round(Math.max(usage.inputTokens, 0)),
        p_output_tokens: Math.round(Math.max(usage.outputTokens, 0))
      });
    }
  };
}

export function resolveLlmUsageStore(): LlmUsageStore {
  try {
    return createSupabaseLlmUsageStore(createAdminClient());
  } catch {
    return getInMemoryLlmUsageStore();
  }
}

// Register the resolved store as the global recorder as soon as a route (or
// page) imports the llm-budget index. Provider modules call recordLlmUsage()
// from core and stay free of server-only imports.
const resolvedStore = resolveLlmUsageStore();
setGlobalLlmUsageRecorder((usage) => {
  void resolvedStore.recordUsage(usageDateFor(), usage).catch(() => undefined);
});

/**
 * The route-facing budget check: estimate today's spend from the persisted
 * counters and compare against LLM_DAILY_BUDGET_EUR. Store failures fail open —
 * a metering outage must not take interviews down.
 */
export async function checkLlmBudget(now?: string): Promise<LlmBudgetDecision> {
  const budgetEur = readLlmDailyBudgetEurFromEnv(process.env.LLM_DAILY_BUDGET_EUR);
  try {
    const rows = await resolvedStore.readDailyTotals(usageDateFor(now));
    return decideLlmBudget(rows, budgetEur);
  } catch {
    return { allowed: true, estimatedCostEur: 0, budgetEur };
  }
}
