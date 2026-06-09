import Link from "next/link";
import { cookies } from "next/headers";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import { CandidateProfilePreferenceFields } from "@/components/candidate/CandidateProfilePreferenceFields";
import {
  formatProfileReviewConfidence,
  isMinimalProfileReviewRequiredField,
  selectMinimalProfileReviewGroups,
  type MinimalProfileReviewField,
  type MinimalProfileReviewGroup
} from "@/components/candidate/minimal-profile-review-fields";
import { candidateResumeProfilePipeline } from "@/features/candidate-flow";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  resolveCandidateInterviewLanguageCode,
  resolveExplicitCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "@/features/interview-flow";
import {
  resolveCandidateFlowCopy,
  type CandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import {
  buildTargetRolePreferenceOptions,
  workSetupOptions
} from "@/features/occupations";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { readResumePipelineSession } from "@/features/candidate-persistence/supabase-candidate-store";

interface CandidateProfileConfirmPageProps {
  readonly searchParams: Promise<{
    readonly resumeDocumentId?: string;
    readonly profileError?: string;
    readonly language?: string;
  }>;
}

export const metadata = {
  title: "Confirm Profile | AssumerAI",
  description: "Candidate profile confirmation before scoring."
};

export default async function CandidateProfileConfirmPage({
  searchParams
}: CandidateProfileConfirmPageProps) {
  const { language, profileError, resumeDocumentId } = await searchParams;
  const cookieStore = await cookies();
  const activeInterviewLanguage = resolveCandidateInterviewLanguageCode(
    resolveExplicitCandidateInterviewLanguageCode(language) ??
      cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value
  );
  const copy = resolveCandidateFlowCopy(activeInterviewLanguage);
  const activeResumeDocumentId = resolveProfileReviewResumeDocumentId({
    cookieResumeDocumentId: cookieStore.get("assumerai_resume_document_id")?.value,
    searchResumeDocumentId: resumeDocumentId
  });
  let review = activeResumeDocumentId
    ? candidateResumeProfilePipeline.getProfileReview(activeResumeDocumentId)
    : undefined;
  if (!review && activeResumeDocumentId) {
    const candidateContext = await resolveCandidateRouteContext();
    if (!isCandidateContextError(candidateContext)) {
      const restoredSession = await readResumePipelineSession(
        candidateContext,
        activeResumeDocumentId
      );

      if (restoredSession) {
        candidateResumeProfilePipeline.restore(restoredSession);
        review = candidateResumeProfilePipeline.getProfileReview(activeResumeDocumentId);
      }
    }
  }

  if (!review) {
    return (
      <main className="confirm-layout-root">
        <CandidateConfirmPageStyles />
        <div className="confirm-top-bar">
          <CandidateProgressRail current="profile" language={activeInterviewLanguage} />
        </div>
        <section className="confirm-empty-panel">
          <p className="confirm-eyebrow">{copy.profileConfirm.empty.eyebrow}</p>
          <h1 className="confirm-title" style={{ fontSize: "2rem" }}>
            {copy.profileConfirm.empty.title}
          </h1>
          <p className="confirm-body-text">
            {copy.profileConfirm.empty.body}
          </p>
          <Link href="/candidate/resume" className="confirm-primary-link">
            {copy.profileConfirm.empty.uploadResume}
          </Link>
        </section>
      </main>
    );
  }

  const reviewGroups = selectMinimalProfileReviewGroups(review.reviewFields, activeInterviewLanguage);
  const targetRoleOptions = buildTargetRolePreferenceOptions(review.profile);
  const contactGroup = reviewGroups.find((group) => group.id === "contact");
  const preferencesGroup = reviewGroups.find((group) => group.id === "preferences");
  const targetRoleField = findGroupField(preferencesGroup, "preferences.target_roles");
  const locationField = findGroupField(preferencesGroup, "preferences.locations");
  const workModeField = findGroupField(preferencesGroup, "preferences.work_modes");
  const optionalGroups = reviewGroups.filter(
    (group) => group.id !== "contact" && group.id !== "preferences"
  );
  const parserConfidenceLabel = formatProfileReviewConfidence(
    review.scoreReadiness.parser_confidence,
    activeInterviewLanguage
  );

  return (
    <main className="confirm-layout-root">
      <CandidateConfirmPageStyles />
      <div className="confirm-top-bar">
        <CandidateProgressRail current="profile" language={activeInterviewLanguage} />
      </div>

      <header className="confirm-header">
        <div className="confirm-step-badge">{copy.profileConfirm.header.stepBadge}</div>
        <p className="confirm-eyebrow">{copy.profileConfirm.header.eyebrow}</p>
        <h1 className="confirm-title">{copy.profileConfirm.header.title}</h1>
        <p className="confirm-body-text">
          {copy.profileConfirm.header.body}
        </p>
      </header>

      <section className="confirm-info-banner" aria-label={copy.profileConfirm.infoBannerAria}>
        <div className="confirm-info-banner-item">
          <span className="confirm-info-banner-label">{copy.profileConfirm.parserConfidence}</span>
          <span className={`confirm-metric-value ${
            review.scoreReadiness.parser_confidence >= 80
              ? 'confirm-metric-high'
              : review.scoreReadiness.parser_confidence >= 50
                ? 'confirm-metric-medium'
                : 'confirm-metric-low'
          }`}>
            {parserConfidenceLabel}
          </span>
        </div>
        <div className="confirm-info-banner-divider" />
        <div className="confirm-info-banner-item privacy-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="confirm-privacy-icon-small">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>{copy.profileConfirm.privacyStatus}</span>
        </div>
      </section>

      {profileError ? (
        <section className="confirm-error-panel" aria-label={copy.profileConfirm.errorAria}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{profileError}</span>
        </section>
      ) : null}

      <form id="profile-confirm-form" action="/candidate/profile/confirm/action" method="post" className="confirm-form">
        <input name="resumeDocumentId" type="hidden" value={review.resumeDocumentId} />

        <div className="confirm-required-stack">
          {contactGroup ? renderContactGroup(contactGroup, copy, activeInterviewLanguage) : null}
          {targetRoleField && locationField && workModeField ? (
            <CandidateProfilePreferenceFields
              language={activeInterviewLanguage}
              locationField={locationField}
              targetRoleField={targetRoleField}
              targetRoleOptions={targetRoleOptions}
              workModeField={workModeField}
              workSetupOptions={workSetupOptions}
            />
          ) : preferencesGroup ? (
            renderEditableGroup(preferencesGroup, copy, activeInterviewLanguage, { open: true })
          ) : null}
        </div>

        {optionalGroups.length > 0 ? (
          <section className="confirm-optional-section" aria-labelledby="optional-review-title">
            <div className="confirm-optional-header">
              <p className="confirm-eyebrow">{copy.profileConfirm.optional.eyebrow}</p>
              <h2 id="optional-review-title" className="confirm-section-title">
                {copy.profileConfirm.optional.title}
              </h2>
              <p className="confirm-body-text">
                {copy.profileConfirm.optional.description}
              </p>
            </div>
            <div className="confirm-optional-stack">
              {optionalGroups.map((group) =>
                renderEditableGroup(group, copy, activeInterviewLanguage)
              )}
            </div>
          </section>
        ) : null}

        <div className="confirm-submit-block">
          <p className="confirm-confirmation-note">
            {copy.profileConfirm.submitNote}
          </p>
          <button className="confirm-button" type="submit">
            {copy.profileConfirm.submitLabel}
          </button>
        </div>
      </form>
    </main>
  );
}

function resolveProfileReviewResumeDocumentId({
  cookieResumeDocumentId,
  searchResumeDocumentId
}: {
  readonly cookieResumeDocumentId: string | undefined;
  readonly searchResumeDocumentId: string | undefined;
}): string | undefined {
  return (
    normalizeResumeDocumentId(searchResumeDocumentId) ??
    normalizeResumeDocumentId(cookieResumeDocumentId)
  );
}

function normalizeResumeDocumentId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function renderContactGroup(
  group: MinimalProfileReviewGroup,
  copy: CandidateFlowCopy,
  language: CandidateInterviewLanguageCode
) {
  return (
    <section className="confirm-panel" aria-labelledby="profile-review-contact">
      <div className="confirm-group-header">
        <p className="confirm-kicker">{copy.profileConfirm.contact.kicker}</p>
        <h2 id="profile-review-contact" className="confirm-group-title">
          {copy.profileConfirm.contact.title}
        </h2>
        <p className="confirm-group-description">
          {copy.profileConfirm.contact.description}
        </p>
      </div>
      <div className="confirm-group-fields">
        {group.fields.map((field) => (
          <div
            key={field.field_path}
            className={field.field_path === "contact.location" ? "confirm-full-width-field" : ""}
          >
            {renderReviewField(field, copy, language)}
          </div>
        ))}
      </div>
    </section>
  );
}

function renderEditableGroup(
  group: MinimalProfileReviewGroup,
  copy: CandidateFlowCopy,
  language: CandidateInterviewLanguageCode,
  options: { readonly open?: boolean } = {}
) {
  return (
    <details
      key={group.id}
      open={options.open}
      className="confirm-accordion-panel"
    >
      <summary className="confirm-accordion-summary">
        <span className="confirm-accordion-summary-content">
          <strong className="confirm-accordion-title">{group.title}</strong>
          <span className="confirm-accordion-description">{group.description}</span>
        </span>
        <div className="confirm-accordion-meta">
          <span className="confirm-accordion-count">{group.fields.length}</span>
          <span className="confirm-accordion-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </div>
      </summary>
      <div className="confirm-accordion-body">
        <div className="confirm-group-fields">
          {group.fields.map((field) => (
            <div
              key={field.field_path}
              className={isFullWidthReviewField(field) ? "confirm-full-width-field" : ""}
            >
              {renderReviewField(field, copy, language)}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function findGroupField(
  group: MinimalProfileReviewGroup | undefined,
  fieldPath: string
): MinimalProfileReviewField | undefined {
  return group?.fields.find((field) => field.field_path === fieldPath);
}

function isFullWidthReviewField(field: MinimalProfileReviewField): boolean {
  return field.input_kind === "textarea" || field.input_kind === "csv";
}

function ConfidenceBadge({
  confidence,
  language
}: {
  readonly confidence: number | null;
  readonly language: CandidateInterviewLanguageCode;
}) {
  const label = formatProfileReviewConfidence(confidence, language);
  let badgeClass = "confirm-confidence-review";

  if (confidence !== null && Number.isFinite(confidence)) {
    const normalized = confidence > 0 && confidence <= 1 ? confidence * 100 : confidence;
    if (normalized >= 80) {
      badgeClass = "confirm-confidence-high";
    } else {
      badgeClass = "confirm-confidence-check";
    }
  }

  return (
    <span className={`confirm-confidence-badge ${badgeClass}`}>
      {label}
    </span>
  );
}

function renderReviewField(
  field: MinimalProfileReviewField,
  copy: CandidateFlowCopy,
  language: CandidateInterviewLanguageCode
) {
  const isTextarea = field.input_kind === "textarea";
  const isRequired = isMinimalProfileReviewRequiredField(field.field_path);
  const inputType = field.field_path === "contact.email" ? "email" : "text";

  return (
    <label
      htmlFor={field.field_path}
      className={`confirm-label ${isTextarea ? "confirm-full-width-field" : ""}`}
    >
      <span className="confirm-label-row">
        <span className="confirm-label-title">
          {field.label}
          {isRequired ? (
            <span className="confirm-required-badge">
              {copy.profileConfirm.requiredBadge}
            </span>
          ) : null}
        </span>
        <ConfidenceBadge confidence={field.confidence} language={language} />
      </span>
      {isTextarea ? (
        <textarea
          defaultValue={field.value}
          id={field.field_path}
          name={field.field_path}
          rows={4}
          className="confirm-textarea"
        />
      ) : (
        <input
          defaultValue={field.value}
          id={field.field_path}
          name={field.field_path}
          required={isRequired}
          className="confirm-input"
          type={inputType}
        />
      )}
      {field.input_kind === "csv" ? (
        <small className="confirm-field-hint">{copy.profileConfirm.csvHint}</small>
      ) : null}
    </label>
  );
}

function CandidateConfirmPageStyles() {
  return (
    <style>{`
      .confirm-layout-root {
        background: #ffffff;
        color: #111c19;
        margin: 0 auto;
        max-width: 720px;
        min-height: 100dvh;
        padding: 2rem 1.25rem 3.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .confirm-top-bar {
        width: 100%;
      }

      .confirm-header {
        display: grid;
        gap: 0.4rem;
        margin-bottom: 0.25rem;
      }

      .confirm-step-badge {
        background: var(--candidate-surface-warm);
        border: 1px solid rgba(17, 28, 25, 0.08);
        border-radius: 999px;
        color: var(--candidate-ink);
        font-size: 0.72rem;
        font-weight: 850;
        padding: 0.25rem 0.65rem;
        width: fit-content;
        letter-spacing: 0.02em;
      }

      .confirm-eyebrow {
        color: var(--candidate-muted);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin: 0;
        text-transform: uppercase;
      }

      .confirm-title {
        font-size: 1.8rem;
        line-height: 1.15;
        margin: 0;
        font-weight: 850;
        letter-spacing: -0.02em;
        color: var(--candidate-ink);
      }

      .confirm-body-text {
        color: var(--candidate-muted);
        line-height: 1.5;
        font-size: 0.88rem;
        margin: 0;
      }

      .confirm-info-banner {
        background: var(--candidate-surface-soft);
        border: 1px solid var(--candidate-line);
        border-radius: 12px;
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .confirm-info-banner-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        font-weight: 750;
        color: var(--candidate-ink);
      }

      .confirm-info-banner-item.privacy-info {
        color: var(--candidate-muted);
        font-weight: 500;
      }

      .confirm-info-banner-label {
        color: var(--candidate-muted);
        font-weight: 600;
      }

      .confirm-info-banner-divider {
        width: 1px;
        height: 14px;
        background: var(--candidate-line);
      }

      .confirm-privacy-icon-small {
        color: var(--candidate-muted);
        flex-shrink: 0;
      }

      .confirm-error-panel {
        background: #fff3ef;
        border: 1px solid rgba(156, 47, 39, 0.2);
        border-radius: 10px;
        color: #9c2f27;
        font-weight: 750;
        line-height: 1.4;
        padding: 0.8rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.88rem;
      }

      .confirm-form {
        display: grid;
        gap: 1.25rem;
      }

      .confirm-required-stack {
        display: grid;
        gap: 1.25rem;
      }

      /* Panel cards */
      .confirm-panel {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line);
        border-radius: var(--candidate-radius-surface);
        box-shadow: var(--candidate-shadow-surface);
        display: grid;
        gap: 1.25rem;
        padding: 1.25rem;
        transition: border-color var(--candidate-motion-standard);
      }

      .confirm-panel:hover {
        border-color: var(--candidate-line-strong);
      }

      .confirm-group-header {
        display: grid;
        gap: 0.25rem;
      }

      .confirm-kicker {
        color: var(--candidate-muted);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin: 0;
        text-transform: uppercase;
      }

      .confirm-group-title {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.01em;
      }

      .confirm-group-description {
        color: var(--candidate-muted);
        line-height: 1.45;
        font-size: 0.88rem;
        margin: 0;
      }

      .confirm-group-fields {
        display: grid;
        gap: 0.85rem 1rem;
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      }

      .confirm-full-width-field {
        grid-column: 1 / -1;
      }

      /* Forms and labels */
      .confirm-label {
        color: var(--candidate-ink);
        display: grid;
        font-weight: 750;
        gap: 0.35rem;
        font-size: 0.88rem;
      }

      .confirm-label-row {
        align-items: center;
        display: flex;
        gap: 0.5rem;
        justify-content: space-between;
      }

      .confirm-label-title {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }

      .confirm-required-badge {
        background: var(--candidate-surface-warm);
        border: 1px solid rgba(17, 28, 25, 0.08);
        border-radius: 999px;
        color: var(--candidate-ink);
        font-size: 0.6rem;
        font-weight: 900;
        padding: 0.1rem 0.4rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* Input controls */
      .confirm-input {
        background: var(--candidate-surface-soft);
        border: 1px solid var(--candidate-line);
        border-radius: 10px;
        color: var(--candidate-ink);
        font: inherit;
        font-size: 0.88rem;
        padding: 0.7rem 0.9rem;
        width: 100%;
        transition: all var(--candidate-motion-standard);
      }

      .confirm-input:focus {
        background: var(--candidate-surface);
        border-color: var(--candidate-ink);
        box-shadow: 0 0 0 4px rgba(17, 28, 25, 0.06);
        outline: none;
      }

      .confirm-textarea {
        background: var(--candidate-surface-soft);
        border: 1px solid var(--candidate-line);
        border-radius: 10px;
        color: var(--candidate-ink);
        font: inherit;
        font-size: 0.88rem;
        line-height: 1.45;
        padding: 0.7rem 0.9rem;
        width: 100%;
        resize: vertical;
        transition: all var(--candidate-motion-standard);
      }

      .confirm-textarea:focus {
        background: var(--candidate-surface);
        border-color: var(--candidate-ink);
        box-shadow: 0 0 0 4px rgba(17, 28, 25, 0.06);
        outline: none;
      }

      .confirm-field-hint {
        color: var(--candidate-muted);
        font-size: 0.76rem;
        font-weight: 500;
        margin-top: 0.1rem;
      }

      /* Accordions details summary */
      .confirm-accordion-panel {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line);
        border-radius: var(--candidate-radius-inner);
        margin-bottom: 0.5rem;
        overflow: hidden;
        transition: all var(--candidate-motion-standard);
      }

      .confirm-accordion-panel:hover {
        border-color: var(--candidate-line-strong);
      }

      .confirm-accordion-panel[open] {
        border-color: var(--candidate-ink);
        box-shadow: var(--candidate-shadow-surface);
      }

      .confirm-accordion-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.25rem;
        cursor: pointer;
        user-select: none;
        transition: background var(--candidate-motion-standard);
      }

      .confirm-accordion-summary::-webkit-details-marker {
        display: none;
      }

      .confirm-accordion-summary:hover {
        background: var(--candidate-surface-soft);
      }

      .confirm-accordion-summary-content {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        padding-right: 1rem;
      }

      .confirm-accordion-title {
        font-size: 1rem;
        font-weight: 800;
        color: var(--candidate-ink);
      }

      .confirm-accordion-description {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--candidate-muted);
        line-height: 1.35;
      }

      .confirm-accordion-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      .confirm-accordion-count {
        background: var(--candidate-surface-soft);
        color: var(--candidate-muted);
        font-size: 0.7rem;
        font-weight: 850;
        padding: 0.15rem 0.45rem;
        border-radius: 99px;
        border: 1px solid var(--candidate-line);
      }

      .confirm-accordion-chevron {
        width: 16px;
        height: 16px;
        color: var(--candidate-muted);
        transition: transform var(--candidate-motion-standard);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .confirm-accordion-panel[open] .confirm-accordion-chevron {
        transform: rotate(180deg);
        color: var(--candidate-ink);
      }

      .confirm-accordion-body {
        padding: 1.25rem;
        border-top: 1px solid var(--candidate-line);
        background: #fafbfa;
      }

      .confirm-optional-section {
        display: grid;
        gap: 0.85rem;
        border-top: 1px solid var(--candidate-line);
        padding-top: 1.25rem;
      }

      .confirm-optional-header {
        display: grid;
        gap: 0.25rem;
        padding: 0.15rem 0;
      }

      .confirm-section-title {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.015em;
      }

      .confirm-optional-stack {
        display: grid;
        gap: 0.4rem;
      }

      /* Submit block */
      .confirm-submit-block {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line-strong);
        border-radius: 16px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        box-shadow: var(--candidate-shadow-surface);
        margin-top: 0.5rem;
      }

      .confirm-confirmation-note {
        color: var(--candidate-muted);
        font-size: 0.8rem;
        line-height: 1.45;
        margin: 0;
      }

      .confirm-button {
        background: var(--candidate-ink);
        color: #ffffff;
        border: 0;
        border-radius: 10px;
        cursor: pointer;
        font-size: 0.94rem;
        font-weight: 850;
        padding: 0.85rem 1.25rem;
        text-align: center;
        transition: all var(--candidate-motion-standard);
        width: 100%;
        box-shadow: 0 4px 12px rgba(17, 28, 25, 0.08);
      }

      .confirm-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(17, 28, 25, 0.12);
        background: #000000;
      }

      .confirm-button:active {
        transform: translateY(0);
      }

      /* Empty panel */
      .confirm-empty-panel {
        background: var(--candidate-surface);
        border: 1px solid var(--candidate-line);
        border-radius: var(--candidate-radius-surface);
        box-shadow: var(--candidate-shadow-surface);
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        padding: 2rem;
        max-width: 30rem;
        margin: 3rem auto;
        align-items: center;
        text-align: center;
      }

      .confirm-primary-link {
        background: var(--candidate-ink);
        border-radius: 10px;
        color: #ffffff;
        font-weight: 850;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
        transition: all var(--candidate-motion-standard);
        box-shadow: 0 4px 12px rgba(17, 28, 25, 0.08);
        font-size: 0.9rem;
      }

      .confirm-primary-link:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(17, 28, 25, 0.12);
      }

      /* Dynamic confidence colors inside forms */
      .confirm-confidence-badge {
        font-size: 0.7rem;
        font-weight: 850;
        padding: 0.15rem 0.45rem;
        border-radius: 99px;
        letter-spacing: 0.02em;
      }

      .confirm-confidence-high {
        background: #e6f4ea;
        color: #137333;
        border: 1px solid rgba(19, 115, 51, 0.12);
      }

      .confirm-confidence-check {
        background: #fef7e0;
        color: #b06000;
        border: 1px solid rgba(176, 96, 0, 0.12);
      }

      .confirm-confidence-review {
        background: #e8f0fe;
        color: #1a73e8;
        border: 1px solid rgba(26, 115, 232, 0.12);
      }
    `}</style>
  );
}
