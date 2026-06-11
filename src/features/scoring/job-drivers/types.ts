/**
 * Job-drivers / career-anchors taxonomy (Phase 14, Schein-inspired).
 *
 * DESCRIPTIVE and FLAG-ONLY: driver signals never enter any score. At match
 * time they produce transparency flags and a realistic job preview for the
 * candidate — decision support for the human conversation, not a ranking
 * input. The lifestyle driver carries a HARD-CODED anti-proxy guardrail (see
 * FLAG_ONLY_NEVER_COMPARED): preferences about hours, travel, and balance
 * correlate with family status and caregiving, so the candidate side of that
 * driver is never compared against a role and never shown to companies.
 */

export const JOB_DRIVERS = [
  "technical_mastery",
  "leadership_track",
  "autonomy_independence",
  "security_stability",
  "entrepreneurial_creation",
  "service_impact",
  "pure_challenge",
  "lifestyle_balance",
] as const;

export type JobDriver = (typeof JOB_DRIVERS)[number];

/** Human-readable meanings, used in prompts and evidence lines. */
export const JOB_DRIVER_LABELS: Readonly<Record<JobDriver, string>> = {
  technical_mastery: "going deep in a craft or specialty",
  leadership_track: "leading people and growing responsibility",
  autonomy_independence: "working with autonomy and independence",
  security_stability: "security, stability, and predictability",
  entrepreneurial_creation: "building new things from scratch",
  service_impact: "being of service and having impact on others",
  pure_challenge: "hard problems for their own sake",
  lifestyle_balance: "how work fits around the rest of life",
};

export const LIFESTYLE_DRIVER: JobDriver = "lifestyle_balance";

/**
 * HARD-CODED anti-proxy guardrail. Drivers listed here are NEVER numerically
 * compared against a role's declared context and the candidate-side signal is
 * never surfaced to companies — only the role-side reality reaches the
 * candidate as a realistic preview. This is a frozen constant, not
 * configuration: no weight set, env var, or calibration can re-enable it.
 */
export const FLAG_ONLY_NEVER_COMPARED: readonly JobDriver[] = Object.freeze([
  LIFESTYLE_DRIVER,
]);

export const DRIVER_PROFILE_VERSION = "driver-profile-v1";

/** One revealed-preference signal: how strongly the answers evidence a driver. */
export interface DriverSignal {
  readonly driver: JobDriver;
  readonly strength: number; // 0-100
  readonly confidence: number; // 0-1
  /** Verbatim snippets from the candidate's answers backing the signal. */
  readonly evidence: readonly string[];
}

export interface DriverProfile {
  readonly version: typeof DRIVER_PROFILE_VERSION;
  readonly signals: readonly DriverSignal[];
  readonly generatedAt: string;
  readonly source: "anthropic" | "deterministic_fallback";
}

/** What the role's day-to-day actually offers on one driver (company-declared). */
export interface RoleDriverContextEntry {
  readonly driver: JobDriver;
  readonly level: number; // 0-100
  /** Concrete description of the day-to-day reality, in the company's words. */
  readonly note: string;
}

export interface RoleDriverContext {
  readonly version: string;
  readonly entries: readonly RoleDriverContextEntry[];
}

export function isJobDriver(value: unknown): value is JobDriver {
  return typeof value === "string" && (JOB_DRIVERS as readonly string[]).includes(value);
}

export function clampDriverStrength(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Parse a persisted driver profile defensively (jsonb round-trip). */
export function readDriverProfile(value: unknown): DriverProfile | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== DRIVER_PROFILE_VERSION || !Array.isArray(record.signals)) {
    return undefined;
  }

  const signals = record.signals.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const item = entry as Record<string, unknown>;
    if (!isJobDriver(item.driver) || typeof item.strength !== "number") {
      return [];
    }
    return [
      {
        driver: item.driver,
        strength: clampDriverStrength(item.strength),
        confidence:
          typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0,
        evidence: Array.isArray(item.evidence)
          ? item.evidence.filter((snippet): snippet is string => typeof snippet === "string")
          : [],
      } satisfies DriverSignal,
    ];
  });

  return {
    version: DRIVER_PROFILE_VERSION,
    signals,
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : "",
    source: record.source === "anthropic" ? "anthropic" : "deterministic_fallback",
  };
}

/** Parse a company's declared work-context reality defensively (role jsonb). */
export function readRoleDriverContext(value: unknown): RoleDriverContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.entries)) {
    return undefined;
  }

  const entries = record.entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const item = entry as Record<string, unknown>;
    if (
      !isJobDriver(item.driver) ||
      typeof item.level !== "number" ||
      typeof item.note !== "string" ||
      item.note.trim().length === 0
    ) {
      return [];
    }
    return [
      {
        driver: item.driver,
        level: clampDriverStrength(item.level),
        note: item.note.trim().slice(0, 300),
      } satisfies RoleDriverContextEntry,
    ];
  });

  if (entries.length === 0) {
    return undefined;
  }

  return {
    version:
      typeof record.version === "string" && record.version ? record.version : "driver-context-v1",
    entries,
  };
}
