/**
 * Sliding-window rate limiter core. Pure math + an in-memory store; the
 * Postgres-backed store lives in ./store.ts so this module stays dependency-free
 * and unit-testable. No new infra: the production store is a plain table
 * (rate_limit_events, service-role only).
 */

export interface RateLimitStore {
  /** ISO timestamps of events for (bucket, subject) at or after sinceIso. */
  listEventTimesSince(bucket: string, subject: string, sinceIso: string): Promise<string[]>;
  /** Record one event; implementations may prune events older than pruneBeforeIso. */
  recordEvent(
    bucket: string,
    subject: string,
    atIso: string,
    pruneBeforeIso: string
  ): Promise<void>;
}

export interface RateLimitRule {
  readonly bucket: string;
  /** Maximum events per subject inside the window. */
  readonly limit: number;
  readonly windowSeconds: number;
}

export type RateLimitDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly retryAfterSeconds: number;
      /** Which subject (e.g. "user:<id>" or "ip:<addr>") tripped the limit. */
      readonly limitedSubject: string;
    };

/**
 * Pure sliding-window decision: given the event times already inside the
 * window, is one more request allowed, and if not, when does the oldest event
 * fall out of the window?
 */
export function computeRateLimitDecision(
  eventTimesIso: readonly string[],
  rule: Pick<RateLimitRule, "limit" | "windowSeconds">,
  nowMs: number
): { readonly allowed: boolean; readonly retryAfterSeconds: number } {
  const windowStartMs = nowMs - rule.windowSeconds * 1000;
  const inWindow = eventTimesIso
    .map((iso) => Date.parse(iso))
    .filter((ms) => Number.isFinite(ms) && ms > windowStartMs)
    .sort((a, b) => a - b);

  if (inWindow.length < rule.limit) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // The request becomes allowed when enough old events leave the window. With
  // `limit` slots, the blocking event is the one that, once expired, brings the
  // in-window count below the limit.
  const blockingEventMs = inWindow[inWindow.length - rule.limit];
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((blockingEventMs + rule.windowSeconds * 1000 - nowMs) / 1000)
  );

  return { allowed: false, retryAfterSeconds };
}

export interface EnforceRateLimitInput {
  readonly store: RateLimitStore;
  readonly rule: RateLimitRule;
  /** Subjects checked independently, e.g. ["user:abc", "ip:203.0.113.7"]. */
  readonly subjects: readonly string[];
  readonly now?: string;
}

/**
 * Check every subject against the rule; deny when any subject is over the
 * limit, otherwise record one event per subject. Store failures fail open: a
 * rate limiter outage must not lock candidates out of their interview.
 */
export async function enforceRateLimit(input: EnforceRateLimitInput): Promise<RateLimitDecision> {
  const nowIso = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const sinceIso = new Date(nowMs - input.rule.windowSeconds * 1000).toISOString();
  const subjects = input.subjects.filter((subject) => subject.trim().length > 0);

  try {
    for (const subject of subjects) {
      const eventTimes = await input.store.listEventTimesSince(
        input.rule.bucket,
        subject,
        sinceIso
      );
      const decision = computeRateLimitDecision(eventTimes, input.rule, nowMs);
      if (!decision.allowed) {
        return {
          allowed: false,
          retryAfterSeconds: decision.retryAfterSeconds,
          limitedSubject: subject
        };
      }
    }

    for (const subject of subjects) {
      await input.store.recordEvent(input.rule.bucket, subject, nowIso, sinceIso);
    }
  } catch {
    return { allowed: true };
  }

  return { allowed: true };
}

/** Parse a positive-integer limit from the environment with a safe default. */
export function readRateLimitFromEnv(
  value: string | undefined,
  fallback: number,
  max = 10_000
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    return fallback;
  }

  return parsed;
}

/** Best-effort client IP from proxy headers (first x-forwarded-for hop). */
export function clientIpFromHeaders(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get("x-forwarded-for");
  const firstHop = forwarded?.split(",")[0]?.trim();
  if (firstHop) {
    return firstHop;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

// ---------------------------------------------------------------------------
// In-memory store (local dev fallback + tests)
// ---------------------------------------------------------------------------

const memoryEvents = new Map<string, number[]>();

export function createInMemoryRateLimitStore(): RateLimitStore {
  return {
    async listEventTimesSince(bucket, subject, sinceIso) {
      const sinceMs = Date.parse(sinceIso);
      const events = memoryEvents.get(`${bucket}:${subject}`) ?? [];
      return events.filter((ms) => ms >= sinceMs).map((ms) => new Date(ms).toISOString());
    },

    async recordEvent(bucket, subject, atIso, pruneBeforeIso) {
      const key = `${bucket}:${subject}`;
      const pruneBeforeMs = Date.parse(pruneBeforeIso);
      const events = (memoryEvents.get(key) ?? []).filter((ms) => ms >= pruneBeforeMs);
      events.push(Date.parse(atIso));
      memoryEvents.set(key, events);
    }
  };
}

/** Test-only helper: clear in-memory rate limit state between cases. */
export function clearInMemoryRateLimitStore(): void {
  memoryEvents.clear();
}
