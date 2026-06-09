export type ComplianceMvpItemId =
  | "candidate_privacy_notice"
  | "ai_disclosure_before_interview"
  | "consent_acknowledgement_logging"
  | "no_automatic_rejection_without_human_review"
  | "human_review_request_button"
  | "candidate_data_export_delete_form"
  | "retention_auto_delete_settings"
  | "recruiter_audit_logs"
  | "model_prompt_rubric_version_logs"
  | "subprocessor_list"
  | "dpa_support"
  | "role_based_access_control"
  | "eu_data_hosting_option"
  | "dpia_template_export"
  | "bias_monitoring_reporting"
  | "incident_breach_workflow";

export type ComplianceMvpGroup =
  | "candidate_trust"
  | "human_review_audit"
  | "privacy_operations"
  | "legal_operations"
  | "risk_monitoring";

export type ComplianceMvpStatus = "implemented" | "partial" | "needs_build";

export type ComplianceMvpPriority = "P0" | "P1" | "P2";

export type ComplianceMvpSurface =
  | "candidate_flow"
  | "employer_review"
  | "admin_compliance"
  | "legal_ops";

export interface ComplianceMvpItem {
  readonly id: ComplianceMvpItemId;
  readonly label: string;
  readonly group: ComplianceMvpGroup;
  readonly priority: ComplianceMvpPriority;
  readonly status: ComplianceMvpStatus;
  readonly surface: ComplianceMvpSurface;
  readonly candidateFacing: boolean;
  readonly minimumMvp: string;
  readonly currentEvidence: readonly string[];
  readonly nextStep: string;
}

export interface ComplianceReadinessSummary {
  readonly total: number;
  readonly implemented: number;
  readonly partial: number;
  readonly needsBuild: number;
  readonly candidateFacingIds: readonly ComplianceMvpItemId[];
  readonly operationalIds: readonly ComplianceMvpItemId[];
}

export const complianceMvpChecklist = [
  {
    id: "candidate_privacy_notice",
    label: "Candidate privacy notice",
    group: "candidate_trust",
    priority: "P1",
    status: "partial",
    surface: "candidate_flow",
    candidateFacing: true,
    minimumMvp:
      "Show the notice before resume collection and version the accepted notice.",
    currentEvidence: [
      "src/components/candidate/ResumeUploadForm.tsx",
      "src/app/candidate/resume/upload/route.ts",
      "docs/PRIVACY_SECURITY_ETHICS.md"
    ],
    nextStep: "Persist the accepted notice version as a consent/audit record."
  },
  {
    id: "ai_disclosure_before_interview",
    label: "AI disclosure before interview",
    group: "candidate_trust",
    priority: "P1",
    status: "partial",
    surface: "candidate_flow",
    candidateFacing: true,
    minimumMvp:
      "Require acknowledgement before the interview route can open.",
    currentEvidence: [
      "src/app/candidate/interview/prepare/page.tsx",
      "src/app/candidate/interview/prepare/acknowledge/route.ts",
      "src/app/candidate/interview/page.tsx"
    ],
    nextStep: "Store acknowledgement records in durable audit storage."
  },
  {
    id: "consent_acknowledgement_logging",
    label: "Consent/acknowledgement logging",
    group: "candidate_trust",
    priority: "P0",
    status: "partial",
    surface: "admin_compliance",
    candidateFacing: false,
    minimumMvp:
      "Record privacy, AI disclosure, media, match, export, and deletion acknowledgements.",
    currentEvidence: [
      "src/features/privacy/consent.ts",
      "src/features/matching/candidate-match-consent.ts",
      "src/features/candidate-flow/interview-disclosure-acknowledgement.ts"
    ],
    nextStep: "Add persistent consent/audit repository writes for every acknowledgement."
  },
  {
    id: "no_automatic_rejection_without_human_review",
    label: "No automatic rejection without human review",
    group: "human_review_audit",
    priority: "P0",
    status: "partial",
    surface: "employer_review",
    candidateFacing: false,
    minimumMvp:
      "Block final reject/close actions unless a human review record with rationale exists.",
    currentEvidence: [
      "docs/HUMAN_REVIEW_POLICY.md",
      "src/components/employer/HiringDashboard.tsx",
      "src/components/employer/hiring-dashboard-model.ts"
    ],
    nextStep: "Enforce the review requirement at API and permission boundaries."
  },
  {
    id: "human_review_request_button",
    label: "Human-review request button",
    group: "candidate_trust",
    priority: "P1",
    status: "implemented",
    surface: "candidate_flow",
    candidateFacing: true,
    minimumMvp:
      "Let candidates ask for human review of scorecards, matches, profile, or access.",
    currentEvidence: [
      "src/app/candidate/data/page.tsx",
      "src/components/candidate/CandidateDataControls.tsx",
      "src/features/human-review/candidate-review-request.ts"
    ],
    nextStep: "Route queued requests to a reviewer inbox with SLA tracking."
  },
  {
    id: "candidate_data_export_delete_form",
    label: "Candidate data export/delete request form",
    group: "candidate_trust",
    priority: "P1",
    status: "implemented",
    surface: "candidate_flow",
    candidateFacing: true,
    minimumMvp:
      "Expose export and deletion requests with audit IDs and candidate-visible status.",
    currentEvidence: [
      "src/app/candidate/data/page.tsx",
      "src/components/candidate/CandidateDataControls.tsx",
      "src/features/privacy/data-rights.ts"
    ],
    nextStep: "Connect requests to persistent fulfillment jobs and notification status."
  },
  {
    id: "retention_auto_delete_settings",
    label: "Retention auto-delete settings",
    group: "privacy_operations",
    priority: "P1",
    status: "partial",
    surface: "admin_compliance",
    candidateFacing: true,
    minimumMvp:
      "Show retention timing and run deletion jobs with audit events.",
    currentEvidence: [
      "src/features/privacy/retention.ts",
      "src/components/candidate/CandidateDataControls.tsx"
    ],
    nextStep: "Add scheduled deletion runner, failure queue, and deletion audit persistence."
  },
  {
    id: "recruiter_audit_logs",
    label: "Recruiter audit logs",
    group: "human_review_audit",
    priority: "P1",
    status: "partial",
    surface: "admin_compliance",
    candidateFacing: false,
    minimumMvp:
      "Persist employer views, denied access, human review, and next-step actions.",
    currentEvidence: [
      "src/components/employer/HiringDashboard.tsx",
      "schemas/audit-event.schema.json"
    ],
    nextStep: "Add searchable audit log storage and access review filters."
  },
  {
    id: "model_prompt_rubric_version_logs",
    label: "Model/prompt/rubric version logs",
    group: "human_review_audit",
    priority: "P1",
    status: "partial",
    surface: "admin_compliance",
    candidateFacing: false,
    minimumMvp:
      "Include version IDs on scorecards, interview questions, prompts, and rubrics.",
    currentEvidence: [
      "docs/AUDIT_AND_EXPLAINABILITY.md",
      "src/features/scoring/resume/resume-score.ts",
      "src/features/interview-flow/question-bank.ts"
    ],
    nextStep: "Create a version registry and lifecycle log for every scoring artifact."
  },
  {
    id: "subprocessor_list",
    label: "Subprocessor list",
    group: "legal_operations",
    priority: "P1",
    status: "implemented",
    surface: "legal_ops",
    candidateFacing: false,
    minimumMvp:
      "List vendors, purpose, region, DPA/SCC status, and data categories.",
    currentEvidence: [
      "src/features/compliance/compliance-operations.ts",
      "src/app/subprocessors/page.tsx",
      "src/app/admin/compliance/page.tsx"
    ],
    nextStep: "Replace placeholder vendors with signed provider contracts before pilots."
  },
  {
    id: "dpa_support",
    label: "DPA support",
    group: "legal_operations",
    priority: "P2",
    status: "partial",
    surface: "legal_ops",
    candidateFacing: false,
    minimumMvp:
      "Provide DPA request workflow and counsel-approved template status.",
    currentEvidence: [
      "src/features/compliance/compliance-operations.ts",
      "src/app/admin/compliance/page.tsx"
    ],
    nextStep: "Attach counsel-approved DPA template and signing workflow."
  },
  {
    id: "role_based_access_control",
    label: "Role-based access control",
    group: "privacy_operations",
    priority: "P0",
    status: "partial",
    surface: "admin_compliance",
    candidateFacing: false,
    minimumMvp:
      "Enforce candidate, employer, reviewer, and admin roles at route/API boundaries.",
    currentEvidence: [
      "src/lib/access-control/employer-visibility.ts",
      "docs/PRIVACY_SECURITY_ETHICS.md"
    ],
    nextStep: "Add real auth/session role checks and deny-by-default route middleware."
  },
  {
    id: "eu_data_hosting_option",
    label: "EU data hosting option",
    group: "legal_operations",
    priority: "P2",
    status: "partial",
    surface: "legal_ops",
    candidateFacing: false,
    minimumMvp:
      "Document EU residency option and vendor region commitments.",
    currentEvidence: [
      "src/features/compliance/compliance-operations.ts",
      "src/app/admin/compliance/page.tsx"
    ],
    nextStep: "Bind region selection to deployment, storage, and provider configuration."
  },
  {
    id: "dpia_template_export",
    label: "DPIA template/export",
    group: "legal_operations",
    priority: "P1",
    status: "implemented",
    surface: "legal_ops",
    candidateFacing: false,
    minimumMvp:
      "Export a DPIA/FRAIA template populated from purposes, risks, and mitigations.",
    currentEvidence: [
      "src/features/compliance/compliance-operations.ts",
      "src/app/admin/compliance/page.tsx",
      "docs/GDPR_READINESS.md",
      "docs/EU_AI_ACT_READINESS.md"
    ],
    nextStep: "Add signed approval workflow and document storage."
  },
  {
    id: "bias_monitoring_reporting",
    label: "Bias monitoring/reporting",
    group: "risk_monitoring",
    priority: "P1",
    status: "partial",
    surface: "admin_compliance",
    candidateFacing: false,
    minimumMvp:
      "Report outcome, override, confidence, dispute, language-gate, and unknown-data metrics.",
    currentEvidence: [
      "src/features/compliance/compliance-operations.ts",
      "src/app/admin/compliance/page.tsx",
      "docs/EU_AI_ACT_READINESS.md",
      "docs/AUDIT_AND_EXPLAINABILITY.md"
    ],
    nextStep: "Connect reports to lawful outcome data and protected-trait collection process."
  },
  {
    id: "incident_breach_workflow",
    label: "Incident/breach workflow",
    group: "risk_monitoring",
    priority: "P0",
    status: "implemented",
    surface: "admin_compliance",
    candidateFacing: false,
    minimumMvp:
      "Track triage, containment, notification clock, owner, evidence, and closure.",
    currentEvidence: [
      "src/features/compliance/compliance-operations.ts",
      "src/app/admin/compliance/page.tsx",
      "docs/EU_AI_ACT_READINESS.md"
    ],
    nextStep: "Add persistent case management and notification templates."
  }
] as const satisfies readonly ComplianceMvpItem[];

export function buildComplianceReadinessSummary(
  items: readonly ComplianceMvpItem[] = complianceMvpChecklist
): ComplianceReadinessSummary {
  return {
    total: items.length,
    implemented: items.filter((item) => item.status === "implemented").length,
    partial: items.filter((item) => item.status === "partial").length,
    needsBuild: items.filter((item) => item.status === "needs_build").length,
    candidateFacingIds: items
      .filter((item) => item.candidateFacing)
      .map((item) => item.id),
    operationalIds: items
      .filter((item) => !item.candidateFacing)
      .map((item) => item.id)
  };
}

export function groupComplianceChecklist(
  items: readonly ComplianceMvpItem[] = complianceMvpChecklist
): ReadonlyArray<{
  readonly group: ComplianceMvpGroup;
  readonly items: readonly ComplianceMvpItem[];
}> {
  const groupOrder: readonly ComplianceMvpGroup[] = [
    "candidate_trust",
    "human_review_audit",
    "privacy_operations",
    "legal_operations",
    "risk_monitoring"
  ];

  return groupOrder.map((group) => ({
    group,
    items: items.filter((item) => item.group === group)
  }));
}
