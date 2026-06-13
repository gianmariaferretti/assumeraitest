import {
  buildModuleScoreResult,
  type ModuleScoreResult,
  type ScoredCompetency,
} from "../module-scoring/scorer-types";

/**
 * Interactive end-state scorer (Phase 2). Grades a structured interaction by
 * comparing the candidate's resulting END STATE against an expected one:
 *  - SQL: result-set equality (module 6, against a per-session sandbox DB);
 *  - spreadsheet: resulting cell/formula state (module 9);
 *  - chart/data widget: end state after manipulation (module 5).
 *
 * Pure and deterministic: the sandbox DB / widget execution happens in the
 * candidate UI / a sandbox and the produced end state is passed in here, so
 * grading stays inside our trust boundary and is fully auditable. The optional
 * query-shape / approach rubric is scored separately by the LLM open scorer and
 * combined upstream; this scorer only judges the observable end state.
 */

export const INTERACTIVE_SCORER_VERSION = "interactive-end-state-scorer-v1";

export type ResultSetCell = string | number | boolean | null;
export type ResultSetRow = readonly ResultSetCell[];

export interface ResultSetTask {
  readonly kind: "result_set";
  readonly competency_id: string;
  /** Expected rows. Column order matters; row order matters unless orderInsensitive. */
  readonly expected: readonly ResultSetRow[];
  readonly actual: readonly ResultSetRow[];
  readonly orderInsensitive?: boolean;
  readonly label?: string;
}

export interface KeyValueStateTask {
  readonly kind: "cell_state" | "chart_state";
  readonly competency_id: string;
  /** Expected key→value end state (cell ref → value, or chart property → value). */
  readonly expected: Readonly<Record<string, ResultSetCell>>;
  readonly actual: Readonly<Record<string, ResultSetCell>>;
  readonly label?: string;
}

export type InteractiveTask = ResultSetTask | KeyValueStateTask;

export interface InteractiveScoringInput {
  readonly module_id: string;
  readonly tasks: readonly InteractiveTask[];
  readonly now?: string;
}

export function scoreInteractive(input: InteractiveScoringInput): ModuleScoreResult {
  if (input.tasks.length === 0) {
    return buildModuleScoreResult({
      module_id: input.module_id,
      scorer_type: "interactive",
      scorer_version: INTERACTIVE_SCORER_VERSION,
      competency_scores: [],
      used_fallback: true,
      now: input.now,
    });
  }

  const byCompetency = new Map<string, { earned: number; total: number; evidence: string[] }>();
  for (const task of input.tasks) {
    const { fraction, evidence } = gradeTask(task);
    const bucket = byCompetency.get(task.competency_id) ?? { earned: 0, total: 0, evidence: [] };
    bucket.earned += fraction;
    bucket.total += 1;
    bucket.evidence.push(evidence);
    byCompetency.set(task.competency_id, bucket);
  }

  const competencyScores: ScoredCompetency[] = [...byCompetency.entries()].map(
    ([competencyId, bucket]) => {
      const score = Math.round((bucket.earned / bucket.total) * 100);
      return {
        competency_id: competencyId,
        score,
        // End-state equality is certain per task; confidence rises with task count.
        confidence: 1 - 1 / (bucket.total + 1),
        evidence: bucket.evidence,
        reason:
          `${Math.round(bucket.earned)}/${bucket.total} interaction(s) matched the expected end state ` +
          `(${score}/100). Deterministic end-state grading; not an automated decision.`,
        needs_human_review: score < 100,
      };
    },
  );

  return buildModuleScoreResult({
    module_id: input.module_id,
    scorer_type: "interactive",
    scorer_version: INTERACTIVE_SCORER_VERSION,
    competency_scores: competencyScores,
    used_fallback: false,
    now: input.now,
  });
}

function gradeTask(task: InteractiveTask): { fraction: number; evidence: string } {
  if (task.kind === "result_set") {
    const match = resultSetsEqual(task.expected, task.actual, task.orderInsensitive ?? false);
    return {
      fraction: match ? 1 : 0,
      evidence: `${task.label ?? "result set"}: ${match ? "matched expected rows" : `returned ${task.actual.length} row(s), expected ${task.expected.length}`}`,
    };
  }
  // cell_state / chart_state: fraction of expected keys whose value matches.
  const keys = Object.keys(task.expected);
  if (keys.length === 0) {
    return { fraction: 0, evidence: `${task.label ?? task.kind}: no expected state` };
  }
  const correct = keys.filter((key) => Object.is(task.actual[key], task.expected[key])).length;
  return {
    fraction: correct / keys.length,
    evidence: `${task.label ?? task.kind}: ${correct}/${keys.length} cells/properties correct`,
  };
}

function resultSetsEqual(
  expected: readonly ResultSetRow[],
  actual: readonly ResultSetRow[],
  orderInsensitive: boolean,
): boolean {
  if (expected.length !== actual.length) {
    return false;
  }
  if (!orderInsensitive) {
    return expected.every((row, index) => rowsEqual(row, actual[index]));
  }
  const remaining = actual.map((row) => serializeRow(row));
  for (const row of expected) {
    const key = serializeRow(row);
    const position = remaining.indexOf(key);
    if (position === -1) {
      return false;
    }
    remaining.splice(position, 1);
  }
  return true;
}

function rowsEqual(left: ResultSetRow, right: ResultSetRow | undefined): boolean {
  return right !== undefined && left.length === right.length && left.every((cell, index) => Object.is(cell, right[index]));
}

function serializeRow(row: ResultSetRow): string {
  return JSON.stringify(row);
}
