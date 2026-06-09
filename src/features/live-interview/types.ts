import type { InterviewMode, InterviewSession } from "../interview-flow";
import type { CandidateFlowCopy } from "../interview-flow/candidate-flow-copy";

export const LIVE_INTERVIEW_PROVIDER_CONTRACT_VERSION = "live-interview-provider-contract-v2";

export type LiveInterviewProviderKind = "mock" | "tavus" | "anam" | "did" | "simli";

export type LiveInterviewSessionStatus =
  | "active"
  | "paused"
  | "fallback_active"
  | "completed"
  | "disconnected"
  | "expired"
  | "failed";

export type LiveInterviewTranscriptSpeaker = "interviewer" | "candidate" | "system";

export type LiveInterviewTranscriptKind = "question" | "answer" | "system_note";

export type LiveInterviewFallbackMode = "none" | "text" | "audio";

export type LiveInterviewDisconnectReason =
  | "candidate_disconnect"
  | "provider_disconnect"
  | "network_timeout";

export type LiveInterviewEndReason =
  | "completed"
  | "candidate_ended"
  | "provider_disconnect"
  | "provider_disconnect_cap_reached"
  | "session_duration_cap_reached"
  | "transcript_event_cap_reached"
  | "technical_failure";

export type LiveInterviewDisallowedSignalUse =
  | "protected_attribute_inference"
  | "direct_age_inference"
  | "face_or_facial_expression"
  | "voice_tone_or_accent"
  | "emotion_or_personality"
  | "biometric_identifier"
  | "automated_hiring_or_rejection";

export type LiveInterviewConsentPurpose = "interview_media_processing";

export type LiveInterviewDataCategory =
  | "interview_transcript"
  | "raw_interview_media"
  | "audit_metadata";

export type LiveInterviewVisibilityScope =
  | "candidate_private"
  | "candidate_private_sensitive_review"
  | "employer_shareable_after_candidate_consent";

export interface LiveInterviewMediaConsent {
  readonly consentRecordId: string;
  readonly purpose: LiveInterviewConsentPurpose;
  readonly active: boolean;
  readonly dataCategories: readonly LiveInterviewDataCategory[];
  readonly grantedAt: string;
  readonly revokedAt?: string | null;
  readonly version: string;
}

export interface LiveInterviewSessionCaps {
  readonly maxDurationSeconds: number;
  readonly maxTranscriptEvents: number;
  readonly maxDisconnects: number;
}

export const DEFAULT_LIVE_INTERVIEW_SESSION_CAPS: LiveInterviewSessionCaps = {
  maxDurationSeconds: 20 * 60,
  maxTranscriptEvents: 120,
  maxDisconnects: 1
};

export interface LiveInterviewProviderCapabilities {
  readonly avatar: boolean;
  readonly speech: boolean;
  readonly transcript: boolean;
  readonly fallback: readonly LiveInterviewFallbackMode[];
  readonly mock: boolean;
}

export interface LiveInterviewConsentBoundary {
  readonly mediaProcessingConsentRecordId: string | null;
  readonly mediaProcessingConsentRequired: boolean;
  readonly mediaProcessingConsentSatisfied: boolean;
  readonly textFallbackAvailableWithoutMediaConsent: true;
}

export interface LiveInterviewComplianceBoundary {
  readonly recommendationOnly: true;
  readonly requiresMeaningfulHumanReview: true;
  readonly scoringInput: "transcript_content_only";
  readonly disallowedSignalUse: readonly LiveInterviewDisallowedSignalUse[];
  readonly candidateTransparencyNotice: string;
  readonly employerSharing: "candidate_consent_and_sensitive_review_required";
  readonly consent: LiveInterviewConsentBoundary;
}

export interface LiveInterviewRawMediaState {
  readonly stored: boolean;
  readonly deleted: boolean;
  readonly retentionHours: number;
  readonly deleteAfter: string | null;
  readonly deletedAt?: string | null;
  readonly deletionFailureRequiresHumanReview: boolean;
}

export interface LiveInterviewFallbackState {
  readonly active: boolean;
  readonly mode: LiveInterviewFallbackMode;
  readonly reason?: LiveInterviewDisconnectReason | LiveInterviewEndReason | "media_consent_missing";
  readonly activatedAt?: string;
  readonly message?: string;
  readonly noNegativeScoreImpact: true;
  readonly humanReviewRequired: boolean;
}

export interface LiveInterviewEvidenceHook {
  readonly evidenceId: string;
  readonly source: "interview_transcript";
  readonly transcriptEventId: string;
  readonly scoringAllowed: true;
  readonly rawMediaIncluded: false;
  readonly allowedUse: "score_transcript_content_with_human_review";
  readonly humanReviewRequired: boolean;
}

export interface LiveInterviewTranscriptEvent {
  readonly transcriptEventId: string;
  readonly providerSessionId: string;
  readonly speaker: LiveInterviewTranscriptSpeaker;
  readonly kind: LiveInterviewTranscriptKind;
  readonly text: string;
  readonly occurredAt: string;
  readonly questionId?: string;
  readonly evidenceHook: LiveInterviewEvidenceHook;
  readonly visibilityScope: LiveInterviewVisibilityScope;
  readonly containsSensitiveCandidateDisclosure: boolean;
}

export interface LiveInterviewHumanReviewRequest {
  readonly reviewRequestId: string;
  readonly eventType: "human_review.requested";
  readonly reason:
    | "provider_fallback"
    | "missing_transcript"
    | "disallowed_signal_excluded"
    | "raw_media_deletion_failure"
    | "confidence_gap";
  readonly interviewSessionId: string;
  readonly candidateId: string;
  readonly createdAt: string;
  readonly scoreImpact: "none";
  readonly auditEventId: string;
}

export interface LiveInterviewProviderSession {
  readonly providerName: LiveInterviewProviderKind | string;
  readonly providerVersion: string;
  readonly providerSessionId: string;
  readonly interviewSessionId: string;
  readonly candidateId: string;
  readonly roleId?: string;
  readonly roleTitle: string;
  readonly avatarName: string;
  readonly mode: InterviewMode;
  readonly status: LiveInterviewSessionStatus;
  readonly joinUrl: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly endedAt?: string;
  readonly endReason?: LiveInterviewEndReason;
  readonly billingStoppedAt?: string;
  readonly auditEventId: string;
  readonly correlationId: string;
  readonly disconnectCount: number;
  readonly caps: LiveInterviewSessionCaps;
  readonly transcriptEvents: readonly LiveInterviewTranscriptEvent[];
  readonly fallback: LiveInterviewFallbackState;
  readonly rawMedia: LiveInterviewRawMediaState;
  readonly compliance: LiveInterviewComplianceBoundary;
  readonly humanReviewRequests: readonly LiveInterviewHumanReviewRequest[];
  readonly textFallbackEnabled: boolean;
  readonly transcriptDrawerOpen: boolean;
  readonly contractVersion: typeof LIVE_INTERVIEW_PROVIDER_CONTRACT_VERSION;
}

export interface StartLiveInterviewSessionInput {
  readonly interviewSession: InterviewSession;
  readonly mode?: InterviewMode;
  readonly now?: string;
  readonly auditEventId?: string;
  readonly correlationId?: string;
  readonly caps?: Partial<LiveInterviewSessionCaps>;
  readonly mediaConsent?: LiveInterviewMediaConsent;
}

export interface RecordLiveInterviewTranscriptEventInput {
  readonly providerSessionId: string;
  readonly speaker: LiveInterviewTranscriptSpeaker;
  readonly kind: LiveInterviewTranscriptKind;
  readonly text: string;
  readonly questionId?: string;
  readonly occurredAt?: string;
}

export interface HandleLiveInterviewDisconnectInput {
  readonly providerSessionId: string;
  readonly reason: LiveInterviewDisconnectReason;
  readonly occurredAt?: string;
}

export interface EndLiveInterviewSessionInput {
  readonly providerSessionId: string;
  readonly reason: LiveInterviewEndReason;
  readonly occurredAt?: string;
}

export interface AvatarSessionProvider {
  startSession(input: StartLiveInterviewSessionInput): Promise<LiveInterviewProviderSession>;
  endSession(input: EndLiveInterviewSessionInput): Promise<LiveInterviewProviderSession>;
}

export interface TranscriptProvider {
  recordTranscriptEvent(
    input: RecordLiveInterviewTranscriptEventInput
  ): Promise<LiveInterviewProviderSession>;
}

export interface InterviewEvidenceRecorder {
  buildEvidenceHook(event: {
    readonly providerSessionId: string;
    readonly transcriptEventId: string;
    readonly humanReviewRequired?: boolean;
  }): LiveInterviewEvidenceHook;
}

export interface LiveInterviewProvider
  extends AvatarSessionProvider,
    TranscriptProvider,
    InterviewEvidenceRecorder {
  readonly name: string;
  readonly version: string;
  readonly capabilities: LiveInterviewProviderCapabilities;
  handleDisconnect(
    input: HandleLiveInterviewDisconnectInput
  ): Promise<LiveInterviewProviderSession>;
  getSession(providerSessionId: string): LiveInterviewProviderSession | undefined;
}

export type LiveInterviewAvatarMotionState = "listening" | "paused" | "complete";

export interface CreateLiveInterviewShellStateOptions {
  readonly lastSavedAt?: string | null;
  readonly copy?: CandidateFlowCopy["interview"];
}

export interface LiveInterviewShellAvatarState {
  readonly name: string;
  readonly statusLabel: string;
  readonly detail: string;
  readonly motionState: LiveInterviewAvatarMotionState;
}

export interface LiveInterviewShellQuestionState {
  readonly prompt: string;
  readonly moduleLabel: string;
  readonly progressLabel: string;
  readonly isOnlyVisibleQuestion: boolean;
}

export interface LiveInterviewShellTranscriptState {
  readonly isOpen: boolean;
  readonly title: string;
  readonly emptyLabel: string;
  readonly entries: readonly LiveInterviewTranscriptEvent[];
}

export interface LiveInterviewShellTextFallbackState {
  readonly enabled: boolean;
  readonly label: string;
  readonly helperText: string;
}

export interface LiveInterviewShellControlsState {
  readonly canPause: boolean;
  readonly canResume: boolean;
  readonly canUseTextFallback: boolean;
  readonly primaryActionLabel: string;
}

export interface LiveInterviewShellCompletionState {
  readonly isComplete: boolean;
  readonly title: string;
  readonly nextActionLabel: string;
  readonly detail: string;
}

export interface LiveInterviewShellState {
  readonly avatar: LiveInterviewShellAvatarState;
  readonly question: LiveInterviewShellQuestionState;
  readonly transcriptDrawer: LiveInterviewShellTranscriptState;
  readonly textFallback: LiveInterviewShellTextFallbackState;
  readonly controls: LiveInterviewShellControlsState;
  readonly completion: LiveInterviewShellCompletionState;
  readonly safetyNotice: string;
  readonly saveStateLabel: string;
}
