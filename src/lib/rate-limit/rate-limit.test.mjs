import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const {
  clearInMemoryRateLimitStore,
  clientIpFromHeaders,
  computeRateLimitDecision,
  createInMemoryRateLimitStore,
  enforceRateLimit,
  readRateLimitFromEnv,
} = loadFromRepoRoot("src/lib/rate-limit/core.ts");

const T0 = Date.parse("2026-06-09T10:00:00.000Z");
const iso = (offsetSeconds) => new Date(T0 + offsetSeconds * 1000).toISOString();

// ---------------------------------------------------------------------------
// Pure sliding-window math
// ---------------------------------------------------------------------------

test("requests under the limit are allowed", () => {
  const decision = computeRateLimitDecision(
    [iso(-50), iso(-30)],
    { limit: 3, windowSeconds: 60 },
    T0,
  );
  assert.equal(decision.allowed, true);
});

test("the limit-th request inside the window is denied with a correct Retry-After", () => {
  // Three events at -50s, -30s, -10s with limit 3: denied. The blocking event
  // (oldest of the last `limit`) is at -50s, so the window frees up in 10s.
  const decision = computeRateLimitDecision(
    [iso(-50), iso(-30), iso(-10)],
    { limit: 3, windowSeconds: 60 },
    T0,
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.retryAfterSeconds, 10);
});

test("events older than the window do not count (sliding window)", () => {
  const decision = computeRateLimitDecision(
    [iso(-3700), iso(-3650), iso(-10)],
    { limit: 3, windowSeconds: 3600 },
    T0,
  );
  assert.equal(decision.allowed, true);
});

test("retry-after is at least one second and handles unsorted input", () => {
  const decision = computeRateLimitDecision(
    [iso(-0.2), iso(-59.5)],
    { limit: 2, windowSeconds: 60 },
    T0,
  );
  assert.equal(decision.allowed, false);
  assert.ok(decision.retryAfterSeconds >= 1);
});

test("malformed timestamps are ignored instead of poisoning the window", () => {
  const decision = computeRateLimitDecision(
    ["not-a-date", iso(-10)],
    { limit: 2, windowSeconds: 60 },
    T0,
  );
  assert.equal(decision.allowed, true);
});

// ---------------------------------------------------------------------------
// enforceRateLimit over the in-memory store
// ---------------------------------------------------------------------------

test("enforceRateLimit allows up to the limit, then denies per subject", async () => {
  clearInMemoryRateLimitStore();
  const store = createInMemoryRateLimitStore();
  const rule = { bucket: "turn", limit: 2, windowSeconds: 60 };

  const first = await enforceRateLimit({ store, rule, subjects: ["user:a"], now: iso(0) });
  const second = await enforceRateLimit({ store, rule, subjects: ["user:a"], now: iso(1) });
  const third = await enforceRateLimit({ store, rule, subjects: ["user:a"], now: iso(2) });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.limitedSubject, "user:a");
  assert.ok(third.retryAfterSeconds >= 1);

  // A different subject in the same bucket is unaffected.
  const other = await enforceRateLimit({ store, rule, subjects: ["user:b"], now: iso(2) });
  assert.equal(other.allowed, true);
});

test("any limited subject (user or ip) denies the request", async () => {
  clearInMemoryRateLimitStore();
  const store = createInMemoryRateLimitStore();
  const rule = { bucket: "upload", limit: 1, windowSeconds: 3600 };

  const first = await enforceRateLimit({
    store,
    rule,
    subjects: ["user:a", "ip:203.0.113.7"],
    now: iso(0),
  });
  assert.equal(first.allowed, true);

  // Same IP, different user: the per-IP limit still applies.
  const second = await enforceRateLimit({
    store,
    rule,
    subjects: ["user:b", "ip:203.0.113.7"],
    now: iso(10),
  });
  assert.equal(second.allowed, false);
  assert.equal(second.limitedSubject, "ip:203.0.113.7");
});

test("the window slides: requests are allowed again after the window passes", async () => {
  clearInMemoryRateLimitStore();
  const store = createInMemoryRateLimitStore();
  const rule = { bucket: "turn", limit: 1, windowSeconds: 60 };

  assert.equal(
    (await enforceRateLimit({ store, rule, subjects: ["user:a"], now: iso(0) })).allowed,
    true,
  );
  assert.equal(
    (await enforceRateLimit({ store, rule, subjects: ["user:a"], now: iso(30) })).allowed,
    false,
  );
  assert.equal(
    (await enforceRateLimit({ store, rule, subjects: ["user:a"], now: iso(61) })).allowed,
    true,
  );
});

test("a failing store fails open instead of locking candidates out", async () => {
  const brokenStore = {
    async listEventTimesSince() {
      throw new Error("db down");
    },
    async recordEvent() {
      throw new Error("db down");
    },
  };

  const decision = await enforceRateLimit({
    store: brokenStore,
    rule: { bucket: "turn", limit: 1, windowSeconds: 60 },
    subjects: ["user:a"],
    now: iso(0),
  });
  assert.equal(decision.allowed, true);
});

// ---------------------------------------------------------------------------
// Env parsing + IP extraction
// ---------------------------------------------------------------------------

test("rate limit env values fall back safely", () => {
  assert.equal(readRateLimitFromEnv(undefined, 10), 10);
  assert.equal(readRateLimitFromEnv("25", 10), 25);
  assert.equal(readRateLimitFromEnv("0", 10), 10);
  assert.equal(readRateLimitFromEnv("-5", 10), 10);
  assert.equal(readRateLimitFromEnv("banana", 10), 10);
});

test("client IP uses the first x-forwarded-for hop", () => {
  const headers = new Map([
    ["x-forwarded-for", "203.0.113.7, 10.0.0.1"],
    ["x-real-ip", "198.51.100.9"],
  ]);
  const headerLike = { get: (name) => headers.get(name) ?? null };
  assert.equal(clientIpFromHeaders(headerLike), "203.0.113.7");

  const realIpOnly = { get: (name) => (name === "x-real-ip" ? "198.51.100.9" : null) };
  assert.equal(clientIpFromHeaders(realIpOnly), "198.51.100.9");

  const empty = { get: () => null };
  assert.equal(clientIpFromHeaders(empty), "unknown");
});
