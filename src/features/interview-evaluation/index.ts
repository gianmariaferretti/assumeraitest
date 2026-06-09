import type {
  InterviewQuestion,
  InterviewResponse,
  InterviewSession,
  ModuleId,
} from "../interview-flow";
import {
  assessCompetencyScores,
  assessModuleScore,
  type CompetencyMeta,
  type CompetencyScore,
  type ModuleScore,
} from "../scoring/aggregation";
import type { BarsEvaluation, BarsLevel } from "../scoring/bars/types";
import { containsDisallowedQuestionText } from "../interview-flow/safety";

export const TRANSCRIPT_EVIDENCE_MODEL_VERSION = "transcript-evidence-capture-v0";
export const INTERVIEW_EVIDENCE_CAPTURE_VERSION = "interview-evidence-capture-v0";

export type TranscriptSource = "typed_text" | "transcribed_media";
export type TranscriptVisibilityScope =
  | "candidate_private"
  | "candidate_private_sensitive_review"
  | "employer_shareable_after_candidate_consent";

export type TranscriptEvent = {
  readonly event_id: string;
  readonly interview_session_id: string;
  readonly candidate_id: string;
  readonly question_id: string;
  readonly question_version: string;
  readonly module_id: ModuleId;
  readonly actor_type: "candidate";
  readonly source: TranscriptSource;
  readonly field: "answerText";
  readonly content: string;
  readonly occurred_at: string;
  readonly timestamp_start: string;
  readonly timestamp_end: string;
  readonly visibility_scope: TranscriptVisibilityScope;
  readonly sensitive_disclosure_review_required: boolean;
};

export type EvidenceAttribution = {
  readonly question_id: string;
  readonly question_version: string;
  readonly module_id: ModuleId;
  readonly evidence_requirement: string;
  readonly follow_up_reason: string | null;
};

export type TranscriptEvidenceSnippet = {
  readonly evidence_id: string;
  readonly source_type: "interview_transcript";
  readonly source_event_id: string;
  readonly interview_session_id: string;
  readonly question_id: string;
  readonly module_id: ModuleId;
  readonly field: "answerText";
  readonly snippet: string;
  readonly timestamp_start: string;
  readonly timestamp_end: string;
  readonly extraction_confidence: number;
  readonly attribution: EvidenceAttribution;
};

export type ConfidenceGapType = "missing_evidence" | "disallowed_signal_excluded";

export type MissingEvidenceConfidenceGap = {
  readonly gap_id: string;
  readonly gap_type: ConfidenceGapType;
  readonly interview_session_id: string;
  readonly question_id: string;
  readonly module_id: ModuleId;
  readonly missing_evidence: string;
  readonly reason: string;
  readonly confidence: number;
  readonly review_required: true;
  readonly score_impact: "none";
};

export type TranscriptEvidenceRetentionBoundary = {
  readonly transcript_data_category: "interview_transcript";
  readonly raw_media_data_category: "raw_interview_media";
  readonly raw_media_retention_is_separate: true;
  readonly raw_media_is_scoring_evidence: false;
  readonly transcript_is_scoring_evidence: true;
  readonly raw_media_retention_note: string;
};

export type TranscriptEvidenceAuditEvent = {
  readonly audit_event_id: string;
  readonly event_type: "score.generated";
  readonly actor_type: "system";
  readonly actor_id: null;
  readonly occurred_at: string;
  readonly target_type: "interview_transcript";
  readonly target_id: string;
  readonly summary: string;
  readonly details: Record<string, unknown>;
  readonly model_version: string;
  readonly scoring_version: string;
  readonly input_hash: string;
  readonly confidence: number;
  readonly consent_record_id: string | null;
  readonly visibility_scope: "candidate_private";
  readonly correlation_id: string;
};

export type TranscriptEvidenceHumanReviewRequest = {
  readonly review_request_id: string;
  readonly event_type: "human_review.requested";
  readonly reason: "missing_evidence" | "disallowed_signal_excluded";
  readonly interview_session_id: string;
  readonly candidate_id: string;
  readonly created_at: string;
  readonly related_confidence_gap_id: string;
  readonly score_impact: "none";
  readonly audit_event_id: string;
};

export type TranscriptEvidenceCapture = {
  readonly transcriptEvents: readonly TranscriptEvent[];
  readonly evidence: readonly TranscriptEvidenceSnippet[];
  readonly confidenceGaps: readonly MissingEvidenceConfidenceGap[];
  readonly humanReviewRequests: readonly TranscriptEvidenceHumanReviewRequest[];
  readonly retentionBoundary: TranscriptEvidenceRetentionBoundary;
  readonly auditEvent: TranscriptEvidenceAuditEvent;
};

export type CaptureTranscriptEvidenceInput = {
  readonly session: InterviewSession;
  readonly transcriptSource: TranscriptSource;
  readonly generatedAt?: string;
  readonly auditEventId?: string;
  readonly correlationId?: string;
  readonly inputHash?: string;
  readonly extractionConfidence?: number;
  readonly rawMediaAssetIds?: readonly string[];
};

export type InterviewResponseEvidenceAssessment = {
  readonly responseId: string;
  readonly questionId: string;
  readonly moduleId: ModuleId;
  readonly answerText: string;
  readonly score: number;
  readonly confidence: number;
  readonly wordCount: number;
  readonly evidenceSupported: boolean;
  readonly reviewNote: string;
  readonly matchedRoleTermCount: number;
  readonly hasEvidenceMarker: boolean;
};

export type InterviewSessionEvidenceAssessment = {
  readonly overallScore: number;
  readonly confidenceScore: number;
  readonly totalResponseCount: number;
  readonly usableResponseCount: number;
  readonly weakResponseCount: number;
  readonly evidenceSupported: boolean;
  readonly needsHumanReview: boolean;
  readonly missingEvidence: readonly string[];
  readonly responseAssessments: readonly InterviewResponseEvidenceAssessment[];
};

type ResponseContext = {
  readonly response: InterviewResponse;
  readonly question: InterviewQuestion;
  readonly sequence: number;
  readonly timestamp: string;
};

const DEFAULT_EXTRACTION_CONFIDENCE = 82;
const LOW_CONFIDENCE_GAP_CONFIDENCE = 35;
const MINIMUM_EVIDENCE_WORDS = 12;
const DEFAULT_INPUT_HASH = "transcript-evidence-input-hash-unset";

const EVIDENCE_MARKER_PATTERN =
  /\b(owned|shipped|built|added|tested|measured|documented|reduced|increased|delivered|debugged|designed|implemented|because|for example|result)\b/i;
const RESPONSE_EVIDENCE_MARKER_PATTERN =
  /\b(owned|coordinated|managed|led|built|tested|measured|documented|reduced|increased|delivered|designed|implemented|resolved|explained|prioritized|because|for example|result|tradeoff|evidence)\b/i;
const RESPONSE_SPECIFICITY_PATTERN =
  /\b(client|customer|family|stakeholder|reviewer|service|risk|sql|python|analysis|documented|artifact|tradeoff|outcome|process)\b|\d/i;
const MINIMUM_USABLE_RESPONSE_SCORE = 55;
const MINIMUM_REVIEW_READY_SCORE = 45;
const MINIMUM_REVIEW_READY_CONFIDENCE = 55;

const PLACEHOLDER_RESPONSE_PATTERNS: readonly RegExp[] = [
  /\b(run|start)\s+(the\s+)?(dev|developer)\s+server\b/i,
  /\b(let'?s\s+)?do\s+a\s+test\b/i,
  /\bcheck\s+and\s+confirm\b/i,
  /\bvery\s+important\b/i,
  /\bjust\s+testing\b/i,
  /\brandom\s+(answer|words?)\b/i,
  /^(ok|okay|yes|no|sure|fine)[.!?]?$/i,
];

const ROLE_TERM_STOP_WORDS = new Set([
  "about",
  "after",
  "answer",
  "based",
  "before",
  "brief",
  "candidate",
  "could",
  "describe",
  "evidence",
  "example",
  "experience",
  "from",
  "have",
  "into",
  "next",
  "planned",
  "prompt",
  "question",
  "requirement",
  "requires",
  "role",
  "should",
  "specific",
  "through",
  "where",
  "with",
  "would",
  "write",
]);

const DISALLOWED_SIGNAL_PATTERNS: ReadonlyArray<readonly [signal: string, pattern: RegExp]> = [
  ["accent", /\baccent(?:ed|s)?\b|\bnative\s+speaker\b/i],
  ["voice tone", /\bvoice\s+tone\b|\btone\s+of\s+voice\b/i],
  ["emotion", /\bemotion(?:al|s)?\b|\baffect\b|\bmood\b/i],
  ["face", /\bface\b|\bfacial\b|\bsmil(?:e|ed|ing)\b/i],
  ["biometric", /\bbiometric(?:s)?\b/i],
  ["personality", /\bpersonality\b|\btemperament\b/i],
  ["age", /\bage\b|\byears?\s+old\b|\bborn\b/i],
  ["race", /\brace\b|\bracial\b/i],
  ["ethnicity", /\bethnicity\b|\bethnic\b/i],
  ["religion", /\breligion\b|\breligious\b/i],
  ["gender", /\bgender\b/i],
  ["disability", /\bdisabilit(?:y|ies)\b/i],
  ["sexual orientation", /\bsexual\s+orientation\b/i],
  ["family status", /\bfamily\s+status\b|\bmarital\s+status\b/i],
  ["health", /\bhealth\b|\bmedical\b/i],
  ["pregnancy", /\bpregnan(?:t|cy)\b/i],
  ["caregiving", /\bcaregiv(?:er|ing)\b/i],
  ["nationality", /\bnationality\b/i],
];

export function assessInterviewSessionEvidence(
  session: InterviewSession,
): InterviewSessionEvidenceAssessment {
  const responseContexts = buildResponseContexts(session);
  const responseAssessments = responseContexts.map(assessInterviewResponseEvidence);
  const totalResponseCount = responseAssessments.length;
  const usableResponseCount = responseAssessments.filter(
    (assessment) => assessment.evidenceSupported,
  ).length;
  const weakResponseCount = totalResponseCount - usableResponseCount;
  const averageScore =
    totalResponseCount === 0
      ? 0
      : responseAssessments.reduce((total, assessment) => total + assessment.score, 0) /
        totalResponseCount;
  const usableRatio = totalResponseCount === 0 ? 0 : usableResponseCount / totalResponseCount;
  const confidenceScore = clampConfidence(
    20 + usableRatio * 35 + averageScore * 0.35 + (session.status === "completed" ? 8 : 0),
  );
  const overallScore = clampConfidence(averageScore);
  const evidenceSupported =
    totalResponseCount > 0 &&
    usableRatio >= 0.6 &&
    overallScore >= MINIMUM_REVIEW_READY_SCORE &&
    confidenceScore >= MINIMUM_REVIEW_READY_CONFIDENCE;
  const needsHumanReview =
    session.status !== "completed" ||
    !evidenceSupported ||
    confidenceScore < MINIMUM_REVIEW_READY_CONFIDENCE;

  return {
    overallScore,
    confidenceScore,
    totalResponseCount,
    usableResponseCount,
    weakResponseCount,
    evidenceSupported,
    needsHumanReview,
    missingEvidence: buildInterviewAssessmentMissingEvidence({
      session,
      totalResponseCount,
      usableResponseCount,
      weakResponseCount,
    }),
    responseAssessments,
  };
}

export function captureTranscriptEvidence(
  input: CaptureTranscriptEvidenceInput,
): TranscriptEvidenceCapture {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const extractionConfidence = clampConfidence(
    input.extractionConfidence ?? DEFAULT_EXTRACTION_CONFIDENCE,
  );
  const responseContexts = buildResponseContexts(input.session);
  const transcriptEvents = responseContexts.map((context) =>
    buildTranscriptEvent(input.session, input.transcriptSource, context),
  );

  const evidence: TranscriptEvidenceSnippet[] = [];
  const confidenceGaps: MissingEvidenceConfidenceGap[] = [];
  const excludedDisallowedSignals = new Set<string>();

  responseContexts.forEach((context, index) => {
    const transcriptEvent = transcriptEvents[index];
    const disallowedSignals = findDisallowedSignals(context.response.answerText);

    if (!transcriptEvent) {
      return;
    }

    if (disallowedSignals.length > 0) {
      for (const signal of disallowedSignals) {
        excludedDisallowedSignals.add(signal);
      }
      confidenceGaps.push(
        buildConfidenceGap({
          context,
          gapType: "disallowed_signal_excluded",
          reason: `Disallowed interview signals were excluded from evidence: ${disallowedSignals.join(
            ", ",
          )}.`,
        }),
      );
      return;
    }

    evidence.push(
      buildEvidenceSnippet({
        context,
        event: transcriptEvent,
        extractionConfidence,
        sessionId: input.session.sessionId,
      }),
    );

    if (needsMissingEvidenceGap(context.response.answerText)) {
      confidenceGaps.push(
        buildConfidenceGap({
          context,
          gapType: "missing_evidence",
          reason:
            "Answer does not provide enough concrete role-relevant evidence for confident review.",
        }),
      );
    }
  });

  const retentionBoundary = buildRetentionBoundary();
  const auditEvent = createTranscriptEvidenceAuditEvent({
    auditEventId: input.auditEventId,
    correlationId: input.correlationId,
    generatedAt,
    inputHash: input.inputHash ?? DEFAULT_INPUT_HASH,
    session: input.session,
    transcriptSource: input.transcriptSource,
    transcriptEvents,
    evidence,
    confidenceGaps,
    rawMediaAssetCount: input.rawMediaAssetIds?.length ?? 0,
    retentionBoundary,
    excludedDisallowedSignals: [...excludedDisallowedSignals],
  });
  const humanReviewRequests = buildHumanReviewRequests({
    session: input.session,
    confidenceGaps,
    generatedAt,
    auditEventId: auditEvent.audit_event_id,
  });
  const auditEventWithReviews: TranscriptEvidenceAuditEvent = {
    ...auditEvent,
    details: {
      ...auditEvent.details,
      human_review_request_ids: humanReviewRequests.map((request) => request.review_request_id),
      human_review_score_impact: "none",
    },
  };

  return {
    transcriptEvents,
    evidence,
    confidenceGaps,
    humanReviewRequests,
    retentionBoundary,
    auditEvent: auditEventWithReviews,
  };
}

export function createEmployerSafeTranscriptEvents(
  transcriptEvents: readonly TranscriptEvent[],
): TranscriptEvent[] {
  return transcriptEvents
    .filter((event) => event.visibility_scope !== "candidate_private_sensitive_review")
    .map((event) => ({
      ...event,
      visibility_scope: "employer_shareable_after_candidate_consent",
    }));
}

export function createTranscriptEvidenceAuditEvent(args: {
  readonly auditEventId?: string;
  readonly correlationId?: string;
  readonly generatedAt: string;
  readonly inputHash: string;
  readonly session: InterviewSession;
  readonly transcriptSource: TranscriptSource;
  readonly transcriptEvents: readonly TranscriptEvent[];
  readonly evidence: readonly TranscriptEvidenceSnippet[];
  readonly confidenceGaps: readonly MissingEvidenceConfidenceGap[];
  readonly rawMediaAssetCount: number;
  readonly retentionBoundary: TranscriptEvidenceRetentionBoundary;
  readonly excludedDisallowedSignals: readonly string[];
}): TranscriptEvidenceAuditEvent {
  return {
    audit_event_id:
      args.auditEventId ??
      `audit_transcript_evidence_${sanitizeForId(args.session.sessionId)}_${Date.parse(
        args.generatedAt,
      )}`,
    event_type: "score.generated",
    actor_type: "system",
    actor_id: null,
    occurred_at: args.generatedAt,
    target_type: "interview_transcript",
    target_id: args.session.sessionId,
    summary: buildAuditSummary(args.session.sessionId, args),
    details: {
      transcript_source: args.transcriptSource,
      transcript_event_ids: args.transcriptEvents.map((event) => event.event_id),
      evidence_ids: args.evidence.map((snippet) => snippet.evidence_id),
      confidence_gap_ids: args.confidenceGaps.map((gap) => gap.gap_id),
      question_ids: args.transcriptEvents.map((event) => event.question_id),
      raw_media_asset_count: args.rawMediaAssetCount,
      raw_media_retention_is_separate:
        args.retentionBoundary.raw_media_retention_is_separate,
      transcript_data_category: args.retentionBoundary.transcript_data_category,
      raw_media_data_category: args.retentionBoundary.raw_media_data_category,
      excluded_disallowed_signals: args.excludedDisallowedSignals,
      recommendation_only: true,
      requires_meaningful_human_review: true,
      no_hidden_automated_rejection: true,
    },
    model_version: TRANSCRIPT_EVIDENCE_MODEL_VERSION,
    scoring_version: INTERVIEW_EVIDENCE_CAPTURE_VERSION,
    input_hash: args.inputHash,
    confidence: auditConfidence(args.evidence, args.confidenceGaps),
    consent_record_id: null,
    visibility_scope: "candidate_private",
    correlation_id:
      args.correlationId ??
      `transcript-evidence-${args.session.sessionId}-${args.generatedAt}`,
  };
}

function buildResponseContexts(session: InterviewSession): ResponseContext[] {
  const questionsById = new Map(session.questions.map((question) => [question.id, question]));

  return session.responses.map((response, index) => {
    const question = questionsById.get(response.questionId);

    if (!question) {
      throw new Error(`Transcript response references unknown question ${response.questionId}.`);
    }

    return {
      response,
      question,
      sequence: index + 1,
      timestamp: formatOffset(session.createdAt, response.answeredAt),
    };
  });
}

function assessInterviewResponseEvidence(
  context: ResponseContext,
): InterviewResponseEvidenceAssessment {
  const answerText = context.response.answerText.trim();
  const answerWordCount = wordCount(answerText);
  const placeholder = isPlaceholderResponse(answerText);
  const matchedRoleTermCount = countMatchedRoleTerms(answerText, context.question);
  const hasEvidenceMarker = RESPONSE_EVIDENCE_MARKER_PATTERN.test(answerText);
  const hasSpecificity = RESPONSE_SPECIFICITY_PATTERN.test(answerText);

  if (answerWordCount < 6 || placeholder) {
    return {
      responseId: context.response.id,
      questionId: context.response.questionId,
      moduleId: context.response.moduleId,
      answerText,
      score: 8,
      confidence: 18,
      wordCount: answerWordCount,
      evidenceSupported: false,
      reviewNote:
        "This answer is too short or off-topic to support interview score evidence.",
      matchedRoleTermCount,
      hasEvidenceMarker,
    };
  }

  const score = clampConfidence(
    18 +
      Math.min(answerWordCount, 28) * 1.1 +
      Math.min(matchedRoleTermCount, 8) * 5 +
      (hasEvidenceMarker ? 18 : 0) +
      (hasSpecificity ? 8 : 0) -
      (answerWordCount < MINIMUM_EVIDENCE_WORDS ? 12 : 0),
  );
  const confidence = clampConfidence(
    30 + Math.min(answerWordCount, 30) + Math.min(matchedRoleTermCount, 8) * 4,
  );
  const evidenceSupported = score >= MINIMUM_USABLE_RESPONSE_SCORE;

  return {
    responseId: context.response.id,
    questionId: context.response.questionId,
    moduleId: context.response.moduleId,
    answerText,
    score,
    confidence,
    wordCount: answerWordCount,
    evidenceSupported,
    reviewNote: evidenceSupported
      ? "This answer provides role-relevant transcript evidence for candidate review."
      : "This answer needs a clearer example, artifact, result, or role-relevant detail.",
    matchedRoleTermCount,
    hasEvidenceMarker,
  };
}

function buildInterviewAssessmentMissingEvidence({
  session,
  totalResponseCount,
  usableResponseCount,
  weakResponseCount,
}: {
  readonly session: InterviewSession;
  readonly totalResponseCount: number;
  readonly usableResponseCount: number;
  readonly weakResponseCount: number;
}): readonly string[] {
  const missingEvidence = new Set<string>();

  if (session.status !== "completed") {
    missingEvidence.add("Complete the interview before final score explanations are ready.");
  }

  if (totalResponseCount === 0) {
    missingEvidence.add("No interview responses are available for scoring evidence.");
  }

  if (weakResponseCount > 0) {
    missingEvidence.add(
      "Interview answers were too short or off-topic to support score explanations.",
    );
  }

  if (usableResponseCount < totalResponseCount) {
    missingEvidence.add(
      `${weakResponseCount} of ${totalResponseCount} interview responses need concrete examples or artifacts.`,
    );
  }

  return [...missingEvidence];
}

function buildTranscriptEvent(
  session: InterviewSession,
  source: TranscriptSource,
  context: ResponseContext,
): TranscriptEvent {
  const sensitiveDisclosureReviewRequired =
    findDisallowedSignals(context.response.answerText).length > 0;

  return {
    event_id: `transcript_event_${sanitizeForId(session.sessionId)}_${sequenceId(
      context.sequence,
    )}`,
    interview_session_id: session.sessionId,
    candidate_id: session.candidateId,
    question_id: context.response.questionId,
    question_version: context.question.version,
    module_id: context.response.moduleId,
    actor_type: "candidate",
    source,
    field: "answerText",
    content: context.response.answerText,
    occurred_at: context.response.answeredAt,
    timestamp_start: context.timestamp,
    timestamp_end: context.timestamp,
    visibility_scope: sensitiveDisclosureReviewRequired
      ? "candidate_private_sensitive_review"
      : "candidate_private",
    sensitive_disclosure_review_required: sensitiveDisclosureReviewRequired,
  };
}

function buildEvidenceSnippet(args: {
  readonly context: ResponseContext;
  readonly event: TranscriptEvent;
  readonly extractionConfidence: number;
  readonly sessionId: string;
}): TranscriptEvidenceSnippet {
  return {
    evidence_id: `evidence_${sanitizeForId(args.sessionId)}_${sequenceId(
      args.context.sequence,
    )}`,
    source_type: "interview_transcript",
    source_event_id: args.event.event_id,
    interview_session_id: args.sessionId,
    question_id: args.context.response.questionId,
    module_id: args.context.response.moduleId,
    field: "answerText",
    snippet: createEvidenceSnippet(args.context.response.answerText),
    timestamp_start: args.event.timestamp_start,
    timestamp_end: args.event.timestamp_end,
    extraction_confidence: args.extractionConfidence,
    attribution: {
      question_id: args.context.response.questionId,
      question_version: args.context.question.version,
      module_id: args.context.response.moduleId,
      evidence_requirement: firstEvidenceRequirement(args.context.question),
      follow_up_reason: args.context.response.followUpReason ?? null,
    },
  };
}

function buildConfidenceGap(args: {
  readonly context: ResponseContext;
  readonly gapType: ConfidenceGapType;
  readonly reason: string;
}): MissingEvidenceConfidenceGap {
  const sessionId = interviewSessionIdFromResponseId(args.context.response.id);

  return {
    gap_id: `confidence_gap_${sanitizeForId(sessionId)}_${sequenceId(args.context.sequence)}`,
    gap_type: args.gapType,
    interview_session_id: sessionId,
    question_id: args.context.response.questionId,
    module_id: args.context.response.moduleId,
    missing_evidence: firstEvidenceRequirement(args.context.question),
    reason: args.reason,
    confidence: LOW_CONFIDENCE_GAP_CONFIDENCE,
    review_required: true,
    score_impact: "none",
  };
}

function buildHumanReviewRequests(args: {
  readonly session: InterviewSession;
  readonly confidenceGaps: readonly MissingEvidenceConfidenceGap[];
  readonly generatedAt: string;
  readonly auditEventId: string;
}): TranscriptEvidenceHumanReviewRequest[] {
  return args.confidenceGaps.map((gap, index) => ({
    review_request_id: `human_review_${sanitizeForId(args.session.sessionId)}_${sequenceId(
      index + 1,
    )}`,
    event_type: "human_review.requested",
    reason: gap.gap_type,
    interview_session_id: args.session.sessionId,
    candidate_id: args.session.candidateId,
    created_at: args.generatedAt,
    related_confidence_gap_id: gap.gap_id,
    score_impact: "none",
    audit_event_id: args.auditEventId,
  }));
}

function buildRetentionBoundary(): TranscriptEvidenceRetentionBoundary {
  return {
    transcript_data_category: "interview_transcript",
    raw_media_data_category: "raw_interview_media",
    raw_media_retention_is_separate: true,
    raw_media_is_scoring_evidence: false,
    transcript_is_scoring_evidence: true,
    raw_media_retention_note:
      "Raw interview media must be deleted after transcription/scoring according to RETENTION_HOURS_RAW_MEDIA; transcript evidence follows transcript/scorecard retention.",
  };
}

function needsMissingEvidenceGap(answerText: string): boolean {
  return wordCount(answerText) < MINIMUM_EVIDENCE_WORDS || !EVIDENCE_MARKER_PATTERN.test(answerText);
}

function isPlaceholderResponse(answerText: string): boolean {
  return PLACEHOLDER_RESPONSE_PATTERNS.some((pattern) => pattern.test(answerText));
}

function countMatchedRoleTerms(answerText: string, question: InterviewQuestion): number {
  const answerTerms = new Set(tokenizeForEvidence(answerText));
  const questionTerms = buildQuestionRoleTerms(question);
  let matchCount = 0;

  for (const term of questionTerms) {
    if (answerTerms.has(term)) {
      matchCount += 1;
    }
  }

  return matchCount;
}

function buildQuestionRoleTerms(question: InterviewQuestion): Set<string> {
  return new Set(
    [
      question.prompt,
      ...question.rubric,
      ...question.expectedSignals,
      ...question.evidenceRequirements,
    ].flatMap(tokenizeForEvidence),
  );
}

function tokenizeForEvidence(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 4 &&
        !ROLE_TERM_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token),
    );
}

function findDisallowedSignals(text: string): string[] {
  return DISALLOWED_SIGNAL_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(
    ([signal]) => signal,
  );
}

function createEvidenceSnippet(answerText: string): string {
  const normalized = answerText.trim().replace(/\s+/g, " ");
  return normalized.length <= 260 ? normalized : `${normalized.slice(0, 257).trim()}...`;
}

function firstEvidenceRequirement(question: InterviewQuestion): string {
  return question.evidenceRequirements[0] ?? "role-relevant answer evidence";
}

function buildAuditSummary(
  sessionId: string,
  args: {
    readonly transcriptEvents: readonly TranscriptEvent[];
    readonly evidence: readonly TranscriptEvidenceSnippet[];
    readonly confidenceGaps: readonly MissingEvidenceConfidenceGap[];
  },
): string {
  return `Captured ${args.transcriptEvents.length} transcript ${plural(
    args.transcriptEvents.length,
    "event",
  )}, ${args.evidence.length} evidence ${plural(
    args.evidence.length,
    "snippet",
  )}, and ${args.confidenceGaps.length} confidence ${plural(
    args.confidenceGaps.length,
    "gap",
  )} for ${sessionId}.`;
}

function auditConfidence(
  evidence: readonly TranscriptEvidenceSnippet[],
  confidenceGaps: readonly MissingEvidenceConfidenceGap[],
): number {
  if (evidence.length === 0 && confidenceGaps.length > 0) {
    return LOW_CONFIDENCE_GAP_CONFIDENCE;
  }

  if (evidence.length === 0) {
    return DEFAULT_EXTRACTION_CONFIDENCE;
  }

  return clampConfidence(
    evidence.reduce((total, snippet) => total + snippet.extraction_confidence, 0) /
      evidence.length,
  );
}

function formatOffset(startIso: string, endIso: string): string {
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  const seconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds].map(pad2).join(":");
}

function parseDate(value: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid transcript timestamp: ${value}`);
  }

  return parsed;
}

function wordCount(value: string): number {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_EXTRACTION_CONFIDENCE;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function sequenceId(value: number): string {
  return value.toString().padStart(3, "0");
}

function sanitizeForId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

function interviewSessionIdFromResponseId(responseId: string): string {
  const marker = "-response-";
  const markerIndex = responseId.lastIndexOf(marker);
  return markerIndex === -1 ? responseId : responseId.slice(0, markerIndex);
}

/* ------------------------------------------------------------------ *
 * Module scorecard aggregation (Phase 4 data layer)
 * ------------------------------------------------------------------ */

export const MODULE_SCORECARD_EXPLANATION_VERSION = "module-scorecard-explanation-v0";

/** Per-competency metadata: which module it belongs to, plus its BARS tier. */
export interface ModuleScoreMeta extends CompetencyMeta {
  moduleId: ModuleId | string;
}

/**
 * Roll per-answer BARS evaluations up to module scores. Evaluations are grouped
 * by competency (via `assessCompetencyScores`) and then by the module each
 * competency belongs to (`assessModuleScore`). A competency without module
 * metadata falls back to the "general" module so nothing is silently dropped.
 */
export function aggregateModuleScores(
  evaluations: readonly BarsEvaluation[],
  metaByCompetency: Readonly<Record<string, ModuleScoreMeta>> = {},
): ModuleScore[] {
  const competencyScores = assessCompetencyScores(evaluations, metaByCompetency);

  const byModule = new Map<string, CompetencyScore[]>();
  for (const competencyScore of competencyScores) {
    const moduleId = String(metaByCompetency[competencyScore.competency_id]?.moduleId ?? "general");
    const list = byModule.get(moduleId) ?? [];
    list.push(competencyScore);
    byModule.set(moduleId, list);
  }

  return [...byModule.entries()].map(([moduleId, scores]) => assessModuleScore(moduleId, scores));
}

export interface ModuleScorecardExplanation {
  module_id: string;
  bars_level: BarsLevel;
  bars_score: number;
  confidence: number;
  summary: string;
  evidence_cited: string[];
  human_review_required: boolean;
  version: string;
}

/**
 * Build a candidate-facing explanation for a single module score, citing the
 * concrete evidence snippets behind it. Snippets are re-checked against the
 * protected-trait filter so nothing disallowed ever surfaces, and a low score
 * is framed as an evidence gap for human review — never a quality judgment.
 */
export function buildModuleScorecardExplanation(
  moduleScore: ModuleScore,
): ModuleScorecardExplanation {
  const evidenceCited = unique(
    moduleScore.competencies
      .flatMap((competency) => competency.evidence_snippets)
      .filter((snippet) => snippet.trim().length > 0 && !containsDisallowedQuestionText(snippet)),
  ).slice(0, 6);

  const competencyCount = moduleScore.competencies.length;
  const reviewNote = moduleScore.human_review_required
    ? " A human reviewer will confirm this before any decision; a lower score reflects an evidence gap, not a judgment about you."
    : "";

  const summary =
    `This module scored ${moduleScore.bars_score}/10 (${humanizeLevel(moduleScore.bars_level)}) ` +
    `across ${competencyCount} ${plural(competencyCount, "competency area")}, ` +
    `based on the behavioral evidence you gave.${reviewNote}`;

  return {
    module_id: String(moduleScore.module_id),
    bars_level: moduleScore.bars_level,
    bars_score: moduleScore.bars_score,
    confidence: moduleScore.confidence,
    summary,
    evidence_cited: evidenceCited,
    human_review_required: moduleScore.human_review_required,
    version: MODULE_SCORECARD_EXPLANATION_VERSION,
  };
}

function humanizeLevel(level: BarsLevel): string {
  return level.replace(/_/g, " ");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
