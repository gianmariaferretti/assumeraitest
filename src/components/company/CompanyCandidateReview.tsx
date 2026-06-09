"use client";

import { ArrowUpRight, Clock3, FileText, PauseCircle, XCircle } from "lucide-react";

import type { CompanyDashboardMatch } from "@/features/company-workspace";
import { useI18n, type Language } from "@/lib/i18n";

type CompanyReviewCopy = ReturnType<typeof useI18n>["t"]["companyReview"];
type ConsentCategory = "profile" | "scorecard" | "match_explanation" | "interview_transcript";

const consentCategories: readonly ConsentCategory[] = [
  "profile",
  "scorecard",
  "match_explanation",
  "interview_transcript"
];

export function CompanyCandidateReview({
  match
}: {
  readonly match: CompanyDashboardMatch;
}) {
  const { language, t } = useI18n();
  const copy = t.companyReview;
  const transcriptExcerpt = match.transcriptExcerpt;

  return (
    <main className="company-review-shell">
      <CompanyCandidateReviewStyles />
      <header className="company-review-header">
        <div>
          <p>{copy.evidenceReview}</p>
          <h1>{match.candidateName}</h1>
          <span>{match.candidateHeadline}</span>
        </div>
        <aside>
          <Clock3 aria-hidden="true" size={18} />
          <span>
            {match.reviewDueAt
              ? `${copy.reviewDue} ${formatDate(match.reviewDueAt, language)}`
              : copy.reviewDuePending}
          </span>
        </aside>
      </header>

      <section className="review-layout">
        <section className="review-main">
          <section aria-labelledby="consent-scope">
            <div className="review-section-title">
              <FileText aria-hidden="true" size={18} />
              <h2 id="consent-scope">{copy.consentScope}</h2>
            </div>
            <ul className="consent-scope-list">
              {consentCategories.map((category) => (
                <li key={category}>{copy.consentCategories[category]}</li>
              ))}
            </ul>
            <p className="media-boundary">{copy.rawCvMediaExcluded}</p>
          </section>

          <section aria-labelledby="scorecard">
            <div className="review-section-title">
              <FileText aria-hidden="true" size={18} />
              <h2 id="scorecard">{copy.scorecard}</h2>
            </div>
            <dl className="scorecard-grid">
              <div>
                <dt>{copy.matchScore}</dt>
                <dd>{match.matchScore}</dd>
              </div>
              <div>
                <dt>{copy.confidence}</dt>
                <dd>{match.matchConfidence}%</dd>
              </div>
              <div>
                <dt>{copy.contact}</dt>
                <dd>
                  {match.contactVisibility === "visible_after_advance"
                    ? copy.contactVisible
                    : copy.contactHidden}
                </dd>
              </div>
            </dl>
            <pre className="scorecard-payload">
              {JSON.stringify(match.scorecard, null, 2)}
            </pre>
          </section>

          <section aria-labelledby="explanation">
            <div className="review-section-title">
              <FileText aria-hidden="true" size={18} />
              <h2 id="explanation">{copy.matchExplanation}</h2>
            </div>
            <pre className="scorecard-payload">
              {JSON.stringify(match.matchExplanation, null, 2)}
            </pre>
          </section>

          <section aria-labelledby="transcript">
            <div className="review-section-title">
              <FileText aria-hidden="true" size={18} />
              <h2 id="transcript">{copy.transcript}</h2>
            </div>
            <div className="transcript-tabs">
              <section>
                <h3>{copy.excerpt}</h3>
                <p>{transcriptExcerpt}</p>
              </section>
              <section>
                <h3>{copy.fullTranscript}</h3>
                <p>{match.transcriptText || transcriptExcerpt}</p>
              </section>
            </div>
            <p className="media-boundary">{copy.rawMediaExcluded}</p>
          </section>

          <section aria-labelledby="review-history">
            <div className="review-section-title">
              <Clock3 aria-hidden="true" size={18} />
              <h2 id="review-history">{copy.auditHistory}</h2>
            </div>
            <dl className="audit-history-panel">
              <div>
                <dt>{copy.currentStatus}</dt>
                <dd>{formatCompanyMatchStatus(match.status, copy)}</dd>
              </div>
              <div>
                <dt>{copy.humanReviewReason}</dt>
                <dd>{match.companyDecisionReason ?? copy.noDecision}</dd>
              </div>
              <div>
                <dt>{copy.nextStep}</dt>
                <dd>{match.companyNextStep ?? copy.pending}</dd>
              </div>
              <div>
                <dt>{copy.followUp}</dt>
                <dd>
                  {match.companyFollowUpAt
                    ? formatDate(match.companyFollowUpAt, language)
                    : copy.notScheduled}
                </dd>
              </div>
            </dl>
          </section>
        </section>

        <aside className="decision-panel">
          <h2>{copy.decision}</h2>
          <p>{copy.decisionBody}</p>
          <form
            action={`/company/review/${match.matchId}/decision`}
            className="company-review-actions"
            method="post"
          >
            <label>
              {copy.reason}
              <textarea name="reason" placeholder={copy.reasonPlaceholder} rows={4} />
            </label>
            <label>
              {copy.nextStep}
              <input name="nextStep" placeholder={copy.nextStepPlaceholder} />
            </label>
            <label>
              {copy.followUpDate}
              <input name="followUpAt" type="date" />
            </label>
            <button name="action" type="submit" value="advance">
              <ArrowUpRight aria-hidden="true" size={17} />
              {copy.advance}
            </button>
            <button name="action" type="submit" value="hold">
              <PauseCircle aria-hidden="true" size={17} />
              {copy.hold}
            </button>
            <button name="action" type="submit" value="decline">
              <XCircle aria-hidden="true" size={17} />
              {copy.decline}
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function formatDate(value: string, language: Language): string {
  const localeByLanguage: Record<Language, string> = {
    en: "en",
    fr: "fr-FR",
    it: "it-IT"
  };

  return new Intl.DateTimeFormat(localeByLanguage[language], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatCompanyMatchStatus(status: string, copy: CompanyReviewCopy): string {
  if (status === "company_advanced") return copy.statuses.advanced;
  if (status === "company_hold") return copy.statuses.hold;
  if (status === "company_declined") return copy.statuses.declined;
  return copy.statuses.candidateAccepted;
}

function CompanyCandidateReviewStyles() {
  return (
    <style>{`
      .company-review-shell {
        background: #fbfbf7;
        color: #111c19;
        font-family: var(--font-geist-sans), sans-serif;
        min-height: 100dvh;
        padding: clamp(104px, 10vw, 124px) clamp(18px, 4vw, 56px) 72px;
      }

      .company-review-shell * {
        box-sizing: border-box;
      }

      .company-review-header,
      .review-layout {
        margin: 0 auto;
        max-width: 1220px;
      }

      .company-review-header {
        align-items: start;
        display: flex;
        gap: 18px;
        justify-content: space-between;
        margin-bottom: 22px;
      }

      .company-review-header p,
      .company-review-header span,
      .decision-panel p,
      .media-boundary,
      .transcript-tabs p,
      .audit-history-panel dd {
        color: #5d6965;
        line-height: 1.5;
        margin: 0;
      }

      .company-review-header > div > p {
        color: #111c19;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .company-review-header h1 {
        font-size: clamp(1.7rem, 2.8vw, 2.7rem);
        line-height: 1.06;
        margin: 5px 0;
        overflow-wrap: anywhere;
      }

      .company-review-header aside {
        align-items: center;
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 8px;
        display: inline-flex;
        gap: 8px;
        min-height: 44px;
        padding: 10px 12px;
      }

      .review-layout {
        align-items: start;
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      }

      .review-main {
        display: grid;
        gap: 14px;
      }

      .review-main > section,
      .decision-panel {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 8px;
        display: grid;
        gap: 14px;
        padding: 18px;
      }

      .review-section-title {
        align-items: center;
        display: flex;
        gap: 8px;
      }

      .review-section-title h2,
      .decision-panel h2,
      .transcript-tabs h3 {
        font-size: 1rem;
        margin: 0;
      }

      .scorecard-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin: 0;
      }

      .consent-scope-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .consent-scope-list li {
        background: #eef2e8;
        border-radius: 999px;
        color: #111c19;
        font-size: 0.78rem;
        font-weight: 900;
        padding: 7px 10px;
      }

      .scorecard-grid div {
        background: #f6f8f3;
        border-radius: 8px;
        display: grid;
        gap: 6px;
        padding: 12px;
      }

      .scorecard-grid dt,
      .scorecard-grid dd {
        margin: 0;
      }

      .scorecard-grid dt {
        color: #5d6965;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .scorecard-grid dd {
        font-weight: 900;
      }

      .scorecard-payload {
        background: #111c19;
        border-radius: 8px;
        color: #fffdf8;
        font-size: 0.78rem;
        line-height: 1.5;
        margin: 0;
        overflow: auto;
        padding: 14px;
      }

      .transcript-tabs {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .transcript-tabs section {
        background: #f6f8f3;
        border-radius: 8px;
        display: grid;
        gap: 8px;
        padding: 14px;
      }

      .media-boundary {
        font-weight: 900;
      }

      .audit-history-panel {
        display: grid;
        gap: 10px;
        margin: 0;
      }

      .audit-history-panel div {
        border-top: 1px solid rgba(17, 28, 25, 0.1);
        display: grid;
        gap: 4px;
        padding-top: 10px;
      }

      .audit-history-panel dt {
        color: #111c19;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .company-review-actions {
        display: grid;
        gap: 10px;
      }

      .company-review-actions label {
        display: grid;
        font-size: 0.82rem;
        font-weight: 900;
        gap: 7px;
      }

      .company-review-actions input,
      .company-review-actions textarea {
        background: #fbfbf7;
        border: 1px solid rgba(17, 28, 25, 0.14);
        border-radius: 8px;
        color: #111c19;
        font: inherit;
        min-height: 42px;
        padding: 10px 11px;
      }

      .company-review-actions button {
        align-items: center;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-weight: 900;
        gap: 8px;
        justify-content: center;
        min-height: 42px;
        padding: 10px 13px;
      }

      .company-review-actions button[value="advance"] {
        background: #111c19;
        color: #ffffff;
      }

      .company-review-actions button[value="hold"] {
        background: #eef2e8;
        color: #111c19;
      }

      .company-review-actions button[value="decline"] {
        background: #fff4f1;
        color: #8f2d22;
      }

      @media (max-width: 900px) {
        .company-review-header,
        .review-layout,
        .transcript-tabs,
        .scorecard-grid {
          align-items: start;
          display: grid;
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
