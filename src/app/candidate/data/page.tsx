import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CandidateDataControls } from "@/components/candidate/CandidateDataControls";
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
  title: "Candidate Data Controls | AssumerAI",
  description:
    "Candidate-owned data export, deletion, retention, and human-review controls."
};

export default async function CandidateDataControlsPage() {
  const cookieStore = await cookies();
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    redirect(
      candidateContext.status === 401
        ? "/login?next=/candidate/data"
        : "/candidate?error=candidate_account_required"
    );
  }

  const progress = await readCandidateProgress(candidateContext);
  const language = resolveCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value ??
      progress.interviewLanguage
  );

  return <CandidateDataControls language={language} />;
}
