"use client";

import { ArrowRight, Building2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";

export type CompanyOnboardingProfile = {
  readonly companyName: string;
  readonly website: string;
  readonly domain: string;
  readonly hiringLocations: string;
  readonly teamSize: string;
  readonly primaryContactName: string;
  readonly primaryContactEmail: string;
};

export function CompanyOnboarding({
  errorCode,
  profile
}: {
  readonly errorCode?: string;
  readonly profile: CompanyOnboardingProfile;
}) {
  const { t } = useI18n();
  const copy = t.companyOnboarding;
  const error = getOnboardingError(errorCode, copy);

  return (
    <main className="company-onboarding-shell">
      <CompanyOnboardingStyles />
      <header className="company-onboarding-header">
        <div>
          <p>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <span>{copy.body}</span>
        </div>
        <Building2 aria-hidden="true" size={22} />
      </header>

      <form action="/company/onboarding/submit" className="company-onboarding-form" method="post">
        {error ? <p className="company-form-error">{error}</p> : null}
        <section aria-labelledby="company-profile">
          <h2 id="company-profile">{copy.companyProfile}</h2>
          <label>
            {copy.companyName}
            <input defaultValue={profile.companyName} name="company_name" required />
          </label>
          <label>
            {copy.website}
            <input
              defaultValue={profile.website}
              name="website"
              placeholder={copy.websitePlaceholder}
              type="url"
              required
            />
          </label>
          <label>
            {copy.domain}
            <input
              defaultValue={profile.domain}
              name="domain"
              placeholder={copy.domainPlaceholder}
            />
            <span className="company-field-help">{copy.domainHelp}</span>
          </label>
          <label>
            {copy.hiringLocations}
            <textarea
              defaultValue={profile.hiringLocations}
              name="hiring_locations"
              placeholder={copy.hiringLocationsPlaceholder}
              required
              rows={3}
            />
          </label>
          <label>
            {copy.teamSize}
            <select defaultValue={profile.teamSize} name="team_size" required>
              <option value="">{copy.selectTeamSize}</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-1000">201-1000</option>
              <option value="1000+">1000+</option>
            </select>
          </label>
        </section>

        <section aria-labelledby="primary-contact">
          <h2 id="primary-contact">{copy.primaryContact}</h2>
          <label>
            {copy.contactName}
            <input defaultValue={profile.primaryContactName} name="primary_contact.name" required />
          </label>
          <label>
            {copy.contactEmail}
            <input
              defaultValue={profile.primaryContactEmail}
              name="primary_contact.email"
              required
              type="email"
            />
          </label>
        </section>

        <div className="company-onboarding-submit">
          <button type="submit">
            {copy.submit}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </div>
      </form>
    </main>
  );
}

function getOnboardingError(
  errorCode: string | undefined,
  copy: ReturnType<typeof useI18n>["t"]["companyOnboarding"]
): string | undefined {
  if (!errorCode) return undefined;
  if (errorCode === "missing_required_fields") return copy.errors.missing_required_fields;
  if (errorCode === "save_failed") return copy.errors.save_failed;
  if (errorCode.startsWith("company_onboarding.")) return copy.errors.missing_required_fields;
  return copy.errors.default;
}

function CompanyOnboardingStyles() {
  return (
    <style>{`
      .company-onboarding-shell {
        background: #fbfbf7;
        color: #111c19;
        font-family: var(--font-geist-sans), sans-serif;
        min-height: 100dvh;
        padding: clamp(104px, 10vw, 124px) clamp(18px, 4vw, 56px) 72px;
      }

      .company-onboarding-shell * {
        box-sizing: border-box;
      }

      .company-onboarding-header,
      .company-onboarding-form {
        margin: 0 auto;
        max-width: 920px;
      }

      .company-onboarding-header {
        align-items: start;
        display: flex;
        gap: 18px;
        justify-content: space-between;
        margin-bottom: 22px;
      }

      .company-onboarding-header p {
        color: #111c19;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0;
        margin: 0;
        text-transform: uppercase;
      }

      .company-onboarding-header h1 {
        font-size: clamp(1.7rem, 2.8vw, 2.7rem);
        line-height: 1.06;
        margin: 5px 0;
        overflow-wrap: anywhere;
      }

      .company-onboarding-header span,
      .company-field-help,
      .company-form-error {
        color: #5d6965;
        line-height: 1.5;
        margin: 0;
      }

      .company-field-help {
        font-size: 0.76rem;
        font-weight: 700;
      }

      .company-onboarding-form {
        display: grid;
        gap: 14px;
      }

      .company-onboarding-form section {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 8px;
        display: grid;
        gap: 14px;
        padding: 18px;
      }

      .company-onboarding-form h2 {
        font-size: 1rem;
        margin: 0;
      }

      .company-onboarding-form label {
        display: grid;
        font-size: 0.82rem;
        font-weight: 900;
        gap: 7px;
      }

      .company-onboarding-form input,
      .company-onboarding-form select,
      .company-onboarding-form textarea {
        background: #fbfbf7;
        border: 1px solid rgba(17, 28, 25, 0.14);
        border-radius: 8px;
        color: #111c19;
        font: inherit;
        min-height: 42px;
        padding: 10px 11px;
      }

      .company-form-error {
        background: #fff4f1;
        border: 1px solid rgba(143, 45, 34, 0.2);
        border-radius: 8px;
        color: #8f2d22;
        font-weight: 850;
        padding: 12px 14px;
      }

      .company-onboarding-submit {
        display: flex;
        justify-content: end;
      }

      .company-onboarding-submit button {
        align-items: center;
        background: #111c19;
        border: 0;
        border-radius: 999px;
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-weight: 900;
        gap: 8px;
        justify-content: center;
        min-height: 44px;
        padding: 10px 16px;
      }

      @media (max-width: 760px) {
        .company-onboarding-header {
          align-items: start;
          display: grid;
        }
      }
    `}</style>
  );
}
