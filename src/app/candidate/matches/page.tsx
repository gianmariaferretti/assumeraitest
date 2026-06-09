import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CandidateMatchInbox } from "@/components/candidate/CandidateMatchInbox";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  resolveCandidateInterviewLanguageCode
} from "@/features/interview-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { readCandidateProgress } from "@/features/candidate-persistence/supabase-candidate-store";
import {
  type CompanyDashboardMatch,
  materializeCandidateMatchesForCandidate,
  readCandidateMatchFeedback
} from "@/features/company-workspace";
import {
  defaultCandidateSharingPreview,
  type CandidateDashboardMatch
} from "@/components/candidate/candidate-dashboard-model";

export const metadata = {
  title: "Candidate Matches | AssumerAI",
  description:
    "Candidate-controlled company-role matches and scoped sharing decisions."
};

export default async function CandidateMatchesPage() {
  const cookieStore = await cookies();
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    redirect(
      candidateContext.status === 401
        ? "/login?next=/candidate/matches"
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

  const materializedCompanyMatches = await materializeCandidateMatchesForCandidate(candidateContext).catch(() => []);
  const materializedMatches = materializedCompanyMatches.map(
    mapCompanyMatchToCandidateMatch
  );
  const companyFeedback = await readCandidateMatchFeedback(candidateContext);

  return (
    <CandidateMatchInbox
      companyFeedback={companyFeedback}
      language={activeInterviewLanguage}
      materializedMatches={materializedMatches}
    />
  );
}

function mapCompanyMatchToCandidateMatch(
  match: CompanyDashboardMatch
): CandidateDashboardMatch {
  const explanation = isRecord(match.matchExplanation.matchExplanation)
    ? match.matchExplanation.matchExplanation
    : {};
  const scoreReasons = readStringArray(match.scorecard.reasons);
  const explanationEvidence = readStringArray(explanation.supporting_evidence);
  const gaps = readStringArray(match.scorecard.gaps);
  const explanationGaps = readStringArray(explanation.missing_evidence);

  return {
    matchId: match.matchId,
    companyId: match.companyId,
    roleId: match.roleId,
    roleTitle: match.roleTitle,
    companyName: match.companyName,
    matchScore: match.matchScore,
    confidence: match.matchConfidence,
    status:
      match.status === "candidate_visible"
        ? "awaiting_candidate"
        : match.status === "candidate_declined"
          ? "declined"
          : "accepted",
    consentRecordId: undefined,
    sharingSnapshotId: undefined,
    sharingPreview: defaultCandidateSharingPreview,
    reasons: scoreReasons.length > 0 ? scoreReasons : explanationEvidence,
    evidence: explanationEvidence.length > 0 ? explanationEvidence : scoreReasons,
    gaps: gaps.length > 0 ? gaps : explanationGaps
  };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
