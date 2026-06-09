export type ConsentPurpose =
  | "employer_visibility"
  | "raw_cv_retention"
  | "interview_media_processing"
  | "scorecard_sharing"
  | "matching_participation"
  | "data_export"
  | "data_deletion";

export type PrivacyDataCategory =
  | "candidate_profile"
  | "raw_cv"
  | "resume_parse"
  | "scorecard"
  | "interview_transcript"
  | "raw_interview_media"
  | "match_explanation"
  | "company_match"
  | "human_review"
  | "consent_records"
  | "audit_metadata";

export type ConsentScope = {
  companyIds?: string[];
  roleIds?: string[];
  allEmployers?: boolean;
};

export type ConsentRecord = {
  consentRecordId: string;
  candidateId: string;
  purpose: ConsentPurpose;
  version: string;
  granted: boolean;
  grantedAt: string;
  revokedAt: string | null;
  dataCategories: PrivacyDataCategory[];
  scope: ConsentScope;
  auditEventId: string;
  correlationId: string;
};

export type ConsentRequest = {
  candidateId: string;
  purpose: ConsentPurpose;
  dataCategories: PrivacyDataCategory[];
  companyId?: string;
  roleId?: string;
};

export type ConsentDecisionReason =
  | "candidate_consent_active"
  | "candidate_consent_missing"
  | "candidate_consent_revoked"
  | "candidate_consent_scope_mismatch";

export type ConsentDecision = {
  allowed: boolean;
  reason: ConsentDecisionReason;
  consentRecordId?: string;
};

export function evaluateConsentRecords(
  consentRecords: ConsentRecord[],
  request: ConsentRequest,
): ConsentDecision {
  const candidatePurposeRecords = consentRecords.filter(
    (record) =>
      record.candidateId === request.candidateId &&
      record.purpose === request.purpose,
  );

  const activeMatch = candidatePurposeRecords.find(
    (record) => isConsentActive(record) && consentCoversRequest(record, request),
  );

  if (activeMatch) {
    return {
      allowed: true,
      reason: "candidate_consent_active",
      consentRecordId: activeMatch.consentRecordId,
    };
  }

  if (candidatePurposeRecords.length === 0) {
    return {
      allowed: false,
      reason: "candidate_consent_missing",
    };
  }

  if (candidatePurposeRecords.every((record) => !isConsentActive(record))) {
    return {
      allowed: false,
      reason: "candidate_consent_revoked",
    };
  }

  return {
    allowed: false,
    reason: "candidate_consent_scope_mismatch",
  };
}

export function isConsentActive(record: ConsentRecord): boolean {
  return record.granted && record.revokedAt === null;
}

function consentCoversRequest(
  record: ConsentRecord,
  request: ConsentRequest,
): boolean {
  return (
    coversDataCategories(record.dataCategories, request.dataCategories) &&
    coversCompany(record.scope, request.companyId) &&
    coversRole(record.scope, request.roleId)
  );
}

function coversDataCategories(
  consentedCategories: PrivacyDataCategory[],
  requestedCategories: PrivacyDataCategory[],
): boolean {
  return requestedCategories.every((category) =>
    consentedCategories.includes(category),
  );
}

function coversCompany(scope: ConsentScope, companyId?: string): boolean {
  if (scope.allEmployers) {
    return true;
  }

  if (!companyId) {
    return true;
  }

  return scope.companyIds?.includes(companyId) ?? false;
}

function coversRole(scope: ConsentScope, roleId?: string): boolean {
  if (!roleId) {
    return true;
  }

  return scope.roleIds?.includes(roleId) ?? false;
}
