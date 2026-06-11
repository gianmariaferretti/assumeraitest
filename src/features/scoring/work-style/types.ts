/**
 * Work-style taxonomy (Phase 13).
 *
 * Every dimension is BIPOLAR and DESCRIPTIVE: neither pole is "better". At
 * interview time there is NO right answer — the work-style evaluator only
 * classifies where a response sits between the two poles, with verbatim
 * evidence. Normative judgment happens per-company in the matching engine,
 * against keys each company declares in the role wizard.
 */

export const WORK_STYLE_DIMENSIONS = [
  "autonomy_escalation",
  "speed_thoroughness",
  "individual_collaboration",
  "risk_caution",
  "structure_improvisation",
] as const;

export type WorkStyleDimension = (typeof WORK_STYLE_DIMENSIONS)[number];

/** Human-readable pole labels (first = negative positions, second = positive). */
export const WORK_STYLE_POLES: Readonly<
  Record<WorkStyleDimension, { readonly first: string; readonly second: string }>
> = {
  autonomy_escalation: { first: "decides autonomously", second: "escalates for alignment" },
  speed_thoroughness: { first: "ships fast", second: "verifies thoroughly" },
  individual_collaboration: { first: "individual drive", second: "collaborates first" },
  risk_caution: { first: "tolerates risk", second: "prefers caution" },
  structure_improvisation: { first: "follows structure", second: "improvises" },
};

export const WORK_STYLE_PROFILE_VERSION = "work-style-profile-v1";

/** Where a response sits between the two poles: -100 (first) .. +100 (second). */
export interface WorkStyleClassification {
  readonly dimension: WorkStyleDimension;
  readonly position: number;
  readonly confidence: number; // 0-1
  /** Verbatim snippets from the candidate's answer backing the classification. */
  readonly evidence: readonly string[];
}

export interface WorkStyleProfile {
  readonly version: typeof WORK_STYLE_PROFILE_VERSION;
  readonly classifications: readonly WorkStyleClassification[];
  readonly generatedAt: string;
  readonly source: "anthropic" | "deterministic_fallback";
}

/** A company's declared expectation on one dimension, anchored by its own words. */
export interface WorkStyleKeyEntry {
  readonly dimension: WorkStyleDimension;
  readonly position: number; // -100 .. +100
  /** Concrete behavioral statement written by the company. */
  readonly statement: string;
}

export interface WorkStyleKey {
  readonly version: string;
  readonly entries: readonly WorkStyleKeyEntry[];
}

/** Parse a company's declared key defensively (role wizard jsonb). */
export function readWorkStyleKey(value: unknown): WorkStyleKey | undefined {
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
      !isWorkStyleDimension(item.dimension) ||
      typeof item.position !== "number" ||
      typeof item.statement !== "string" ||
      item.statement.trim().length === 0
    ) {
      return [];
    }
    return [
      {
        dimension: item.dimension,
        position: clampWorkStylePosition(item.position),
        statement: item.statement.trim().slice(0, 300),
      } satisfies WorkStyleKeyEntry,
    ];
  });

  if (entries.length === 0) {
    return undefined;
  }

  return {
    version: typeof record.version === "string" && record.version ? record.version : "work-style-key-v1",
    entries,
  };
}

export function isWorkStyleDimension(value: unknown): value is WorkStyleDimension {
  return (
    typeof value === "string" &&
    (WORK_STYLE_DIMENSIONS as readonly string[]).includes(value)
  );
}

export function clampWorkStylePosition(value: number): number {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

/** Parse a persisted profile defensively (jsonb round-trip). */
export function readWorkStyleProfile(value: unknown): WorkStyleProfile | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== WORK_STYLE_PROFILE_VERSION || !Array.isArray(record.classifications)) {
    return undefined;
  }

  const classifications = record.classifications.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const item = entry as Record<string, unknown>;
    if (!isWorkStyleDimension(item.dimension) || typeof item.position !== "number") {
      return [];
    }
    return [
      {
        dimension: item.dimension,
        position: clampWorkStylePosition(item.position),
        confidence:
          typeof item.confidence === "number"
            ? Math.max(0, Math.min(1, item.confidence))
            : 0,
        evidence: Array.isArray(item.evidence)
          ? item.evidence.filter((snippet): snippet is string => typeof snippet === "string")
          : [],
      } satisfies WorkStyleClassification,
    ];
  });

  return {
    version: WORK_STYLE_PROFILE_VERSION,
    classifications,
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : "",
    source: record.source === "anthropic" ? "anthropic" : "deterministic_fallback",
  };
}
