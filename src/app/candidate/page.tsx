import { cookies } from "next/headers";

import { CandidateJourney } from "@/components/candidate/CandidateJourney";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  resolveExplicitCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "@/features/interview-flow";

export const metadata = {
  title: "Start Candidate Flow | AssumerAI",
  description:
    "Resume-first candidate flow for profile confirmation, interview preparation, and consent-controlled matches."
};

type CandidatePageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function CandidatePage({
  searchParams
}: {
  readonly searchParams?: CandidatePageSearchParams;
}) {
  const forceInterviewLanguageSelection = shouldForceInterviewLanguageSelection(
    await searchParams
  );
  const routeInterviewLanguage = resolveRouteInterviewLanguage(
    await searchParams
  );
  const initialInterviewLanguage = await resolveInitialInterviewLanguage(
    forceInterviewLanguageSelection,
    routeInterviewLanguage
  );

  return <CandidateJourney initialInterviewLanguage={initialInterviewLanguage} />;
}

function shouldForceInterviewLanguageSelection(
  searchParams: Record<string, string | string[] | undefined> | undefined
) {
  const value = searchParams?.selectLanguage;
  if (Array.isArray(value)) {
    return value.some(isForceLanguageValue);
  }

  return isForceLanguageValue(value);
}

function resolveRouteInterviewLanguage(
  searchParams: Record<string, string | string[] | undefined> | undefined
) {
  const value = searchParams?.language;
  return resolveExplicitCandidateInterviewLanguageCode(
    Array.isArray(value) ? value[0] : value
  );
}

function isForceLanguageValue(value: string | undefined) {
  return value === "" || value === "1" || value === "true";
}

async function resolveInitialInterviewLanguage(
  forceInterviewLanguageSelection: boolean,
  routeInterviewLanguage: CandidateInterviewLanguageCode | undefined
): Promise<
  CandidateInterviewLanguageCode | undefined
> {
  if (forceInterviewLanguageSelection) {
    return undefined;
  }

  if (routeInterviewLanguage) {
    return routeInterviewLanguage;
  }

  const cookieStore = await cookies();
  const cookieLanguage = resolveExplicitCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value
  );
  if (cookieLanguage) {
    return cookieLanguage;
  }

  return undefined;
}
