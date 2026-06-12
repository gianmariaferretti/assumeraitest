import { isHighFluencyAnswer } from "./text-disfluency";

/**
 * Anti-cheating v1+v2 — honest signals only.
 *
 * The client reports coarse behavioral counters per turn (tab switches,
 * window blur, paste events, audio continuity gaps); the server adds the
 * response latency it derived itself. v2 adds three derived flags aimed at
 * the external-copilot pattern (invisible overlay that captures the question,
 * sends it to an LLM, and has the candidate read or paste the answer back):
 * uniform response onset, text-only low disfluency, and paste bursts on
 * code-capable modules.
 *
 * VECTORS WE DELIBERATELY DO NOT FIGHT (and never will here): no camera
 * proctoring, no keystroke biometrics, no process inspection, no virtual-audio
 * detection, no voice-print and no audio features of any kind (safety.ts).
 * Our real moat against copilots is the ANCHORED adaptive follow-up
 * (anchor-entities.ts), not surveillance.
 *
 * HARD RULE: integrity data is context for the human reviewer and is NEVER an
 * input to any score computation. Nothing in scoring/ may import this module,
 * and the summary is folded in strictly AFTER the evaluator has run.
 */

export const MAX_SIGNAL_COUNT = 1000;
export const MAX_AUDIO_GAP_SECONDS = 3600;
export const MAX_PASTE_CHARS = 200000;

/** Audio gaps at or above this are counted as continuity gaps. */
export const AUDIO_GAP_THRESHOLD_SECONDS = 10;

/** Anomaly-flag thresholds (descriptive, never punitive). */
export const FREQUENT_TAB_SWITCH_THRESHOLD = 3;
export const LONG_AUDIO_GAP_SECONDS = 30;
export const LONG_RESPONSE_LATENCY_SECONDS = 240;

/**
 * Uniform-onset defaults (v2): humans start answering with IRREGULAR timing;
 * an external copilot pipeline imposes a near-constant "capture + generate +
 * read the first line" delay. What matters here is the LOW VARIANCE across
 * turns — deliberately NOT a long-latency threshold like the 240s above. The
 * minimum-mean guard keeps fast instinctive answerers (uniformly ~2s) from
 * ever flagging: the onset must also sit in the plausible LLM-round-trip band.
 */
export const UNIFORM_ONSET_MIN_TURNS = 4;
export const UNIFORM_ONSET_MAX_STDDEV_SECONDS = 2;
export const UNIFORM_ONSET_MIN_MEAN_SECONDS = 8;
/** Onset history kept on the summary (enough for any module, bounded jsonb). */
export const MAX_ONSET_SAMPLES = 24;

/** Low-disfluency-text defaults (v2): see text-disfluency.ts for the WHY. */
export const LOW_DISFLUENCY_MIN_TURNS = 3;
export const LOW_DISFLUENCY_MIN_WORDS = 40;

/** Paste-burst defaults (v2), only meaningful on code-capable modules. */
export const LARGE_PASTE_CHARS_THRESHOLD = 400;
export const PASTE_BURST_COUNT_THRESHOLD = 3;
export const CODE_MODULE_IDS: readonly string[] = ["work_sample", "case"];

/** Per-turn counters reported by the client with the answer. */
export interface TurnIntegritySignals {
  readonly tabHiddenCount: number;
  readonly windowBlurCount: number;
  readonly pasteCount: number;
  readonly audioGapCount: number;
  readonly maxAudioGapSeconds: number;
  /** Size of the largest single paste this turn (characters; content signal, not biometric). */
  readonly largestPasteChars?: number;
  /** Max paste events inside a short client-side window (a "burst"). */
  readonly pasteBurstCount?: number;
}

export type IntegrityAnomalyFlag =
  | "frequent_tab_switching"
  | "long_audio_gap"
  | "paste_detected"
  | "long_response_latency"
  // v2 (anti-copilot, descriptive "look closer" flags — never punitive):
  | "uniform_response_onset"
  | "low_disfluency_text"
  | "large_paste_burst";

const KNOWN_ANOMALY_FLAGS: readonly IntegrityAnomalyFlag[] = [
  "frequent_tab_switching",
  "long_audio_gap",
  "paste_detected",
  "long_response_latency",
  "uniform_response_onset",
  "low_disfluency_text",
  "large_paste_burst"
];

/** Optional threshold overrides for the v2 flags (defaults above). */
export interface IntegrityFlagOptions {
  readonly uniformOnsetMinTurns?: number;
  readonly uniformOnsetMaxStdDevSeconds?: number;
  readonly uniformOnsetMinMeanSeconds?: number;
  readonly lowDisfluencyMinTurns?: number;
  readonly lowDisfluencyMinWords?: number;
  readonly largePasteChars?: number;
  readonly pasteBurstThreshold?: number;
  readonly codeModuleIds?: readonly string[];
}

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
  /** Server-derived onset series (bounded; for the uniform-onset flag). */
  readonly responseOnsetsSeconds: readonly number[];
  /** Consecutive long, near-zero-disfluency VOICE answers (text mode exempt). */
  readonly lowDisfluencyStreak: number;
  readonly largestPasteChars: number;
  readonly maxPasteBurstCount: number;
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
    responseOnsetsSeconds: [],
    lowDisfluencyStreak: 0,
    largestPasteChars: 0,
    maxPasteBurstCount: 0,
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
    "maxAudioGapSeconds",
    "largestPasteChars",
    "pasteBurstCount"
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

  // v2 paste-shape fields are optional, but when present they must be valid —
  // a malformed value invalidates the whole report, like every other field.
  const largestPasteChars =
    value.largestPasteChars === undefined ? undefined : clampChars(value.largestPasteChars);
  if (value.largestPasteChars !== undefined && largestPasteChars === undefined) {
    return undefined;
  }
  const pasteBurstCount =
    value.pasteBurstCount === undefined ? undefined : clampCount(value.pasteBurstCount);
  if (value.pasteBurstCount !== undefined && pasteBurstCount === undefined) {
    return undefined;
  }

  return {
    tabHiddenCount,
    windowBlurCount,
    pasteCount,
    audioGapCount,
    maxAudioGapSeconds,
    ...(largestPasteChars !== undefined ? { largestPasteChars } : {}),
    ...(pasteBurstCount !== undefined ? { pasteBurstCount } : {})
  };
}

/**
 * Fold one turn's signals (plus the server-derived response latency) into the
 * module summary. Pure: returns a new summary. The v2 inputs are all optional
 * and all derived from data the server already holds:
 *  - responseLatencySeconds — server-derived, feeds the uniform-onset series;
 *  - answerText            — the transcript text (text-only fluency analysis);
 *  - interviewMode         — typed answers are legitimately "clean", so text
 *                            mode is EXEMPT from the disfluency streak
 *                            (Phase 12 fairness: text mode is first-class);
 *  - moduleId              — the paste-burst flag only applies to
 *                            code-capable modules.
 */
export function accumulateIntegritySummary(
  summary: ModuleIntegritySummary | undefined,
  input: {
    readonly signals?: TurnIntegritySignals;
    readonly responseLatencySeconds: number;
    readonly answerText?: string;
    readonly interviewMode?: "voice" | "text";
    readonly moduleId?: string;
  },
  options?: IntegrityFlagOptions
): ModuleIntegritySummary {
  const base = summary ?? emptyModuleIntegritySummary();
  const signals = input.signals;
  const latency = Math.min(Math.max(input.responseLatencySeconds, 0), MAX_AUDIO_GAP_SECONDS);

  // Disfluency streak: only VOICE answers count; a text-mode turn neither
  // extends nor resets the streak (typed text is legitimately marker-free).
  let lowDisfluencyStreak = base.lowDisfluencyStreak;
  if (input.answerText !== undefined && input.interviewMode !== "text") {
    lowDisfluencyStreak = isHighFluencyAnswer(input.answerText, {
      minWords: options?.lowDisfluencyMinWords ?? LOW_DISFLUENCY_MIN_WORDS
    })
      ? lowDisfluencyStreak + 1
      : 0;
  }

  const next: ModuleIntegritySummary = {
    version: "integrity-summary-v1",
    turnsObserved: base.turnsObserved + 1,
    tabHiddenCount: base.tabHiddenCount + (signals?.tabHiddenCount ?? 0),
    windowBlurCount: base.windowBlurCount + (signals?.windowBlurCount ?? 0),
    pasteCount: base.pasteCount + (signals?.pasteCount ?? 0),
    audioGapCount: base.audioGapCount + (signals?.audioGapCount ?? 0),
    maxAudioGapSeconds: Math.max(base.maxAudioGapSeconds, signals?.maxAudioGapSeconds ?? 0),
    maxResponseLatencySeconds: Math.max(base.maxResponseLatencySeconds, latency),
    responseOnsetsSeconds: [...base.responseOnsetsSeconds, latency].slice(-MAX_ONSET_SAMPLES),
    lowDisfluencyStreak,
    largestPasteChars: Math.max(base.largestPasteChars, signals?.largestPasteChars ?? 0),
    maxPasteBurstCount: Math.max(base.maxPasteBurstCount, signals?.pasteBurstCount ?? 0),
    anomalyFlags: []
  };

  return {
    ...next,
    anomalyFlags: deriveAnomalyFlags(next, { moduleId: input.moduleId }, options)
  };
}

function deriveAnomalyFlags(
  summary: ModuleIntegritySummary,
  context: { readonly moduleId?: string },
  options?: IntegrityFlagOptions
): IntegrityAnomalyFlag[] {
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

  // v2: uniform response onset. Unlike long_response_latency, this is about
  // LOW VARIANCE: a near-constant onset across enough turns, sitting in the
  // plausible LLM-round-trip band. "Look closer", never punitive.
  if (hasUniformOnset(summary.responseOnsetsSeconds, options)) {
    flags.push("uniform_response_onset");
  }

  // v2: a streak of long, near-zero-disfluency voice answers (text-only
  // analysis; text-mode turns are exempt upstream).
  if (summary.lowDisfluencyStreak >= (options?.lowDisfluencyMinTurns ?? LOW_DISFLUENCY_MIN_TURNS)) {
    flags.push("low_disfluency_text");
  }

  // v2: paste burst on code-capable modules — one very large single insertion
  // or a spike of pastes in seconds. A content-shape signal, not biometrics.
  const codeModules = options?.codeModuleIds ?? CODE_MODULE_IDS;
  if (context.moduleId !== undefined && codeModules.includes(context.moduleId)) {
    const largeChars = options?.largePasteChars ?? LARGE_PASTE_CHARS_THRESHOLD;
    const burstThreshold = options?.pasteBurstThreshold ?? PASTE_BURST_COUNT_THRESHOLD;
    if (summary.largestPasteChars >= largeChars || summary.maxPasteBurstCount >= burstThreshold) {
      flags.push("large_paste_burst");
    }
  }

  return flags;
}

/** Sample standard deviation of the onset series vs the configured bounds. */
function hasUniformOnset(
  onsets: readonly number[],
  options?: IntegrityFlagOptions
): boolean {
  const minTurns = options?.uniformOnsetMinTurns ?? UNIFORM_ONSET_MIN_TURNS;
  const maxStdDev = options?.uniformOnsetMaxStdDevSeconds ?? UNIFORM_ONSET_MAX_STDDEV_SECONDS;
  const minMean = options?.uniformOnsetMinMeanSeconds ?? UNIFORM_ONSET_MIN_MEAN_SECONDS;
  if (onsets.length < minTurns) {
    return false; // too few turns: insufficient data, never flag on noise
  }

  const mean = onsets.reduce((sum, value) => sum + value, 0) / onsets.length;
  if (mean < minMean) {
    return false; // fast instinctive answerers are not a copilot pattern
  }
  const variance =
    onsets.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (onsets.length - 1);
  return Math.sqrt(variance) <= maxStdDev;
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
  // v2 flags — neutral, factual phrasing ("look closer", never an accusation).
  if (summary.anomalyFlags.includes("uniform_response_onset")) {
    highlights.push(
      `uniform response onset across ${summary.responseOnsetsSeconds.length} turns`
    );
  }
  if (summary.anomalyFlags.includes("low_disfluency_text")) {
    highlights.push(
      `${summary.lowDisfluencyStreak} consecutive answers with near-zero written disfluency`
    );
  }
  if (summary.anomalyFlags.includes("large_paste_burst")) {
    highlights.push(
      summary.largestPasteChars > 0
        ? `large single paste (${summary.largestPasteChars} characters)`
        : `paste burst (${summary.maxPasteBurstCount} pastes in a short window)`
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
    // v2 fields default safely for summaries persisted before they existed.
    responseOnsetsSeconds: Array.isArray(value.responseOnsetsSeconds)
      ? value.responseOnsetsSeconds
          .map((onset) => clampSeconds(onset))
          .filter((onset): onset is number => onset !== undefined)
          .slice(-MAX_ONSET_SAMPLES)
      : [],
    lowDisfluencyStreak: clampCount(value.lowDisfluencyStreak) ?? 0,
    largestPasteChars: clampChars(value.largestPasteChars) ?? 0,
    maxPasteBurstCount: clampCount(value.maxPasteBurstCount) ?? 0,
    anomalyFlags: Array.isArray(value.anomalyFlags)
      ? (value.anomalyFlags.filter((flag): flag is IntegrityAnomalyFlag =>
          (KNOWN_ANOMALY_FLAGS as readonly unknown[]).includes(flag)
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

function clampChars(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.min(Math.round(value), MAX_PASTE_CHARS);
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
