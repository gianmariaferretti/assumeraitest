import { notFound, redirect } from "next/navigation";

import { CompanyCandidateReview } from "@/components/company/CompanyCandidateReview";
import {
  isCompanyContextError,
  readCompanyMatchForReview,
  readIntegritySummariesForMatch,
  resolveCompanyRouteContext
} from "@/features/company-workspace";

export const metadata = {
  title: "Company Candidate Review | AssumerAI",
  description: "Consent-gated evidence review and auditable company decision controls."
};

export default async function CompanyReviewPage({
  params
}: {
  readonly params: Promise<{ readonly matchId: string }>;
}) {
  const { matchId } = await params;
  const companyContext = await resolveCompanyRouteContext(`/company/review/${matchId}`);
  if (isCompanyContextError(companyContext)) {
    if (companyContext.status === 401) {
      redirect(`/login?next=/company/review/${matchId}`);
    }

    redirect("/profile?error=company_account_required");
  }

  const match = await readCompanyMatchForReview(companyContext, matchId);
  if (!match) {
    notFound();
  }

  // Read-only reviewer context; never an input to any score.
  const integritySummaries = await readIntegritySummariesForMatch(match);

  return <CompanyCandidateReview match={match} integritySummaries={integritySummaries} />;
}
