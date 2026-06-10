/**
 * Frozen fixtures for the matching-engine characterization test. Everything is
 * deterministic: fixed timestamps, fixed ids, fixed input hashes. Do not edit
 * casually — the snapshot file is generated from these inputs and the refactor
 * must reproduce it byte-for-byte.
 */

export const GENERATED_AT = "2026-06-09T12:00:00.000Z";

const candidate = {
  candidate_id: "cand_fixture_1",
  confirmed_by_candidate: true,
  contact: {
    full_name: "Jordan Fixture",
    location: "Milan",
    work_authorization: "EU citizen, no sponsorship required",
  },
  education: [
    {
      institution: "Politecnico di Milano",
      institution_canonical: "politecnico di milano",
      degree: "MSc",
      field: "Computer Science",
      projects: ["Thesis on streaming pipelines"],
      university_signal: {
        score: 82,
        confidence: 80,
        tier: "tier-2-strong-international",
        source_id: "seed",
        scoring_approved: true,
        enrichment_needed: false,
        evidence: ["Governed ranking snapshot"],
      },
    },
  ],
  experience: [
    {
      company: "Acme",
      title: "Sales Development Representative",
      industry: "SaaS",
      function: "sales",
      responsibilities: ["Outbound prospecting", "CRM pipeline hygiene"],
      measurable_impact: ["Booked 14 meetings in one quarter", "30% reply-rate lift"],
      tools: ["Salesforce", "Outreach"],
      evidence_quality: 78,
    },
    {
      company: "Beta GmbH",
      title: "Account Executive",
      industry: "SaaS",
      function: "sales",
      responsibilities: ["Full-cycle sales"],
      measurable_impact: ["120% quota attainment"],
      tools: ["HubSpot"],
      evidence_quality: 70,
    },
  ],
  skills: [
    { name: "outbound", evidence_count: 3, evidence: ["Built a three-touch sequence"] },
    { name: "qualification", evidence_count: 2, evidence: ["MEDDIC qualification notes"] },
    { name: "crm", evidence_count: 2, evidence: [] },
  ],
  languages: [
    { language: "English", declared_level: "C1", assessed_level: "C1", evidence: ["Assessed in interview"] },
    { language: "Italian", declared_level: "C2", assessed_level: "unknown", evidence: [] },
  ],
  certifications: ["MEDDIC Certification"],
  preferences: {
    target_roles: ["Sales Development Representative", "Account Executive"],
    locations: ["Milan", "Remote EU"],
    work_modes: ["remote", "hybrid"],
    company_sizes: ["11-50"],
    industries: ["SaaS"],
  },
  parse_metadata: {
    parser_confidence: 82,
    missing_data: [],
  },
};

const role = {
  role_id: "role_fixture_sdr",
  company_id: "company_fixture_1",
  title: "Sales Development Representative",
  seniority: "mid",
  role_type: "sales",
  location_constraints: ["Milan", "Remote EU"],
  work_modes: ["remote", "hybrid"],
  requirements: {
    required_skills: ["outbound", "qualification"],
    nice_to_have_skills: ["crm", "salesforce"],
    required_languages: [{ language: "English", minimum_level: "B2" }],
    certifications: ["MEDDIC Certification"],
    hard_gates: [
      {
        gate_type: "language",
        description: "English B2 for client communication",
        role_essential: true,
      },
      {
        gate_type: "work_authorization",
        description: "EU work authorization",
        role_essential: true,
      },
    ],
  },
  calibration: {
    version: "calibration-v1",
    score_bars: { overall: 70 },
    weights: { RoleSkillFit: 0.3 },
    required_evidence: ["outbound evidence"],
    interview_modules: ["motivation", "domain"],
  },
};

const company = {
  company_id: "company_fixture_1",
  name: "Fixture SaaS Srl",
  industry: "SaaS",
  size: "11-50",
  locations: ["Milan"],
  work_modes: ["remote", "hybrid"],
};

const resumeScorecard = {
  overall_resume_screen_score: 76,
  confidence_score: 80,
  scores: {
    SkillFitScore: { score: 81, confidence: 78, evidence: ["Skills matched from resume"] },
    ExperienceRelevanceScore: {
      score: 74,
      confidence: 72,
      evidence: ["Two SaaS sales roles"],
      missing_data: [],
    },
  },
};

const interviewScorecard = {
  overall_interview_score: 72,
  interview_confidence_score: 70,
  module_scores: {
    motivation: { score: 75, confidence: 72, evidence: ["Clear role motivation"], missing_data: [] },
    domain: { score: 69, confidence: 68, evidence: ["Solid outbound process"], missing_data: ["Pricing depth"] },
  },
};

const completedModules = [
  { module_id: "motivation", required_for_match: true, completed: true },
  { module_id: "domain", required_for_match: true, completed: true },
  { module_id: "case", required_for_match: false, completed: false },
];

/** Scenario 1: full happy path with consented sharing. */
export const FULL_ACCEPTED_INPUT = {
  candidate,
  role,
  company,
  resumeScorecard,
  interviewScorecard,
  requiredModuleStatuses: completedModules,
  candidateDecision: {
    decision: "accepted",
    decided_at: "2026-06-09T11:00:00.000Z",
    consent_record_id: "consent_fixture_1",
    audit_event_id: "audit_decision_fixture_1",
  },
  generatedAt: GENERATED_AT,
  matchId: "match_fixture_full",
  auditEventId: "audit_match_fixture_full",
  inputHash: "input_fixture_full",
};

/** Scenario 2: blocked before scoring (required module incomplete). */
export const BLOCKED_MODULES_INPUT = {
  candidate,
  role,
  company,
  resumeScorecard,
  interviewScorecard,
  requiredModuleStatuses: [
    { module_id: "motivation", required_for_match: true, completed: true },
    { module_id: "domain", required_for_match: true, completed: false },
  ],
  generatedAt: GENERATED_AT,
  matchId: "match_fixture_blocked",
  auditEventId: "audit_match_fixture_blocked",
  inputHash: "input_fixture_blocked",
};

/** Scenario 3: hard-gate failures (no language evidence, no authorization) + declined. */
export const GATE_FAILING_DECLINED_INPUT = {
  candidate: {
    ...candidate,
    contact: { ...candidate.contact, work_authorization: "needs sponsorship" },
    languages: [{ language: "Italian", declared_level: "C2", assessed_level: "unknown", evidence: [] }],
    certifications: [],
  },
  role,
  company,
  requiredModuleStatuses: completedModules,
  candidateDecision: {
    decision: "declined",
    decided_at: "2026-06-09T11:30:00.000Z",
    audit_event_id: "audit_decision_fixture_declined",
  },
  generatedAt: GENERATED_AT,
  matchId: "match_fixture_gates",
  auditEventId: "audit_match_fixture_gates",
  inputHash: "input_fixture_gates",
};

/** Scenario 4: minimal input — no company, no scorecards, no decision, no modules. */
export const MINIMAL_INPUT = {
  candidate: {
    candidate_id: "cand_fixture_min",
    education: [],
    experience: [],
    skills: [],
    languages: [],
    preferences: { target_roles: [], locations: [], work_modes: [] },
  },
  role: {
    role_id: "role_fixture_min",
    company_id: "company_fixture_min",
    title: "Operations Analyst",
    requirements: {
      required_skills: ["excel"],
      nice_to_have_skills: [],
      hard_gates: [],
    },
    calibration: { version: "calibration-min" },
  },
  generatedAt: GENERATED_AT,
  matchId: "match_fixture_min",
  auditEventId: "audit_match_fixture_min",
  inputHash: "input_fixture_min",
};

export const SCENARIOS = {
  full_accepted: FULL_ACCEPTED_INPUT,
  blocked_modules: BLOCKED_MODULES_INPUT,
  gate_failing_declined: GATE_FAILING_DECLINED_INPUT,
  minimal: MINIMAL_INPUT,
};
