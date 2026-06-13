import type { QuizForm, QuizItemPublic, QuizItemResponse } from "./types";

/**
 * Server-authoritative quiz timing. The client clock is never trusted: the
 * server stamps `issued_at` when it presents an item and `answered_at` when it
 * receives the answer, and every deadline is checked against those stamps.
 *
 * A late answer is NOT dropped — it is graded and flagged `within_time: false`,
 * consistent with the human-in-the-loop stance (timing is reviewer context,
 * never a silent auto-fail).
 */

/** Small allowance for network/processing jitter so honest answers aren't clipped. */
export const TIMING_GRACE_SECONDS = 2;

export interface ItemTimingVerdict {
  readonly item_id: string;
  readonly elapsed_seconds: number;
  readonly within_time: boolean;
}

function secondsBetween(issuedAt: string, answeredAt: string): number {
  const issued = Date.parse(issuedAt);
  const answered = Date.parse(answeredAt);
  if (!Number.isFinite(issued) || !Number.isFinite(answered)) {
    // Unparseable stamps can never be vouched for as within-time.
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, (answered - issued) / 1000);
}

/** Per-item verdict from the server-stamped issue/answer instants. */
export function evaluateItemTiming(
  item: QuizItemPublic,
  response: QuizItemResponse,
  graceSeconds: number = TIMING_GRACE_SECONDS,
): ItemTimingVerdict {
  const elapsed = secondsBetween(response.issued_at, response.answered_at);
  return {
    item_id: item.item_id,
    elapsed_seconds: Number.isFinite(elapsed) ? Math.round(elapsed * 100) / 100 : elapsed,
    within_time: elapsed <= item.time_limit_seconds + graceSeconds,
  };
}

export interface ModuleTimingVerdict {
  readonly total_elapsed_seconds: number;
  readonly within_module_limit: boolean;
  readonly items: readonly ItemTimingVerdict[];
}

/**
 * Whole-form timing: per-item verdicts plus a module-level deadline. The module
 * window is measured from the EARLIEST issue to the LATEST answer across items,
 * so a candidate can't game per-item timers by sitting idle between items.
 */
export function evaluateModuleTiming(
  form: QuizForm,
  responses: readonly QuizItemResponse[],
  graceSeconds: number = TIMING_GRACE_SECONDS,
): ModuleTimingVerdict {
  const itemById = new Map(form.items.map((item) => [item.item_id, item]));
  const items: ItemTimingVerdict[] = [];
  let earliestIssued = Number.POSITIVE_INFINITY;
  let latestAnswered = Number.NEGATIVE_INFINITY;

  for (const response of responses) {
    const item = itemById.get(response.item_id);
    if (!item) {
      continue;
    }
    items.push(evaluateItemTiming(item, response, graceSeconds));
    const issued = Date.parse(response.issued_at);
    const answered = Date.parse(response.answered_at);
    if (Number.isFinite(issued)) {
      earliestIssued = Math.min(earliestIssued, issued);
    }
    if (Number.isFinite(answered)) {
      latestAnswered = Math.max(latestAnswered, answered);
    }
  }

  const totalElapsed =
    Number.isFinite(earliestIssued) && Number.isFinite(latestAnswered)
      ? Math.max(0, (latestAnswered - earliestIssued) / 1000)
      : Number.POSITIVE_INFINITY;

  return {
    total_elapsed_seconds: Number.isFinite(totalElapsed)
      ? Math.round(totalElapsed * 100) / 100
      : totalElapsed,
    within_module_limit: totalElapsed <= form.module_time_limit_seconds + graceSeconds,
    items,
  };
}
