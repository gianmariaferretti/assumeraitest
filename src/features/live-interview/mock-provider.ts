import {
  DEFAULT_LIVE_INTERVIEW_SESSION_CAPS,
  LIVE_INTERVIEW_PROVIDER_CONTRACT_VERSION,
  type EndLiveInterviewSessionInput,
  type HandleLiveInterviewDisconnectInput,
  type LiveInterviewComplianceBoundary,
  type LiveInterviewDisallowedSignalUse,
  type LiveInterviewEndReason,
  type LiveInterviewEvidenceHook,
  type LiveInterviewHumanReviewRequest,
  type LiveInterviewMediaConsent,
  type LiveInterviewProvider,
  type LiveInterviewProviderCapabilities,
  type LiveInterviewProviderSession,
  type LiveInterviewRawMediaState,
  type LiveInterviewSessionCaps,
  type LiveInterviewSessionStatus,
  type LiveInterviewTranscriptEvent,
  type RecordLiveInterviewTranscriptEventInput,
  type StartLiveInterviewSessionInput
} from "./types";

export interface MockLiveInterviewProviderOptions {
  readonly caps?: Partial<LiveInterviewSessionCaps>;
}

export interface CreateMockLiveInterviewProviderSessionOptions {
  readonly now?: string;
  readonly caps?: Partial<LiveInterviewSessionCaps>;
  readonly correlationId?: string;
}

const MOCK_PROVIDER_NAME = "mock";
const MOCK_PROVIDER_VERSION = "mock-live-interview-provider-v2";

export const LIVE_INTERVIEW_TRANSPARENCY_NOTICE =
  "AssumerAI scores transcript answers, work product, and role evidence only. It does not judge face, facial expression, emotion, voice tone, accent, personality, biometrics, protected traits, or direct age.";

const DISALLOWED_SIGNAL_USE: readonly LiveInterviewDisallowedSignalUse[] = [
  "protected_attribute_inference",
  "direct_age_inference",
  "face_or_facial_expression",
  "voice_tone_or_accent",
  "emotion_or_personality",
  "biometric_identifier",
  "automated_hiring_or_rejection"
];

const MOCK_CAPABILITIES: LiveInterviewProviderCapabilities = {
  avatar: true,
  speech: false,
  transcript: true,
  fallback: ["text"],
  mock: true
};

const SENSITIVE_DISCLOSURE_PATTERN =
  /\b(accent|native speaker|face|facial|emotion|personality|biometric|age|years old|born|race|ethnic|religion|gender|disab|health|medical|pregnan|caregiv|family status|marital status|sexual orientation|nationality)\b/i;

const DISALLOWED_VENDOR_PAYLOAD_KEYS = new Set([
  "accent",
  "age",
  "biometric",
  "biometrics",
  "emotion",
  "emotions",
  "face",
  "facial",
  "facialExpression",
  "facial_expression",
  "gender",
  "personality",
  "race",
  "voiceTone",
  "voice_tone"
]);

export function createMockLiveInterviewProvider(
  options: MockLiveInterviewProviderOptions = {}
): LiveInterviewProvider {
  return new MockLiveInterviewProvider(options);
}

export function createMockLiveInterviewProviderSession(
  interviewSession: StartLiveInterviewSessionInput["interviewSession"],
  options: CreateMockLiveInterviewProviderSessionOptions = {}
): LiveInterviewProviderSession {
  return buildMockSession({
    interviewSession,
    mode: "text",
    now: options.now,
    correlationId: options.correlationId,
    caps: options.caps
  });
}

export function createLiveInterviewHumanReviewRequest(input: {
  readonly reason: LiveInterviewHumanReviewRequest["reason"];
  readonly session: LiveInterviewProviderSession;
  readonly createdAt: string;
  readonly auditEventId?: string;
}): LiveInterviewHumanReviewRequest {
  return {
    reviewRequestId: `human_review_${sanitizeId(input.session.interviewSessionId)}_${sanitizeId(
      input.reason
    )}_${input.session.humanReviewRequests.length + 1}`,
    eventType: "human_review.requested",
    reason: input.reason,
    interviewSessionId: input.session.interviewSessionId,
    candidateId: input.session.candidateId,
    createdAt: input.createdAt,
    scoreImpact: "none",
    auditEventId:
      input.auditEventId ??
      `audit_human_review_${sanitizeId(input.session.interviewSessionId)}_${Date.parse(
        input.createdAt
      )}`
  };
}

export function sanitizeLiveInterviewProviderPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (DISALLOWED_VENDOR_PAYLOAD_KEYS.has(key)) {
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeLiveInterviewProviderPayload(value as Record<string, unknown>);
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

class MockLiveInterviewProvider implements LiveInterviewProvider {
  readonly name = MOCK_PROVIDER_NAME;
  readonly version = MOCK_PROVIDER_VERSION;
  readonly capabilities = MOCK_CAPABILITIES;

  private readonly caps: LiveInterviewSessionCaps;
  private readonly sessions = new Map<string, LiveInterviewProviderSession>();

  constructor(options: MockLiveInterviewProviderOptions) {
    this.caps = mergeCaps(options.caps);
  }

  async startSession(input: StartLiveInterviewSessionInput): Promise<LiveInterviewProviderSession> {
    const mode = input.mode ?? "text";
    assertMediaConsentForMode(mode, input.mediaConsent);

    const session = buildMockSession({
      ...input,
      caps: { ...this.caps, ...input.caps },
      mode
    });

    this.sessions.set(session.providerSessionId, session);
    return copySession(session);
  }

  async recordTranscriptEvent(
    input: RecordLiveInterviewTranscriptEventInput
  ): Promise<LiveInterviewProviderSession> {
    const session = this.requireSession(input.providerSessionId);
    const occurredAt = asIsoString(input.occurredAt);

    assertSessionCanAcceptInput(session);

    if (isPastSessionCap(session, occurredAt)) {
      return this.store(
        endSession(session, {
          status: "expired",
          reason: "session_duration_cap_reached",
          occurredAt
        })
      );
    }

    if (session.transcriptEvents.length >= session.caps.maxTranscriptEvents) {
      return this.store(
        endSession(session, {
          status: "expired",
          reason: "transcript_event_cap_reached",
          occurredAt
        })
      );
    }

    const text = input.text.trim();
    if (!text) {
      throw new Error("Live interview transcript text is required.");
    }

    const transcriptEventId = `${session.providerSessionId}_transcript_${
      session.transcriptEvents.length + 1
    }`;
    const containsSensitiveCandidateDisclosure =
      input.speaker === "candidate" && SENSITIVE_DISCLOSURE_PATTERN.test(text);
    const event: LiveInterviewTranscriptEvent = {
      transcriptEventId,
      providerSessionId: session.providerSessionId,
      speaker: input.speaker,
      kind: input.kind,
      text,
      questionId: input.questionId,
      occurredAt,
      evidenceHook: this.buildEvidenceHook({
        providerSessionId: session.providerSessionId,
        transcriptEventId,
        humanReviewRequired: containsSensitiveCandidateDisclosure
      }),
      visibilityScope: containsSensitiveCandidateDisclosure
        ? "candidate_private_sensitive_review"
        : "candidate_private",
      containsSensitiveCandidateDisclosure
    };
    const updated: LiveInterviewProviderSession = {
      ...session,
      updatedAt: occurredAt,
      transcriptEvents: [...session.transcriptEvents, event]
    };

    return this.store(updated);
  }

  async handleDisconnect(
    input: HandleLiveInterviewDisconnectInput
  ): Promise<LiveInterviewProviderSession> {
    const session = this.requireSession(input.providerSessionId);
    const occurredAt = asIsoString(input.occurredAt);

    assertSessionCanAcceptInput(session);

    const disconnectCount = session.disconnectCount + 1;

    if (disconnectCount > session.caps.maxDisconnects) {
      return this.store(
        endSession(
          {
            ...session,
            disconnectCount
          },
          {
            status: "disconnected",
            reason: "provider_disconnect_cap_reached",
            occurredAt
          }
        )
      );
    }

    const fallbackSession: LiveInterviewProviderSession = {
      ...session,
      status: "fallback_active",
      mode: "text",
      updatedAt: occurredAt,
      billingStoppedAt: occurredAt,
      disconnectCount,
      fallback: {
        active: true,
        mode: "text",
        reason: input.reason,
        activatedAt: occurredAt,
        message: "The live avatar connection dropped, so the session is continuing in text mode.",
        noNegativeScoreImpact: true,
        humanReviewRequired: true
      },
      rawMedia: {
        ...session.rawMedia,
        deleted: true,
        deletedAt: occurredAt
      },
      textFallbackEnabled: true
    };

    return this.store(addReviewRequest(fallbackSession, "provider_fallback", occurredAt));
  }

  async endSession(input: EndLiveInterviewSessionInput): Promise<LiveInterviewProviderSession> {
    const session = this.requireSession(input.providerSessionId);
    const occurredAt = asIsoString(input.occurredAt);

    if (isTerminalStatus(session.status)) {
      return copySession(session);
    }

    return this.store(
      endSession(session, {
        status: statusForEndReason(input.reason),
        reason: input.reason,
        occurredAt
      })
    );
  }

  getSession(providerSessionId: string): LiveInterviewProviderSession | undefined {
    const session = this.sessions.get(providerSessionId);
    return session ? copySession(session) : undefined;
  }

  buildEvidenceHook(event: {
    readonly providerSessionId: string;
    readonly transcriptEventId: string;
    readonly humanReviewRequired?: boolean;
  }): LiveInterviewEvidenceHook {
    return {
      evidenceId: `${event.transcriptEventId}_evidence`,
      source: "interview_transcript",
      transcriptEventId: event.transcriptEventId,
      scoringAllowed: true,
      rawMediaIncluded: false,
      allowedUse: "score_transcript_content_with_human_review",
      humanReviewRequired: event.humanReviewRequired ?? false
    };
  }

  private requireSession(providerSessionId: string): LiveInterviewProviderSession {
    const session = this.sessions.get(providerSessionId);

    if (!session) {
      throw new Error(`Live interview provider session ${providerSessionId} was not found.`);
    }

    return session;
  }

  private store(session: LiveInterviewProviderSession): LiveInterviewProviderSession {
    this.sessions.set(session.providerSessionId, session);
    return copySession(session);
  }
}

function buildMockSession(input: StartLiveInterviewSessionInput): LiveInterviewProviderSession {
  const startedAt = asIsoString(input.now);
  const mode = input.mode ?? "text";
  const caps = mergeCaps(input.caps);
  const providerSessionId = `mock_${sanitizeId(input.interviewSession.sessionId)}`;

  return {
    providerName: MOCK_PROVIDER_NAME,
    providerVersion: MOCK_PROVIDER_VERSION,
    providerSessionId,
    interviewSessionId: input.interviewSession.sessionId,
    candidateId: input.interviewSession.candidateId,
    roleId: input.interviewSession.roleId,
    roleTitle: input.interviewSession.roleTitle,
    avatarName: "AssumerAI mock interviewer",
    mode,
    status: "active",
    joinUrl: `mock://live-interview/${input.interviewSession.sessionId}`,
    startedAt,
    updatedAt: startedAt,
    expiresAt: addSeconds(startedAt, caps.maxDurationSeconds),
    auditEventId:
      input.auditEventId ??
      `audit_live_interview_${sanitizeId(input.interviewSession.sessionId)}_${Date.parse(
        startedAt
      )}`,
    correlationId:
      input.correlationId ?? `corr_live_${input.interviewSession.sessionId}_${startedAt}`,
    disconnectCount: 0,
    caps,
    transcriptEvents: [],
    fallback: baseFallback(),
    rawMedia: createRawMediaState(mode, input.mediaConsent),
    compliance: createComplianceBoundary(mode, input.mediaConsent),
    humanReviewRequests: [],
    textFallbackEnabled: mode === "text",
    transcriptDrawerOpen: false,
    contractVersion: LIVE_INTERVIEW_PROVIDER_CONTRACT_VERSION
  };
}

function assertMediaConsentForMode(
  mode: string,
  consent: LiveInterviewMediaConsent | undefined
): void {
  if (mode === "text") {
    return;
  }

  const consentIsValid =
    consent?.active === true &&
    consent.purpose === "interview_media_processing" &&
    consent.revokedAt == null &&
    consent.dataCategories.includes("raw_interview_media") &&
    consent.dataCategories.includes("interview_transcript");

  if (!consentIsValid) {
    throw new Error(
      "live_interview_media_consent_required: avatar/audio/video mode requires active interview_media_processing consent."
    );
  }
}

function createComplianceBoundary(
  mode: string,
  consent: LiveInterviewMediaConsent | undefined
): LiveInterviewComplianceBoundary {
  const mediaProcessingConsentRequired = mode !== "text";
  return {
    recommendationOnly: true,
    requiresMeaningfulHumanReview: true,
    scoringInput: "transcript_content_only",
    disallowedSignalUse: DISALLOWED_SIGNAL_USE,
    candidateTransparencyNotice: LIVE_INTERVIEW_TRANSPARENCY_NOTICE,
    employerSharing: "candidate_consent_and_sensitive_review_required",
    consent: {
      mediaProcessingConsentRecordId: consent?.consentRecordId ?? null,
      mediaProcessingConsentRequired,
      mediaProcessingConsentSatisfied: mediaProcessingConsentRequired ? consent?.active === true : true,
      textFallbackAvailableWithoutMediaConsent: true
    }
  };
}

function createRawMediaState(
  mode: string,
  consent: LiveInterviewMediaConsent | undefined
): LiveInterviewRawMediaState {
  const wouldCaptureMedia = mode !== "text" && consent?.active === true;
  return {
    stored: false,
    deleted: true,
    retentionHours: wouldCaptureMedia ? 24 : 0,
    deleteAfter: null,
    deletedAt: null,
    deletionFailureRequiresHumanReview: true
  };
}

function baseFallback() {
  return {
    active: false,
    mode: "none" as const,
    noNegativeScoreImpact: true as const,
    humanReviewRequired: false
  };
}

function mergeCaps(caps?: Partial<LiveInterviewSessionCaps>): LiveInterviewSessionCaps {
  return {
    ...DEFAULT_LIVE_INTERVIEW_SESSION_CAPS,
    ...caps
  };
}

function endSession(
  session: LiveInterviewProviderSession,
  input: {
    readonly status: LiveInterviewSessionStatus;
    readonly reason: LiveInterviewEndReason;
    readonly occurredAt: string;
  }
): LiveInterviewProviderSession {
  return {
    ...session,
    status: input.status,
    updatedAt: input.occurredAt,
    endedAt: input.occurredAt,
    endReason: input.reason,
    billingStoppedAt: input.occurredAt,
    rawMedia: {
      ...session.rawMedia,
      deleted: true,
      deletedAt: input.occurredAt
    }
  };
}

function statusForEndReason(reason: LiveInterviewEndReason): LiveInterviewSessionStatus {
  switch (reason) {
    case "completed":
    case "candidate_ended":
      return "completed";
    case "session_duration_cap_reached":
    case "transcript_event_cap_reached":
      return "expired";
    case "provider_disconnect":
    case "provider_disconnect_cap_reached":
      return "disconnected";
    case "technical_failure":
      return "failed";
  }
}

function assertSessionCanAcceptInput(session: LiveInterviewProviderSession): void {
  if (isTerminalStatus(session.status)) {
    throw new Error(`Live interview provider session ${session.providerSessionId} is ${session.status}.`);
  }
}

function isTerminalStatus(status: LiveInterviewSessionStatus): boolean {
  return ["completed", "disconnected", "expired", "failed"].includes(status);
}

function isPastSessionCap(session: LiveInterviewProviderSession, occurredAt: string): boolean {
  return new Date(occurredAt).getTime() > new Date(session.expiresAt).getTime();
}

function addReviewRequest(
  session: LiveInterviewProviderSession,
  reason: LiveInterviewHumanReviewRequest["reason"],
  createdAt: string
): LiveInterviewProviderSession {
  return {
    ...session,
    humanReviewRequests: [
      ...session.humanReviewRequests,
      createLiveInterviewHumanReviewRequest({ reason, session, createdAt })
    ]
  };
}

function asIsoString(value: string | undefined): string {
  return value ?? new Date().toISOString();
}

function addSeconds(isoDate: string, seconds: number): string {
  return new Date(new Date(isoDate).getTime() + seconds * 1000).toISOString();
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function copySession(session: LiveInterviewProviderSession): LiveInterviewProviderSession {
  return {
    ...session,
    caps: { ...session.caps },
    transcriptEvents: session.transcriptEvents.map((event) => ({
      ...event,
      evidenceHook: { ...event.evidenceHook }
    })),
    fallback: { ...session.fallback },
    rawMedia: { ...session.rawMedia },
    compliance: {
      ...session.compliance,
      disallowedSignalUse: [...session.compliance.disallowedSignalUse],
      consent: { ...session.compliance.consent }
    },
    humanReviewRequests: session.humanReviewRequests.map((request) => ({ ...request }))
  };
}
