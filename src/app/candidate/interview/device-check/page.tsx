import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InterviewDevicePrep } from "@/components/candidate/InterviewDevicePrep";
import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import styles from "@/components/candidate/InterviewDevicePrep.module.css";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  resolveCandidateInterviewLanguageCode
} from "@/features/interview-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { readCandidateProgress } from "@/features/candidate-persistence/supabase-candidate-store";

export const metadata = {
  title: "Device Check | AssumerAI",
  description: "Camera and microphone preparation before the live interview."
};

export default async function CandidateInterviewDeviceCheckPage() {
  const cookieStore = await cookies();
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    redirect(
      candidateContext.status === 401
        ? "/login?next=/candidate/interview/device-check"
        : "/candidate?error=candidate_account_required"
    );
  }

  const progress = await readCandidateProgress(candidateContext);
  const profileConfirmed =
    progress.status === "supabase_persisted"
      ? progress.profileConfirmed
      : cookieStore.get("assumerai_profile_confirmed")?.value === "true";
  const disclosureAcknowledged =
    progress.status === "supabase_persisted"
      ? progress.disclosureAcknowledged
      : cookieStore.get("assumerai_ai_disclosure_acknowledged")?.value === "true";
  const activeInterviewLanguage = resolveCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value ??
      progress.interviewLanguage
  );

  if (!profileConfirmed) {
    redirect("/candidate/resume?error=profile_required");
  }

  if (!disclosureAcknowledged) {
    redirect("/candidate/interview/prepare?error=ai_disclosure_required");
  }

  return (
    <main className={styles.shell}>
      <div className={styles.progress}>
        <CandidateProgressRail current="interview" language={activeInterviewLanguage} />
      </div>
      <InterviewDevicePrep language={activeInterviewLanguage} />
    </main>
  );
}
