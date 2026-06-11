import {
  FLAG_ONLY_NEVER_COMPARED,
  JOB_DRIVER_LABELS,
  type DriverProfile,
  type RoleDriverContext,
} from "./types";

/**
 * Driver insights at match time (Phase 14) — FLAG-ONLY by construction.
 *
 * Produces a realistic job preview (the role's day-to-day reality, in the
 * company's own words) plus alignment flags for the human conversation. The
 * output carries no score and is consumed nowhere by the scoring pipeline:
 * the matching weights have no driver dimension at all.
 *
 * HARD-CODED anti-proxy guardrail: drivers in FLAG_ONLY_NEVER_COMPARED
 * (lifestyle) are excluded from candidate-vs-role comparison entirely — the
 * candidate only receives the role-side reality as preview, and the
 * candidate-side signal never appears in any output here.
 */

export const DRIVER_INSIGHTS_VERSION = "driver-insights-v1";

/** Candidate-vs-context gap (0-100 scale) that surfaces a discussion flag. */
export const DRIVER_FLAG_GAP = 40;

export interface DriverInsights {
  readonly version: typeof DRIVER_INSIGHTS_VERSION;
  /** Structural: these insights can never carry or influence a score. */
  readonly flag_only: true;
  /** Role-side reality, candidate-facing ("realistic job preview"). */
  readonly realistic_preview: readonly string[];
  /** Gaps worth an open conversation in the human interview. */
  readonly flags: readonly string[];
}

export function buildDriverInsights(input: {
  readonly profile?: DriverProfile;
  readonly context?: RoleDriverContext;
}): DriverInsights | undefined {
  const entries = input.context?.entries ?? [];
  if (entries.length === 0) {
    return undefined;
  }

  const signalByDriver = new Map(
    (input.profile?.signals ?? []).map((signal) => [signal.driver, signal]),
  );

  const preview: string[] = [];
  const flags: string[] = [];

  for (const entry of entries) {
    // Every declared context entry reaches the candidate as honest preview.
    preview.push(
      `realistic preview (${entry.driver}): the day-to-day offers ${JOB_DRIVER_LABELS[entry.driver]} at ${entry.level}/100 — "${entry.note}".`,
    );

    if (FLAG_ONLY_NEVER_COMPARED.includes(entry.driver)) {
      // HARD-CODED: never compare the candidate against this driver. The
      // role-side preview above is all that is ever produced for it.
      continue;
    }

    const signal = signalByDriver.get(entry.driver);
    if (!signal) {
      continue;
    }
    if (Math.abs(signal.strength - entry.level) >= DRIVER_FLAG_GAP) {
      flags.push(
        `driver flag (${entry.driver}): the candidate's interview signals ${signal.strength}/100, the day-to-day offers ${entry.level}/100 — discuss openly in the human interview; flag only, never a score input.`,
      );
    }
  }

  return {
    version: DRIVER_INSIGHTS_VERSION,
    flag_only: true,
    realistic_preview: preview,
    flags,
  };
}
