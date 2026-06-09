"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";
import type {
  CandidateHumanReviewRequest,
  CandidateReviewRequestTarget
} from "@/features/human-review/candidate-review-request";
import {
  type CandidateDataDeletionRequest,
  type CandidateDataExportRequest
} from "@/features/privacy/data-rights";
import { DEFAULT_RETENTION_CONFIG } from "@/features/privacy/retention";

type CandidateDataControlsProps = {
  readonly language?: CandidateInterviewLanguageCode;
  readonly rawCvDeleteAfter?: string;
};

export function CandidateDataControls({
  language,
  rawCvDeleteAfter
}: CandidateDataControlsProps) {
  const copy = resolveCandidateFlowCopy(language).dataControls;
  const effectiveRawCvDeleteAfter = rawCvDeleteAfter ?? copy.defaultRawCvDeleteAfter;
  const reviewTargets: ReadonlyArray<{
    readonly value: CandidateReviewRequestTarget;
    readonly label: string;
  }> = [
    { value: "resume_scorecard", label: copy.targets.resume_scorecard },
    { value: "interview_scorecard", label: copy.targets.interview_scorecard },
    { value: "company_match", label: copy.targets.company_match },
    { value: "candidate_profile", label: copy.targets.candidate_profile },
    { value: "data_access", label: copy.targets.data_access }
  ];
  const [targetType, setTargetType] =
    useState<CandidateReviewRequestTarget>("resume_scorecard");
  const [targetId, setTargetId] = useState("local_scorecard");
  const [reviewSummary, setReviewSummary] = useState(
    copy.reviewDefaultSummary
  );
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [rightsError, setRightsError] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [rightsSubmitting, setRightsSubmitting] = useState<
    "export" | "deletion" | null
  >(null);
  const [reviewRequest, setReviewRequest] =
    useState<CandidateHumanReviewRequest | null>(null);
  const [exportRequest, setExportRequest] =
    useState<CandidateDataExportRequest | null>(null);
  const [deletionRequest, setDeletionRequest] =
    useState<CandidateDataDeletionRequest | null>(null);

  const retentionRows = useMemo(
    () => [
      {
        label: copy.retention.rawCv,
        value: effectiveRawCvDeleteAfter,
        detail: copy.retention.rawCvDetail
      },
      {
        label: copy.retention.rawInterviewMedia,
        value: `${DEFAULT_RETENTION_CONFIG.rawMediaHours} ${copy.retention.hoursSuffix}`,
        detail: copy.retention.rawMediaDetail
      },
      {
        label: copy.retention.consentAudit,
        value: `${DEFAULT_RETENTION_CONFIG.auditLogDays} ${copy.retention.daysSuffix}`,
        detail: copy.retention.consentAuditDetail
      }
    ],
    [copy, effectiveRawCvDeleteAfter]
  );

  function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitReviewRequest();
  }

  async function submitReviewRequest() {
    setIsReviewSubmitting(true);
    try {
      const request = await postCandidateDataWorkflow<CandidateHumanReviewRequest>({
        kind: "human_review",
        targetType,
        targetId,
        summary: reviewSummary,
        evidenceNotes,
        correlationId: buildCorrelationId("review")
      }, copy.workflowFailed);
      setReviewRequest(request);
      setFormError("");
    } catch (error) {
      setReviewRequest(null);
      setFormError(
          error instanceof Error ? error.message : copy.reviewFailed
      );
    } finally {
      setIsReviewSubmitting(false);
    }
  }

  async function requestExport() {
    setRightsSubmitting("export");
    setRightsError("");

    try {
      const request = await postCandidateDataWorkflow<CandidateDataExportRequest>({
        kind: "data_export",
        correlationId: buildCorrelationId("export")
      }, copy.workflowFailed);

      setExportRequest(request);
    } catch (error) {
      setExportRequest(null);
      setRightsError(
        error instanceof Error ? error.message : copy.exportFailed
      );
    } finally {
      setRightsSubmitting(null);
    }
  }

  async function requestDeletion() {
    setRightsSubmitting("deletion");
    setRightsError("");

    try {
      const request = await postCandidateDataWorkflow<CandidateDataDeletionRequest>({
        kind: "data_deletion",
        correlationId: buildCorrelationId("delete")
      }, copy.workflowFailed);

      setDeletionRequest(request);
    } catch (error) {
      setDeletionRequest(null);
      setRightsError(
        error instanceof Error ? error.message : copy.deletionFailed
      );
    } finally {
      setRightsSubmitting(null);
    }
  }

  return (
    <main className="candidate-data-controls">
      <CandidateDataControlsStyles />
      <CandidateProgressRail current="data" language={language} />

      <section
        className="data-controls-hero"
        aria-label={copy.heroAria}
        aria-labelledby="data-controls-title"
      >
        <div>
          <p>{copy.eyebrow}</p>
          <h1 id="data-controls-title">{copy.title}</h1>
          <span>{copy.summary}</span>
        </div>
        <div className="data-controls-proof" aria-label={copy.guaranteesAria}>
          <strong>{copy.proofTitle}</strong>
          {copy.proofLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </section>

      <section className="data-control-flow" aria-label={copy.actionsAria}>
        <form className="data-control-step" onSubmit={handleReviewSubmit}>
          <div className="step-number">01</div>
          <div className="step-body">
            <p>{copy.reviewEyebrow}</p>
            <h2>{copy.reviewTitle}</h2>
            <div className="field-grid">
              <label>
                {copy.reviewTarget}
                <select
                  onChange={(event) =>
                    setTargetType(event.currentTarget.value as CandidateReviewRequestTarget)
                  }
                  value={targetType}
                >
                  {reviewTargets.map((target) => (
                    <option key={target.value} value={target.value}>
                      {target.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.targetId}
                <input
                  onChange={(event) => setTargetId(event.currentTarget.value)}
                  value={targetId}
                />
              </label>
            </div>
            <label>
              {copy.whatChecked}
              <textarea
                onChange={(event) => setReviewSummary(event.currentTarget.value)}
                rows={3}
                value={reviewSummary}
              />
            </label>
            <label>
              {copy.optionalNotes}
              <textarea
                onChange={(event) => setEvidenceNotes(event.currentTarget.value)}
                rows={3}
                value={evidenceNotes}
              />
            </label>
            <button disabled={isReviewSubmitting} type="submit">
              {isReviewSubmitting ? copy.requesting : copy.requestHumanReview}
            </button>
            {formError ? <StatusMessage tone="error" value={formError} /> : null}
            {reviewRequest ? (
              <StatusMessage
                tone="success"
                value={`${copy.reviewQueuedPrefix} ${reviewRequest.auditEventId}.`}
              />
            ) : null}
          </div>
        </form>

        <section className="data-control-step" aria-labelledby="rights-title">
          <div className="step-number">02</div>
          <div className="step-body">
            <p>{copy.rightsEyebrow}</p>
            <h2 id="rights-title">{copy.rightsTitle}</h2>
            <span>{copy.rightsBody}</span>
            <div className="button-row">
              <button
                disabled={rightsSubmitting !== null}
                onClick={() => void requestExport()}
                type="button"
              >
                {rightsSubmitting === "export" ? copy.requesting : copy.requestExport}
              </button>
              <button
                disabled={rightsSubmitting !== null}
                onClick={() => void requestDeletion()}
                type="button"
              >
                {rightsSubmitting === "deletion" ? copy.requesting : copy.requestDeletion}
              </button>
            </div>
            {rightsError ? <StatusMessage tone="error" value={rightsError} /> : null}
            {exportRequest ? (
              <StatusMessage
                tone="success"
                value={`${copy.exportQueuedPrefix} ${exportRequest.exportRequestId}.`}
              />
            ) : null}
            {deletionRequest ? (
              <StatusMessage
                tone="success"
                value={`${copy.deletionQueuedPrefix} ${deletionRequest.deletionRequestId}.`}
              />
            ) : null}
          </div>
        </section>

        <section className="data-control-step" aria-labelledby="retention-title">
          <div className="step-number">03</div>
          <div className="step-body">
            <p>{copy.retentionEyebrow}</p>
            <h2 id="retention-title">{copy.retentionTitle}</h2>
            <div className="retention-list">
              {retentionRows.map((row) => (
                <div className="retention-row" key={row.label}>
                  <strong>{row.label}</strong>
                  <span>{row.value}</span>
                  <small>{row.detail}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <nav className="data-profile-return" aria-label={copy.returnToProfile}>
        <Link href="/profile">{copy.returnToProfile}</Link>
      </nav>
    </main>
  );
}

function StatusMessage({
  tone,
  value
}: {
  readonly tone: "success" | "error";
  readonly value: string;
}) {
  return <p className={`data-status data-status-${tone}`}>{value}</p>;
}

function buildCorrelationId(kind: string): string {
  return `candidate-data-${kind}-${Date.now().toString(36)}`;
}

async function postCandidateDataWorkflow<TRequest>(
  payload: Record<string, unknown>,
  fallbackMessage: string
): Promise<TRequest> {
  const response = await fetch("/candidate/data/request", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const responsePayload = (await response.json().catch(() => null)) as
    | {
        readonly request?: TRequest;
        readonly error?: { readonly message?: string };
      }
    | null;

  if (!response.ok || !responsePayload?.request) {
    throw new Error(
      responsePayload?.error?.message ?? fallbackMessage
    );
  }

  return responsePayload.request;
}

function CandidateDataControlsStyles() {
  return (
    <style>{`
      .candidate-data-controls {
        background: #ffffff;
        color: #111c19;
        min-height: 100dvh;
        padding: clamp(20px, 4vw, 42px);
      }

      .data-controls-hero,
      .data-control-flow {
        margin: 0 auto;
        max-width: 1040px;
      }

      .data-controls-hero {
        align-items: end;
        border-bottom: 1px solid rgba(23, 33, 31, 0.14);
        display: grid;
        gap: 28px;
        grid-template-columns: minmax(0, 1fr) minmax(250px, 340px);
        padding-bottom: 28px;
      }

      .data-controls-hero p,
      .data-control-step p {
        color: #111c19;
        font-size: 0.78rem;
        font-weight: 900;
        margin: 0;
        text-transform: uppercase;
      }

      .data-controls-hero h1 {
        font-size: clamp(2rem, 4.8vw, 3.8rem);
        line-height: 1.02;
        margin: 10px 0 12px;
        max-width: 680px;
      }

      .data-controls-hero span,
      .step-body > span,
      .retention-row small {
        color: #5d6965;
        line-height: 1.55;
      }

      .data-controls-proof {
        background: #111c19;
        border-radius: 8px;
        color: #ffffff;
        display: grid;
        gap: 10px;
        padding: 18px;
      }

      .data-controls-proof strong {
        color: #f5f7f2;
      }

      .data-controls-proof span {
        border-top: 1px solid rgba(255, 255, 255, 0.16);
        color: #ffffff;
        padding-top: 10px;
      }

      .data-control-flow {
        display: grid;
        gap: 16px;
        padding-top: 22px;
      }

      .data-profile-return {
        display: flex;
        justify-content: center;
        margin: 24px auto 0;
        max-width: 1040px;
      }

      .data-profile-return a {
        align-items: center;
        background: #111c19;
        border-radius: 999px;
        color: #ffffff;
        display: inline-flex;
        font-weight: 900;
        min-height: 44px;
        padding: 11px 18px;
        text-decoration: none;
      }

      .data-control-step {
        background: #ffffff;
        border: 1px solid rgba(23, 33, 31, 0.13);
        border-radius: 8px;
        display: grid;
        gap: 16px;
        grid-template-columns: 54px minmax(0, 1fr);
        padding: clamp(16px, 3vw, 22px);
      }

      .step-number {
        color: #111c19;
        font-size: 1.35rem;
        font-weight: 900;
      }

      .step-body {
        display: grid;
        gap: 12px;
      }

      .step-body h2 {
        font-size: clamp(1.45rem, 3vw, 2rem);
        line-height: 1.08;
        margin: 0;
      }

      .field-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .candidate-data-controls label {
        color: #364640;
        display: grid;
        font-size: 0.86rem;
        font-weight: 800;
        gap: 7px;
      }

      .candidate-data-controls input,
      .candidate-data-controls select,
      .candidate-data-controls textarea {
        background: #ffffff;
        border: 1px solid rgba(23, 33, 31, 0.2);
        border-radius: 8px;
        color: #111c19;
        padding: 10px 11px;
      }

      .candidate-data-controls textarea {
        line-height: 1.45;
        resize: vertical;
      }

      .candidate-data-controls button {
        background: #111c19;
        border: 0;
        border-radius: 999px;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-weight: 900;
        min-height: 44px;
        padding: 11px 16px;
        width: fit-content;
      }

      .candidate-data-controls button:disabled {
        cursor: default;
        opacity: 0.72;
      }

      .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .data-status {
        border-radius: 8px;
        margin: 0;
        padding: 10px 12px;
      }

      .data-status-success {
        background: #f5f7f2;
        color: #0f4b35;
      }

      .data-status-error {
        background: #fff1ef;
        color: #9b2d1f;
      }

      .retention-list {
        display: grid;
        gap: 10px;
      }

      .retention-row {
        border-top: 1px solid rgba(23, 33, 31, 0.12);
        display: grid;
        gap: 4px;
        padding-top: 10px;
      }

      .retention-row span {
        color: #111c19;
        font-weight: 900;
      }

      @media (max-width: 820px) {
        .data-controls-hero,
        .data-control-step,
        .field-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
