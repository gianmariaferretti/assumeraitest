import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CandidateResultsReview } from "@/components/candidate/CandidateResultsReview";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  resolveCandidateInterviewLanguageCode
} from "@/features/interview-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  loadServerInterviewState,
  resolveServerInterviewStore
} from "@/features/candidate-persistence/server-interview-store";
import {
  readCandidateHumanReviewRequests,
  readCandidateProgress
} from "@/features/candidate-persistence/supabase-candidate-store";

export const metadata = {
  title: "Candidate Results | AssumerAI",
  description:
    "Candidate-private score explanations, evidence, matches, and consent choices."
};

export default async function CandidateResultsPage() {
  const cookieStore = await cookies();
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    redirect(
      candidateContext.status === 401
        ? "/login?next=/candidate/results"
        : "/candidate?error=candidate_account_required"
    );
  }

  const progress = await readCandidateProgress(candidateContext);
  const profileConfirmed =
    progress.status === "supabase_persisted"
      ? progress.profileConfirmed
      : cookieStore.get("assumerai_profile_confirmed")?.value === "true";
  const interviewCompleted =
    progress.status === "supabase_persisted"
      ? progress.interviewCompleted
      : cookieStore.get("assumerai_interview_completed")?.value === "true";
  const activeInterviewLanguage = resolveCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value ??
      progress.interviewLanguage
  );

  if (!profileConfirmed) {
    redirect("/candidate/resume?error=profile_required");
  }

  if (!interviewCompleted) {
    redirect("/candidate/interview?error=interview_required");
  }

  const store = resolveServerInterviewStore(candidateContext);
  const [serverState, reviewRequests] = await Promise.all([
    loadServerInterviewState(store, candidateContext.candidateId),
    readCandidateHumanReviewRequests(candidateContext)
  ]);

  return (
    <CandidateResultsReview
      language={activeInterviewLanguage}
      initialInterviewSession={serverState?.session ?? null}
      initialReviewRequests={reviewRequests}
    />
  );
}
