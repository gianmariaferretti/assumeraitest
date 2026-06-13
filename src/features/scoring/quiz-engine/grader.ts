import type { ScoredCompetency } from "../module-scoring/scorer-types";
import { clampConfidence, clampScore0to100 } from "../module-scoring/scorer-types";

import type {
  GradedQuizItem,
  QuizAnswerKey,
  QuizItemBankEntry,
  QuizItemResponse,
} from "./types";
import { evaluateItemTiming, type ItemTimingVerdict } from "./timing";

/**
 * Pure deterministic quiz grader. No LLM, no randomness, fully auditable:
 * candidate responses + the server-only answer keys → graded items →
 * per-competency scores. Partial credit is supported where it is meaningful
 * (multi_choice, ordering, matching). Every graded item keeps the candidate's
 * answer verbatim as audit evidence.
 */

const NUMERIC_DEFAULT_TOLERANCE = 1e-9;

export interface GradeQuizArgs {
  readonly bank: readonly QuizItemBankEntry[];
  readonly responses: readonly QuizItemResponse[];
  /** Per-item timing verdicts (from timing.ts); optional but recommended. */
  readonly timing?: readonly ItemTimingVerdict[];
  readonly graceSeconds?: number;
}

export function gradeQuiz(args: GradeQuizArgs): GradedQuizItem[] {
  const responseByItem = new Map(args.responses.map((response) => [response.item_id, response]));
  const timingByItem = new Map((args.timing ?? []).map((verdict) => [verdict.item_id, verdict]));

  return args.bank.map((entry) => {
    const response = responseByItem.get(entry.public.item_id);
    const maxPoints = entry.public.max_points ?? 1;

    if (response === undefined) {
      // Unanswered: zero, and explicitly flagged as missing audit evidence.
      return {
        item_id: entry.public.item_id,
        competency_tag: entry.public.competency_tag,
        correct: false,
        awarded: 0,
        max_points: maxPoints,
        within_time: false,
        candidate_answer_audit: "(no answer submitted)",
        rationale: entry.key.rationale,
      };
    }

    const timing =
      timingByItem.get(entry.public.item_id) ??
      evaluateItemTiming(entry.public, response, args.graceSeconds);
    const { fraction, audit } = gradeAnswer(entry.key.correct, response.answer);
    const awarded = Math.round(fraction * maxPoints * 1000) / 1000;

    return {
      item_id: entry.public.item_id,
      competency_tag: entry.public.competency_tag,
      correct: fraction >= 1,
      awarded,
      max_points: maxPoints,
      within_time: timing.within_time,
      candidate_answer_audit: audit,
      rationale: entry.key.rationale,
    };
  });
}

/** Returns the fraction of credit (0..1) plus a verbatim audit rendering. */
function gradeAnswer(key: QuizAnswerKey, answer: unknown): { fraction: number; audit: string } {
  switch (key.type) {
    case "single_choice": {
      const value = typeof answer === "string" ? answer : "";
      return { fraction: value === key.option_id ? 1 : 0, audit: `selected: ${value || "(none)"}` };
    }
    case "multi_choice": {
      const selected = toStringArray(answer);
      const correct = new Set(key.option_ids);
      // Jaccard-style partial credit: reward correct picks, penalize wrong ones,
      // never below zero. All-correct-and-only-correct = 1.
      const hits = selected.filter((id) => correct.has(id)).length;
      const wrong = selected.filter((id) => !correct.has(id)).length;
      const denom = correct.size === 0 ? 1 : correct.size;
      const fraction = Math.max(0, (hits - wrong) / denom);
      return { fraction: Math.min(1, fraction), audit: `selected: [${selected.join(", ")}]` };
    }
    case "numeric_entry": {
      const value = typeof answer === "number" ? answer : Number(answer);
      if (!Number.isFinite(value)) {
        return { fraction: 0, audit: `entered: ${String(answer)}` };
      }
      const tolerance = key.tolerance ?? NUMERIC_DEFAULT_TOLERANCE;
      return {
        fraction: Math.abs(value - key.value) <= tolerance ? 1 : 0,
        audit: `entered: ${value}`,
      };
    }
    case "ordering": {
      const ordered = toStringArray(answer);
      if (ordered.length !== key.order.length || ordered.length === 0) {
        return { fraction: 0, audit: `ordered: [${ordered.join(", ")}]` };
      }
      const correctPositions = ordered.filter((id, index) => id === key.order[index]).length;
      return {
        fraction: correctPositions / key.order.length,
        audit: `ordered: [${ordered.join(", ")}]`,
      };
    }
    case "matching": {
      const pairs = toPairArray(answer);
      const expected = new Map(key.pairs.map(([left, right]) => [left, right]));
      if (expected.size === 0) {
        return { fraction: 0, audit: "matched: (none)" };
      }
      const correctPairs = pairs.filter(([left, right]) => expected.get(left) === right).length;
      return {
        fraction: Math.min(1, correctPairs / expected.size),
        audit: `matched: [${pairs.map(([l, r]) => `${l}->${r}`).join(", ")}]`,
      };
    }
    case "hotspot": {
      const point = toPoint(answer);
      if (!point) {
        return { fraction: 0, audit: `clicked: ${String(answer)}` };
      }
      const { x, y, w, h } = key.region;
      const inside = point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
      return { fraction: inside ? 1 : 0, audit: `clicked: (${point.x}, ${point.y})` };
    }
    default: {
      // Exhaustiveness guard — unreachable when QuizAnswerKey is fully handled.
      return { fraction: 0, audit: "(ungradeable answer)" };
    }
  }
}

/**
 * Reduce graded items to per-competency scores (0–100). Deterministic grading
 * is certain per item, so "confidence" reflects measurement RELIABILITY (how
 * many items back the estimate), monotonically rising with item count. A
 * competency needs human review when any of its items were late or unanswered.
 */
export function gradedItemsToCompetencyScores(items: readonly GradedQuizItem[]): ScoredCompetency[] {
  const byCompetency = new Map<string, GradedQuizItem[]>();
  for (const item of items) {
    const list = byCompetency.get(item.competency_tag) ?? [];
    list.push(item);
    byCompetency.set(item.competency_tag, list);
  }

  return [...byCompetency.entries()].map(([competencyId, competencyItems]) => {
    const earned = competencyItems.reduce((sum, item) => sum + item.awarded, 0);
    const possible = competencyItems.reduce((sum, item) => sum + item.max_points, 0);
    const score = possible === 0 ? 0 : clampScore0to100((earned / possible) * 100);
    const correctCount = competencyItems.filter((item) => item.correct).length;
    const lateOrMissing = competencyItems.filter(
      (item) => !item.within_time || item.candidate_answer_audit === "(no answer submitted)",
    );
    const confidence = clampConfidence(1 - 1 / (competencyItems.length + 1));

    return {
      competency_id: competencyId,
      score,
      confidence,
      evidence: competencyItems.map(
        (item) =>
          `${item.item_id}: ${item.candidate_answer_audit} — ${
            item.correct ? "correct" : `${item.awarded}/${item.max_points}`
          }${item.within_time ? "" : " (over time limit)"}`,
      ),
      reason:
        `${correctCount}/${competencyItems.length} items correct ` +
        `(${score}/100)${lateOrMissing.length > 0 ? `; ${lateOrMissing.length} late/unanswered → human review` : ""}. ` +
        "Deterministic answer-key scoring; not an automated decision.",
      needs_human_review: lateOrMissing.length > 0,
    } satisfies ScoredCompetency;
  });
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toPairArray(value: unknown): [string, string][] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) =>
    Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string"
      ? [[entry[0], entry[1]] as [string, string]]
      : [],
  );
}

function toPoint(value: unknown): { x: number; y: number } | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).x === "number" &&
    typeof (value as Record<string, unknown>).y === "number"
  ) {
    return { x: (value as { x: number }).x, y: (value as { y: number }).y };
  }
  return null;
}
