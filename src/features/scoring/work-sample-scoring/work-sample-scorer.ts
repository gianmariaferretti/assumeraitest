import {
  buildModuleScoreResult,
  clampScore0to100,
  type ModuleScoreResult,
  type ScoredCompetency,
} from "../module-scoring/scorer-types";

/**
 * Coding work-sample scorer (Phase 1, module 3) — assess WITH AI, not against
 * it. Correctness is graded DETERMINISTICALLY from automated test results
 * (computed in a sandbox and passed in — execution stays out of this pure
 * module). The candidate's AI-assistant transcript is captured as first-class
 * evidence so a human reviewer can judge collaboration-with-AI; we deliberately
 * do NOT emit a confident automated "collaboration score" — that would overreach
 * — so the collaboration competency is surfaced for human review with evidence.
 *
 * Anti-HackerRank stance, made auditable: the AI interaction is logged and
 * reviewed, never penalized.
 */

export const WORK_SAMPLE_SCORER_VERSION = "work-sample-scorer-v1";

export interface WorkSampleTestResult {
  readonly test_id: string;
  readonly passed: boolean;
  readonly weight?: number;
}

export interface WorkSampleAiTurn {
  readonly role: "candidate" | "assistant";
  readonly text: string;
}

export interface WorkSampleScoringInput {
  readonly module_id: string;
  readonly correctness_competency_id: string;
  readonly test_results: readonly WorkSampleTestResult[];
  /** Captured AI-assistant conversation; evidence for collaboration review. */
  readonly ai_transcript?: readonly WorkSampleAiTurn[];
  readonly collaboration_competency_id?: string;
  readonly now?: string;
}

export function scoreWorkSample(input: WorkSampleScoringInput): ModuleScoreResult {
  if (input.test_results.length === 0) {
    // No test results means we can't vouch for correctness: fallback to review.
    return buildModuleScoreResult({
      module_id: input.module_id,
      scorer_type: "work_sample",
      scorer_version: WORK_SAMPLE_SCORER_VERSION,
      competency_scores: [],
      used_fallback: true,
      now: input.now,
    });
  }

  const totalWeight = input.test_results.reduce((sum, test) => sum + (test.weight ?? 1), 0);
  const passedWeight = input.test_results.reduce(
    (sum, test) => sum + (test.passed ? test.weight ?? 1 : 0),
    0,
  );
  const passedCount = input.test_results.filter((test) => test.passed).length;
  const correctnessScore = totalWeight === 0 ? 0 : clampScore0to100((passedWeight / totalWeight) * 100);

  const competencyScores: ScoredCompetency[] = [
    {
      competency_id: input.correctness_competency_id,
      score: correctnessScore,
      // Automated tests are certain; confidence reflects test coverage.
      confidence: 1 - 1 / (input.test_results.length + 1),
      evidence: input.test_results.map(
        (test) => `${test.test_id}: ${test.passed ? "passed" : "failed"}`,
      ),
      reason:
        `${passedCount}/${input.test_results.length} automated tests passed (${correctnessScore}/100). ` +
        "Deterministic test-based correctness; not an automated decision.",
      needs_human_review: correctnessScore < 100,
    },
  ];

  if (input.collaboration_competency_id) {
    const transcript = input.ai_transcript ?? [];
    const candidateTurns = transcript.filter((turn) => turn.role === "candidate").length;
    competencyScores.push({
      competency_id: input.collaboration_competency_id,
      // Descriptive only: collaboration-with-AI is reviewed by a human; we never
      // emit a confident automated score for it.
      score: 0,
      confidence: 0,
      evidence: transcript
        .slice(0, 8)
        .map((turn) => `${turn.role}: ${turn.text.slice(0, 200)}`),
      reason:
        `Candidate exchanged ${candidateTurns} prompt(s) with the AI assistant. ` +
        "Collaboration-with-AI is captured for human review, never auto-scored or penalized.",
      needs_human_review: true,
    });
  }

  return buildModuleScoreResult({
    module_id: input.module_id,
    scorer_type: "work_sample",
    scorer_version: WORK_SAMPLE_SCORER_VERSION,
    competency_scores: competencyScores,
    // The module always needs review while collaboration is human-judged.
    used_fallback: false,
    now: input.now,
  });
}
