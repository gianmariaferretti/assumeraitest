import type { ComplianceMvpItemId } from "./mvp-compliance-checklist";

export type ComplianceControlStatus =
  | "mvp_ready"
  | "operational_partial"
  | "legal_review_required";

export type ComplianceSurface =
  | "candidate"
  | "recruiter"
  | "admin"
  | "legal_ops";

export type AdminRole =
  | "interview_reviewer"
  | "hiring_manager"
  | "hr_admin"
  | "compliance_admin"
  | "super_admin"
  | "external_interviewer";

export type CompliancePermission =
  | "view_assigned_candidate"
  | "record_human_review"
  | "view_audit_logs"
  | "manage_retention"
  | "manage_subprocessors"
  | "export_dpia"
  | "manage_incidents"
  | "manage_region"
  | "view_bias_reports"
  | "view_sensitive_data";

export interface ComplianceOperationalControl {
  readonly checklistId: ComplianceMvpItemId;
  readonly title: string;
  readonly status: ComplianceControlStatus;
  readonly surface: ComplianceSurface;
  readonly visibleInApp: true;
  readonly owner: string;
  readonly artifacts: readonly string[];
  readonly evidenceToLog: readonly string[];
  readonly remainingHardening: readonly string[];
}

export interface RbacRoleRule {
  readonly role: AdminRole;
  readonly scope: string;
  readonly permissions: readonly CompliancePermission[];
  readonly accessExpiryRequired: boolean;
  readonly sensitiveDataRequiresReason: boolean;
  readonly auditLogged: true;
}

export interface SubprocessorRecord {
  readonly name: string;
  readonly purpose: string;
  readonly region: "EU" | "US" | "Global";
  readonly dataShared: readonly string[];
  readonly transferMechanism: string;
  readonly retention: string;
  readonly dpaStatus: "required" | "in_review" | "approved" | "not_applicable";
  readonly canBeDisabledForEuOnly: boolean;
}

export interface DpaSupport {
  readonly status: "template_in_review";
  readonly owner: string;
  readonly requestChannel: string;
  readonly exposes: readonly string[];
  readonly unresolvedLegalQuestions: readonly string[];
}

export interface DataRegionOption {
  readonly id: "eu_only" | "global_with_safeguards";
  readonly label: string;
  readonly defaultForNewEmployer: boolean;
  readonly subprocessorsAllowed: readonly string[];
  readonly transferNotice: string;
  readonly requiresLegalApproval: boolean;
}

export interface RetentionControl {
  readonly category: string;
  readonly defaultPeriod: string;
  readonly legalHoldSupported: boolean;
  readonly deletionAuditEvent: string;
  readonly failureQueueRequired: boolean;
}

export interface AuditLogView {
  readonly eventType: string;
  readonly actorTypes: readonly string[];
  readonly targetTypes: readonly string[];
  readonly requiredFields: readonly string[];
}

export interface ModelVersionRecord {
  readonly artifact: "model" | "prompt" | "rubric" | "question_bank" | "scoring_formula";
  readonly versionId: string;
  readonly appliesTo: string;
  readonly status: "active" | "monitoring" | "retired";
  readonly auditRequired: true;
}

export interface DpiaTemplate {
  readonly title: string;
  readonly processingPurposes: readonly string[];
  readonly dataCategories: readonly string[];
  readonly highRiskReasons: readonly string[];
  readonly riskRegister: readonly {
    readonly risk: string;
    readonly mitigation: string;
    readonly owner: string;
  }[];
  readonly approvals: readonly string[];
}

export interface BiasMonitoringReport {
  readonly reportId: string;
  readonly protectedTraitHandling: "lawful_collection_only_no_inference";
  readonly metrics: readonly {
    readonly name: string;
    readonly purpose: string;
    readonly alertRule: string;
  }[];
  readonly exportable: true;
}

export interface IncidentWorkflow {
  readonly incidentId: string;
  readonly status: "triage" | "contained" | "notifiable_assessment" | "closed";
  readonly detectedAt: string;
  readonly gdprAssessmentDueAt: string;
  readonly affectedSubjects: readonly string[];
  readonly affectedControllers: readonly string[];
  readonly evidenceLog: readonly string[];
  readonly auditEventId: string;
}

export interface TrainingDataControl {
  readonly defaultUse: "not_used_for_shared_model_training";
  readonly optInRequired: true;
  readonly tenantExclusionSupported: true;
  readonly datasetLineageRequired: true;
  readonly candidateWithdrawalSupported: true;
}

export interface ComplianceOperationsCenter {
  readonly controls: readonly ComplianceOperationalControl[];
  readonly rbac: readonly RbacRoleRule[];
  readonly subprocessors: readonly SubprocessorRecord[];
  readonly dpa: DpaSupport;
  readonly dataRegions: readonly DataRegionOption[];
  readonly retention: readonly RetentionControl[];
  readonly auditLogViews: readonly AuditLogView[];
  readonly modelVersions: readonly ModelVersionRecord[];
  readonly dpia: DpiaTemplate;
  readonly biasMonitoring: BiasMonitoringReport;
  readonly incidentWorkflowTemplate: IncidentWorkflow;
  readonly trainingDataControl: TrainingDataControl;
}

export const complianceOperationalControls: readonly ComplianceOperationalControl[] = [
  {
    checklistId: "candidate_privacy_notice",
    title: "Candidate privacy notice before collection",
    status: "mvp_ready",
    surface: "candidate",
    visibleInApp: true,
    owner: "Candidate flow",
    artifacts: [
      "/candidate/resume",
      "src/components/candidate/ResumeUploadForm.tsx",
      "src/features/candidate-flow/pre-resume-consent-gate.ts"
    ],
    evidenceToLog: ["notice_version", "accepted_at", "candidate_id", "correlation_id"],
    remainingHardening: ["Persist acceptance in durable consent storage."]
  },
  {
    checklistId: "ai_disclosure_before_interview",
    title: "AI disclosure before interview",
    status: "mvp_ready",
    surface: "candidate",
    visibleInApp: true,
    owner: "Candidate interview",
    artifacts: [
      "/candidate/interview/prepare",
      "src/features/candidate-flow/interview-disclosure-acknowledgement.ts"
    ],
    evidenceToLog: ["ai_notice_version", "acknowledged_at", "audit_event_id"],
    remainingHardening: ["Persist acknowledgement records beyond cookies."]
  },
  {
    checklistId: "consent_acknowledgement_logging",
    title: "Consent and acknowledgement logging",
    status: "operational_partial",
    surface: "admin",
    visibleInApp: true,
    owner: "Compliance admin",
    artifacts: ["src/features/privacy/consent.ts", "schemas/audit-event.schema.json"],
    evidenceToLog: ["purpose", "scope", "version", "revocation_state", "audit_event_id"],
    remainingHardening: ["Add append-only audit repository."]
  },
  {
    checklistId: "no_automatic_rejection_without_human_review",
    title: "No automatic rejection without human review",
    status: "mvp_ready",
    surface: "recruiter",
    visibleInApp: true,
    owner: "Employer review",
    artifacts: ["/employer", "src/components/employer/HiringDashboard.tsx"],
    evidenceToLog: ["reviewer_id", "decision", "reason", "reviewed_at", "audit_event_id"],
    remainingHardening: ["Enforce at API boundary when backend decisions are added."]
  },
  {
    checklistId: "human_review_request_button",
    title: "Candidate human-review request",
    status: "mvp_ready",
    surface: "candidate",
    visibleInApp: true,
    owner: "Candidate portal",
    artifacts: ["/candidate/results", "/candidate/data", "src/features/human-review/candidate-review-request.ts"],
    evidenceToLog: ["target_type", "target_id", "summary", "requested_at", "audit_event_id"],
    remainingHardening: ["Route queued requests to reviewer inbox."]
  },
  {
    checklistId: "candidate_data_export_delete_form",
    title: "Candidate data export and deletion",
    status: "mvp_ready",
    surface: "candidate",
    visibleInApp: true,
    owner: "Privacy operations",
    artifacts: ["/candidate/data", "src/features/privacy/data-rights.ts"],
    evidenceToLog: ["request_type", "data_categories", "status", "audit_event_id"],
    remainingHardening: ["Connect to fulfillment jobs and notifications."]
  },
  {
    checklistId: "retention_auto_delete_settings",
    title: "Retention and auto-delete settings",
    status: "operational_partial",
    surface: "admin",
    visibleInApp: true,
    owner: "Privacy operations",
    artifacts: ["src/features/privacy/retention.ts", "/admin/compliance"],
    evidenceToLog: ["category", "delete_after", "legal_hold", "deletion_audit_event"],
    remainingHardening: ["Add scheduled deletion worker and failure queue."]
  },
  {
    checklistId: "recruiter_audit_logs",
    title: "Recruiter audit logs",
    status: "operational_partial",
    surface: "admin",
    visibleInApp: true,
    owner: "Compliance admin",
    artifacts: ["schemas/audit-event.schema.json", "/admin/compliance"],
    evidenceToLog: ["actor_id", "event_type", "target_id", "occurred_at", "correlation_id"],
    remainingHardening: ["Store immutable logs and add filters/search."]
  },
  {
    checklistId: "model_prompt_rubric_version_logs",
    title: "Model, prompt, and rubric versions",
    status: "operational_partial",
    surface: "admin",
    visibleInApp: true,
    owner: "AI governance",
    artifacts: ["src/features/scoring/resume/resume-score.ts", "src/features/interview-flow/question-bank.ts"],
    evidenceToLog: ["model_version", "prompt_version", "rubric_version", "generated_at"],
    remainingHardening: ["Add version lifecycle registry persistence."]
  },
  {
    checklistId: "subprocessor_list",
    title: "Subprocessor list",
    status: "mvp_ready",
    surface: "legal_ops",
    visibleInApp: true,
    owner: "Legal operations",
    artifacts: ["/subprocessors", "/admin/compliance"],
    evidenceToLog: ["provider", "purpose", "region", "transfer_mechanism", "dpa_status"],
    remainingHardening: ["Replace placeholder vendors with signed provider contracts."]
  },
  {
    checklistId: "dpa_support",
    title: "DPA support",
    status: "legal_review_required",
    surface: "legal_ops",
    visibleInApp: true,
    owner: "Legal operations",
    artifacts: ["/admin/compliance"],
    evidenceToLog: ["requester", "template_version", "approval_state", "requested_at"],
    remainingHardening: ["Attach counsel-approved DPA template and signing workflow."]
  },
  {
    checklistId: "role_based_access_control",
    title: "Role-based access control",
    status: "operational_partial",
    surface: "admin",
    visibleInApp: true,
    owner: "Security",
    artifacts: ["src/lib/access-control/employer-visibility.ts", "/admin/compliance"],
    evidenceToLog: ["role", "permission", "decision", "reason", "audit_event_id"],
    remainingHardening: ["Add auth/session middleware and deny-by-default API checks."]
  },
  {
    checklistId: "eu_data_hosting_option",
    title: "EU data hosting option",
    status: "operational_partial",
    surface: "legal_ops",
    visibleInApp: true,
    owner: "Infrastructure",
    artifacts: ["/admin/compliance"],
    evidenceToLog: ["region_option", "subprocessors_allowed", "transfer_notice_version"],
    remainingHardening: ["Bind setting to deployment and storage providers."]
  },
  {
    checklistId: "dpia_template_export",
    title: "DPIA and FRAIA template export",
    status: "mvp_ready",
    surface: "legal_ops",
    visibleInApp: true,
    owner: "Compliance admin",
    artifacts: ["/admin/compliance", "buildDpiaExportMarkdown"],
    evidenceToLog: ["template_version", "exported_by", "exported_at", "approval_state"],
    remainingHardening: ["Add signed approval workflow and document storage."]
  },
  {
    checklistId: "bias_monitoring_reporting",
    title: "Bias and discrimination monitoring",
    status: "operational_partial",
    surface: "admin",
    visibleInApp: true,
    owner: "AI governance",
    artifacts: ["/admin/compliance"],
    evidenceToLog: ["metric", "window", "alert_state", "protected_trait_source"],
    remainingHardening: ["Connect to lawful outcome data and protected-trait collection process."]
  },
  {
    checklistId: "incident_breach_workflow",
    title: "Incident and breach workflow",
    status: "mvp_ready",
    surface: "admin",
    visibleInApp: true,
    owner: "Security",
    artifacts: ["/admin/compliance", "createIncidentWorkflow"],
    evidenceToLog: ["incident_id", "severity", "detected_at", "assessment_due_at", "owner"],
    remainingHardening: ["Add persistent case management and notification templates."]
  }
];

export const rbacMatrix: readonly RbacRoleRule[] = [
  {
    role: "interview_reviewer",
    scope: "Assigned candidates only",
    permissions: ["view_assigned_candidate", "record_human_review"],
    accessExpiryRequired: true,
    sensitiveDataRequiresReason: false,
    auditLogged: true
  },
  {
    role: "hiring_manager",
    scope: "Candidates for assigned jobs after candidate sharing consent",
    permissions: ["view_assigned_candidate", "record_human_review"],
    accessExpiryRequired: false,
    sensitiveDataRequiresReason: true,
    auditLogged: true
  },
  {
    role: "hr_admin",
    scope: "Organization candidates and rights requests",
    permissions: ["view_assigned_candidate", "record_human_review", "manage_retention"],
    accessExpiryRequired: false,
    sensitiveDataRequiresReason: true,
    auditLogged: true
  },
  {
    role: "compliance_admin",
    scope: "Audit, DPIA, subprocessors, incidents, and reports",
    permissions: [
      "view_audit_logs",
      "manage_subprocessors",
      "export_dpia",
      "manage_incidents",
      "view_bias_reports"
    ],
    accessExpiryRequired: false,
    sensitiveDataRequiresReason: true,
    auditLogged: true
  },
  {
    role: "super_admin",
    scope: "Settings, integrations, region, and retention",
    permissions: [
      "view_audit_logs",
      "manage_retention",
      "manage_subprocessors",
      "export_dpia",
      "manage_incidents",
      "manage_region",
      "view_bias_reports",
      "view_sensitive_data"
    ],
    accessExpiryRequired: false,
    sensitiveDataRequiresReason: true,
    auditLogged: true
  },
  {
    role: "external_interviewer",
    scope: "Time-bound assigned interview notes only",
    permissions: ["view_assigned_candidate", "record_human_review"],
    accessExpiryRequired: true,
    sensitiveDataRequiresReason: true,
    auditLogged: true
  }
];

export const subprocessorRegister: readonly SubprocessorRecord[] = [
  {
    name: "EU Cloud Hosting Placeholder",
    purpose: "Application hosting, database, backups, and file storage",
    region: "EU",
    dataShared: ["candidate_profile", "raw_cv", "transcript", "scorecard", "audit_metadata"],
    transferMechanism: "EU processing region; no third-country transfer for EU-only mode",
    retention: "Mirrors tenant retention settings",
    dpaStatus: "in_review",
    canBeDisabledForEuOnly: false
  },
  {
    name: "OpenAI or configured LLM provider",
    purpose: "AI-assisted parsing, interview summarization, and evaluation support",
    region: "Global",
    dataShared: ["resume_parse", "interview_transcript", "role_requirements", "metadata"],
    transferMechanism: "SCCs or provider-specific data processing terms required",
    retention: "Provider contract must disable training and define retention",
    dpaStatus: "required",
    canBeDisabledForEuOnly: true
  },
  {
    name: "Speech-to-text provider placeholder",
    purpose: "Interview audio transcription",
    region: "EU",
    dataShared: ["audio", "transcript_metadata"],
    transferMechanism: "EU processing region preferred; SCCs required if non-EU",
    retention: "Raw audio deleted after transcription/scoring window",
    dpaStatus: "required",
    canBeDisabledForEuOnly: true
  },
  {
    name: "Transactional email provider placeholder",
    purpose: "Rights-request notifications and candidate emails",
    region: "EU",
    dataShared: ["email", "request_status", "notification_metadata"],
    transferMechanism: "EU processing or SCCs required",
    retention: "Notification logs follow audit retention",
    dpaStatus: "required",
    canBeDisabledForEuOnly: true
  }
];

export const dpaSupport: DpaSupport = {
  status: "template_in_review",
  owner: "Legal operations",
  requestChannel: "privacy@assumerai.local",
  exposes: [
    "DPA request intake",
    "subprocessor register",
    "data region commitments",
    "transfer safeguards",
    "security measures",
    "breach contact"
  ],
  unresolvedLegalQuestions: [
    "Final controller/processor split per customer deployment",
    "Signed DPA template approval",
    "Subprocessor notice period",
    "Jurisdiction-specific retention commitments"
  ]
};

export const dataRegionOptions: readonly DataRegionOption[] = [
  {
    id: "eu_only",
    label: "EU-only processing",
    defaultForNewEmployer: true,
    subprocessorsAllowed: ["EU Cloud Hosting Placeholder"],
    transferNotice:
      "EU mode blocks optional non-EU subprocessors until legal approval and provider DPA are recorded.",
    requiresLegalApproval: false
  },
  {
    id: "global_with_safeguards",
    label: "Global with safeguards",
    defaultForNewEmployer: false,
    subprocessorsAllowed: subprocessorRegister.map((record) => record.name),
    transferNotice:
      "Global mode requires transfer notice, SCC or adequacy basis, and customer approval before candidate data leaves the EEA.",
    requiresLegalApproval: true
  }
];

export const retentionControls: readonly RetentionControl[] = [
  {
    category: "Raw CV",
    defaultPeriod: "30 days unless profile confirmation or legal hold extends it",
    legalHoldSupported: true,
    deletionAuditEvent: "retention.deleted",
    failureQueueRequired: true
  },
  {
    category: "Raw interview media",
    defaultPeriod: "24 hours after transcription/scoring",
    legalHoldSupported: true,
    deletionAuditEvent: "retention.deleted",
    failureQueueRequired: true
  },
  {
    category: "Transcripts and scorecards",
    defaultPeriod: "365 days unless tenant policy is shorter",
    legalHoldSupported: true,
    deletionAuditEvent: "retention.deleted",
    failureQueueRequired: true
  },
  {
    category: "Audit and consent records",
    defaultPeriod: "2555 days or legal retention period",
    legalHoldSupported: true,
    deletionAuditEvent: "retention.deleted",
    failureQueueRequired: true
  }
];

export const auditLogViews: readonly AuditLogView[] = [
  {
    eventType: "consent.changed",
    actorTypes: ["candidate", "admin"],
    targetTypes: ["candidate", "consent_record"],
    requiredFields: ["audit_event_id", "actor_id", "occurred_at", "purpose", "version"]
  },
  {
    eventType: "human_review.recorded",
    actorTypes: ["reviewer", "employer"],
    targetTypes: ["scorecard", "company_match"],
    requiredFields: ["reviewer_id", "decision", "reason", "occurred_at", "audit_event_id"]
  },
  {
    eventType: "data.accessed",
    actorTypes: ["employer", "admin", "system"],
    targetTypes: ["candidate", "company_match"],
    requiredFields: ["actor_id", "target_id", "decision", "correlation_id", "occurred_at"]
  },
  {
    eventType: "incident.reported",
    actorTypes: ["admin", "system"],
    targetTypes: ["security_incident", "ai_incident"],
    requiredFields: ["incident_id", "severity", "detected_at", "owner", "audit_event_id"]
  }
];

export const modelVersionRegistry: readonly ModelVersionRecord[] = [
  {
    artifact: "model",
    versionId: "resume-parser-model-v0",
    appliesTo: "CV parsing and candidate profile extraction",
    status: "active",
    auditRequired: true
  },
  {
    artifact: "prompt",
    versionId: "interview-disclosure-prompt-v0",
    appliesTo: "AI interview disclosure and candidate acknowledgement",
    status: "active",
    auditRequired: true
  },
  {
    artifact: "rubric",
    versionId: "tech-risk-rubric-v0",
    appliesTo: "Tech Risk Analyst interview evaluation",
    status: "monitoring",
    auditRequired: true
  },
  {
    artifact: "question_bank",
    versionId: "question-bank-v0",
    appliesTo: "Adaptive interview module prompts",
    status: "active",
    auditRequired: true
  },
  {
    artifact: "scoring_formula",
    versionId: "deterministic-matching-v0",
    appliesTo: "Candidate-company match explanation",
    status: "active",
    auditRequired: true
  }
];

export const dpiaTemplate: DpiaTemplate = {
  title: "AssumerAI HR AI DPIA/FRAIA MVP template",
  processingPurposes: [
    "Candidate profile and CV processing",
    "AI-assisted interview transcription and evaluation summary",
    "Candidate-controlled matching and employer visibility",
    "Human review, appeal, and data-rights handling"
  ],
  dataCategories: [
    "candidate_profile",
    "raw_cv",
    "resume_parse",
    "interview_transcript",
    "scorecard",
    "company_match",
    "human_review",
    "consent_records",
    "audit_metadata"
  ],
  highRiskReasons: [
    "Employment and recruitment context",
    "AI scoring, ranking, or recommendation may influence hiring",
    "Video/audio and transcript processing may affect candidate rights",
    "Candidates need meaningful human review and contest routes"
  ],
  riskRegister: [
    {
      risk: "Solely automated rejection or hidden ranking",
      mitigation: "Block final decisions without human review, rationale, and audit event.",
      owner: "Employer review"
    },
    {
      risk: "Employer access before candidate consent",
      mitigation: "Deny employer visibility until candidate accepts match and scoped consent is active.",
      owner: "Candidate privacy"
    },
    {
      risk: "Bias or low-confidence output overuse",
      mitigation: "Monitor confidence, overrides, disputes, unknown-data flags, and route low confidence to review.",
      owner: "AI governance"
    },
    {
      risk: "Raw media over-retention",
      mitigation: "Delete raw interview media after transcription/scoring window unless legal hold applies.",
      owner: "Privacy operations"
    }
  ],
  approvals: ["Product owner", "DPO or privacy counsel", "Security owner", "AI governance owner"]
};

export const biasMonitoringReport: BiasMonitoringReport = {
  reportId: "bias_report_mvp_001",
  protectedTraitHandling: "lawful_collection_only_no_inference",
  exportable: true,
  metrics: [
    {
      name: "Human override rate by role",
      purpose: "Find roles where reviewers frequently disagree with AI outputs.",
      alertRule: "Alert when override rate changes by more than 15 percentage points."
    },
    {
      name: "Low-confidence scorecard rate",
      purpose: "Prevent low-confidence outputs from becoming hidden negative decisions.",
      alertRule: "Route any low-confidence cluster to calibration review."
    },
    {
      name: "Candidate dispute and transcript-correction rate",
      purpose: "Identify evaluation quality and transcription accuracy issues.",
      alertRule: "Alert when disputes exceed baseline for a role or model version."
    },
    {
      name: "Unknown-data review rate",
      purpose: "Track neutral fallbacks such as unknown university or missing language evidence.",
      alertRule: "Manual review required before negative employer action."
    }
  ]
};

export const trainingDataControl: TrainingDataControl = {
  defaultUse: "not_used_for_shared_model_training",
  optInRequired: true,
  tenantExclusionSupported: true,
  datasetLineageRequired: true,
  candidateWithdrawalSupported: true
};

export function buildComplianceOperationsCenter(): ComplianceOperationsCenter {
  return {
    controls: complianceOperationalControls,
    rbac: rbacMatrix,
    subprocessors: subprocessorRegister,
    dpa: dpaSupport,
    dataRegions: dataRegionOptions,
    retention: retentionControls,
    auditLogViews,
    modelVersions: modelVersionRegistry,
    dpia: dpiaTemplate,
    biasMonitoring: biasMonitoringReport,
    incidentWorkflowTemplate: createIncidentWorkflow({
      incidentId: "incident_template_001",
      detectedAt: "2026-05-21T10:00:00.000Z",
      affectedSubjects: ["candidate"],
      affectedControllers: ["employer_controller"],
      evidenceLog: ["Initial report", "Containment owner assigned"],
      auditEventId: "audit_incident_template_001"
    }),
    trainingDataControl
  };
}

export function canAccessCompliancePermission(
  role: AdminRole,
  permission: CompliancePermission
): boolean {
  return rbacMatrix.some(
    (rule) => rule.role === role && rule.permissions.includes(permission)
  );
}

export function createIncidentWorkflow(input: {
  readonly incidentId: string;
  readonly detectedAt: string;
  readonly affectedSubjects: readonly string[];
  readonly affectedControllers: readonly string[];
  readonly evidenceLog: readonly string[];
  readonly auditEventId: string;
}): IncidentWorkflow {
  const detectedAt = new Date(input.detectedAt);
  const gdprAssessmentDueAt = new Date(detectedAt.getTime() + 72 * 60 * 60 * 1000);

  return {
    incidentId: input.incidentId,
    status: "triage",
    detectedAt: detectedAt.toISOString(),
    gdprAssessmentDueAt: gdprAssessmentDueAt.toISOString(),
    affectedSubjects: input.affectedSubjects,
    affectedControllers: input.affectedControllers,
    evidenceLog: input.evidenceLog,
    auditEventId: input.auditEventId
  };
}

export function buildDpiaExportMarkdown(
  center: ComplianceOperationsCenter = buildComplianceOperationsCenter()
): string {
  const riskLines = center.dpia.riskRegister
    .map((risk) => `- ${risk.risk}: ${risk.mitigation} Owner: ${risk.owner}.`)
    .join("\n");
  const subprocessorLines = center.subprocessors
    .map((record) => `- ${record.name}: ${record.purpose}; region ${record.region}; ${record.transferMechanism}.`)
    .join("\n");

  return [
    `# ${center.dpia.title}`,
    "",
    "## Intended Purpose",
    center.dpia.processingPurposes.map((purpose) => `- ${purpose}`).join("\n"),
    "",
    "## Data Categories",
    center.dpia.dataCategories.map((category) => `- ${category}`).join("\n"),
    "",
    "## High-Risk Reasons",
    center.dpia.highRiskReasons.map((reason) => `- ${reason}`).join("\n"),
    "",
    "## Risk Register",
    riskLines,
    "",
    "## Subprocessors",
    subprocessorLines,
    "",
    "## Human Oversight",
    "- AI output is recommendation-only; human review and final reason are required for employer decisions.",
    "- Candidate appeal, transcript correction, and data-rights workflows are part of the control set.",
    "",
    "## Training Data",
    "- Candidate data is not used for shared model training unless separately enabled under a legal basis."
  ].join("\n");
}
