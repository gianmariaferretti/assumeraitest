import type {
  CandidateResumeNextStep,
  CandidateResumeProfilePipelineSession,
  CandidateResumeScoreReadiness
} from "@/features/candidate-flow/resume-profile-pipeline";
import type {
  ResumeDocumentMetadata,
  ResumeUploadAuditEvent
} from "@/features/resume-ingestion";
import type {
  CandidateProfile,
  CandidateProfileConfirmation,
  ResumeParseDraft
} from "@/features/resume-parsing";
import type {
  InterviewDisclosureAcknowledgement,
  InterviewDisclosureAuditEvent
} from "@/features/candidate-flow/interview-disclosure-acknowledgement";
import {
  resolveCandidateInterviewLanguageCode,
  resolveExplicitCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "@/features/interview-flow";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isAuthenticatedCandidateContext,
  type AuthenticatedCandidateContext,
  type CandidateRouteContext
} from "./supabase-candidate-context";

export type CandidatePersistenceStatus =
  | "supabase_persisted"
  | "local_fallback"
  | "supabase_unavailable";

export type CandidatePersistenceResult = {
  readonly status: CandidatePersistenceStatus;
  readonly detail?: string;
};

export type CandidateProgressState = {
  readonly status: CandidatePersistenceStatus;
  readonly hasResumeDocument: boolean;
  readonly profileConfirmed: boolean;
  readonly disclosureAcknowledged: boolean;
  readonly deviceCheckCompleted: boolean;
  readonly interviewCompleted: boolean;
  readonly hasActiveSharingSnapshot: boolean;
  readonly latestResumeDocumentId?: string;
  readonly latestInterviewSessionId?: string;
  readonly interviewLanguage?: CandidateInterviewLanguageCode;
  /** Pre-interview mode choice; text is a first-class equivalent mode. */
  readonly interviewMode?: "voice" | "text";
};

type CandidateWorkflowType =
  | "interview_disclosure"
  | "human_review"
  | "data_export"
  | "data_deletion"
  | "match_decision"
  | "sharing_snapshot";

type CandidateInterviewSnapshotPayload = {
  readonly session: Record<string, unknown>;
  readonly providerSession?: Record<string, unknown>;
  readonly questionPlan?: Record<string, unknown>;
};

export async function persistResumePipelineSession(
  context: CandidateRouteContext,
  session: CandidateResumeProfilePipelineSession
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  const now = new Date().toISOString();
  const profile = session.confirmation?.profile ?? session.parseDraft.profile;
  const confirmedAt = session.confirmation?.confirmed_at ?? null;

  return runSupabaseWrite(async () => {
    await upsertCandidateProfile(context, {
      profileStatus: session.confirmation ? "confirmed" : "draft",
      profileJson: profile,
      resumeDocumentId: session.resumeDocument.id,
      parserConfidence: session.parseDraft.parser_confidence,
      confirmedAt,
      now
    });

    await requireWrite(
      context.supabase.from("candidate_resume_documents").upsert(
        {
          user_id: context.user.id,
          resume_document_id: session.resumeDocument.id,
          original_filename: session.resumeDocument.file.originalName,
          content_type: session.resumeDocument.file.mimeType,
          size_bytes: session.resumeDocument.file.sizeBytes,
          resume_document: toJson(session.resumeDocument),
          parse_draft: toJson(session.parseDraft),
          score_readiness: toJson(session.scoreReadiness),
          next_step: toJson(session.nextStep),
          parser_confidence: session.parseDraft.parser_confidence,
          uploaded_at: session.resumeDocument.retention.receivedAt,
          updated_at: now
        },
        { onConflict: "user_id,resume_document_id" }
      )
    );

    await upsertCandidateProgress(context, {
      latest_resume_document_id: session.resumeDocument.id,
      ...(confirmedAt ? { profile_confirmed_at: confirmedAt } : {}),
      updated_at: now
    });

    await appendAuditEvent(context, session.uploadAuditEvent);
  });
}

export async function persistCandidateProfileConfirmation(
  context: CandidateRouteContext,
  session: CandidateResumeProfilePipelineSession
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  const result = await persistResumePipelineSession(context, session);
  if (result.status !== "supabase_persisted") {
    return result;
  }

  const confirmation = session.confirmation;
  if (confirmation) {
    return runSupabaseWrite(async () => {
      await upsertCandidateProgress(context, {
        profile_confirmed_at: confirmation.confirmed_at,
        latest_resume_document_id: session.resumeDocument.id,
        updated_at: new Date().toISOString()
      });
      await appendAuditEvent(context, {
        audit_event_id: confirmation.audit_event_id,
        event_type: "candidate_profile.confirmed",
        target_type: "candidate_profile",
        target_id: context.candidateId,
        confirmation
      });
    });
  }

  return result;
}

export async function readResumePipelineSession(
  context: CandidateRouteContext,
  resumeDocumentId: string | undefined
): Promise<CandidateResumeProfilePipelineSession | undefined> {
  if (!isAuthenticatedCandidateContext(context)) {
    return undefined;
  }

  const normalizedResumeDocumentId = readString(resumeDocumentId);
  if (!normalizedResumeDocumentId) {
    return undefined;
  }

  try {
    const [resumeResult, profileResult] = await Promise.all([
      context.supabase
        .from("candidate_resume_documents")
        .select("resume_document,parse_draft,score_readiness,next_step")
        .eq("user_id", context.user.id)
        .eq("resume_document_id", normalizedResumeDocumentId)
        .maybeSingle(),
      context.supabase
        .from("candidate_profiles")
        .select("profile_status,profile_json,confirmed_at")
        .eq("user_id", context.user.id)
        .maybeSingle()
    ]);

    if (resumeResult.error || !resumeResult.data) {
      return undefined;
    }

    return createResumePipelineSessionFromStoredRow(
      context,
      resumeResult.data as Record<string, unknown>,
      profileResult.error ? undefined : (profileResult.data as Record<string, unknown> | null)
    );
  } catch {
    return undefined;
  }
}

export async function persistInterviewDisclosureAcknowledgement(
  context: CandidateRouteContext,
  acknowledgement: InterviewDisclosureAcknowledgement,
  auditEvent: InterviewDisclosureAuditEvent
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  return runSupabaseWrite(async () => {
    await persistCandidateWorkflow(context, {
      workflowType: "interview_disclosure",
      workflowId: acknowledgement.acknowledgementId,
      workflowPayload: acknowledgement,
      auditEvent
    });
    await upsertCandidateProgress(context, {
      disclosure_acknowledged_at: acknowledgement.acknowledgedAt,
      disclosure_version: acknowledgement.disclosureVersion,
      disclosure_audit_event_id: acknowledgement.auditEventId,
      updated_at: new Date().toISOString()
    });
  });
}

export async function persistDeviceCheckCompleted(
  context: CandidateRouteContext,
  completedAt: string
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  return runSupabaseWrite(async () => {
    const auditEvent = {
      audit_event_id: `audit_device_check_${sanitizeId(context.user.id)}_${sanitizeId(completedAt)}`,
      event_type: "interview_device_check.completed",
      target_type: "candidate_interview_progress",
      target_id: context.user.id,
      completed_at: completedAt,
      recommendation_only: true,
      no_biometric_emotion_personality_or_accent_scoring: true
    };

    await upsertCandidateProgress(context, {
      device_check_completed_at: completedAt,
      updated_at: completedAt
    });
    await appendAuditEvent(context, auditEvent);
  });
}

export async function persistCandidateInterviewLanguage(
  context: CandidateRouteContext,
  interviewLanguage: CandidateInterviewLanguageCode
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  return runSupabaseWrite(async () => {
    await upsertCandidateProgress(context, {
      interview_language: interviewLanguage,
      updated_at: new Date().toISOString()
    });
  });
}

export async function persistCandidateDataWorkflow(
  context: CandidateRouteContext,
  input: {
    readonly workflowType: CandidateWorkflowType;
    readonly workflowId: string;
    readonly workflowPayload: unknown;
    readonly auditEvent: unknown;
  }
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  return runSupabaseWrite(async () => {
    await persistCandidateWorkflow(context, input);
  });
}

export async function persistInterviewSessionSnapshot(
  context: CandidateRouteContext,
  payload: CandidateInterviewSnapshotPayload
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  const sessionId = readString(payload.session.sessionId);
  if (!sessionId) {
    return {
      status: "supabase_unavailable",
      detail: "Interview snapshot did not include a session ID."
    };
  }

  const now = new Date().toISOString();
  const status = payload.session.status === "completed" ? "completed" : "in_progress";
  const interviewLanguage = resolveCandidateInterviewLanguageCode(
    payload.session.interviewLanguage
  );
  const responses = readArray(payload.session.responses)
    .map((response) => normalizeInterviewResponse(sessionId, response))
    .filter((response): response is NonNullable<typeof response> => Boolean(response));

  return runSupabaseWrite(async () => {
    await requireWrite(
      context.supabase.from("candidate_interview_sessions").upsert(
        {
          user_id: context.user.id,
          interview_session_id: sessionId,
          status,
          interview_language: interviewLanguage,
          role_id: readString(payload.session.roleId),
          role_title: readString(payload.session.roleTitle),
          session_payload: toJson(payload.session),
          provider_payload: toJson(payload.providerSession ?? {}),
          question_plan: toJson(
            payload.questionPlan ?? {
              questions: payload.session.questions,
              source: "client_snapshot"
            }
          ),
          completed_at: status === "completed" ? now : null,
          updated_at: now
        },
        { onConflict: "user_id,interview_session_id" }
      )
    );

    if (responses.length > 0) {
      await requireWrite(
        context.supabase.from("candidate_interview_responses").upsert(
          responses.map((response) => ({
            user_id: context.user.id,
            interview_session_id: sessionId,
            response_id: response.responseId,
            question_id: response.questionId,
            module_id: response.moduleId,
            answer_text: response.answerText,
            transcript_payload: response.transcriptPayload,
            analysis_flags: response.analysisFlags,
            answered_at: response.answeredAt,
            updated_at: now
          })),
          { onConflict: "user_id,interview_session_id,response_id" }
        )
      );
    }

    await upsertCandidateProgress(context, {
      latest_interview_session_id: sessionId,
      interview_language: interviewLanguage,
      ...(status === "completed" ? { interview_completed_at: now } : {}),
      updated_at: now
    });
  });
}

export async function readCandidateProgress(
  context: CandidateRouteContext
): Promise<CandidateProgressState> {
  if (!isAuthenticatedCandidateContext(context)) {
    return {
      status: localFallbackResult(context).status,
      hasResumeDocument: false,
      profileConfirmed: false,
      disclosureAcknowledged: false,
      deviceCheckCompleted: false,
      interviewCompleted: false,
      hasActiveSharingSnapshot: false
    };
  }

  try {
    const [progressResult, profileResult, sharingResult] = await Promise.all([
      context.supabase
        .from("candidate_interview_progress")
        .select("*")
        .eq("user_id", context.user.id)
        .maybeSingle(),
      context.supabase
        .from("candidate_profiles")
        .select("confirmed_at,profile_status,source_resume_document_id")
        .eq("user_id", context.user.id)
        .maybeSingle(),
      context.supabase
        .from("candidate_sharing_snapshots")
        .select("id")
        .eq("user_id", context.user.id)
        .eq("status", "active")
        .limit(1)
    ]);

    if (progressResult.error || profileResult.error || sharingResult.error) {
      return unavailableProgress();
    }

    const progress = progressResult.data as Record<string, unknown> | null;
    const profile = profileResult.data as Record<string, unknown> | null;
    const latestResumeDocumentId =
      readString(progress?.latest_resume_document_id) ??
      readString(profile?.source_resume_document_id);
    const latestInterviewSessionId = readString(progress?.latest_interview_session_id);

    return {
      status: "supabase_persisted",
      hasResumeDocument: Boolean(latestResumeDocumentId),
      profileConfirmed:
        Boolean(progress?.profile_confirmed_at) ||
        Boolean(profile?.confirmed_at) ||
        profile?.profile_status === "confirmed",
      disclosureAcknowledged: Boolean(progress?.disclosure_acknowledged_at),
      deviceCheckCompleted: Boolean(progress?.device_check_completed_at),
      interviewCompleted: Boolean(progress?.interview_completed_at),
      hasActiveSharingSnapshot: (sharingResult.data?.length ?? 0) > 0,
      latestResumeDocumentId,
      latestInterviewSessionId,
      interviewLanguage: resolveExplicitCandidateInterviewLanguageCode(
        progress?.interview_language
      ),
      interviewMode: progress?.interview_mode === "text" ? "text" : "voice"
    };
  } catch {
    return unavailableProgress();
  }
}

function createResumePipelineSessionFromStoredRow(
  context: AuthenticatedCandidateContext,
  row: Record<string, unknown>,
  profileRow: Record<string, unknown> | null | undefined
): CandidateResumeProfilePipelineSession | undefined {
  const resumeDocumentJson = row.resume_document;
  const parseDraftJson = row.parse_draft;
  const scoreReadinessJson = row.score_readiness;

  if (
    !isRecord(resumeDocumentJson) ||
    !isRecord(parseDraftJson) ||
    !isRecord(scoreReadinessJson)
  ) {
    return undefined;
  }

  const resumeDocument = resumeDocumentJson as unknown as ResumeDocumentMetadata;
  const parseDraft = parseDraftJson as unknown as ResumeParseDraft;
  const scoreReadiness = scoreReadinessJson as unknown as CandidateResumeScoreReadiness;
  const nextStep = createStoredNextStep(row.next_step, resumeDocument);
  const resumeDocumentId = readString(resumeDocument.id);
  const parseId = readString(parseDraft.parse_id);
  const candidateId = readString(parseDraft.candidate_id);

  if (!resumeDocumentId || !parseId || candidateId !== context.candidateId) {
    return undefined;
  }

  return {
    resumeDocument,
    uploadAuditEvent: createRestoredResumeUploadAuditEvent(context, resumeDocument),
    parseDraft,
    confirmation: createStoredCandidateProfileConfirmation(profileRow, parseDraft),
    scoreReadiness,
    nextStep,
    correlationId: `restored_resume_${sanitizeId(resumeDocumentId)}`
  };
}

function createStoredNextStep(
  value: unknown,
  resumeDocument: ResumeDocumentMetadata
): CandidateResumeNextStep {
  if (isRecord(value)) {
    const label = readString(value.label);
    const href = readString(value.href);

    if (label && href) {
      return { label, href };
    }
  }

  return {
    label: "Review parsed profile",
    href: resumeDocument.candidateConfirmation.handoffPath
  };
}

function createStoredCandidateProfileConfirmation(
  profileRow: Record<string, unknown> | null | undefined,
  parseDraft: ResumeParseDraft
): CandidateProfileConfirmation | undefined {
  if (profileRow?.profile_status !== "confirmed" || !isRecord(profileRow.profile_json)) {
    return undefined;
  }

  const profile = profileRow.profile_json as unknown as CandidateProfile;
  if (profile.confirmed_by_candidate !== true) {
    return undefined;
  }

  const metadata: Record<string, unknown> = isRecord(profile.confirmation_metadata)
    ? profile.confirmation_metadata
    : {};
  const confirmedAt =
    readString(metadata.confirmed_at) ??
    readString(profileRow.confirmed_at) ??
    profile.updated_at;
  const auditEventId =
    readString(metadata.audit_event_id) ??
    `audit_profile_confirmation_${sanitizeId(parseDraft.resume_document_id)}`;

  return {
    confirmation_id: `profile_confirmation_${sanitizeId(parseDraft.parse_id)}`,
    parse_id: parseDraft.parse_id,
    candidate_id: parseDraft.candidate_id,
    status: "confirmed",
    profile,
    corrections: [],
    confirmed_by: readString(metadata.confirmed_by) ?? `candidate:${parseDraft.candidate_id}`,
    confirmed_at: confirmedAt,
    audit_event_id: auditEventId
  };
}

function createRestoredResumeUploadAuditEvent(
  context: AuthenticatedCandidateContext,
  document: ResumeDocumentMetadata
): ResumeUploadAuditEvent {
  return {
    audit_event_id: document.auditEventId,
    event_type: "data.accessed",
    actor_type: "candidate",
    actor_id: context.user.id,
    occurred_at: document.retention.receivedAt,
    target_type: "ResumeDocument",
    target_id: document.id,
    summary:
      "Candidate uploaded a raw resume document for retention-limited ingestion.",
    details: {
      purpose: "resume_upload_ingestion",
      retention_policy: "raw_cv",
      retention_days: document.retention.retentionDays,
      candidate_confirmation_required: true,
      scoring_allowed: false,
      storage_provider: document.storage.provider
    },
    correlation_id: `restored_resume_${sanitizeId(document.id)}`
  };
}

function unavailableProgress(): CandidateProgressState {
  return {
    status: "supabase_unavailable",
    hasResumeDocument: false,
    profileConfirmed: false,
    disclosureAcknowledged: false,
    deviceCheckCompleted: false,
    interviewCompleted: false,
    hasActiveSharingSnapshot: false
  };
}

async function upsertCandidateProfile(
  context: AuthenticatedCandidateContext,
  input: {
    readonly profileStatus: "draft" | "confirmed";
    readonly profileJson: unknown;
    readonly resumeDocumentId: string;
    readonly parserConfidence: number;
    readonly confirmedAt: string | null;
    readonly now: string;
  }
) {
  await requireWrite(
    context.supabase.from("candidate_profiles").upsert(
      {
        user_id: context.user.id,
        profile_status: input.profileStatus,
        profile_json: toJson(input.profileJson),
        source_resume_document_id: input.resumeDocumentId,
        parser_confidence: input.parserConfidence,
        confirmed_at: input.confirmedAt,
        updated_at: input.now
      },
      { onConflict: "user_id" }
    )
  );
}

async function persistCandidateWorkflow(
  context: AuthenticatedCandidateContext,
  input: {
    readonly workflowType: CandidateWorkflowType;
    readonly workflowId: string;
    readonly workflowPayload: unknown;
    readonly auditEvent: unknown;
  }
) {
  await requireWrite(
    context.supabase.from("candidate_compliance_workflows").upsert(
      {
        user_id: context.user.id,
        workflow_type: input.workflowType,
        workflow_id: input.workflowId,
        workflow_payload: toJson(input.workflowPayload),
        audit_event: toJson(input.auditEvent),
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,workflow_type,workflow_id" }
    )
  );
  await appendAuditEvent(context, input.auditEvent);
}

async function upsertCandidateProgress(
  context: AuthenticatedCandidateContext,
  patch: Record<string, unknown>
) {
  await requireWrite(
    context.supabase.from("candidate_interview_progress").upsert(
      {
        user_id: context.user.id,
        ...patch
      },
      { onConflict: "user_id" }
    )
  );
}

async function appendAuditEvent(
  context: AuthenticatedCandidateContext,
  auditEvent: unknown
) {
  const auditEventId =
    readRecordString(auditEvent, "audit_event_id") ?? readRecordString(auditEvent, "auditEventId");
  if (!auditEventId) {
    return;
  }

  await requireWrite(
    context.supabase.from("candidate_audit_events").upsert(
      {
        user_id: context.user.id,
        audit_event_id: auditEventId,
        event_type:
          readRecordString(auditEvent, "event_type") ??
          readRecordString(auditEvent, "eventType") ??
          "candidate.event",
        target_type:
          readRecordString(auditEvent, "target_type") ??
          readRecordString(auditEvent, "targetType") ??
          "candidate",
        target_id:
          readRecordString(auditEvent, "target_id") ??
          readRecordString(auditEvent, "targetId") ??
          context.user.id,
        payload: toJson(auditEvent)
      },
      { onConflict: "user_id,audit_event_id", ignoreDuplicates: true }
    )
  );
}

export type CandidateHumanReviewRequestStatusRow = {
  readonly requestId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly status: "open" | "upheld" | "adjusted";
  readonly requestedAt: string;
  readonly resolvedAt: string | null;
  readonly outcomeReason: string | null;
};

/**
 * Persist a candidate-initiated human review request (owner-only insert; the
 * reviewer outcome columns are written later through the service role).
 */
export async function persistHumanReviewRequest(
  context: CandidateRouteContext,
  request: {
    readonly humanReviewRequestId: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly summary: string;
    readonly evidenceNotes: string | null;
    readonly requestedAt: string;
    readonly auditEventId: string;
  }
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  return runSupabaseWrite(async () => {
    await requireWrite(
      context.supabase.from("human_review_requests").upsert(
        {
          user_id: context.user.id,
          request_id: request.humanReviewRequestId,
          target_type: request.targetType,
          target_id: request.targetId,
          summary: request.summary,
          evidence_notes: request.evidenceNotes,
          status: "open",
          request_payload: toJson(request),
          audit_event_id: request.auditEventId,
          requested_at: request.requestedAt
        },
        { onConflict: "user_id,request_id", ignoreDuplicates: true }
      )
    );
  });
}

/** The candidate's own review requests, newest first (results-page status). */
export async function readCandidateHumanReviewRequests(
  context: CandidateRouteContext
): Promise<readonly CandidateHumanReviewRequestStatusRow[]> {
  if (!isAuthenticatedCandidateContext(context)) {
    return [];
  }

  try {
    const result = await context.supabase
      .from("human_review_requests")
      .select("request_id,target_type,target_id,status,requested_at,resolved_at,outcome_reason")
      .eq("user_id", context.user.id)
      .order("requested_at", { ascending: false });
    if (result.error || !result.data) {
      return [];
    }

    return (result.data as Record<string, unknown>[]).map((row) => ({
      requestId: String(row.request_id ?? ""),
      targetType: String(row.target_type ?? ""),
      targetId: String(row.target_id ?? ""),
      status:
        row.status === "upheld" || row.status === "adjusted"
          ? row.status
          : ("open" as const),
      requestedAt: String(row.requested_at ?? ""),
      resolvedAt: readString(row.resolved_at) ?? null,
      outcomeReason: readString(row.outcome_reason) ?? null
    }));
  } catch {
    return [];
  }
}

export type ModuleSessionPersistencePayload = {
  readonly interviewSessionId: string;
  readonly moduleId: string;
  readonly state: string;
  readonly modulePayload: Record<string, unknown>;
  readonly startedAt?: string | null;
  readonly completedAt?: string | null;
};

/**
 * Persist a single module sub-session (the async Session Store). Owner-only via
 * RLS; one row per (candidate, interview session, module).
 */
export async function persistModuleSessionState(
  context: CandidateRouteContext,
  payload: ModuleSessionPersistencePayload
): Promise<CandidatePersistenceResult> {
  if (!isAuthenticatedCandidateContext(context)) {
    return localFallbackResult(context);
  }

  const now = new Date().toISOString();

  return runSupabaseWrite(async () => {
    await requireWrite(
      context.supabase.from("candidate_module_sessions").upsert(
        {
          user_id: context.user.id,
          interview_session_id: payload.interviewSessionId,
          module_id: payload.moduleId,
          state: payload.state,
          module_payload: toJson(payload.modulePayload),
          started_at: payload.startedAt ?? null,
          completed_at: payload.completedAt ?? null,
          updated_at: now
        },
        { onConflict: "user_id,interview_session_id,module_id" }
      )
    );
  });
}

/**
 * Persist a BARS evaluator run for audit / inter-rater reliability. The
 * `interview_evaluator_runs` table is service-role-write-only (scores stay
 * tamper-proof), so this uses the admin client and degrades gracefully when the
 * service role is not configured (e.g. local dev).
 */
export async function persistInterviewEvaluatorRun(
  run: Record<string, unknown>
): Promise<CandidatePersistenceResult> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return {
      status: "supabase_unavailable",
      detail: "Service role is not configured; evaluator run not persisted."
    };
  }

  return runSupabaseWrite(async () => {
    await requireWrite(admin.from("interview_evaluator_runs").insert(run));
  });
}

async function runSupabaseWrite(
  write: () => Promise<void>
): Promise<CandidatePersistenceResult> {
  try {
    await write();
    return { status: "supabase_persisted" };
  } catch (error) {
    return {
      status: "supabase_unavailable",
      detail: error instanceof Error ? error.message : "Supabase write failed."
    };
  }
}

async function requireWrite(
  promise: PromiseLike<{ readonly error: { readonly message?: string } | null }>
) {
  const { error } = await promise;
  if (error) {
    throw new Error(error.message ?? "Supabase write failed.");
  }
}

function normalizeInterviewResponse(
  sessionId: string,
  value: unknown
):
  | {
      readonly responseId: string;
      readonly questionId: string;
      readonly moduleId: string | null;
      readonly answerText: string;
      readonly answeredAt: string;
      readonly analysisFlags: Record<string, unknown>;
      readonly transcriptPayload: Record<string, unknown>;
    }
  | null {
  if (!isRecord(value)) {
    return null;
  }

  const questionId = readString(value.questionId);
  const answerText = readString(value.answerText);
  const answeredAt = readString(value.answeredAt) ?? new Date().toISOString();
  if (!questionId || !answerText) {
    return null;
  }

  return {
    responseId:
      readString(value.id) ??
      `response_${sanitizeId(sessionId)}_${sanitizeId(questionId)}_${sanitizeId(answeredAt)}`,
    questionId,
    moduleId: readString(value.moduleId) ?? null,
    answerText,
    answeredAt,
    analysisFlags: isRecord(value.analysisFlags) ? toJson(value.analysisFlags) : {},
    transcriptPayload: {
      visibility_scope: "candidate_private",
      raw_media_included: false,
      response: toJson(value)
    }
  };
}

function localFallbackResult(context: CandidateRouteContext): CandidatePersistenceResult {
  return {
    status: context.mode === "local_fallback" ? "local_fallback" : "supabase_unavailable"
  };
}

function readArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readRecordString(value: unknown, key: string): string | undefined {
  return isRecord(value) ? readString(value[key]) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toJson(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
