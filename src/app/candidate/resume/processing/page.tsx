import { cookies } from "next/headers";

import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  resolveCandidateInterviewLanguageCode
} from "@/features/interview-flow";

import { normalizeCandidateNextHref } from "./route-state";
import { ResumeProcessingClient } from "./processing-client";

interface ResumeProcessingPageProps {
  readonly searchParams: Promise<{
    readonly next?: string;
  }>;
}

export const metadata = {
  title: "Resume Processed | AssumerAI",
  description: "Resume processing handoff before candidate profile review."
};

export default async function ResumeProcessingPage({
  searchParams
}: ResumeProcessingPageProps) {
  const { next } = await searchParams;
  const cookieStore = await cookies();
  const nextHref = normalizeCandidateNextHref(
    next,
    cookieStore.get("assumerai_resume_document_id")?.value
  );
  const language = resolveCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value
  );

  return <ResumeProcessingClient language={language} nextHref={nextHref} />;
}
