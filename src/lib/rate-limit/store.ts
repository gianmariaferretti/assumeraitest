import { createAdminClient } from "@/lib/supabase/admin";

import { createInMemoryRateLimitStore, type RateLimitStore } from "./core";

/**
 * Postgres-backed sliding-window store (rate_limit_events, service-role only).
 * Old events for the touched (bucket, subject) are pruned lazily on record so
 * the table stays small without a scheduled job.
 */
export function createSupabaseRateLimitStore(
  admin: Pick<ReturnType<typeof createAdminClient>, "from">
): RateLimitStore {
  return {
    async listEventTimesSince(bucket, subject, sinceIso) {
      const { data, error } = await admin
        .from("rate_limit_events")
        .select("occurred_at")
        .eq("bucket", bucket)
        .eq("subject", subject)
        .gte("occurred_at", sinceIso);
      if (error || !data) {
        throw new Error(error?.message ?? "rate_limit_events read failed");
      }

      return (data as { occurred_at: string }[]).map((row) => row.occurred_at);
    },

    async recordEvent(bucket, subject, atIso, pruneBeforeIso) {
      const { error } = await admin
        .from("rate_limit_events")
        .insert({ bucket, subject, occurred_at: atIso });
      if (error) {
        throw new Error(error.message);
      }

      await admin
        .from("rate_limit_events")
        .delete()
        .eq("bucket", bucket)
        .eq("subject", subject)
        .lt("occurred_at", pruneBeforeIso);
    }
  };
}

/**
 * Supabase store when the service role is configured; in-memory otherwise
 * (local dev / tests). Mirrors resolveServerInterviewStore's gating.
 */
export function resolveRateLimitStore(): RateLimitStore {
  try {
    return createSupabaseRateLimitStore(createAdminClient());
  } catch {
    return createInMemoryRateLimitStore();
  }
}
