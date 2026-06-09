import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import {
  INTERVIEW_AI_DISCLOSURE_VERSION,
  interviewDisclosureFieldNames
} from "@/features/candidate-flow";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  CANDIDATE_INTERVIEW_LANGUAGE_FIELD,
  resolveCandidateInterviewLanguageCode
} from "@/features/interview-flow";
import { resolveCandidateFlowCopy } from "@/features/interview-flow/candidate-flow-copy";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { readCandidateProgress } from "@/features/candidate-persistence/supabase-candidate-store";

export const metadata = {
  title: "Prepare For Interview | AssumerAI",
  description: "Candidate interview preparation before the adaptive text interview."
};

export default async function CandidateInterviewPreparePage() {
  const cookieStore = await cookies();
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    redirect(
      candidateContext.status === 401
        ? "/login?next=/candidate/interview/prepare"
        : "/candidate?error=candidate_account_required"
    );
  }

  const progress = await readCandidateProgress(candidateContext);
  const profileConfirmed =
    progress.status === "supabase_persisted"
      ? progress.profileConfirmed
      : cookieStore.get("assumerai_profile_confirmed")?.value === "true";

  if (!profileConfirmed) {
    redirect("/candidate/resume?error=profile_required");
  }
  const activeInterviewLanguage = resolveCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value ??
      progress.interviewLanguage
  );
  const copy = resolveCandidateFlowCopy(activeInterviewLanguage);

  return (
    <main className="prepare-shell">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.prepare-shell {
  background: #ffffff;
  color: #111c19;
  min-height: 100dvh;
  padding: clamp(22px, 5vw, 56px);
}

.prepare-grid {
  align-items: start;
  display: grid;
  gap: 22px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  margin: clamp(34px, 4vw, 56px) auto 0;
  max-width: 1120px;
}

.prepare-copy {
  display: grid;
  gap: 18px;
  padding-top: clamp(14px, 3vw, 40px);
}

.prepare-copy p,
.module-list span,
.safety-panel span {
  color: #5d6965;
  line-height: 1.55;
  margin: 0;
}

.prepare-copy > span {
  color: #111c19;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.prepare-copy h1 {
  font-size: clamp(2.1rem, 5.2vw, 4rem);
  line-height: 1.02;
  margin: 0;
  max-width: 680px;
}

.module-list,
.safety-panel {
  border: 1px solid rgba(23, 33, 31, 0.14);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 18px;
}

.module-list {
  background: #ffffff;
}

.module-list h2,
.safety-panel strong {
  font-size: 1.15rem;
  margin: 0;
}

.module-list ol {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 1.4rem;
}

.module-list li {
  font-weight: 750;
}

.safety-panel {
  background: #111c19;
  color: #ffffff;
}

.safety-panel span {
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  color: #ffffff;
  padding-top: 10px;
}

.prepare-actions {
  display: grid;
  gap: 12px;
}

.prepare-acknowledgement {
  background: #ffffff;
  border: 1px solid rgba(23, 33, 31, 0.14);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 14px;
}

.prepare-acknowledgement label {
  align-items: flex-start;
  color: #364640;
  display: grid;
  font-size: 0.94rem;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr);
  line-height: 1.45;
}

.prepare-acknowledgement input[type="checkbox"] {
  accent-color: #111c19;
  height: 18px;
  margin-top: 2px;
  width: 18px;
}

.prepare-actions a,
.prepare-actions button {
  border: 1px solid #111c19;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-weight: 850;
  padding: 12px 14px;
  width: fit-content;
}

.prepare-actions button {
  background: #111c19;
  color: #ffffff;
}

.prepare-actions a {
  color: #111c19;
}

@media (max-width: 860px) {
  .prepare-grid {
    grid-template-columns: 1fr;
  }

  .prepare-actions a,
  .prepare-actions button {
    width: 100%;
  }
}
`
        }}
      />
      <CandidateProgressRail current="interview" language={activeInterviewLanguage} />
      <section className="prepare-grid">
        <div className="prepare-copy">
          <span>{copy.prepare.nextStep}</span>
          <h1>{copy.prepare.title}</h1>
          <p>
            {copy.prepare.body}
          </p>
          <form
            action="/candidate/interview/prepare/acknowledge"
            className="prepare-actions"
            method="post"
          >
            <input
              name={CANDIDATE_INTERVIEW_LANGUAGE_FIELD}
              type="hidden"
              value={activeInterviewLanguage}
            />
            <div className="prepare-acknowledgement">
              <label>
                <input
                  name={interviewDisclosureFieldNames.acknowledged}
                  required
                  type="checkbox"
                  value="accepted"
                />
                <span>
                  {copy.prepare.acknowledgement}
                </span>
              </label>
              <small>
                {copy.prepare.disclosureVersion} {INTERVIEW_AI_DISCLOSURE_VERSION}
              </small>
            </div>
            <button type="submit">{copy.prepare.continueToDeviceCheck}</button>
            <Link href="/candidate/resume">{copy.prepare.backToResume}</Link>
          </form>
        </div>

        <aside className="module-list" aria-label={copy.prepare.modulesAria}>
          <h2>{copy.prepare.modulesTitle}</h2>
          <ol>
            {copy.prepare.modules.map((module) => (
              <li key={module}>{module}</li>
            ))}
          </ol>
          <span>{copy.prepare.saveResumeNote}</span>
        </aside>

        <aside className="safety-panel" aria-label={copy.prepare.safetyAria}>
          <strong>{copy.prepare.safetyTitle}</strong>
          {copy.prepare.safetyRules.map((rule) => (
            <span key={rule}>{rule}</span>
          ))}
        </aside>
      </section>
    </main>
  );
}
