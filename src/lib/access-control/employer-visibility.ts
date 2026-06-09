import {
  evaluateConsentRecords,
  type ConsentRecord,
  type PrivacyDataCategory,
} from "../../features/privacy/consent";

export type EmployerVisibleMatchStatus =
  | "candidate_visible"
  | "candidate_accepted"
  | "candidate_declined"
  | "employer_review"
  | "closed";

export type EmployerCandidateAccessDecisionReason =
  | "candidate_consent_active"
  | "candidate_consent_missing"
  | "candidate_consent_revoked"
  | "candidate_consent_scope_mismatch"
  | "candidate_match_not_accepted";

export type EmployerCandidateAccessDecision = {
  allowed: boolean;
  reason: EmployerCandidateAccessDecisionReason;
  auditEventType: "data.accessed";
  consentRecordId?: string;
};

export type EmployerCandidateAccessInput = {
  candidateId: string;
  companyId: string;
  roleId: string;
  requestedCategories: PrivacyDataCategory[];
  matchStatus: EmployerVisibleMatchStatus;
  consentRecords: ConsentRecord[];
};

const EMPLOYER_ACCESS_MATCH_STATUSES: EmployerVisibleMatchStatus[] = [
  "candidate_accepted",
  "employer_review",
];

export function evaluateEmployerCandidateAccess(
  input: EmployerCandidateAccessInput,
): EmployerCandidateAccessDecision {
  if (!EMPLOYER_ACCESS_MATCH_STATUSES.includes(input.matchStatus)) {
    return {
      allowed: false,
      reason: "candidate_match_not_accepted",
      auditEventType: "data.accessed",
    };
  }

  const consentDecision = evaluateConsentRecords(input.consentRecords, {
    candidateId: input.candidateId,
    purpose: "employer_visibility",
    companyId: input.companyId,
    roleId: input.roleId,
    dataCategories: input.requestedCategories,
  });

  return {
    allowed: consentDecision.allowed,
    reason: consentDecision.reason,
    auditEventType: "data.accessed",
    consentRecordId: consentDecision.consentRecordId,
  };
}
