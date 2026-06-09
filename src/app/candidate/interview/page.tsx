import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { candidateResumeProfilePipeline } from "@/features/candidate-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  createServerInterviewSession,
  loadServerInterviewState,
  resolveServerInterviewStore
} from "@/features/candidate-persistence/server-interview-store";
import {
  readCandidateProgress,
  readResumePipelineSession
} from "@/features/candidate-persistence/supabase-candidate-store";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_COOKIE,
  createClaudeResumeAwareQuestionPlan,
  resolveCandidateInterviewLanguageCode,
  resolveExplicitCandidateInterviewLanguageCode,
  selectQuestionBankForRole
} from "@/features/interview-flow";
import { interviewDeviceCheckPath } from "@/features/live-interview";
import { checkLlmBudget } from "@/lib/llm-budget";
import {
  scoreResume,
  type ResumeScorecard
} from "@/features/scoring/resume/resume-score";
import type { CandidateProfile } from "@/features/resume-parsing";

import { InterviewSessionClient } from "./interview-session-client";
import {
  candidateInterviewPreviewRole,
  candidateInterviewPreviewRoleForScoring
} from "./interview-preview-role";

export default async function CandidateInterviewPage() {
  const cookieStore = await cookies();
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    redirect(
      candidateContext.status === 401
        ? "/login?next=/candidate/interview"
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
  const deviceCheckCompleted =
    progress.status === "supabase_persisted"
      ? progress.deviceCheckCompleted
      : cookieStore.get("assumerai_interview_device_check_completed")?.value === "true";

  if (!profileConfirmed) {
    redirect("/candidate/resume?error=profile_required");
  }
  if (!disclosureAcknowledged) {
    redirect("/candidate/interview/prepare?error=ai_disclosure_required");
  }
  if (!deviceCheckCompleted) {
    redirect(`${interviewDeviceCheckPath}?error=device_check_required`);
  }

  const resumeDocumentId = cookieStore.get("assumerai_resume_document_id")?.value;
  const cookieInterviewLanguage = resolveExplicitCandidateInterviewLanguageCode(
    cookieStore.get(CANDIDATE_INTERVIEW_LANGUAGE_COOKIE)?.value
  );
  const interviewLanguage = resolveCandidateInterviewLanguageCode(
    cookieInterviewLanguage ?? progress.interviewLanguage
  );
  let profileReview = resumeDocumentId
    ? candidateResumeProfilePipeline.getProfileReview(resumeDocumentId)
    : undefined;
  if (!profileReview && resumeDocumentId) {
    const restoredSession = await readResumePipelineSession(candidateContext, resumeDocumentId);
    if (restoredSession) {
      candidateResumeProfilePipeline.restore(restoredSession);
      profileReview = candidateResumeProfilePipeline.getProfileReview(resumeDocumentId);
    }
  }
  const candidateProfile = profileReview?.profile.confirmed_by_candidate
    ? profileReview.profile
    : undefined;

  // Server-authoritative session: reuse the persisted in-progress session, or
  // create one (running the question planner exactly once per session). The
  // client only ever receives a read-only view of this state.
  const store = resolveServerInterviewStore(candidateContext);
  const existingState = await loadServerInterviewState(store, candidateContext.candidateId);
  let serverSession =
    existingState && existingState.session.interviewLanguage === interviewLanguage
      ? existingState.session
      : undefined;
  let questionPlanAudit;
  if (!serverSession) {
    const resumeScorecard = createResumeScorecard(candidateProfile);
    // When the daily LLM budget is exhausted the planner falls back to its
    // deterministic plan instead of calling the API (apiKey: null).
    const budget = await checkLlmBudget();
    const questionPlan = candidateProfile
      ? await createClaudeResumeAwareQuestionPlan({
          questions: selectQuestionBankForRole(
            candidateInterviewPreviewRole,
            undefined,
            interviewLanguage
          ),
          roleProfile: candidateInterviewPreviewRole,
          candidateProfile,
          interviewLanguage,
          resumeScorecard,
          ...(budget.allowed ? {} : { options: { apiKey: null } })
        })
      : undefined;
    const created = await createServerInterviewSession(store, candidateContext.candidateId, {
      roleProfile: candidateInterviewPreviewRole,
      interviewLanguage,
      candidateProfile,
      questionBank: questionPlan?.questions
    });
    serverSession = created.session;
    questionPlanAudit = questionPlan
      ? {
          source: questionPlan.source,
          providerModel: questionPlan.providerModel,
          fallbackReason: questionPlan.fallbackReason,
          generatedAt: new Date().toISOString()
        }
      : undefined;
  }

  return (
    <InterviewSessionClient
      initialSession={serverSession}
      initialInterviewLanguage={interviewLanguage}
      initialQuestionPlanAudit={questionPlanAudit}
    />
  );
}

function createResumeScorecard(
  candidateProfile: CandidateProfile | undefined
): ResumeScorecard | undefined {
  if (!candidateProfile?.confirmed_by_candidate) {
    return undefined;
  }

  try {
    return scoreResume({
      candidateProfile,
      roleProfile: candidateInterviewPreviewRoleForScoring
    }).scorecard;
  } catch {
    return undefined;
  }
}
