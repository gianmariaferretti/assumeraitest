import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CandidateInterviewMovingForward } from "@/components/candidate/CandidateInterviewMovingForward";
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
  title: "Moving Forward | AssumerAI",
  description:
    "Candidate-private transition after profile review and before interview preparation."
};

export default async function CandidateInterviewMovingForwardPage() {
  const cookieStore = await cookies();
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    redirect(
      candidateContext.status === 401
        ? "/login?next=/candidate/interview/moving-forward"
        : "/candidate?error=candidate_account_required"
    );
  }

  const progress = await readCandidateProgress(candidateContext);
  const profileConfirmed =
    progress.status === "supabase_persisted"
      ? progress.profileConfirmed
      : cookieStore.get("assumerai_profile_confirmed")?.value === "true";
  const activeInterviewLanguage = resolveCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value ??
      progress.interviewLanguage
  );

  if (!profileConfirmed) {
    redirect("/candidate/resume?error=profile_required");
  }

  return <CandidateInterviewMovingForward language={activeInterviewLanguage} />;
}
