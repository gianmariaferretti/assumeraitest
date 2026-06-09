"use client";

import React, { useMemo, useState } from "react";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

import {
  buildCandidateMatchTimeline,
  buildCandidateDashboardView,
  updateCandidateMatchDecision,
  type CandidateDashboardMatch,
  type CandidateMatchTimelineStep,
  type CompanyMatchFeedback
} from "./candidate-dashboard-model";
import { candidateResultsReviewSeed } from "./candidate-results-review-model";

export function CandidateMatchInbox({
  companyFeedback = [],
  language,
  materializedMatches
}: {
  readonly companyFeedback?: readonly CompanyMatchFeedback[];
  readonly language?: CandidateInterviewLanguageCode;
  readonly materializedMatches?: readonly CandidateDashboardMatch[];
}) {
  const copy = resolveCandidateFlowCopy(language).matches;
  const initialMatches = useMemo(
    () => {
      const feedbackByMatchId = new Map(
        companyFeedback.map((feedback) => [feedback.matchId, feedback])
      );
      const sourceMatches =
        materializedMatches ??
        buildCandidateDashboardView(candidateResultsReviewSeed).matches;

      return localizeCandidateDashboardMatches(
        sourceMatches.map((match) => ({
          ...match,
          companyFeedback: feedbackByMatchId.get(match.matchId)
        })),
        language
      );
    },
    [companyFeedback, language, materializedMatches]
  );
  const [matches, setMatches] = useState<readonly CandidateDashboardMatch[]>(initialMatches);
  const [pendingDecisionMatchId, setPendingDecisionMatchId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<{
    readonly matchId: string;
    readonly message: string;
  } | null>(null);

  async function decideMatch(match: CandidateDashboardMatch, decision: "accepted" | "declined") {
    setPendingDecisionMatchId(match.matchId);
    setDecisionError(null);

    try {
      const persistedDecision = await persistCandidateMatchDecision(match, decision);
      setMatches((currentMatches) =>
        updateCandidateMatchDecision(
          currentMatches,
          match.matchId,
          decision,
          persistedDecision.decision.consentRecordId ?? undefined,
          {
            auditEventId: persistedDecision.decision.auditEventId,
            decidedAt: persistedDecision.decision.decidedAt,
            sharingSnapshotId: persistedDecision.decision.sharingSnapshotId ?? undefined
          }
        )
      );
    } catch (error) {
      setDecisionError({
        matchId: match.matchId,
        message:
          error instanceof Error
            ? error.message
            : "Decision could not be recorded. Nothing was shared."
      });
    } finally {
      setPendingDecisionMatchId(null);
    }
  }

  return (
    <main className="candidate-match-shell">
      <CandidateMatchInboxStyles />
      <div className="candidate-match-top">
        <CandidateProgressRail current="results" language={language} />
      </div>

      <section className="candidate-match-stage" aria-label={copy.stageAria}>
        <header className="candidate-match-header">
          <div>
            <p>{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <span>{copy.summary}</span>
          </div>
          <aside aria-label={copy.boundaryAria}>
            <strong>{copy.boundaryTitle}</strong>
            <span>{copy.boundaryDetail}</span>
          </aside>
        </header>

        <section className="match-list" aria-label={copy.listAria}>
          {matches.map((match) => (
            <article className="match-row" key={match.matchId}>
              <div className="match-main">
                <div className="match-title-row">
                  <div>
                    <span>{formatMatchStatus(match.status, copy.statuses)}</span>
                    <h2>{match.roleTitle}</h2>
                    <p>{match.companyName}</p>
                  </div>
                  <div className="match-score-pill" aria-label={copy.scoreAria}>
                    <strong>{match.matchScore}</strong>
                    <span>
                      {match.confidence}% {copy.confidence}
                    </span>
                  </div>
                </div>

                <div className="match-evidence-grid">
                  <section>
                    <h3>{copy.whyFit}</h3>
                    <ul>
                      {match.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3>{copy.evidenceAndGaps}</h3>
                    <ul>
                      {[...match.evidence, ...match.gaps].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>

              <div className="match-sharing-panel">
                <span>{copy.sharingPreview}</span>
                <p>{copy.sharingBody}</p>
                <div className="sharing-token-list" aria-label={copy.includedAria}>
                  {match.sharingPreview.dataCategories.map((category) => (
                    <code key={category}>{formatSharingCategory(category)}</code>
                  ))}
                </div>
                <p className="excluded-share-note">
                  {copy.excludedNote}
                </p>
                <div className="sharing-token-list" aria-label={copy.excludedAria}>
                  {match.sharingPreview.excludedCategories.map((category) => (
                    <code key={category}>{formatSharingCategory(category)}</code>
                  ))}
                </div>
                <CandidateDecisionTimeline match={match} />
                <div className="match-actions">
                  <button
                    disabled={match.status === "accepted" || pendingDecisionMatchId === match.matchId}
                    onClick={() => void decideMatch(match, "accepted")}
                    type="button"
                  >
                    {copy.acceptSharing}
                  </button>
                  <button
                    disabled={match.status === "declined" || pendingDecisionMatchId === match.matchId}
                    onClick={() => void decideMatch(match, "declined")}
                    type="button"
                  >
                    {copy.declineMatch}
                  </button>
                </div>
                {decisionError?.matchId === match.matchId ? (
                  <output className="match-decision-error">{decisionError.message}</output>
                ) : null}
                {match.candidateDecision ? (
                  <output title={match.candidateDecision.auditEventId}>
                    {copy.decisionRecorded} {copy.statuses[match.status]}
                  </output>
                ) : null}
                {match.companyFeedback ? (
                  <div className="company-feedback-card">
                    <span>{formatCompanyFeedbackStatus(match.companyFeedback.status)}</span>
                    {match.companyFeedback.status !== "company_declined" ? (
                      <p>{match.companyFeedback.reason}</p>
                    ) : null}
                    {match.companyFeedback.nextStep ? (
                      <p className="next-step">
                        <strong>Next step</strong>{" "}
                        {match.companyFeedback.nextStep}
                      </p>
                    ) : null}
                    {match.companyFeedback.followUpAt ? (
                      <p className="unresolved">
                        <strong>Follow-up</strong>{" "}
                        {formatDate(match.companyFeedback.followUpAt)}
                      </p>
                    ) : null}
                    {match.companyFeedback.status === "company_declined" ? (
                      <p className="decline-reason">
                        <strong>Reason</strong> {match.companyFeedback.reason}
                      </p>
                    ) : null}
                    <p className="sharing-boundary-note">
                      Candidate-owned sharing only. Employer feedback is a human-reviewed update, not an automated verdict.
                    </p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function CandidateDecisionTimeline({
  match
}: {
  readonly match: CandidateDashboardMatch;
}) {
  const steps = buildCandidateMatchTimeline(match);

  return (
    <ol className="match-decision-timeline" aria-label="Candidate decision timeline">
      {steps.map((step) => (
        <li data-state={step.state} key={step.key}>
          <span>{formatTimelineState(step)}</span>
          <div>
            <strong>{formatTimelineDetail(step)}</strong>
            <p>{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const matchTextTranslations = {
  it: {
    "Risk analysis evidence matches the calibrated role bar":
      "Le evidenze di analisi rischio corrispondono alla soglia calibrata del ruolo",
    "English communication is above the role threshold":
      "La comunicazione in inglese supera la soglia del ruolo",
    "SQL and client scenario evidence are present":
      "Sono presenti evidenze SQL e scenario cliente",
    "Resume: audit internship with measurable process improvement":
      "CV: tirocinio audit con miglioramento processo misurabile",
    "Interview evidence is attached only after supported transcript review":
      "L'evidenza colloquio viene allegata solo dopo revisione della trascrizione supportata",
    "Language communication evidence is attached only after supported transcript review":
      "L'evidenza comunicativa linguistica viene allegata solo dopo revisione della trascrizione supportata",
    "More evidence needed for production Python work":
      "Servono piu evidenze sul lavoro Python in produzione",
    "German and English preference fit is promising":
      "Il fit sulle preferenze tedesco e inglese e' promettente",
    "Customer-facing examples support outbound learning potential":
      "Gli esempi a contatto cliente supportano potenziale di apprendimento outbound",
    "Resume: customer support project with measured response improvement":
      "CV: progetto customer support con miglioramento misurato dei tempi di risposta",
    "Needs stronger evidence for pipeline discipline":
      "Servono evidenze piu forti sulla disciplina di pipeline"
  },
  fr: {
    "Risk analysis evidence matches the calibrated role bar":
      "Les preuves d'analyse des risques correspondent au seuil calibre du role",
    "English communication is above the role threshold":
      "La communication en anglais depasse le seuil du role",
    "SQL and client scenario evidence are present":
      "Des preuves SQL et de scenario client sont presentes",
    "Resume: audit internship with measurable process improvement":
      "CV: stage audit avec amelioration de processus mesurable",
    "Interview evidence is attached only after supported transcript review":
      "Les preuves d'entretien sont jointes seulement apres revue de transcription supportee",
    "Language communication evidence is attached only after supported transcript review":
      "Les preuves de communication linguistique sont jointes seulement apres revue de transcription supportee",
    "More evidence needed for production Python work":
      "Davantage de preuves sont necessaires pour le travail Python en production",
    "German and English preference fit is promising":
      "L'adequation des preferences allemand et anglais est prometteuse",
    "Customer-facing examples support outbound learning potential":
      "Les exemples face client soutiennent un potentiel d'apprentissage outbound",
    "Resume: customer support project with measured response improvement":
      "CV: projet support client avec amelioration mesuree du temps de reponse",
    "Needs stronger evidence for pipeline discipline":
      "Des preuves plus solides sont necessaires pour la discipline de pipeline"
  }
} as const;

function localizeCandidateDashboardMatches(
  matches: readonly CandidateDashboardMatch[],
  language?: CandidateInterviewLanguageCode
): readonly CandidateDashboardMatch[] {
  if (language !== "it" && language !== "fr") {
    return matches;
  }

  const translations = matchTextTranslations[language];
  const localize = (value: string) => translations[value as keyof typeof translations] ?? value;

  return matches.map((match) => ({
    ...match,
    reasons: match.reasons.map(localize),
    evidence: match.evidence.map(localize),
    gaps: match.gaps.map(localize)
  }));
}

async function persistCandidateMatchDecision(
  match: CandidateDashboardMatch,
  decision: "accepted" | "declined"
): Promise<CandidateMatchDecisionPersistence> {
  const response = await fetch("/candidate/matches/decision", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      matchId: match.matchId,
      companyId: match.companyId,
      roleId: match.roleId,
      roleTitle: match.roleTitle,
      companyName: match.companyName,
      matchScore: match.matchScore,
      confidence: match.confidence,
      reasons: match.reasons,
      evidence: match.evidence,
      gaps: match.gaps,
      raw_cv_included: false,
      raw_interview_media_included: false,
      decision
    })
  });
  const payload = (await response.json().catch(() => null)) as
    | CandidateMatchDecisionPersistence
    | {
        readonly error?: { readonly message?: string };
      }
    | null;

  if (!response.ok || !payload || !("decision" in payload)) {
    const errorMessage =
      payload && "error" in payload ? payload.error?.message : undefined;
    throw new Error(
      errorMessage ?? "Decision could not be recorded. Nothing was shared."
    );
  }

  return payload;
}

type CandidateMatchDecisionPersistence = {
  readonly decision: {
    readonly matchId: string;
    readonly decision: "accepted" | "declined";
    readonly companyId: string;
    readonly roleId: string;
    readonly consentRecordId: string | null;
    readonly sharingSnapshotId: string | null;
    readonly decidedAt: string;
    readonly auditEventId: string;
  };
};

function formatMatchStatus(
  status: CandidateDashboardMatch["status"],
  statuses: ReturnType<typeof resolveCandidateFlowCopy>["matches"]["statuses"]
): string {
  return statuses[status];
}

function formatCompanyFeedbackStatus(status: CompanyMatchFeedback["status"]): string {
  if (status === "company_advanced") {
    return "Advanced by company";
  }

  if (status === "company_hold") {
    return "Still under review";
  }

  return "Not moving forward";
}

function formatTimelineState(step: CandidateMatchTimelineStep): string {
  if (step.state === "complete") {
    return "Done";
  }

  if (step.state === "unresolved") {
    return "Open";
  }

  if (step.state === "current") {
    return "Now";
  }

  return "Pending";
}

function formatTimelineDetail(step: CandidateMatchTimelineStep): string {
  if (step.key === "company_feedback" && step.label === "Still under review") {
    return `${step.label} - unresolved`;
  }

  return step.label;
}

function formatSharingCategory(category: string): string {
  const labels: Record<string, string> = {
    candidate_profile: "Candidate profile",
    scorecard: "Scorecard",
    interview_transcript: "Interview transcript",
    match_explanation: "Match explanation",
    company_match: "Company-role match",
    raw_cv: "Original CV file",
    raw_interview_media: "Interview recording"
  };

  return labels[category] ?? category.replace(/_/g, " ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function CandidateMatchInboxStyles() {
  return (
    <style>{`
      .candidate-match-shell {
        background: linear-gradient(180deg, #ffffff 0%, #f7f8f4 100%);
        color: #111c19;
        min-height: 100dvh;
      }

      .candidate-match-top {
        left: 50%;
        max-width: min(770px, calc(100vw - 32px));
        position: fixed;
        top: 52px;
        transform: translateX(-50%);
        width: 100%;
        z-index: 5;
      }

      .candidate-match-stage {
        display: grid;
        gap: 24px;
        margin: 0 auto;
        max-width: 1180px;
        min-height: 100dvh;
        padding: 132px 24px 76px;
      }

      .candidate-match-header {
        align-items: end;
        display: grid;
        gap: 22px;
        grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
      }

      .candidate-match-header div {
        display: grid;
        gap: 9px;
      }

      .candidate-match-header p,
      .candidate-match-header span,
      .match-title-row p,
      .match-sharing-panel p,
      .match-sharing-panel output,
      .match-decision-error,
      .match-evidence-grid li {
        color: #5d6965;
        line-height: 1.5;
        margin: 0;
      }

      .candidate-match-header p,
      .match-title-row span,
      .match-sharing-panel > span {
        color: #111c19;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .candidate-match-header h1 {
        font-size: clamp(1.55rem, 3.2vw, 2.8rem);
        line-height: 1.08;
        margin: 0;
      }

      .candidate-match-header aside {
        background: #111c19;
        border-radius: 22px;
        color: #fffdf8;
        display: grid;
        gap: 9px;
        padding: 20px;
      }

      .candidate-match-header aside span {
        color: rgba(255, 253, 248, 0.74);
      }

      .match-list {
        display: grid;
        gap: 16px;
      }

      .match-row {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 24px;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr) minmax(310px, 380px);
        padding: 18px;
      }

      .match-main {
        display: grid;
        gap: 18px;
        min-width: 0;
      }

      .match-title-row {
        align-items: start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
      }

      .match-title-row h2 {
        font-size: 1.25rem;
        margin: 4px 0 2px;
      }

      .match-score-pill {
        background: #f6f8f3;
        border-radius: 18px;
        display: grid;
        gap: 4px;
        min-width: 112px;
        padding: 12px;
        text-align: right;
      }

      .match-score-pill strong {
        font-size: 1.55rem;
        line-height: 1;
      }

      .match-score-pill span {
        color: #5d6965;
        font-size: 0.76rem;
        font-weight: 800;
      }

      .match-evidence-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .match-evidence-grid section,
      .match-sharing-panel {
        background: #f7f8f4;
        border-radius: 20px;
        display: grid;
        gap: 10px;
        padding: 16px;
      }

      .match-evidence-grid h3 {
        font-size: 0.95rem;
        margin: 0;
      }

      .match-evidence-grid ul {
        display: grid;
        gap: 8px;
        margin: 0;
        padding-left: 18px;
      }

      .sharing-token-list {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .sharing-token-list code {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 999px;
        color: #111c19;
        font-size: 0.76rem;
        font-weight: 850;
        padding: 6px 9px;
      }

      .excluded-share-note {
        font-weight: 850;
      }

      .match-decision-error {
        color: #9c2f27;
        font-weight: 850;
      }

      .company-feedback-card,
      .match-decision-timeline {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.12);
        border-radius: 18px;
        display: grid;
        gap: 8px;
        padding: 13px;
      }

      .match-decision-timeline {
        list-style: none;
        margin: 0;
      }

      .match-decision-timeline li {
        display: grid;
        gap: 10px;
        grid-template-columns: 48px minmax(0, 1fr);
      }

      .match-decision-timeline li > span {
        align-self: start;
        background: #eff3eb;
        border-radius: 999px;
        color: #111c19;
        font-size: 0.68rem;
        font-weight: 900;
        padding: 5px 7px;
        text-align: center;
      }

      .match-decision-timeline li[data-state="complete"] > span {
        background: #dcebd8;
      }

      .match-decision-timeline li[data-state="current"] > span,
      .match-decision-timeline li[data-state="unresolved"] > span {
        background: #fff3cd;
      }

      .match-decision-timeline strong {
        color: #111c19;
        font-size: 0.9rem;
      }

      .match-decision-timeline p {
        margin-top: 3px;
      }

      .company-feedback-card span {
        color: #111c19;
        font-size: 0.75rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .company-feedback-card strong {
        color: #111c19;
        font-weight: 900;
      }

      .sharing-boundary-note {
        border-top: 1px solid rgba(17, 28, 25, 0.1);
        padding-top: 8px;
      }

      .match-actions {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .match-actions button {
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        font-weight: 900;
        min-height: 42px;
        padding: 10px 13px;
      }

      .match-actions button:first-child {
        background: #111c19;
        color: #ffffff;
      }

      .match-actions button:last-child {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.15);
        color: #111c19;
      }

      .match-actions button:disabled {
        cursor: default;
        opacity: 0.66;
      }

      @media (max-width: 820px) {
        .candidate-match-top {
          top: 20px;
        }

        .candidate-match-stage {
          padding: 132px 20px 72px;
        }

        .candidate-match-header,
        .match-row,
        .match-evidence-grid,
        .match-actions {
          grid-template-columns: 1fr;
        }

        .match-title-row {
          display: grid;
        }

        .match-score-pill {
          text-align: left;
        }
      }
    `}</style>
  );
}
