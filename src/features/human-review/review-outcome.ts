/**
 * Reviewer outcome for a candidate human-review request.
 *
 * A reviewer can uphold the original evaluation or adjust it WITH a reason.
 * Either way the outcome is a NEW auditable record: the original
 * interview_evaluator_runs rows are immutable and are never modified by this
 * flow. An adjustment is a documented human judgment layered on top of the
 * recorded evidence, not a rewrite of history.
 */

export type HumanReviewOutcomeAction = "uphold" | "adjust";

export interface HumanReviewRequestRow {
  readonly userId: string;
  readonly requestId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly status: "open" | "upheld" | "adjusted";
  readonly requestedAt: string;
}

export interface BuildReviewOutcomeInput {
  readonly request: HumanReviewRequestRow;
  readonly action: HumanReviewOutcomeAction;
  /** Required when action === "adjust". */
  readonly reason?: string;
  /** Optional reviewer note for upholds. */
  readonly note?: string;
  readonly reviewerUserId: string;
  readonly resolvedAt: string;
}

export interface HumanReviewOutcomeAuditEvent {
  readonly audit_event_id: string;
  readonly event_type: "human_review.resolved";
  readonly actor_type: "reviewer";
  readonly actor_id: string;
  readonly occurred_at: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly summary: string;
  readonly details: {
    readonly human_review_request_id: string;
    readonly candidate_id: string;
    readonly outcome: HumanReviewOutcomeAction;
    readonly outcome_reason: string | null;
    readonly original_evaluator_runs_unmodified: true;
    readonly recommendation_only: true;
  };
  readonly visibility_scope: "candidate_visible";
}

export type BuildReviewOutcomeResult =
  | {
      readonly ok: true;
      readonly status: "upheld" | "adjusted";
      readonly outcomeReason: string | null;
      readonly auditEvent: HumanReviewOutcomeAuditEvent;
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

export function buildReviewOutcome(input: BuildReviewOutcomeInput): BuildReviewOutcomeResult {
  if (input.request.status !== "open") {
    return {
      ok: false,
      code: "review_request_already_resolved",
      message: "This review request was already resolved; outcomes are final and auditable."
    };
  }
  if (input.action !== "uphold" && input.action !== "adjust") {
    return {
      ok: false,
      code: "review_outcome_invalid_action",
      message: "Choose uphold or adjust."
    };
  }

  const reason = input.reason?.trim() ?? "";
  if (input.action === "adjust" && reason.length === 0) {
    return {
      ok: false,
      code: "review_adjustment_requires_reason",
      message: "An adjustment must document its reason."
    };
  }

  const status = input.action === "uphold" ? "upheld" : "adjusted";
  const outcomeReason =
    input.action === "adjust" ? reason : (input.note?.trim() || null);

  return {
    ok: true,
    status,
    outcomeReason,
    auditEvent: {
      audit_event_id: `audit_human_review_resolved_${sanitize(input.request.requestId)}_${sanitize(
        input.resolvedAt
      )}`,
      event_type: "human_review.resolved",
      actor_type: "reviewer",
      actor_id: input.reviewerUserId,
      occurred_at: input.resolvedAt,
      target_type: input.request.targetType,
      target_id: input.request.targetId,
      summary:
        status === "upheld"
          ? "Human reviewer upheld the original evaluation."
          : "Human reviewer recorded an adjustment with a documented reason.",
      details: {
        human_review_request_id: input.request.requestId,
        candidate_id: input.request.userId,
        outcome: input.action,
        outcome_reason: outcomeReason,
        original_evaluator_runs_unmodified: true,
        recommendation_only: true
      },
      visibility_scope: "candidate_visible"
    }
  };
}

function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
