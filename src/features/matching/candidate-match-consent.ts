import type {
  CompanyMatch,
  MatchExplanation,
} from "./matching-engine";
import { buildEmployerVisibility } from "./matching-engine";
import type {
  ConsentRecord,
  PrivacyDataCategory,
} from "../privacy/consent";

export const DEFAULT_MATCH_SHARING_CATEGORIES: PrivacyDataCategory[] = [
  "candidate_profile",
  "scorecard",
  "interview_transcript",
  "match_explanation",
  "company_match",
];

export const EXCLUDED_MATCH_SHARING_CATEGORIES: PrivacyDataCategory[] = [
  "raw_cv",
  "raw_interview_media",
];

export type CandidateMatchConsentDecision = "accepted" | "declined";

export type CandidateMatchDecisionRequest = {
  decision: CandidateMatchConsentDecision;
  decidedAt: string;
  candidateActorId: string;
  consentRecordId?: string;
  sharingSnapshotId?: string;
  auditEventId?: string;
  consentAuditEventId?: string;
  snapshotAuditEventId?: string;
  correlationId?: string;
  consentVersion?: string;
  dataCategories?: PrivacyDataCategory[];
};

export type MatchConsentAuditEvent = {
  audit_event_id: string;
  event_type:
    | "consent.changed"
    | "candidate.match_decision"
    | "candidate.sharing_snapshot_created";
  actor_type: "candidate";
  actor_id: string;
  occurred_at: string;
  target_type: "consent_record" | "company_match" | "candidate_sharing_snapshot";
  target_id: string;
  summary: string;
  details: Record<string, string | number | boolean | string[] | null>;
  consent_record_id: string | null;
  visibility_scope: "candidate_private" | "shared_with_specific_employer";
  correlation_id: string;
};

export type CandidateSharingSnapshot = {
  snapshotId: string;
  candidateId: string;
  companyId: string;
  roleId: string;
  companyMatchId: string;
  consentRecordId: string;
  status: "active";
  createdAt: string;
  expiresAt: null;
  sharedSections: string[];
  dataCategories: PrivacyDataCategory[];
  redactionPolicyVersion: string;
  auditEventId: string;
};

export type MatchSharingPreview = {
  consentRequired: true;
  companyId: string;
  roleId: string;
  companyMatchId: string;
  dataCategories: PrivacyDataCategory[];
  excludedCategories: PrivacyDataCategory[];
  humanReviewRequired: boolean;
  summary: string;
};

export type CandidateMatchDecisionResult = {
  match: CompanyMatch;
  auditEvents: MatchConsentAuditEvent[];
  consentRecord?: ConsentRecord;
  sharingSnapshot?: CandidateSharingSnapshot;
};

export function buildMatchSharingPreview(match: CompanyMatch): MatchSharingPreview {
  return {
    consentRequired: true,
    companyId: match.company_id,
    roleId: match.role_id,
    companyMatchId: match.match_id,
    dataCategories: [...DEFAULT_MATCH_SHARING_CATEGORIES],
    excludedCategories: [...EXCLUDED_MATCH_SHARING_CATEGORIES],
    humanReviewRequired: match.human_review_required,
    summary:
      "Accepting shares only the scoped profile, scorecard, transcript, match explanation, and match record for this company and role.",
  };
}

export function resolveEmployerSharingDataCategories(
  dataCategories?: readonly PrivacyDataCategory[],
): PrivacyDataCategory[] {
  const requestedCategories =
    dataCategories && dataCategories.length > 0
      ? dataCategories
      : DEFAULT_MATCH_SHARING_CATEGORIES;
  const shareableCategories = requestedCategories.filter(
    (category) =>
      DEFAULT_MATCH_SHARING_CATEGORIES.includes(category) &&
      !EXCLUDED_MATCH_SHARING_CATEGORIES.includes(category),
  );

  return shareableCategories.length > 0
    ? [...new Set(shareableCategories)]
    : [...DEFAULT_MATCH_SHARING_CATEGORIES];
}

export function recordCandidateMatchDecision(
  match: CompanyMatch,
  input: CandidateMatchDecisionRequest,
): CandidateMatchDecisionResult {
  if (input.decision === "accepted") {
    return acceptCandidateMatch(match, input);
  }

  return declineCandidateMatch(match, input);
}

function acceptCandidateMatch(
  match: CompanyMatch,
  input: CandidateMatchDecisionRequest,
): CandidateMatchDecisionResult {
  const ids = buildDecisionIds(match, input);
  const dataCategories = resolveEmployerSharingDataCategories(input.dataCategories);
  const consentRecord: ConsentRecord = {
    consentRecordId: ids.consentRecordId,
    candidateId: match.candidate_id,
    purpose: "employer_visibility",
    version: input.consentVersion ?? "privacy-v1",
    granted: true,
    grantedAt: input.decidedAt,
    revokedAt: null,
    dataCategories,
    scope: {
      companyIds: [match.company_id],
      roleIds: [match.role_id],
    },
    auditEventId: ids.consentAuditEventId,
    correlationId: ids.correlationId,
  };
  const sharingSnapshot: CandidateSharingSnapshot = {
    snapshotId: ids.sharingSnapshotId,
    candidateId: match.candidate_id,
    companyId: match.company_id,
    roleId: match.role_id,
    companyMatchId: match.match_id,
    consentRecordId: ids.consentRecordId,
    status: "active",
    createdAt: input.decidedAt,
    expiresAt: null,
    sharedSections: [
      "profile",
      "scorecard",
      "interview_transcript",
      "match_explanation",
    ],
    dataCategories,
    redactionPolicyVersion: "candidate-sharing-redaction-v1",
    auditEventId: ids.snapshotAuditEventId,
  };
  const updatedMatch: CompanyMatch = {
    ...match,
    status: "candidate_accepted",
    candidate_decision: {
      decision: "accepted",
      decided_at: input.decidedAt,
      consent_record_id: ids.consentRecordId,
      audit_event_id: ids.decisionAuditEventId,
    },
    employer_visibility: buildEmployerVisibility(
      {
        decision: "accepted",
        decided_at: input.decidedAt,
        consent_record_id: ids.consentRecordId,
        audit_event_id: ids.decisionAuditEventId,
      },
      match.match_id,
      ids.sharingSnapshotId,
    ),
    explanations: {
      ...match.explanations,
      employer_facing:
        match.explanations.employer_facing ?? buildEmployerExplanationForSharedMatch(match),
    },
  };

  return {
    match: updatedMatch,
    consentRecord,
    sharingSnapshot,
    auditEvents: [
      buildConsentAuditEvent(match, input, ids),
      buildDecisionAuditEvent(match, input, ids, ids.consentRecordId),
      buildSnapshotAuditEvent(match, input, ids),
    ],
  };
}

function declineCandidateMatch(
  match: CompanyMatch,
  input: CandidateMatchDecisionRequest,
): CandidateMatchDecisionResult {
  const ids = buildDecisionIds(match, input);
  const updatedMatch: CompanyMatch = {
    ...match,
    status: "candidate_declined",
    candidate_decision: {
      decision: "declined",
      decided_at: input.decidedAt,
      consent_record_id: null,
      audit_event_id: ids.decisionAuditEventId,
    },
    employer_visibility: buildEmployerVisibility(
      {
        decision: "declined",
        decided_at: input.decidedAt,
        consent_record_id: null,
        audit_event_id: ids.decisionAuditEventId,
      },
      match.match_id,
    ),
    explanations: {
      candidate_facing: match.explanations.candidate_facing,
    },
  };

  return {
    match: updatedMatch,
    auditEvents: [buildDecisionAuditEvent(match, input, ids, null)],
  };
}

function buildEmployerExplanationForSharedMatch(match: CompanyMatch): MatchExplanation {
  return {
    summary: `Candidate accepted sharing for this company-role match. Match score is ${match.match_score}/100 with ${match.match_confidence}/100 confidence and requires meaningful human review.`,
    supporting_evidence: match.explanations.candidate_facing.supporting_evidence,
    missing_evidence: match.explanations.candidate_facing.missing_evidence,
    risks_uncertainties: match.explanations.candidate_facing.risks_uncertainties,
    suggested_next_step:
      "Employer reviewer should inspect evidence, gaps, consent scope, and human-review requirements before any hiring decision.",
  };
}

function buildConsentAuditEvent(
  match: CompanyMatch,
  input: CandidateMatchDecisionRequest,
  ids: DecisionIds,
): MatchConsentAuditEvent {
  const dataCategories = resolveEmployerSharingDataCategories(input.dataCategories);

  return {
    audit_event_id: ids.consentAuditEventId,
    event_type: "consent.changed",
    actor_type: "candidate",
    actor_id: input.candidateActorId,
    occurred_at: input.decidedAt,
    target_type: "consent_record",
    target_id: ids.consentRecordId,
    summary: "Candidate granted employer visibility consent for one company-role match.",
    details: {
      decision: input.decision,
      candidate_id: match.candidate_id,
      company_id: match.company_id,
      role_id: match.role_id,
      company_match_id: match.match_id,
      data_categories: dataCategories,
      excluded_categories: EXCLUDED_MATCH_SHARING_CATEGORIES,
      consent_version: input.consentVersion ?? "privacy-v1",
    },
    consent_record_id: ids.consentRecordId,
    visibility_scope: "candidate_private",
    correlation_id: ids.correlationId,
  };
}

function buildDecisionAuditEvent(
  match: CompanyMatch,
  input: CandidateMatchDecisionRequest,
  ids: DecisionIds,
  consentRecordId: string | null,
): MatchConsentAuditEvent {
  return {
    audit_event_id: ids.decisionAuditEventId,
    event_type: "candidate.match_decision",
    actor_type: "candidate",
    actor_id: input.candidateActorId,
    occurred_at: input.decidedAt,
    target_type: "company_match",
    target_id: match.match_id,
    summary:
      input.decision === "accepted"
        ? "Candidate accepted company-role sharing."
        : "Candidate declined company-role sharing; employer remains blind.",
    details: {
      decision: input.decision,
      candidate_id: match.candidate_id,
      company_id: match.company_id,
      role_id: match.role_id,
      match_score_preserved: match.match_score,
      match_confidence_preserved: match.match_confidence,
      employer_visibility_state:
        input.decision === "accepted"
          ? "shared_after_candidate_consent"
          : "candidate_declined",
      human_review_required: match.human_review_required,
      recommendation_only: match.decision_policy.recommendation_only,
    },
    consent_record_id: consentRecordId,
    visibility_scope:
      input.decision === "accepted"
        ? "shared_with_specific_employer"
        : "candidate_private",
    correlation_id: ids.correlationId,
  };
}

function buildSnapshotAuditEvent(
  match: CompanyMatch,
  input: CandidateMatchDecisionRequest,
  ids: DecisionIds,
): MatchConsentAuditEvent {
  return {
    audit_event_id: ids.snapshotAuditEventId,
    event_type: "candidate.sharing_snapshot_created",
    actor_type: "candidate",
    actor_id: input.candidateActorId,
    occurred_at: input.decidedAt,
    target_type: "candidate_sharing_snapshot",
    target_id: ids.sharingSnapshotId,
    summary: "Candidate sharing snapshot created for accepted match.",
    details: {
      candidate_id: match.candidate_id,
      company_id: match.company_id,
      role_id: match.role_id,
      company_match_id: match.match_id,
      redaction_policy_version: "candidate-sharing-redaction-v1",
      raw_cv_shared: false,
      raw_interview_media_shared: false,
    },
    consent_record_id: ids.consentRecordId,
    visibility_scope: "shared_with_specific_employer",
    correlation_id: ids.correlationId,
  };
}

type DecisionIds = {
  consentRecordId: string;
  sharingSnapshotId: string;
  decisionAuditEventId: string;
  consentAuditEventId: string;
  snapshotAuditEventId: string;
  correlationId: string;
};

function buildDecisionIds(
  match: CompanyMatch,
  input: CandidateMatchDecisionRequest,
): DecisionIds {
  const matchId = sanitizeForId(match.match_id);

  return {
    consentRecordId: input.consentRecordId ?? `consent_${matchId}`,
    sharingSnapshotId: input.sharingSnapshotId ?? `snapshot_${matchId}`,
    decisionAuditEventId:
      input.auditEventId ?? `audit_candidate_match_decision_${matchId}`,
    consentAuditEventId:
      input.consentAuditEventId ?? `audit_consent_changed_${matchId}`,
    snapshotAuditEventId:
      input.snapshotAuditEventId ?? `audit_candidate_sharing_snapshot_${matchId}`,
    correlationId:
      input.correlationId ?? `candidate-match-decision-${match.match_id}-${input.decidedAt}`,
  };
}

function sanitizeForId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
