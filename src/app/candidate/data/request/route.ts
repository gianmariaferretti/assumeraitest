import { NextRequest, NextResponse } from "next/server";

import {
  createCandidateHumanReviewRequest,
  type CandidateReviewRequestTarget
} from "@/features/human-review/candidate-review-request";
import {
  createCandidateDataDeletionRequest,
  createCandidateDataExportRequest
} from "@/features/privacy/data-rights";
import {
  getDefaultComplianceWorkflowStore,
  type ComplianceWorkflowStore
} from "@/features/compliance/workflow-store";
import {
  isCandidateContextError,
  resolveCandidateRouteContext,
  type CandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { persistCandidateDataWorkflow } from "@/features/candidate-persistence/supabase-candidate-store";

type CandidateDataWorkflowKind = "human_review" | "data_export" | "data_deletion";

type CandidateDataWorkflowPayload = {
  readonly kind?: unknown;
  readonly candidateId?: unknown;
  readonly targetType?: unknown;
  readonly targetId?: unknown;
  readonly summary?: unknown;
  readonly evidenceNotes?: unknown;
  readonly correlationId?: unknown;
};

const humanReviewTargets = new Set<CandidateReviewRequestTarget>([
  "candidate_profile",
  "resume_scorecard",
  "interview_scorecard",
  "company_match",
  "data_access"
]);

export async function POST(request: NextRequest) {
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    return NextResponse.json(
      {
        error: {
          code: candidateContext.code,
          message: candidateContext.message,
          status: candidateContext.status
        }
      },
      { status: candidateContext.status }
    );
  }

  return handleCandidateDataWorkflowRequest(
    request,
    getDefaultComplianceWorkflowStore(),
    candidateContext
  );
}

async function handleCandidateDataWorkflowRequest(
  request: Request,
  store: ComplianceWorkflowStore = getDefaultComplianceWorkflowStore(),
  candidateContext?: CandidateRouteContext
) {
  try {
    const payload = await readPayload(request);
    const kind = readWorkflowKind(payload.kind);
    // The acting candidate is always the resolved route context — a
    // candidateId in the body or headers is never trusted.
    const candidateId =
      candidateContext?.mode === "authenticated" || candidateContext?.mode === "local_fallback"
        ? candidateContext.candidateId
        : "local_candidate";
    const requestedAt = new Date().toISOString();
    const correlationId =
      readOptionalString(payload.correlationId) ??
      `candidate-data-${kind}-${Date.now().toString(36)}`;

    if (kind === "human_review") {
      const targetType = readHumanReviewTarget(payload.targetType);
      const targetId = readRequiredString(payload.targetId, "review target ID");
      const summary = readRequiredString(payload.summary, "review summary");
      const evidenceNotes = readOptionalString(payload.evidenceNotes);
      const { request: reviewRequest, auditEvent } =
        createCandidateHumanReviewRequest({
          candidateId,
          requestedByActorId: candidateId,
          requestedAt,
          targetType,
          targetId,
          summary,
          evidenceNotes,
          correlationId
        });

      if (shouldUseLocalWorkflowStore(candidateContext)) {
        store.appendHumanReviewRequest(reviewRequest, auditEvent);
      }
      if (candidateContext) {
        await persistCandidateDataWorkflow(candidateContext, {
          workflowType: "human_review",
          workflowId: reviewRequest.humanReviewRequestId,
          workflowPayload: reviewRequest,
          auditEvent
        });
      }

      return NextResponse.json(
        {
          request: reviewRequest,
          audit_event: auditEvent
        },
        { status: 201 }
      );
    }

    if (kind === "data_export") {
      const { request: exportRequest, auditEvent } =
        createCandidateDataExportRequest({
          candidateId,
          requestedByActorId: candidateId,
          requestedAt,
          correlationId
        });

      if (shouldUseLocalWorkflowStore(candidateContext)) {
        store.appendDataExportRequest(exportRequest, auditEvent);
      }
      if (candidateContext) {
        await persistCandidateDataWorkflow(candidateContext, {
          workflowType: "data_export",
          workflowId: exportRequest.exportRequestId,
          workflowPayload: exportRequest,
          auditEvent
        });
      }

      return NextResponse.json(
        {
          request: exportRequest,
          audit_event: auditEvent
        },
        { status: 201 }
      );
    }

    const { request: deletionRequest, auditEvent } =
      createCandidateDataDeletionRequest({
        candidateId,
        requestedByActorId: candidateId,
        requestedAt,
        correlationId
      });

    if (shouldUseLocalWorkflowStore(candidateContext)) {
      store.appendDataDeletionRequest(deletionRequest, auditEvent);
    }
    if (candidateContext) {
      await persistCandidateDataWorkflow(candidateContext, {
        workflowType: "data_deletion",
        workflowId: deletionRequest.deletionRequestId,
        workflowPayload: deletionRequest,
        auditEvent
      });
    }

    return NextResponse.json(
      {
        request: deletionRequest,
        audit_event: auditEvent
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "candidate_data_workflow_invalid",
          message:
            error instanceof Error
              ? error.message
              : "Candidate data workflow request is invalid."
        }
      },
      { status: 400 }
    );
  }
}

function shouldUseLocalWorkflowStore(candidateContext: CandidateRouteContext | undefined): boolean {
  return !candidateContext || candidateContext.mode === "local_fallback";
}

async function readPayload(request: Request): Promise<CandidateDataWorkflowPayload> {
  const payload = (await request.json()) as unknown;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Candidate data workflow request requires a JSON object.");
  }

  return payload as CandidateDataWorkflowPayload;
}

function readWorkflowKind(value: unknown): CandidateDataWorkflowKind {
  if (
    value === "human_review" ||
    value === "data_export" ||
    value === "data_deletion"
  ) {
    return value;
  }

  throw new Error(
    "Candidate data workflow kind must be human_review, data_export, or data_deletion."
  );
}

function readHumanReviewTarget(value: unknown): CandidateReviewRequestTarget {
  const target = readRequiredString(value, "review target type");

  if (humanReviewTargets.has(target as CandidateReviewRequestTarget)) {
    return target as CandidateReviewRequestTarget;
  }

  throw new Error("Human review target type is not supported.");
}

function readRequiredString(value: unknown, label: string): string {
  const normalized = readOptionalString(value);

  if (!normalized) {
    throw new Error(`Candidate data workflow request requires ${label}.`);
  }

  return normalized;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : undefined;
}
