import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CandidateJourney } from "@/components/candidate/CandidateJourney";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  resolveExplicitCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "@/features/interview-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { readCandidateProgress } from "@/features/candidate-persistence/supabase-candidate-store";

export default async function CandidateResumeUploadPage() {
  const initialInterviewLanguage = await resolveInitialInterviewLanguage();

  if (!initialInterviewLanguage) {
    redirect("/candidate");
  }

  return (
    <CandidateJourney
      initialInterviewLanguage={initialInterviewLanguage}
      initialProgressStep="resume"
    />
  );
}

async function resolveInitialInterviewLanguage(): Promise<
  CandidateInterviewLanguageCode | undefined
> {
  const cookieStore = await cookies();
  const cookieLanguage = resolveExplicitCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value
  );
  if (cookieLanguage) {
    return cookieLanguage;
  }

  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    return undefined;
  }

  const progress = await readCandidateProgress(candidateContext);
  return progress.interviewLanguage;
}
