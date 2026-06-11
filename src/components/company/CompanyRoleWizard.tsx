"use client";

import { ArrowRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";

type CompanyRoleWizardCopy = ReturnType<typeof useI18n>["t"]["companyRoleWizard"];

export function CompanyRoleWizard({
  errorCode
}: {
  readonly errorCode?: string;
}) {
  const { t } = useI18n();
  const copy = t.companyRoleWizard;
  const error = getRoleWizardError(errorCode, copy);

  return (
    <main className="role-wizard-shell">
      <CompanyRoleWizardStyles />
      <header className="role-wizard-header">
        <div>
          <p>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
        </div>
      </header>

      <form action="/company/roles/create" className="role-wizard-form" method="post">
        {error ? <p className="role-form-error">{error}</p> : null}
        <section aria-labelledby="role-basics">
          <h2 id="role-basics">{copy.basics}</h2>
          <label>
            {copy.roleTitle}
            <input name="title" placeholder={copy.roleTitlePlaceholder} required />
          </label>
          <label>
            {copy.locationConstraints}
            <input
              name="location_constraints"
              placeholder={copy.locationConstraintsPlaceholder}
              required
            />
          </label>
          <label>
            {copy.workModes}
            <input name="work_modes" placeholder={copy.workModesPlaceholder} required />
          </label>
        </section>

        <section aria-labelledby="role-requirements">
          <h2 id="role-requirements">{copy.requirements}</h2>
          <label>
            {copy.requiredSkills}
            <textarea
              name="requirements.required_skills"
              placeholder={copy.requiredSkillsPlaceholder}
              required
              rows={4}
            />
          </label>
          <label>
            {copy.niceToHaveSkills}
            <textarea
              name="requirements.nice_to_have_skills"
              placeholder={copy.niceToHaveSkillsPlaceholder}
              rows={4}
            />
          </label>
          <label>
            {copy.hardGates}
            <textarea
              name="requirements.hard_gates"
              placeholder={copy.hardGatesPlaceholder}
              rows={3}
            />
          </label>
        </section>

        <section aria-labelledby="daily-work">
          <h2 id="daily-work">{copy.dailyWork}</h2>
          <div className="role-form-grid">
            <label>
              {copy.clientFacingPercentage}
              <input
                max={100}
                min={0}
                name="daily_work_reality.client_facing_percentage"
                required
                type="number"
              />
            </label>
            <label>
              {copy.meetingLoad}
              <select name="daily_work_reality.meeting_load" required>
                <option value="medium">{copy.options.medium}</option>
                <option value="low">{copy.options.low}</option>
                <option value="high">{copy.options.high}</option>
              </select>
            </label>
            <label>
              {copy.deliveryPace}
              <select name="daily_work_reality.delivery_pace" required>
                <option value="steady">{copy.options.steady}</option>
                <option value="fast">{copy.options.fast}</option>
                <option value="variable">{copy.options.variable}</option>
              </select>
            </label>
            <label>
              {copy.travel}
              <select name="daily_work_reality.travel_required">
                <option value="none">{copy.options.none}</option>
                <option value="occasional">{copy.options.occasional}</option>
                <option value="frequent">{copy.options.frequent}</option>
              </select>
            </label>
            <label>
              {copy.teamPattern}
              <select name="daily_work_reality.solo_vs_team_work">
                <option value="mixed">{copy.options.mixed}</option>
                <option value="mostly_team">{copy.options.mostlyTeam}</option>
                <option value="mostly_solo">{copy.options.mostlySolo}</option>
              </select>
            </label>
            <label>
              {copy.ambiguityLevel}
              <select name="daily_work_reality.ambiguity_level">
                <option value="medium">{copy.options.medium}</option>
                <option value="low">{copy.options.low}</option>
                <option value="high">{copy.options.high}</option>
              </select>
            </label>
          </div>
        </section>

        <section aria-labelledby="calibration">
          <h2 id="calibration">{copy.calibration}</h2>
          <label>
            {copy.requiredEvidence}
            <textarea
              name="calibration.required_evidence"
              placeholder={copy.requiredEvidencePlaceholder}
              rows={3}
            />
          </label>
          <label>
            {copy.interviewModules}
            <input
              name="calibration.interview_modules"
              placeholder={copy.interviewModulesPlaceholder}
            />
          </label>
        </section>

        <section aria-labelledby="work-style-key-title" className="role-wizard-section">
          <h2 id="work-style-key-title">Work-style expectations (optional)</h2>
          <p>
            Position your team on each dimension (-100 .. 100) and anchor it
            with a concrete statement in your own words. Neither pole is
            better: candidates are compared against YOUR declared expectations
            at match time — values alignment on declared work-style
            dimensions, never a personality judgment.
          </p>
          {(
            [
              ["autonomy_escalation", "Decides autonomously (-100) ↔ Escalates for alignment (+100)"],
              ["speed_thoroughness", "Ships fast (-100) ↔ Verifies thoroughly (+100)"],
              ["individual_collaboration", "Individual drive (-100) ↔ Collaborates first (+100)"],
              ["risk_caution", "Tolerates risk (-100) ↔ Prefers caution (+100)"],
              ["structure_improvisation", "Follows structure (-100) ↔ Improvises (+100)"]
            ] as const
          ).map(([dimension, label]) => (
            <fieldset key={dimension}>
              <legend>{label}</legend>
              <label>
                Position
                <input
                  max={100}
                  min={-100}
                  name={`work_style.${dimension}.position`}
                  step={10}
                  type="number"
                />
              </label>
              <label>
                In your words (e.g. &quot;here, you&apos;d ship and document&quot;)
                <input
                  maxLength={300}
                  name={`work_style.${dimension}.statement`}
                  placeholder="Concrete behavioral statement"
                />
              </label>
            </fieldset>
          ))}
        </section>

        <div className="role-submit-row">
          <button type="submit">
            {copy.submit}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </div>
      </form>
    </main>
  );
}

function getRoleWizardError(
  errorCode: string | undefined,
  copy: CompanyRoleWizardCopy
): string | undefined {
  return errorCode ? copy.errorDefault : undefined;
}

function CompanyRoleWizardStyles() {
  return (
    <style>{`
      .role-wizard-shell {
        background: #fbfbf7;
        color: #111c19;
        font-family: var(--font-geist-sans), sans-serif;
        min-height: 100dvh;
        padding: clamp(104px, 10vw, 124px) clamp(18px, 4vw, 56px) 72px;
      }

      .role-wizard-shell * {
        box-sizing: border-box;
      }

      .role-wizard-header,
      .role-wizard-form {
        margin: 0 auto;
        max-width: 980px;
      }

      .role-wizard-header {
        align-items: start;
        display: flex;
        gap: 18px;
        justify-content: space-between;
        margin-bottom: 22px;
      }

      .role-wizard-header p,
      .role-form-error {
        color: #5d6965;
        line-height: 1.45;
        margin: 0;
      }

      .role-wizard-header p {
        color: #111c19;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .role-wizard-header h1 {
        font-size: clamp(1.7rem, 2.8vw, 2.7rem);
        line-height: 1.06;
        margin: 5px 0 0;
        overflow-wrap: anywhere;
      }

      .role-wizard-form {
        display: grid;
        gap: 14px;
      }

      .role-wizard-form section {
        background: #ffffff;
        border: 1px solid rgba(17, 28, 25, 0.1);
        border-radius: 8px;
        display: grid;
        gap: 14px;
        padding: 18px;
      }

      .role-form-error {
        background: #fff4f1;
        border: 1px solid rgba(143, 45, 34, 0.2);
        border-radius: 8px;
        color: #8f2d22;
        font-weight: 850;
        padding: 12px 14px;
      }

      .role-wizard-form h2 {
        font-size: 1rem;
        margin: 0;
      }

      .role-wizard-form label {
        color: #111c19;
        display: grid;
        font-size: 0.82rem;
        font-weight: 900;
        gap: 7px;
      }

      .role-wizard-form input,
      .role-wizard-form select,
      .role-wizard-form textarea {
        background: #fbfbf7;
        border: 1px solid rgba(17, 28, 25, 0.14);
        border-radius: 8px;
        color: #111c19;
        font: inherit;
        min-height: 42px;
        padding: 10px 11px;
      }

      .role-form-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .role-submit-row {
        display: flex;
        justify-content: end;
      }

      .role-submit-row button {
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
        .role-wizard-header {
          align-items: start;
          display: grid;
        }

        .role-form-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
