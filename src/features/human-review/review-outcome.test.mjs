import assert from "node:assert/strict";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";

const { createCandidateHumanReviewRequest } = loadFromRepoRoot(
  "src/features/human-review/candidate-review-request.ts",
);
const { buildReviewOutcome } = loadFromRepoRoot(
  "src/features/human-review/review-outcome.ts",
);

const REQUESTED_AT = "2026-06-09T10:00:00.000Z";
const RESOLVED_AT = "2026-06-10T09:00:00.000Z";

function openRequest(overrides = {}) {
  return {
    userId: "cand_1",
    requestId: "human_review_request_cand_1_scorecard_1",
    targetType: "interview_scorecard",
    targetId: "scorecard_1",
    status: "open",
    requestedAt: REQUESTED_AT,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Full loop: candidate request -> reviewer outcome -> audit trail
// ---------------------------------------------------------------------------

test("the candidate request produces a queued request plus its audit event", () => {
  const { request, auditEvent } = createCandidateHumanReviewRequest({
    candidateId: "cand_1",
    requestedByActorId: "cand_1",
    requestedAt: REQUESTED_AT,
    targetType: "interview_scorecard",
    targetId: "scorecard_1",
    summary: "Please review my interview scorecard.",
    correlationId: "corr_1",
  });

  assert.equal(request.status, "queued");
  assert.equal(request.recommendationOnly, true);
  assert.equal(auditEvent.event_type, "human_review.requested");
  assert.equal(auditEvent.details.no_automatic_rejection, true);
  assert.equal(auditEvent.audit_event_id, request.auditEventId);
});

test("uphold resolves the request and records a new candidate-visible audit event", () => {
  const outcome = buildReviewOutcome({
    request: openRequest(),
    action: "uphold",
    note: "Evidence matches the recorded anchors.",
    reviewerUserId: "reviewer_1",
    resolvedAt: RESOLVED_AT,
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.status, "upheld");
  assert.equal(outcome.outcomeReason, "Evidence matches the recorded anchors.");
  assert.equal(outcome.auditEvent.event_type, "human_review.resolved");
  assert.equal(outcome.auditEvent.actor_id, "reviewer_1");
  assert.equal(outcome.auditEvent.details.outcome, "uphold");
  assert.equal(outcome.auditEvent.details.original_evaluator_runs_unmodified, true);
  assert.equal(outcome.auditEvent.visibility_scope, "candidate_visible");
});

test("an adjustment REQUIRES a documented reason", () => {
  const missing = buildReviewOutcome({
    request: openRequest(),
    action: "adjust",
    reviewerUserId: "reviewer_1",
    resolvedAt: RESOLVED_AT,
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "review_adjustment_requires_reason");

  const blank = buildReviewOutcome({
    request: openRequest(),
    action: "adjust",
    reason: "   ",
    reviewerUserId: "reviewer_1",
    resolvedAt: RESOLVED_AT,
  });
  assert.equal(blank.ok, false);

  const adjusted = buildReviewOutcome({
    request: openRequest(),
    action: "adjust",
    reason: "STAR evidence for the result element was present in the transcript.",
    reviewerUserId: "reviewer_1",
    resolvedAt: RESOLVED_AT,
  });
  assert.equal(adjusted.ok, true);
  assert.equal(adjusted.status, "adjusted");
  assert.equal(
    adjusted.auditEvent.details.outcome_reason,
    "STAR evidence for the result element was present in the transcript.",
  );
});

test("resolved requests are final: no second outcome is possible", () => {
  for (const status of ["upheld", "adjusted"]) {
    const again = buildReviewOutcome({
      request: openRequest({ status }),
      action: "uphold",
      reviewerUserId: "reviewer_2",
      resolvedAt: RESOLVED_AT,
    });
    assert.equal(again.ok, false, status);
    assert.equal(again.code, "review_request_already_resolved", status);
  }
});

test("invalid actions are rejected", () => {
  const outcome = buildReviewOutcome({
    request: openRequest(),
    action: "overwrite_scores",
    reviewerUserId: "reviewer_1",
    resolvedAt: RESOLVED_AT,
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.code, "review_outcome_invalid_action");
});

test("the outcome never carries evaluator-run mutations, only audit context", () => {
  const outcome = buildReviewOutcome({
    request: openRequest(),
    action: "adjust",
    reason: "Documented reason.",
    reviewerUserId: "reviewer_1",
    resolvedAt: RESOLVED_AT,
  });

  assert.equal(outcome.ok, true);
  const serialized = JSON.stringify(outcome).toLowerCase();
  for (const forbidden of ["bars_score", "delete", "overwrite"]) {
    assert.ok(
      !serialized.includes(forbidden),
      `outcome must not reference "${forbidden}" — original runs stay immutable`,
    );
  }
});
