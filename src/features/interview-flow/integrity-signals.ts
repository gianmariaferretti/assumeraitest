/**
 * Anti-cheating v1 — honest signals only.
 *
 * The client reports coarse behavioral counters per turn (tab switches,
 * window blur, paste events, audio continuity gaps); the server adds the
 * response latency it derived itself. No keystroke logging, no camera
 * analysis, no biometrics — the same philosophy enforced by
 * interview-flow/safety.ts.
 *
 * HARD RULE: integrity data is context for the human reviewer and is NEVER an
 * input to any score computation. Nothing in scoring/ may import this module.
 */

export const MAX_SIGNAL_COUNT = 1000;
export const MAX_AUDIO_GAP_SECONDS = 3600;

/** Audio gaps at or above this are counted as continuity gaps. */
export const AUDIO_GAP_THRESHOLD_SECONDS = 10;

/** Anomaly-flag thresholds (descriptive, never punitive). */
export const FREQUENT_TAB_SWITCH_THRESHOLD = 3;
export const LONG_AUDIO_GAP_SECONDS = 30;
export const LONG_RESPONSE_LATENCY_SECONDS = 240;

/** Per-turn counters reported by the client with the answer. */
export interface TurnIntegritySignals {
  readonly tabHiddenCount: number;
  readonly windowBlurCount: number;
  readonly pasteCount: number;
  readonly audioGapCount: number;
  readonly maxAudioGapSeconds: number;
}

export type IntegrityAnomalyFlag =
  | "frequent_tab_switching"
  | "long_audio_gap"
  | "paste_detected"
  | "long_response_latency";

/** Per-module aggregate stored on the module session (read-only context). */
export interface ModuleIntegritySummary {
  readonly version: "integrity-summary-v1";
  readonly turnsObserved: number;
  readonly tabHiddenCount: number;
  readonly windowBlurCount: number;
  readonly pasteCount: number;
  readonly audioGapCount: number;
  readonly maxAudioGapSeconds: number;
  readonly maxResponseLatencySeconds: number;
  readonly anomalyFlags: readonly IntegrityAnomalyFlag[];
}

export function emptyModuleIntegritySummary(): ModuleIntegritySummary {
  return {
    version: "integrity-summary-v1",
    turnsObserved: 0,
    tabHiddenCount: 0,
    windowBlurCount: 0,
    pasteCount: 0,
    audioGapCount: 0,
    maxAudioGapSeconds: 0,
    maxResponseLatencySeconds: 0,
    anomalyFlags: []
  };
}

/**
 * Validate and clamp client-reported signals. Anything malformed yields
 * undefined (the turn proceeds without signals — missing telemetry must never
 * block an interview). Unknown fields are rejected to keep the contract
 * strict, like the rest of the turn body.
 */
export function parseTurnIntegritySignals(value: unknown): TurnIntegritySignals | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const allowedKeys = new Set([
    "tabHiddenCount",
    "windowBlurCount",
    "pasteCount",
    "audioGapCount",
    "maxAudioGapSeconds"
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return undefined;
  }

  const tabHiddenCount = clampCount(value.tabHiddenCount);
  const windowBlurCount = clampCount(value.windowBlurCount);
  const pasteCount = clampCount(value.pasteCount);
  const audioGapCount = clampCount(value.audioGapCount);
  const maxAudioGapSeconds = clampSeconds(value.maxAudioGapSeconds);
  if (
    tabHiddenCount === undefined ||
    windowBlurCount === undefined ||
    pasteCount === undefined ||
    audioGapCount === undefined ||
    maxAudioGapSeconds === undefined
  ) {
    return undefined;
  }

  return { tabHiddenCount, windowBlurCount, pasteCount, audioGapCount, maxAudioGapSeconds };
}

/**
 * Fold one turn's signals (plus the server-derived response latency) into the
 * module summary. Pure: returns a new summary.
 */
export function accumulateIntegritySummary(
  summary: ModuleIntegritySummary | undefined,
  input: {
    readonly signals?: TurnIntegritySignals;
    readonly responseLatencySeconds: number;
  }
): ModuleIntegritySummary {
  const base = summary ?? emptyModuleIntegritySummary();
  const signals = input.signals;
  const latency = Math.min(Math.max(input.responseLatencySeconds, 0), MAX_AUDIO_GAP_SECONDS);

  const next: ModuleIntegritySummary = {
    version: "integrity-summary-v1",
    turnsObserved: base.turnsObserved + 1,
    tabHiddenCount: base.tabHiddenCount + (signals?.tabHiddenCount ?? 0),
    windowBlurCount: base.windowBlurCount + (signals?.windowBlurCount ?? 0),
    pasteCount: base.pasteCount + (signals?.pasteCount ?? 0),
    audioGapCount: base.audioGapCount + (signals?.audioGapCount ?? 0),
    maxAudioGapSeconds: Math.max(base.maxAudioGapSeconds, signals?.maxAudioGapSeconds ?? 0),
    maxResponseLatencySeconds: Math.max(base.maxResponseLatencySeconds, latency),
    anomalyFlags: []
  };

  return { ...next, anomalyFlags: deriveAnomalyFlags(next) };
}

function deriveAnomalyFlags(summary: ModuleIntegritySummary): IntegrityAnomalyFlag[] {
  const flags: IntegrityAnomalyFlag[] = [];
  if (summary.tabHiddenCount >= FREQUENT_TAB_SWITCH_THRESHOLD) {
    flags.push("frequent_tab_switching");
  }
  if (summary.maxAudioGapSeconds >= LONG_AUDIO_GAP_SECONDS) {
    flags.push("long_audio_gap");
  }
  if (summary.pasteCount > 0) {
    flags.push("paste_detected");
  }
  if (summary.maxResponseLatencySeconds >= LONG_RESPONSE_LATENCY_SECONDS) {
    flags.push("long_response_latency");
  }

  return flags;
}

/**
 * Neutral, factual highlight strings for the human reviewer
 * ("3 tab switches, 1 long pause"). Never a judgment, never a score.
 */
export function integritySummaryHighlights(summary: ModuleIntegritySummary): string[] {
  const highlights: string[] = [];
  if (summary.tabHiddenCount > 0) {
    highlights.push(
      summary.tabHiddenCount === 1 ? "1 tab switch" : `${summary.tabHiddenCount} tab switches`
    );
  }
  if (summary.windowBlurCount > 0) {
    highlights.push(
      summary.windowBlurCount === 1
        ? "1 window focus change"
        : `${summary.windowBlurCount} window focus changes`
    );
  }
  if (summary.pasteCount > 0) {
    highlights.push(summary.pasteCount === 1 ? "1 paste event" : `${summary.pasteCount} paste events`);
  }
  if (summary.audioGapCount > 0) {
    highlights.push(
      summary.audioGapCount === 1
        ? `1 long pause (up to ${Math.round(summary.maxAudioGapSeconds)}s)`
        : `${summary.audioGapCount} long pauses (up to ${Math.round(summary.maxAudioGapSeconds)}s)`
    );
  }
  if (highlights.length === 0 && summary.turnsObserved > 0) {
    highlights.push("No notable signals");
  }

  return highlights;
}

/** Parse a persisted summary back from a module payload (defensive). */
export function readModuleIntegritySummary(value: unknown): ModuleIntegritySummary | undefined {
  if (!isRecord(value) || value.version !== "integrity-summary-v1") {
    return undefined;
  }
  const summary = emptyModuleIntegritySummary();

  return {
    ...summary,
    turnsObserved: clampCount(value.turnsObserved) ?? 0,
    tabHiddenCount: clampCount(value.tabHiddenCount) ?? 0,
    windowBlurCount: clampCount(value.windowBlurCount) ?? 0,
    pasteCount: clampCount(value.pasteCount) ?? 0,
    audioGapCount: clampCount(value.audioGapCount) ?? 0,
    maxAudioGapSeconds: clampSeconds(value.maxAudioGapSeconds) ?? 0,
    maxResponseLatencySeconds: clampSeconds(value.maxResponseLatencySeconds) ?? 0,
    anomalyFlags: Array.isArray(value.anomalyFlags)
      ? (value.anomalyFlags.filter(
          (flag): flag is IntegrityAnomalyFlag =>
            flag === "frequent_tab_switching" ||
            flag === "long_audio_gap" ||
            flag === "paste_detected" ||
            flag === "long_response_latency"
        ) as readonly IntegrityAnomalyFlag[])
      : []
  };
}

function clampCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.min(Math.round(value), MAX_SIGNAL_COUNT);
}

function clampSeconds(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.min(value, MAX_AUDIO_GAP_SECONDS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
