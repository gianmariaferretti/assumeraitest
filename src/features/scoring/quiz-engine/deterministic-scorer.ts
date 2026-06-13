import {
  buildModuleScoreResult,
  type ModuleScorer,
  type ModuleScoreResult,
  type ModuleScoringInput,
} from "../module-scoring/scorer-types";

import { gradeQuiz, gradedItemsToCompetencyScores } from "./grader";
import type { QuizItemBankEntry, QuizItemResponse } from "./types";

/**
 * Deterministic quiz scorer (Phase 0). A `ModuleScorer` of type
 * `deterministic` that wraps the pure grader. Payload carries the server-side
 * bank entries (public item + answer key) and the candidate's responses; the
 * answer key never reaches the client because grading happens here, server-side.
 *
 * Fallback: a malformed payload yields a zero-score result flagged
 * `used_fallback` + `needs_human_review`, and — per the abstraction — can never
 * report high confidence.
 */

export const DETERMINISTIC_SCORER_VERSION = "deterministic-quiz-scorer-v1";

export interface DeterministicScorerPayload {
  readonly bankEntries: readonly QuizItemBankEntry[];
  readonly responses: readonly QuizItemResponse[];
  readonly graceSeconds?: number;
}

function isPayload(value: unknown): value is DeterministicScorerPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Array.isArray(record.bankEntries) && Array.isArray(record.responses);
}

export function createDeterministicScorer(): ModuleScorer {
  return {
    type: "deterministic",
    version: DETERMINISTIC_SCORER_VERSION,
    async scoreModule(input: ModuleScoringInput): Promise<ModuleScoreResult> {
      if (!isPayload(input.payload) || input.payload.bankEntries.length === 0) {
        // Deterministic fallback: never claims confidence, always routes to review.
        return buildModuleScoreResult({
          module_id: input.module_id,
          scorer_type: "deterministic",
          scorer_version: DETERMINISTIC_SCORER_VERSION,
          competency_scores: [],
          used_fallback: true,
          now: input.now,
        });
      }

      const graded = gradeQuiz({
        bank: input.payload.bankEntries,
        responses: input.payload.responses,
        graceSeconds: input.payload.graceSeconds,
      });
      const competencyScores = gradedItemsToCompetencyScores(graded);

      return buildModuleScoreResult({
        module_id: input.module_id,
        scorer_type: "deterministic",
        scorer_version: DETERMINISTIC_SCORER_VERSION,
        competency_scores: competencyScores,
        used_fallback: false,
        now: input.now,
      });
    },
  };
}
