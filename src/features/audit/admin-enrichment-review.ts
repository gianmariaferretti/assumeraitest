export type EnrichmentReviewKind =
  | "unknown_university"
  | "company_conflict"
  | "source_license_review"
  | "low_confidence_data";

export type EnrichmentSubjectType =
  | "candidate_education"
  | "company"
  | "data_source"
  | "match_enrichment";

export type LicenseReviewStatus =
  | "needs-review"
  | "review-only"
  | "licensed-required"
  | "approved-public";

export type AdminEnrichmentAction =
  | "approve_for_manual_context"
  | "block_scoring_use"
  | "mark_neutral_unknown"
  | "request_candidate_confirmation"
  | "request_more_evidence"
  | "request_source_license_review"
  | "resolve_conflict";

export type AdminEnrichmentOutcomeScope =
  | "manual_context"
  | "matching_calibration"
  | "candidate_scoring";

export type AdminReviewState =
  | "needs_admin_review"
  | "blocked_pending_provenance";

export type EnrichmentEvidence = {
  readonly evidenceId: string;
  readonly label: string;
  readonly source: string;
  readonly excerpt: string;
  readonly confidence: number;
};

export type EnrichmentSourceProvenance = {
  readonly sourceId: string;
  readonly publisher: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly licenseTermsNote: string;
  readonly licenseReviewStatus: LicenseReviewStatus;
  readonly updateCadence: string;
  readonly confidence: number;
  readonly staleAfterDate: string;
  readonly allowedUses: readonly string[];
  readonly disallowedUses: readonly string[];
  readonly scoringGate: string;
};

export type CandidateConsentBoundary = {
  readonly employerVisible: boolean;
  readonly candidateApprovedSharing: boolean;
  readonly consentRecordId: string | null;
};

export type EnrichmentReviewSubject = {
  readonly type: EnrichmentSubjectType;
  readonly id: string;
  readonly label: string;
  readonly candidateId?: string;
  readonly companyId?: string;
};

export type EnrichmentReviewInput = {
  readonly caseId: string;
  readonly kind: EnrichmentReviewKind;
  readonly subject: EnrichmentReviewSubject;
  readonly title: string;
  readonly summary: string;
  readonly confidence: number;
  readonly generatedAt: string;
  readonly enrichmentVersion: string;
  readonly evidence: readonly EnrichmentEvidence[];
  readonly missingData: readonly string[];
  readonly sourceProvenance?: EnrichmentSourceProvenance;
  readonly candidateConsent?: CandidateConsentBoundary;
  readonly sourceAuditEventIds?: readonly string[];
};

export type NeutralFallback = {
  readonly applies: boolean;
  readonly score: number | null;
  readonly label: string;
};

export type AdminEnrichmentReviewCase = EnrichmentReviewInput & {
  readonly reviewState: AdminReviewState;
  readonly priority: "critical" | "high" | "medium";
  readonly confidenceLabel: string;
  readonly candidateBoundaryLabel: string;
  readonly provenanceComplete: boolean;
  readonly neutralFallback: NeutralFallback;
  readonly riskFlags: readonly string[];
  readonly allowedActions: readonly AdminEnrichmentAction[];
  readonly scoringGate: {
    readonly state: "not_approved" | "review_gated_context";
    readonly canAffectCandidateScore: false;
    readonly canAffectMatching: false;
    readonly reason: string;
  };
  readonly decisionPolicy: {
    readonly recommendationOnly: true;
    readonly requiresMeaningfulHumanReview: true;
    readonly lowConfidenceMeansReview: true;
  };
};

export type AdminEnrichmentReviewQueue = {
  readonly cases: readonly AdminEnrichmentReviewCase[];
  readonly metrics: {
    readonly totalCases: number;
    readonly adminReviewRequired: number;
    readonly lowConfidenceCases: number;
    readonly sourceLicenseReviewCases: number;
    readonly unknownUniversityCases: number;
    readonly companyConflictCases: number;
  };
};

export type AdminEnrichmentReviewAuditInput = {
  readonly reviewerId: string;
  readonly action: AdminEnrichmentAction;
  readonly outcomeScope: AdminEnrichmentOutcomeScope;
  readonly rationale: string;
  readonly nextStep: string;
};

export type AdminEnrichmentReviewAuditEvent = {
  readonly audit_event_id: string;
  readonly event_type: "admin.action";
  readonly actor_type: "admin";
  readonly actor_id: string;
  readonly occurred_at: string;
  readonly target_type: "enrichment_review_case";
  readonly target_id: string;
  readonly summary: string;
  readonly details: Record<string, unknown>;
  readonly confidence: number;
  readonly visibility_scope: "admin_only";
  readonly consent_record_id: string | null;
  readonly correlation_id: string;
};

export function buildAdminEnrichmentReviewQueue(
  inputs: readonly EnrichmentReviewInput[]
): AdminEnrichmentReviewQueue {
  const cases = inputs.map(toReviewCase).sort(compareCases);

  return {
    cases,
    metrics: {
      totalCases: cases.length,
      adminReviewRequired: cases.filter(
        (caseItem) => caseItem.reviewState === "needs_admin_review"
      ).length,
      lowConfidenceCases: cases.filter((caseItem) => caseItem.confidence < 70)
        .length,
      sourceLicenseReviewCases: cases.filter(
        (caseItem) => caseItem.kind === "source_license_review"
      ).length,
      unknownUniversityCases: cases.filter(
        (caseItem) => caseItem.kind === "unknown_university"
      ).length,
      companyConflictCases: cases.filter(
        (caseItem) => caseItem.kind === "company_conflict"
      ).length
    }
  };
}

export function createAdminEnrichmentReviewAuditEvent(
  caseItem: AdminEnrichmentReviewCase,
  input: AdminEnrichmentReviewAuditInput,
  now = new Date()
): AdminEnrichmentReviewAuditEvent {
  const reviewerId = requireText(input.reviewerId, "reviewer ID");
  const rationale = requireText(input.rationale, "review rationale");
  const nextStep = requireText(input.nextStep, "next step");

  if (input.outcomeScope !== "manual_context") {
    throw new Error(
      "This task cannot approve enrichment for scoring or matching use; use manual context only and create a separate versioned scoring task."
    );
  }

  if (!caseItem.allowedActions.includes(input.action)) {
    throw new Error(
      `Action ${input.action} is not allowed for ${caseItem.kind} review cases.`
    );
  }

  const occurredAt = now.toISOString();

  return {
    audit_event_id: `audit_admin_enrichment_${sanitizeForId(caseItem.caseId)}_${now.getTime()}`,
    event_type: "admin.action",
    actor_type: "admin",
    actor_id: reviewerId,
    occurred_at: occurredAt,
    target_type: "enrichment_review_case",
    target_id: caseItem.caseId,
    summary: `Admin enrichment review ${formatAction(
      input.action
    )} for ${caseItem.subject.label}.`,
    details: buildAuditDetails(caseItem, input, rationale, nextStep),
    confidence: caseItem.confidence,
    visibility_scope: "admin_only",
    consent_record_id: caseItem.candidateConsent?.consentRecordId ?? null,
    correlation_id: `admin-enrichment-review-${caseItem.caseId}-${occurredAt}`
  };
}

function toReviewCase(input: EnrichmentReviewInput): AdminEnrichmentReviewCase {
  const provenanceComplete = hasCompleteProvenance(input.sourceProvenance);
  const riskFlags = getRiskFlags(input, provenanceComplete);

  return {
    ...input,
    reviewState: provenanceComplete
      ? "needs_admin_review"
      : "blocked_pending_provenance",
    priority: getPriority(input, provenanceComplete),
    confidenceLabel: `${Math.round(input.confidence)}% confidence`,
    candidateBoundaryLabel: getCandidateBoundaryLabel(input.candidateConsent),
    provenanceComplete,
    neutralFallback: getNeutralFallback(input.kind),
    riskFlags,
    allowedActions: getAllowedActions(input.kind),
    scoringGate: {
      state:
        input.sourceProvenance?.licenseReviewStatus === "approved-public"
          ? "review_gated_context"
          : "not_approved",
      canAffectCandidateScore: false,
      canAffectMatching: false,
      reason:
        "Enrichment review may support manual context only. Scoring or matching use requires separate source governance, fairness review, tests, and version bump."
    },
    decisionPolicy: {
      recommendationOnly: true,
      requiresMeaningfulHumanReview: true,
      lowConfidenceMeansReview: true
    }
  };
}

function buildAuditDetails(
  caseItem: AdminEnrichmentReviewCase,
  input: AdminEnrichmentReviewAuditInput,
  rationale: string,
  nextStep: string
): Record<string, unknown> {
  return {
    case_id: caseItem.caseId,
    kind: caseItem.kind,
    subject_type: caseItem.subject.type,
    subject_id: caseItem.subject.id,
    subject_label: caseItem.subject.label,
    candidate_id: caseItem.subject.candidateId ?? null,
    company_id: caseItem.subject.companyId ?? null,
    action: input.action,
    outcome_scope: input.outcomeScope,
    rationale,
    next_step: nextStep,
    enrichment_version: caseItem.enrichmentVersion,
    generated_at: caseItem.generatedAt,
    confidence: caseItem.confidence,
    evidence_count: caseItem.evidence.length,
    missing_data: caseItem.missingData,
    risk_flags: caseItem.riskFlags,
    source_audit_event_ids: caseItem.sourceAuditEventIds ?? [],
    recommendation_only: caseItem.decisionPolicy.recommendationOnly,
    requires_meaningful_human_review:
      caseItem.decisionPolicy.requiresMeaningfulHumanReview,
    low_confidence_means_review:
      caseItem.decisionPolicy.lowConfidenceMeansReview,
    can_affect_candidate_score: caseItem.scoringGate.canAffectCandidateScore,
    can_affect_matching: caseItem.scoringGate.canAffectMatching,
    scoring_gate_state: caseItem.scoringGate.state,
    employer_visible: caseItem.candidateConsent?.employerVisible ?? false,
    candidate_approved_sharing:
      caseItem.candidateConsent?.candidateApprovedSharing ?? false,
    candidate_consent_record_id: caseItem.candidateConsent?.consentRecordId ?? null,
    ...getSourceAuditDetails(caseItem.sourceProvenance)
  };
}

function getSourceAuditDetails(
  sourceProvenance: EnrichmentSourceProvenance | undefined
): Record<string, unknown> {
  if (!sourceProvenance) {
    return {
      source_id: null,
      source_url: null,
      publisher: null,
      retrieved_at: null,
      license_review_status: null,
      license_terms_note: null,
      update_cadence: null,
      stale_after_date: null,
      allowed_uses: [],
      disallowed_uses: []
    };
  }

  return {
    source_id: sourceProvenance.sourceId,
    source_url: sourceProvenance.sourceUrl,
    publisher: sourceProvenance.publisher,
    retrieved_at: sourceProvenance.retrievedAt,
    license_review_status: sourceProvenance.licenseReviewStatus,
    license_terms_note: sourceProvenance.licenseTermsNote,
    update_cadence: sourceProvenance.updateCadence,
    stale_after_date: sourceProvenance.staleAfterDate,
    source_confidence: sourceProvenance.confidence,
    allowed_uses: sourceProvenance.allowedUses,
    disallowed_uses: sourceProvenance.disallowedUses,
    source_scoring_gate: sourceProvenance.scoringGate
  };
}

function hasCompleteProvenance(
  sourceProvenance: EnrichmentSourceProvenance | undefined
): boolean {
  if (!sourceProvenance) {
    return false;
  }

  return [
    sourceProvenance.sourceId,
    sourceProvenance.publisher,
    sourceProvenance.sourceUrl,
    sourceProvenance.retrievedAt,
    sourceProvenance.licenseTermsNote,
    sourceProvenance.licenseReviewStatus,
    sourceProvenance.updateCadence,
    sourceProvenance.staleAfterDate,
    sourceProvenance.scoringGate
  ].every((value) => value.trim().length > 0);
}

function getCandidateBoundaryLabel(
  candidateConsent: CandidateConsentBoundary | undefined
): string {
  if (!candidateConsent) {
    return "No candidate data attached";
  }

  if (
    candidateConsent.employerVisible &&
    candidateConsent.candidateApprovedSharing &&
    candidateConsent.consentRecordId
  ) {
    return "Candidate-approved sharing recorded";
  }

  return "Candidate-owned; employer not visible";
}

function getNeutralFallback(kind: EnrichmentReviewKind): NeutralFallback {
  if (kind === "unknown_university") {
    return {
      applies: true,
      score: 50,
      label: "Unknown university: neutral prior, enrichment needed"
    };
  }

  return {
    applies: false,
    score: null,
    label: "No neutral fallback required"
  };
}

function getRiskFlags(
  input: EnrichmentReviewInput,
  provenanceComplete: boolean
): string[] {
  const flags: string[] = [];

  if (input.confidence < 70) {
    flags.push("Low confidence means manual review, not candidate weakness.");
  }

  if (!provenanceComplete) {
    flags.push("Source provenance is incomplete; block enrichment use.");
  }

  if (input.kind === "unknown_university") {
    flags.push(
      "Unknown institution uses neutral prior; do not treat it as a negative signal."
    );
  }

  if (input.kind === "company_conflict") {
    flags.push(
      "Company enrichment is candidate-facing context and preference fit, not a hidden candidate-quality signal."
    );
  }

  if (input.kind === "source_license_review") {
    flags.push(
      "Source licensing must be reviewed before any snapshot, calibration, scoring, or matching use."
    );
  }

  return flags;
}

function getAllowedActions(
  kind: EnrichmentReviewKind
): readonly AdminEnrichmentAction[] {
  const sharedActions: AdminEnrichmentAction[] = [
    "request_more_evidence",
    "block_scoring_use",
    "approve_for_manual_context"
  ];

  if (kind === "unknown_university") {
    return [
      "mark_neutral_unknown",
      "request_candidate_confirmation",
      ...sharedActions
    ];
  }

  if (kind === "company_conflict") {
    return ["resolve_conflict", ...sharedActions];
  }

  if (kind === "source_license_review") {
    return ["request_source_license_review", ...sharedActions];
  }

  return sharedActions;
}

function getPriority(
  input: EnrichmentReviewInput,
  provenanceComplete: boolean
): "critical" | "high" | "medium" {
  if (!provenanceComplete || input.kind === "source_license_review") {
    return "critical";
  }

  if (input.confidence < 50 || input.kind === "unknown_university") {
    return "high";
  }

  return "medium";
}

function compareCases(
  left: AdminEnrichmentReviewCase,
  right: AdminEnrichmentReviewCase
): number {
  const priorityOrder = { critical: 0, high: 1, medium: 2 };
  const priorityDiff =
    priorityOrder[left.priority] - priorityOrder[right.priority];

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return left.confidence - right.confidence;
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Admin enrichment review requires ${label}.`);
  }

  return normalized;
}

function sanitizeForId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function formatAction(value: AdminEnrichmentAction): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
