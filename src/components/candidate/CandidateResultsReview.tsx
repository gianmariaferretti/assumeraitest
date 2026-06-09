"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import {
  resumeInterviewSession,
  type InterviewSession
} from "@/features/interview-flow";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";
import type { CandidateHumanReviewRequest } from "@/features/human-review/candidate-review-request";

import {
  buildCandidateResultsReviewModel,
  type CandidateResultsReviewModel
} from "./candidate-results-review-model";

const INTERVIEW_SESSION_STORAGE_KEY = "assumerai:candidate-interview-session:v0";

type ReviewRequestState = {
  readonly requestId: string;
  readonly auditEventId: string;
  readonly status: CandidateHumanReviewRequest["status"];
  readonly requestedAt: string;
};

export function CandidateResultsReview({
  language,
  initialInterviewSession
}: {
  readonly language?: CandidateInterviewLanguageCode;
  /** Server-authoritative session passed down from the results page. */
  readonly initialInterviewSession?: InterviewSession | null;
}) {
  const copy = resolveCandidateFlowCopy(language).results;
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(
    initialInterviewSession ?? null
  );
  const baseModel = useMemo(
    () => buildCandidateResultsReviewModel(undefined, { interviewSession }),
    [interviewSession]
  );
  const model = useMemo(
    () => localizeResultsReviewModel(baseModel, language),
    [baseModel, language]
  );
  const [requestState, setRequestState] = useState<ReviewRequestState | null>(null);
  const [requestError, setRequestError] = useState("");
  const [isRequestingReview, setIsRequestingReview] = useState(false);

  useEffect(() => {
    // The server-authoritative session wins; the legacy device autosave is only
    // a candidate-private display fallback for sessions saved before the
    // server-trust migration (never used for scoring).
    if (initialInterviewSession) {
      return;
    }

    const savedSession =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(INTERVIEW_SESSION_STORAGE_KEY);

    if (!savedSession) {
      return;
    }

    try {
      setInterviewSession(resumeInterviewSession(savedSession));
    } catch {
      window.localStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
    }
  }, [initialInterviewSession]);

  async function requestHumanReview() {
    setIsRequestingReview(true);
    try {
      const correlationId = `candidate_results_review_${Date.now().toString(36)}`;
      const request = await postCandidateDataWorkflow<CandidateHumanReviewRequest>({
        kind: "human_review",
        targetType: model.reviewTargetType,
        targetId: model.reviewTargetId,
        summary: "Candidate requested human review from the results page.",
        evidenceNotes: [
          "Review score meaning, confidence, missing evidence, and candidate-provided context before employer review.",
          `Readiness: ${model.readinessLabel}.`,
          `Missing evidence: ${model.missingEvidence.join("; ")}`
        ].join(" "),
        correlationId
      }, copy.reviewCreateError);

      setRequestState({
        requestId: request.humanReviewRequestId,
        auditEventId: request.auditEventId,
        status: request.status,
        requestedAt: request.requestedAt
      });
      setRequestError("");
    } catch (caught) {
      setRequestError(
        caught instanceof Error
          ? caught.message
          : copy.reviewCreateError
      );
    } finally {
      setIsRequestingReview(false);
    }
  }

  return (
    <main className="candidate-result-shell">
      <CandidateResultsReviewStyles />

      <div className="candidate-result-top">
        <CandidateProgressRail current="results" language={language} />
      </div>

      <section className="result-aftercare" aria-label={copy.controlsAria}>
        <header className="result-hero">
          <div className="result-aftercare-copy">
            <p>{model.eyebrow}</p>
            <h1>{copy.heroTitle}</h1>
            <span>{model.summary}</span>
          </div>

          <div className="result-status-panel" aria-label={copy.statusAria}>
            <span>{model.readinessLabel}</span>
            <strong>{model.consentStateLabel}</strong>
            <small>{model.consentStateDetail}</small>
          </div>
        </header>

        <section className="result-evidence-strip" aria-label={copy.evidenceAria}>
          {model.metrics.map((metric) => (
            <article key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              <small>{metric.meaning}</small>
              <p>{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="result-control-strip" aria-label={copy.actionsAria}>
          <div className="result-review-action">
            <span>{model.outcomeLabel}</span>
            <strong>{model.outcomeDetail}</strong>
            <p>{model.requestReviewDetail}</p>
            <button
              disabled={Boolean(requestState) || isRequestingReview}
              onClick={() => void requestHumanReview()}
              type="button"
            >
              {requestState
                ? copy.reviewRequested
                : isRequestingReview
                  ? copy.requesting
                  : model.requestReviewLabel}
            </button>
            {requestState ? (
              <output
                aria-live="polite"
                title={`${requestState.requestId} / ${requestState.auditEventId}`}
              >
                {copy.queued} {formatReviewDate(requestState.requestedAt)}
              </output>
            ) : null}
            {requestError ? <output className="result-error">{requestError}</output> : null}
          </div>

          <nav className="result-links" aria-label={copy.resultActionsAria}>
            {model.actions.map((action) => (
              <Link href={action.href} key={action.href} title={action.detail}>
                <strong>{action.label}</strong>
                <span>{action.detail}</span>
              </Link>
            ))}
          </nav>
        </section>

        <section className="result-detail-grid" aria-label={copy.scoreExplanationAria}>
          {model.evidenceGroups.map((group) => (
            <article className="result-detail-section" key={group.title}>
              <div className="result-section-heading">
                <h2>{group.title}</h2>
                <p>{group.summary}</p>
              </div>
              <div className="result-evidence-list">
                {group.items.map((item) => (
                  <section key={`${group.title}-${item.label}-${item.text}`}>
                    <span>{item.label}</span>
                    <p>{item.text}</p>
                    <small>{item.detail}</small>
                  </section>
                ))}
              </div>
            </article>
          ))}

          <article className="result-detail-section">
            <div className="result-section-heading">
              <h2>{copy.needsReviewTitle}</h2>
              <p>{copy.needsReviewBody}</p>
            </div>
            <ul className="result-check-list">
              {model.missingEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="result-detail-section">
            <div className="result-section-heading">
              <h2>{copy.privacyTitle}</h2>
              <p>{copy.privacyBody}</p>
            </div>
            <ul className="result-check-list">
              {model.safeguards.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}

const resultsModelTextTranslations = {
  it: {
    "Private candidate result": "Risultato privato candidato",
    "Interview evidence needs context": "L'evidenza colloquio richiede contesto",
    "Your review is ready": "La tua revisione e' pronta",
    "Finish the interview to unlock results": "Completa il colloquio per sbloccare i risultati",
    "Recommended next step": "Prossimo passo consigliato",
    "Ready for candidate review": "Pronto per revisione candidato",
    "Interview evidence needs review": "L'evidenza colloquio richiede revisione",
    "Finish the interview before review": "Completa il colloquio prima della revisione",
    "Employer cannot see this yet": "Il datore non puo ancora vederlo",
    "Request human review": "Richiedi revisione umana",
    "Data controls": "Controlli dati",
    "Continue interview": "Continua colloquio",
    "Review matches": "Rivedi match",
    "Add context": "Aggiungi contesto",
    "Resume evidence": "Evidenza CV",
    "Interview progress": "Avanzamento colloquio",
    "Interview evidence": "Evidenza colloquio",
    "Confidence": "Confidenza",
    "Evidence reviewed": "Evidenze riviste",
    "Match explanation": "Spiegazione match",
    "Interview answer evidence": "Evidenza risposta colloquio",
    "Matches pending": "Match in attesa",
    "Resume-only preview": "Anteprima solo CV",
    "Interview evidence gap": "Gap evidenza colloquio",
    "Missing evidence": "Evidenza mancante",
    "Interview support": "Supporto colloquio",
    "Remaining gap": "Gap restante",
    "Locked": "Bloccato",
    "Pending": "In attesa"
  },
  fr: {
    "Private candidate result": "Resultat prive candidat",
    "Interview evidence needs context": "Les preuves d'entretien necessitent du contexte",
    "Your review is ready": "Votre revue est prete",
    "Finish the interview to unlock results": "Terminez l'entretien pour debloquer les resultats",
    "Recommended next step": "Prochaine etape recommandee",
    "Ready for candidate review": "Pret pour revue candidat",
    "Interview evidence needs review": "Les preuves d'entretien necessitent une revue",
    "Finish the interview before review": "Terminez l'entretien avant la revue",
    "Employer cannot see this yet": "L'employeur ne peut pas encore voir cela",
    "Request human review": "Demander une revue humaine",
    "Data controls": "Controles des donnees",
    "Continue interview": "Continuer l'entretien",
    "Review matches": "Revoir les matches",
    "Add context": "Ajouter du contexte",
    "Resume evidence": "Preuves CV",
    "Interview progress": "Progression entretien",
    "Interview evidence": "Preuves d'entretien",
    "Confidence": "Confiance",
    "Evidence reviewed": "Preuves revues",
    "Match explanation": "Explication du match",
    "Interview answer evidence": "Preuve de reponse entretien",
    "Matches pending": "Matches en attente",
    "Resume-only preview": "Apercu CV seulement",
    "Interview evidence gap": "Ecart de preuve entretien",
    "Missing evidence": "Preuve manquante",
    "Interview support": "Support entretien",
    "Remaining gap": "Ecart restant",
    "Locked": "Bloque",
    "Pending": "En attente"
  }
} as const;

function localizeResultsReviewModel(
  model: CandidateResultsReviewModel,
  language?: CandidateInterviewLanguageCode
): CandidateResultsReviewModel {
  if (language !== "it" && language !== "fr") {
    return model;
  }

  return localizeStrings(model, resultsModelTextTranslations[language]) as CandidateResultsReviewModel;
}

function localizeStrings(
  value: unknown,
  translations: Readonly<Record<string, string>>
): unknown {
  if (typeof value === "string") {
    return translations[value] ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => localizeStrings(item, translations));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localizeStrings(item, translations)])
    );
  }

  return value;
}

function formatReviewDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
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

function CandidateResultsReviewStyles() {
  return (
    <style>{`
      .candidate-result-shell {
        background: linear-gradient(180deg, #ffffff 0%, #f7f8f4 100%);
        color: #111c19;
        min-height: 100dvh;
      }

      .candidate-result-top {
        left: 50%;
        max-width: min(770px, calc(100vw - 32px));
        position: fixed;
        top: 52px;
        transform: translateX(-50%);
        width: 100%;
        z-index: 5;
      }

      .result-aftercare {
        display: grid;
        gap: 28px;
        margin: 0 auto;
        max-width: 1120px;
        min-height: 100dvh;
        padding: 132px 24px 76px;
      }

      .result-hero {
        align-items: end;
        display: grid;
        gap: 24px;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      }

      .result-aftercare-copy {
        display: grid;
        gap: 9px;
        max-width: 720px;
      }

      .result-aftercare-copy p,
      .result-review-action span,
      .result-evidence-strip span,
      .result-evidence-list span,
      .result-status-panel span {
        color: #111c19;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0;
        margin: 0;
        text-transform: uppercase;
      }

      .result-aftercare-copy h1 {
        color: #111c19;
        font-size: clamp(1.55rem, 3.4vw, 3rem);
        line-height: 1.1;
        margin: 0;
      }

      .result-aftercare-copy span,
      .result-review-action output,
      .result-review-action p,
      .result-evidence-strip small,
      .result-evidence-strip p,
      .result-status-panel small,
      .result-section-heading p,
      .result-evidence-list small {
        color: #5d6965;
        line-height: 1.5;
        margin: 0;
      }

      .result-status-panel {
        background: #111c19;
        border-radius: 22px;
        color: #fffdf8;
        display: grid;
        gap: 10px;
        padding: 20px;
      }

      .result-status-panel span,
      .result-status-panel small {
        color: rgba(255, 253, 248, 0.74);
      }

      .result-status-panel strong {
        color: #ffffff;
        font-size: 1.05rem;
        line-height: 1.25;
      }

      .result-control-strip {
        align-items: stretch;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(320px, 0.92fr) minmax(0, 1fr);
      }

      .result-review-action {
        background: #f6f8f3;
        border: 1px solid rgba(17, 28, 25, 0.09);
        border-radius: 22px;
        display: grid;
        gap: 12px;
        padding: 18px;
      }

      .result-review-action strong {
        color: #111c19;
        line-height: 1.35;
      }

      .result-review-action button,
      .result-links a {
        align-items: center;
        border-radius: 999px;
        display: inline-flex;
        font: inherit;
        font-weight: 900;
        justify-content: center;
        min-height: 42px;
        padding: 10px 15px;
        transition: transform 180ms ease;
      }

      .result-review-action button {
        background: #111c19;
        border: 0;
        color: #fffdf8;
        cursor: pointer;
      }

      .result-review-action button:disabled {
        cursor: default;
        opacity: 0.68;
        width: fit-content;
      }

      .result-review-action button:hover:not(:disabled),
      .result-links a:hover {
        transform: translateY(-1px);
      }

      .result-error {
        color: #9c2f27;
        font-weight: 850;
      }

      .result-links {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .result-links a {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.13);
        border-radius: 20px;
        color: #111c19;
        display: grid;
        gap: 7px;
        justify-content: stretch;
        min-height: 100%;
        text-decoration: none;
      }

      .result-links a span {
        color: #5d6965;
        font-size: 0.8rem;
        font-weight: 700;
        line-height: 1.35;
        text-transform: none;
      }

      .result-evidence-strip {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 24px;
        display: grid;
        gap: 1px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        overflow: hidden;
      }

      .result-evidence-strip article {
        background: #ffffff;
        display: grid;
        gap: 5px;
        min-width: 0;
        padding: 18px;
      }

      .result-evidence-strip strong {
        color: #111c19;
        font-size: 1.75rem;
        line-height: 1;
      }

      .result-detail-grid {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .result-detail-section {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 24px;
        display: grid;
        gap: 16px;
        padding: 20px;
      }

      .result-detail-section:first-child {
        grid-column: 1 / -1;
      }

      .result-section-heading {
        display: grid;
        gap: 7px;
      }

      .result-section-heading h2 {
        font-size: 1.08rem;
        line-height: 1.25;
        margin: 0;
      }

      .result-evidence-list {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .result-evidence-list section {
        background: #f7f8f4;
        border-radius: 18px;
        display: grid;
        gap: 7px;
        padding: 14px;
      }

      .result-evidence-list p {
        color: #111c19;
        line-height: 1.45;
        margin: 0;
      }

      .result-check-list {
        display: grid;
        gap: 9px;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .result-check-list li {
        background: #f7f8f4;
        border-radius: 16px;
        color: #25312d;
        line-height: 1.45;
        padding: 12px 14px;
      }

      @media (max-width: 780px) {
        .candidate-result-top {
          top: 20px;
        }

        .result-hero,
        .result-control-strip,
        .result-evidence-strip,
        .result-detail-grid,
        .result-evidence-list,
        .result-links {
          grid-template-columns: 1fr;
        }

        .result-aftercare {
          padding: 132px 20px 72px;
        }
      }
    `}</style>
  );
}
