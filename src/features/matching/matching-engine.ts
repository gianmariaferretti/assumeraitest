import { enrichCompanyProfile } from "../company-enrichment";

export const MATCHING_VERSION = "company-matching-v0";
export const MATCHING_MODEL_VERSION = "deterministic-matching-v0";

export const MATCH_DIMENSIONS = [
  "RoleSkillFit",
  "ExperienceDomainFit",
  "InterviewEvidenceFit",
  "LanguageLocationAvailabilityFit",
  "CandidatePreferenceFit",
  "CompanyBarFit",
  "GrowthPotentialFit",
  "EducationCredentialFit",
  "MatchConfidence",
] as const;

export type MatchDimensionName = (typeof MATCH_DIMENSIONS)[number];

export const DEFAULT_MATCH_WEIGHTS: Record<MatchDimensionName, number> = {
  RoleSkillFit: 0.22,
  ExperienceDomainFit: 0.18,
  InterviewEvidenceFit: 0.15,
  LanguageLocationAvailabilityFit: 0.12,
  CandidatePreferenceFit: 0.1,
  CompanyBarFit: 0.1,
  GrowthPotentialFit: 0.07,
  EducationCredentialFit: 0.04,
  MatchConfidence: 0.02,
};

type ConsentDecisionValue = "accepted" | "declined";
type MatchStatus =
  | "candidate_visible"
  | "candidate_accepted"
  | "candidate_declined"
  | "employer_review"
  | "closed";

interface CandidateEducation {
  institution?: string;
  institution_canonical?: string;
  degree?: string;
  field?: string;
  projects?: string[];
  ranking_confidence?: number;
  enrichment_needed?: boolean;
  university_signal?: {
    score: number;
    confidence: number;
    tier: string;
    source_id: string;
    scoring_approved: boolean;
    enrichment_needed: boolean;
    evidence?: readonly string[];
  };
}

interface CandidateExperience {
  company?: string;
  title?: string;
  industry?: string;
  function?: string;
  responsibilities?: string[];
  measurable_impact?: string[];
  tools?: string[];
  leadership_scope?: string;
  evidence_quality?: number;
}

interface CandidateSkill {
  name: string;
  category?: string;
  evidence_count?: number;
  evidence?: string[];
}

interface CandidateLanguage {
  language: string;
  declared_level?: string;
  assessed_level?: string;
  evidence?: string[];
}

interface CandidatePreferences {
  target_roles: string[];
  locations: string[];
  work_modes: string[];
  company_sizes?: string[];
  salary_range?: {
    currency?: string;
    min?: number;
    max?: number;
  };
  industries?: string[];
  work_style?: string[];
}

export interface CandidateProfile {
  candidate_id: string;
  profile_version?: string;
  confirmed_by_candidate?: boolean;
  contact?: {
    full_name?: string;
    email?: string;
    location?: string;
    work_authorization?: string;
  };
  education: CandidateEducation[];
  experience: CandidateExperience[];
  skills: CandidateSkill[];
  languages: CandidateLanguage[];
  certifications?: string[];
  portfolio?: string[];
  preferences: CandidatePreferences;
  parse_metadata?: {
    parser_version?: string;
    parser_confidence?: number;
    missing_data?: string[];
    audit_event_id?: string;
  };
}

interface RoleHardGate {
  gate_type: string;
  description: string;
  lawful_basis_note?: string;
  role_essential: boolean;
}

interface RequiredLanguage {
  language: string;
  minimum_level: string;
}

export interface RoleProfile {
  role_id: string;
  company_id: string;
  title: string;
  status?: string;
  seniority?: string;
  role_type?: string;
  location_constraints?: string[];
  work_modes?: string[];
  compensation_range?: {
    currency?: string;
    min?: number;
    max?: number;
  };
  requirements: {
    required_skills: string[];
    nice_to_have_skills: string[];
    required_languages?: RequiredLanguage[];
    certifications?: string[];
    hard_gates: RoleHardGate[];
  };
  calibration: {
    version: string;
    score_bars?: Record<string, number>;
    weights?: Partial<Record<MatchDimensionName, number>> & Record<string, number | undefined>;
    required_evidence?: string[];
    interview_modules?: string[];
    created_by?: string;
    created_at?: string;
    audit_event_id?: string;
  };
}

export interface CompanyProfile {
  company_id: string;
  name?: string;
  industry?: string;
  size?: string;
  locations?: string[];
  work_modes?: string[];
  culture_attributes?: string[];
  data_visibility_policy?: string;
  enrichment?: {
    canonical_name: string;
    identity_confidence: number;
    candidate_context_score: number;
    source_id: string;
    source_version: string;
    license_review_status: string;
    allowed_use: string;
    disallowed_use: string;
    retrieved_at: string;
    stale_after: string;
    evidence: readonly string[];
  };
}

interface EvidenceObject {
  source?: string;
  snippet?: string;
  confidence?: number;
}

interface UpstreamScoreDimension {
  score?: number;
  confidence?: number;
  evidence?: Array<string | EvidenceObject>;
  missing_data?: string[];
}

export interface ResumeScorecard {
  overall_resume_screen_score?: number;
  confidence_score?: number;
  scores?: Record<string, UpstreamScoreDimension>;
  risk_flags?: string[];
  recommendations?: string[];
}

export interface InterviewScorecard {
  overall_interview_score?: number;
  interview_confidence_score?: number;
  module_scores?: Record<string, UpstreamScoreDimension>;
  manual_review_flags?: string[];
}

interface PartialScoreDimension {
  score: number;
  confidence?: number;
  evidence?: string[];
  missing_data?: string[];
}

export interface CandidateDecisionInput {
  decision: ConsentDecisionValue;
  decided_at: string;
  consent_record_id?: string | null;
  audit_event_id?: string;
}

export interface CandidateDecision {
  decision: ConsentDecisionValue;
  decided_at: string;
  consent_record_id: string | null;
  audit_event_id: string;
}

/** Completion signal for a single interview module, from the unlock engine. */
export interface ModuleCompletionInput {
  module_id: string;
  required_for_match: boolean;
  completed: boolean;
}

export interface MatchingScoreInput {
  candidate: CandidateProfile;
  role: RoleProfile;
  company?: CompanyProfile;
  resumeScorecard?: ResumeScorecard;
  interviewScorecard?: InterviewScorecard;
  dimensionOverrides?: Partial<Record<MatchDimensionName, PartialScoreDimension>>;
  candidateDecision?: CandidateDecisionInput | null;
  /**
   * Per-module completion. When provided, the match is blocked until every
   * module flagged required_for_match is completed (Phase 5 match guard).
   */
  requiredModuleStatuses?: readonly ModuleCompletionInput[];
  generatedAt?: string;
  version?: string;
  auditEventId?: string;
  matchId?: string;
  modelVersion?: string;
  scoringVersion?: string;
  inputHash?: string;
}

export interface ScoreDimension {
  score: number;
  confidence: number;
  evidence: string[];
  missing_data: string[];
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: null;
  audit_event_id: string;
}

export interface HardGateOutcome {
  gate_type: string;
  passed: boolean;
  explanation: string;
  role_essential: boolean;
}

export interface MatchExplanation {
  summary: string;
  supporting_evidence: string[];
  missing_evidence: string[];
  risks_uncertainties: string[];
  suggested_next_step: string;
}

export type EmployerVisibilityState =
  | "hidden_pending_candidate_consent"
  | "candidate_declined"
  | "shared_after_candidate_consent"
  | "withdrawn";

export interface EmployerVisibility {
  state: EmployerVisibilityState;
  candidate_consent_required: true;
  visible_to_company: boolean;
  consent_record_id: string | null;
  candidate_sharing_snapshot_id: string | null;
}

export interface DecisionPolicy {
  recommendation_only: true;
  requires_meaningful_human_review: true;
  no_hidden_automated_rejection: true;
}

export interface CompanyMatch {
  match_id: string;
  candidate_id: string;
  role_id: string;
  company_id: string;
  status: MatchStatus;
  match_score: number;
  match_confidence: number;
  overall_match: ScoreDimension;
  evidence: string[];
  missing_data: string[];
  dimensions: Record<MatchDimensionName, ScoreDimension>;
  hard_gates: HardGateOutcome[];
  explanations: {
    candidate_facing: MatchExplanation;
    employer_facing?: MatchExplanation;
  };
  candidate_decision: CandidateDecision | null;
  employer_visibility: EmployerVisibility;
  human_review_required: boolean;
  /** True when the match is blocked before scoring (e.g. required modules incomplete). */
  match_blocked?: boolean;
  version: string;
  model_version: string;
  scoring_version: string;
  input_hash: string;
  generated_at: string;
  reviewed_by_human: boolean;
  human_override: null;
  audit_event_id: string;
  decision_policy: DecisionPolicy;
}

export type EmployerMatchView =
  | {
      allowed: false;
      reason: string;
    }
  | {
      allowed: true;
      match: CompanyMatch;
    };

interface DimensionDraft {
  score: number;
  confidence: number;
  evidence: string[];
  missing_data: string[];
}

interface LanguageEvaluation {
  passed: boolean;
  evidence: string[];
  missing: string[];
  failed: string[];
  score: number;
  confidence: number;
}

interface LanguageEvaluationOptions {
  readonly requireAssessedForPass?: boolean;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function createCompanyMatch(input: MatchingScoreInput): CompanyMatch {
  const scoringInput = input.company
    ? { ...input, company: enrichCompanyProfile(input.company) }
    : input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const version = input.version ?? MATCHING_VERSION;
  const matchId = input.matchId ?? `match_${input.candidate.candidate_id}_${input.role.role_id}`;
  const auditEventId =
    input.auditEventId ??
    `audit_match_${input.candidate.candidate_id}_${input.role.role_id}_${generatedAt}`;

  // Phase 5 match guard: block before scoring when required modules are incomplete.
  const moduleGate = evaluateRequiredModulesGate(scoringInput);
  if (moduleGate && !moduleGate.passed) {
    return buildBlockedMatch({
      input: scoringInput,
      moduleGate,
      matchId,
      generatedAt,
      version,
      auditEventId,
    });
  }

  const hardGates = [
    ...(moduleGate ? [moduleGate] : []),
    ...evaluateHardGates(scoringInput),
  ];
  const dimensions = buildDimensions(scoringInput, hardGates, generatedAt, version, auditEventId);
  const weights = resolveWeights(scoringInput.role.calibration?.weights);
  const candidateDecision = normalizeCandidateDecision(scoringInput.candidateDecision, matchId);
  const status = getStatus(candidateDecision);
  const matchScore = calculateWeightedMatchScore(dimensions, weights);
  const matchConfidence = roundScore(average(MATCH_DIMENSIONS.map((name) => dimensions[name].confidence)));

  const candidateFacing = buildCandidateExplanation({
    candidate: scoringInput.candidate,
    role: scoringInput.role,
    company: scoringInput.company,
    dimensions,
    hardGates,
    matchScore,
    matchConfidence,
  });

  const employerFacing =
    candidateDecision?.decision === "accepted" && candidateDecision.consent_record_id
      ? buildEmployerExplanation({
          role: scoringInput.role,
          company: scoringInput.company,
          dimensions,
          hardGates,
          matchScore,
          matchConfidence,
        })
      : undefined;
  const evidence = collectSupportingEvidence(dimensions);
  const missingData = collectMissingEvidence(dimensions);

  return {
    match_id: matchId,
    candidate_id: scoringInput.candidate.candidate_id,
    role_id: scoringInput.role.role_id,
    company_id: scoringInput.role.company_id,
    status,
    match_score: matchScore,
    match_confidence: matchConfidence,
    overall_match: buildOverallMatchDimension({
      score: matchScore,
      confidence: matchConfidence,
      evidence,
      missingData,
      version,
      generatedAt,
      auditEventId,
    }),
    evidence,
    missing_data: missingData,
    dimensions,
    hard_gates: hardGates,
    explanations: {
      candidate_facing: candidateFacing,
      ...(employerFacing ? { employer_facing: employerFacing } : {}),
    },
    candidate_decision: candidateDecision,
    employer_visibility: buildEmployerVisibility(candidateDecision, matchId),
    human_review_required: true,
    version,
    model_version: scoringInput.modelVersion ?? MATCHING_MODEL_VERSION,
    scoring_version: scoringInput.scoringVersion ?? version,
    input_hash:
      scoringInput.inputHash ??
      `input_${sanitizeForId(scoringInput.candidate.candidate_id)}_${sanitizeForId(scoringInput.role.role_id)}_${sanitizeForId(version)}`,
    generated_at: generatedAt,
    reviewed_by_human: false,
    human_override: null,
    audit_event_id: auditEventId,
    decision_policy: {
      recommendation_only: true,
      requires_meaningful_human_review: true,
      no_hidden_automated_rejection: true,
    },
  };
}

export function getEmployerMatchView(match: CompanyMatch): EmployerMatchView {
  const consentAccepted =
    match.employer_visibility.visible_to_company &&
    match.candidate_decision?.decision === "accepted" &&
    Boolean(match.candidate_decision.consent_record_id);

  if (!consentAccepted || !match.explanations.employer_facing) {
    return {
      allowed: false,
      reason:
        "Candidate consent is required before the employer can view candidate match data.",
    };
  }

  return {
    allowed: true,
    match,
  };
}

export function buildEmployerVisibility(
  candidateDecision: CandidateDecision | null,
  matchId: string,
  candidateSharingSnapshotId?: string | null,
): EmployerVisibility {
  if (candidateDecision?.decision === "accepted" && candidateDecision.consent_record_id) {
    return {
      state: "shared_after_candidate_consent",
      candidate_consent_required: true,
      visible_to_company: true,
      consent_record_id: candidateDecision.consent_record_id,
      candidate_sharing_snapshot_id:
        candidateSharingSnapshotId ?? `snapshot_${sanitizeForId(matchId)}`,
    };
  }

  if (candidateDecision?.decision === "declined") {
    return {
      state: "candidate_declined",
      candidate_consent_required: true,
      visible_to_company: false,
      consent_record_id: null,
      candidate_sharing_snapshot_id: null,
    };
  }

  return {
    state: "hidden_pending_candidate_consent",
    candidate_consent_required: true,
    visible_to_company: false,
    consent_record_id: null,
    candidate_sharing_snapshot_id: null,
  };
}

function buildDimensions(
  input: MatchingScoreInput,
  hardGates: HardGateOutcome[],
  generatedAt: string,
  version: string,
  auditEventId: string,
): Record<MatchDimensionName, ScoreDimension> {
  const drafts: Record<MatchDimensionName, DimensionDraft> = {
    RoleSkillFit: getRoleSkillFit(input),
    ExperienceDomainFit: getExperienceDomainFit(input),
    InterviewEvidenceFit: getInterviewEvidenceFit(input),
    LanguageLocationAvailabilityFit: getLanguageLocationAvailabilityFit(input, hardGates),
    CandidatePreferenceFit: getCandidatePreferenceFit(input),
    CompanyBarFit: getCompanyBarFit(input),
    GrowthPotentialFit: getGrowthPotentialFit(input),
    EducationCredentialFit: getEducationCredentialFit(input),
    MatchConfidence: getMatchConfidence(input, hardGates),
  };

  return Object.fromEntries(
    MATCH_DIMENSIONS.map((name) => {
      const override = input.dimensionOverrides?.[name];
      const draft = override
        ? {
            score: override.score,
            confidence: override.confidence ?? drafts[name].confidence,
            evidence: override.evidence ?? drafts[name].evidence,
            missing_data: override.missing_data ?? drafts[name].missing_data,
          }
        : drafts[name];

      return [
        name,
        {
          score: roundScore(draft.score),
          confidence: roundScore(draft.confidence),
          evidence: unique(draft.evidence).slice(0, 8),
          missing_data: unique(draft.missing_data),
          version,
          generated_at: generatedAt,
          reviewed_by_human: false,
          human_override: null,
          audit_event_id: auditEventId,
        },
      ];
    }),
  ) as Record<MatchDimensionName, ScoreDimension>;
}

function calculateWeightedMatchScore(
  dimensions: Record<MatchDimensionName, ScoreDimension>,
  weights: Record<MatchDimensionName, number>,
): number {
  const weightedScore = MATCH_DIMENSIONS.reduce(
    (total, name) => total + dimensions[name].score * weights[name],
    0,
  );

  return roundScore(weightedScore);
}

function resolveWeights(
  roleWeights?: (Partial<Record<MatchDimensionName, number>> & Record<string, number | undefined>) | null,
): Record<MatchDimensionName, number> {
  const candidateWeights = MATCH_DIMENSIONS.reduce(
    (weights, name) => {
      const weight = roleWeights?.[name];
      weights[name] = typeof weight === "number" ? weight : DEFAULT_MATCH_WEIGHTS[name];
      return weights;
    },
    {} as Record<MatchDimensionName, number>,
  );

  const total = Object.values(candidateWeights).reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return DEFAULT_MATCH_WEIGHTS;
  }

  return MATCH_DIMENSIONS.reduce(
    (weights, name) => {
      weights[name] = candidateWeights[name] / total;
      return weights;
    },
    {} as Record<MatchDimensionName, number>,
  );
}

function evaluateRequiredModulesGate(input: MatchingScoreInput): HardGateOutcome | null {
  const statuses = input.requiredModuleStatuses;
  if (!statuses || statuses.length === 0) {
    return null;
  }

  const incomplete = statuses.filter((module) => module.required_for_match && !module.completed);
  if (incomplete.length === 0) {
    return {
      gate_type: "required_modules",
      passed: true,
      role_essential: true,
      explanation:
        "All required interview modules are complete; the match can proceed to scoring.",
    };
  }

  const names = incomplete.map((module) => module.module_id).join(", ");
  return {
    gate_type: "required_modules",
    passed: false,
    role_essential: true,
    explanation: `Required interview modules are not yet complete: ${names}. This is a process gate, not a candidate quality score; the match opens once they are finished.`,
  };
}

function buildBlockedDimensions(
  generatedAt: string,
  version: string,
  auditEventId: string,
): Record<MatchDimensionName, ScoreDimension> {
  return MATCH_DIMENSIONS.reduce((accumulator, name) => {
    accumulator[name] = {
      score: 0,
      confidence: 0,
      evidence: [],
      missing_data: [
        "Match blocked before scoring: required interview modules are incomplete.",
      ],
      version,
      generated_at: generatedAt,
      reviewed_by_human: false,
      human_override: null,
      audit_event_id: auditEventId,
    };
    return accumulator;
  }, {} as Record<MatchDimensionName, ScoreDimension>);
}

function buildBlockedMatch(args: {
  input: MatchingScoreInput;
  moduleGate: HardGateOutcome;
  matchId: string;
  generatedAt: string;
  version: string;
  auditEventId: string;
}): CompanyMatch {
  const { input, moduleGate, matchId, generatedAt, version, auditEventId } = args;
  const dimensions = buildBlockedDimensions(generatedAt, version, auditEventId);
  const candidateDecision = normalizeCandidateDecision(input.candidateDecision, matchId);
  const hardGates = [moduleGate, ...evaluateHardGates(input)];
  const missing = [moduleGate.explanation];

  const candidateFacing: MatchExplanation = {
    summary:
      "This match is on hold until you finish the required interview modules. It is not a rejection and not a score.",
    supporting_evidence: [],
    missing_evidence: missing,
    risks_uncertainties: ["Matching is intentionally paused until required modules are complete."],
    suggested_next_step: "Complete the remaining required interview modules to open this match.",
  };

  return {
    match_id: matchId,
    candidate_id: input.candidate.candidate_id,
    role_id: input.role.role_id,
    company_id: input.role.company_id,
    status: getStatus(candidateDecision),
    match_score: 0,
    match_confidence: 0,
    overall_match: buildOverallMatchDimension({
      score: 0,
      confidence: 0,
      evidence: [],
      missingData: missing,
      version,
      generatedAt,
      auditEventId,
    }),
    evidence: [],
    missing_data: missing,
    dimensions,
    hard_gates: hardGates,
    explanations: { candidate_facing: candidateFacing },
    candidate_decision: candidateDecision,
    employer_visibility: buildEmployerVisibility(candidateDecision, matchId),
    human_review_required: true,
    match_blocked: true,
    version,
    model_version: input.modelVersion ?? MATCHING_MODEL_VERSION,
    scoring_version: input.scoringVersion ?? version,
    input_hash:
      input.inputHash ??
      `input_${sanitizeForId(input.candidate.candidate_id)}_${sanitizeForId(input.role.role_id)}_${sanitizeForId(version)}`,
    generated_at: generatedAt,
    reviewed_by_human: false,
    human_override: null,
    audit_event_id: auditEventId,
    decision_policy: {
      recommendation_only: true,
      requires_meaningful_human_review: true,
      no_hidden_automated_rejection: true,
    },
  };
}

function evaluateHardGates(input: MatchingScoreInput): HardGateOutcome[] {
  return input.role.requirements.hard_gates
    .filter((gate) => gate.role_essential)
    .map((gate) => {
      if (gate.gate_type === "language") {
        return evaluateLanguageHardGate(input, gate);
      }

      if (gate.gate_type === "certification") {
        return evaluateCertificationHardGate(input, gate);
      }

      if (gate.gate_type === "location_timezone" || gate.gate_type === "availability") {
        return evaluateLocationAvailabilityHardGate(input, gate);
      }

      if (gate.gate_type === "work_authorization") {
        return evaluateWorkAuthorizationHardGate(input, gate);
      }

      return {
        gate_type: gate.gate_type,
        passed: false,
        role_essential: true,
        explanation: `${gate.description} could not be evaluated from available candidate evidence. This is an eligibility review item, not a candidate quality score.`,
      };
    });
}

function evaluateLanguageHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const languageEvaluation = evaluateRequiredLanguages(input.candidate, input.role, {
    requireAssessedForPass: true,
  });
  const passed = languageEvaluation.passed;

  return {
    gate_type: gate.gate_type,
    passed,
    role_essential: true,
    explanation: passed
      ? `${gate.description} is currently supported by candidate language evidence.`
      : `${gate.description} is not currently eligible: ${languageEvaluation.failed.join(
          "; ",
        )}. This is not a candidate quality score.`,
  };
}

function evaluateCertificationHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const requiredCertifications = input.role.requirements.certifications ?? [];
  const candidateCertifications = input.candidate.certifications ?? [];
  const missing = requiredCertifications.filter(
    (certification) => !containsNormalized(candidateCertifications, certification),
  );

  return {
    gate_type: gate.gate_type,
    passed: missing.length === 0,
    role_essential: true,
    explanation:
      missing.length === 0
        ? `${gate.description} is supported by candidate certification evidence.`
        : `${gate.description} is not currently eligible: missing ${missing.join(
            ", ",
          )}. This is not a candidate quality score.`,
  };
}

function evaluateLocationAvailabilityHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const locationMatch = hasLocationOverlap(input.candidate, input.role);
  const workModeMatch = hasOverlap(
    input.candidate.preferences.work_modes,
    input.role.work_modes ?? [],
  );
  const passed =
    gate.gate_type === "location_timezone" ? locationMatch : workModeMatch;
  const evidenceLabel =
    gate.gate_type === "location_timezone"
      ? "candidate location evidence"
      : "candidate availability or work-mode evidence";

  return {
    gate_type: gate.gate_type,
    passed,
    role_essential: true,
    explanation: passed
      ? `${gate.description} is supported by ${evidenceLabel}.`
      : `${gate.description} is not currently eligible from available ${evidenceLabel}. This is not a candidate quality score.`,
  };
}

function evaluateWorkAuthorizationHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const authorization = input.candidate.contact?.work_authorization;
  const hasAffirmativeAuthorization = hasAffirmativeWorkAuthorizationEvidence(authorization);

  return {
    gate_type: gate.gate_type,
    passed: hasAffirmativeAuthorization,
    role_essential: true,
    explanation: hasAffirmativeAuthorization
      ? `${gate.description} has candidate-provided affirmative work authorization evidence.`
      : `${gate.description} is not currently eligible because affirmative work authorization evidence is missing. This is not a candidate quality score.`,
  };
}

function getRoleSkillFit(input: MatchingScoreInput): DimensionDraft {
  const requiredSkills = input.role.requirements.required_skills ?? [];
  const niceToHaveSkills = input.role.requirements.nice_to_have_skills ?? [];
  const matchedRequired = requiredSkills.filter((skill) => candidateHasSkill(input.candidate, skill));
  const matchedNice = niceToHaveSkills.filter((skill) => candidateHasSkill(input.candidate, skill));
  const requiredScore = requiredSkills.length
    ? (matchedRequired.length / requiredSkills.length) * 75
    : 75;
  const niceScore = niceToHaveSkills.length ? (matchedNice.length / niceToHaveSkills.length) * 25 : 15;
  const upstreamScore = input.resumeScorecard?.scores?.SkillFitScore?.score;
  const score = upstreamScore ?? requiredScore + niceScore;
  const missingRequired = requiredSkills.filter((skill) => !matchedRequired.includes(skill));

  return {
    score,
    confidence: confidenceFromEvidence(input.candidate.skills.length + matchedRequired.length),
    evidence: [
      matchedRequired.length
        ? `Matched required skills: ${matchedRequired.join(", ")}.`
        : "No required-skill evidence matched the role.",
      matchedNice.length ? `Matched nice-to-have skills: ${matchedNice.join(", ")}.` : "",
      ...collectEvidenceForSkills(input.candidate, [...matchedRequired, ...matchedNice]),
    ],
    missing_data: missingRequired.map((skill) => `Required skill evidence missing: ${skill}.`),
  };
}

function getExperienceDomainFit(input: MatchingScoreInput): DimensionDraft {
  const upstream = input.resumeScorecard?.scores?.ExperienceRelevanceScore;
  if (upstream?.score !== undefined) {
    return fromUpstreamDimension(upstream);
  }

  const candidateText = normalize(
    input.candidate.experience
      .flatMap((experience) => [
        experience.title,
        experience.industry,
        experience.function,
        ...(experience.responsibilities ?? []),
        ...(experience.measurable_impact ?? []),
        ...(experience.tools ?? []),
      ])
      .filter(Boolean)
      .join(" "),
  );
  const roleTokens = [
    input.role.title,
    input.role.role_type,
    ...(input.role.requirements.required_skills ?? []),
    ...(input.role.requirements.nice_to_have_skills ?? []),
  ].filter(Boolean);
  const matches = roleTokens.filter((token) => candidateText.includes(normalize(token)));
  const evidenceQuality = average(
    input.candidate.experience
      .map((experience) => experience.evidence_quality)
      .filter(isNumber),
  );
  const tokenScore = roleTokens.length ? (matches.length / roleTokens.length) * 100 : 65;
  const score = average([tokenScore, evidenceQuality || 60]);

  return {
    score,
    confidence: confidenceFromEvidence(input.candidate.experience.length + matches.length),
    evidence: [
      matches.length ? `Experience overlaps role signals: ${matches.join(", ")}.` : "",
      ...input.candidate.experience
        .flatMap((experience) => experience.measurable_impact ?? [])
        .slice(0, 3),
    ],
    missing_data: matches.length ? [] : ["Role-domain evidence is limited."],
  };
}

function getInterviewEvidenceFit(input: MatchingScoreInput): DimensionDraft {
  if (!input.interviewScorecard) {
    return {
      score: 40,
      confidence: 35,
      evidence: [],
      missing_data: ["Interview evidence is not available."],
    };
  }

  const moduleScores = Object.values(input.interviewScorecard.module_scores ?? {});
  const evidence = moduleScores.flatMap((dimension) => normalizeEvidence(dimension.evidence)).slice(0, 5);
  const missing = moduleScores.flatMap((dimension) => dimension.missing_data ?? []);

  return {
    score: input.interviewScorecard.overall_interview_score ?? average(moduleScores.map((dimension) => dimension.score).filter(isNumber)),
    confidence:
      input.interviewScorecard.interview_confidence_score ??
      average(moduleScores.map((dimension) => dimension.confidence).filter(isNumber)),
    evidence,
    missing_data: missing,
  };
}

function getLanguageLocationAvailabilityFit(
  input: MatchingScoreInput,
  hardGates: HardGateOutcome[],
): DimensionDraft {
  const languageEvaluation = evaluateRequiredLanguages(input.candidate, input.role);
  const locationMatch = hasLocationOverlap(input.candidate, input.role);
  const workModeMatch = hasOverlap(
    input.candidate.preferences.work_modes,
    input.role.work_modes ?? [],
  );
  const hardGateFailure = hardGates.some((gate) => !gate.passed);
  const languageHardGateFailure = hardGates.some(
    (gate) => gate.gate_type === "language" && !gate.passed,
  );
  const score = average([
    languageEvaluation.score,
    locationMatch ? 85 : 45,
    workModeMatch ? 85 : 45,
  ]);

  return {
    score: languageHardGateFailure
      ? Math.min(score, 45)
      : hardGateFailure
        ? Math.min(score, 65)
        : score,
    confidence: languageEvaluation.confidence,
    evidence: [
      ...languageEvaluation.evidence,
      locationMatch ? "Candidate location preferences overlap role constraints." : "",
      workModeMatch ? "Candidate work-mode preferences overlap role work modes." : "",
    ],
    missing_data: [
      ...languageEvaluation.missing,
      ...(locationMatch ? [] : ["Location overlap evidence is incomplete."]),
      ...(workModeMatch ? [] : ["Work-mode overlap evidence is incomplete."]),
    ],
  };
}

function getCandidatePreferenceFit(input: MatchingScoreInput): DimensionDraft {
  const candidate = input.candidate;
  const role = input.role;
  const company = input.company;
  const roleMatch = tokenOverlap(candidate.preferences.target_roles, [role.title, role.role_type]);
  const locationMatch = hasLocationOverlap(candidate, role) ? 1 : 0;
  const workModeMatch = hasOverlap(candidate.preferences.work_modes, role.work_modes ?? []) ? 1 : 0;
  const companySizeMatch = company?.size
    ? containsNormalized(candidate.preferences.company_sizes ?? [], company.size)
    : false;
  const industryMatch = company?.industry
    ? containsNormalized(candidate.preferences.industries ?? [], company.industry)
    : false;
  const score = clamp(
    ((roleMatch ? 1 : 0) +
      locationMatch +
      workModeMatch +
      (companySizeMatch ? 1 : 0) +
      (industryMatch ? 1 : 0)) *
      20,
    0,
    100,
  );

  return {
    score,
    confidence: company?.enrichment
      ? average([80, company.enrichment.identity_confidence])
      : 80,
    evidence: [
      roleMatch ? "Candidate target roles overlap this role." : "",
      locationMatch ? "Candidate location preferences overlap this role." : "",
      workModeMatch ? "Candidate work-mode preferences overlap this role." : "",
      companySizeMatch ? "Candidate company-size preference overlaps this company." : "",
      industryMatch ? "Candidate industry preference overlaps this company." : "",
      company?.enrichment
        ? `Company enrichment from ${company.enrichment.source_id} is used only for candidate-facing company context and preference fit.`
        : "",
      ...(company?.enrichment?.evidence ?? []),
    ],
    missing_data: [
      roleMatch ? "" : "Target-role preference overlap is limited.",
      company ? "" : "Company profile was not provided.",
      company && !company.enrichment
        ? "Company enrichment is unavailable; company context needs review."
        : "",
    ],
  };
}

function getCompanyBarFit(input: MatchingScoreInput): DimensionDraft {
  const bars = Object.values(input.role.calibration.score_bars ?? {});
  const averageBar = bars.length ? average(bars) : 75;
  const upstreamScores = [
    input.resumeScorecard?.overall_resume_screen_score,
    input.interviewScorecard?.overall_interview_score,
  ].filter(isNumber);
  const availableScore = upstreamScores.length ? average(upstreamScores) : average([getRoleSkillFit(input).score, getInterviewEvidenceFit(input).score]);
  const score = averageBar ? clamp((availableScore / averageBar) * 75, 0, 100) : availableScore;

  return {
    score,
    confidence: upstreamScores.length ? 75 : 55,
    evidence: [
      `Compared available candidate evidence with role calibration ${input.role.calibration.version}.`,
    ],
    missing_data: upstreamScores.length ? [] : ["Resume or interview scorecard evidence is incomplete."],
  };
}

function getGrowthPotentialFit(input: MatchingScoreInput): DimensionDraft {
  const evidenceQuality = average(
    input.candidate.experience
      .map((experience) => experience.evidence_quality)
      .filter(isNumber),
  );
  const measurableImpactCount = input.candidate.experience.flatMap(
    (experience) => experience.measurable_impact ?? [],
  ).length;
  const niceToHaveMatches = (input.role.requirements.nice_to_have_skills ?? []).filter((skill) =>
    candidateHasSkill(input.candidate, skill),
  ).length;
  const score = clamp(
    (evidenceQuality || 55) * 0.65 + Math.min(measurableImpactCount * 8, 20) + Math.min(niceToHaveMatches * 5, 15),
    0,
    100,
  );

  return {
    score,
    confidence: confidenceFromEvidence(measurableImpactCount + niceToHaveMatches),
    evidence: input.candidate.experience
      .flatMap((experience) => experience.measurable_impact ?? [])
      .slice(0, 4),
    missing_data: measurableImpactCount ? [] : ["Measurable impact evidence is limited."],
  };
}

function getEducationCredentialFit(input: MatchingScoreInput): DimensionDraft {
  const requiredCertifications = input.role.requirements.certifications ?? [];
  const missingCertifications = requiredCertifications.filter(
    (certification) => !containsNormalized(input.candidate.certifications ?? [], certification),
  );
  const needsUniversityEnrichment = input.candidate.education.some(
    (education) =>
      education.university_signal?.enrichment_needed ||
      education.enrichment_needed ||
      education.university_signal?.scoring_approved === false ||
      education.institution_canonical?.toLowerCase() === "unknown" ||
      (education.university_signal?.confidence ?? education.ranking_confidence ?? 100) < 25,
  );

  if (needsUniversityEnrichment) {
    return {
      score: 50,
      confidence: 45,
      evidence: ["Unknown university uses a neutral prior, not a negative signal."],
      missing_data: ["University enrichment is needed; education is held at a neutral prior."],
    };
  }

  return {
    score: missingCertifications.length
      ? 35
      : roundScore(
          average([
            70,
            ...input.candidate.education
              .map((education) => education.university_signal?.score)
              .filter(isNumber),
          ]),
        ),
    confidence: roundScore(
      average([
        70,
        ...input.candidate.education
          .map((education) => education.university_signal?.confidence)
          .filter(isNumber),
      ]),
    ),
    evidence: input.candidate.education
      .flatMap((education) => [
        education.degree,
        education.field,
        ...(education.projects ?? []),
        ...(education.university_signal?.evidence ?? []),
      ])
      .filter(isString),
    missing_data: missingCertifications.map(
      (certification) => `Credential evidence missing: ${certification}.`,
    ),
  };
}

function getMatchConfidence(
  input: MatchingScoreInput,
  hardGates: HardGateOutcome[],
): DimensionDraft {
  const parserConfidence = input.candidate.parse_metadata?.parser_confidence ?? 60;
  const resumeConfidence = input.resumeScorecard?.confidence_score ?? 60;
  const interviewConfidence = input.interviewScorecard?.interview_confidence_score ?? 45;
  const calibrationCompleteness = input.role.calibration.weights ? 85 : 70;
  const missingCriticalEvidence = [
    ...(input.candidate.parse_metadata?.missing_data ?? []),
    ...(!input.interviewScorecard ? ["Interview evidence is not available."] : []),
    ...hardGates.filter((gate) => !gate.passed).map((gate) => gate.explanation),
  ];
  const evidenceCompleteness = Math.max(35, 90 - missingCriticalEvidence.length * 12);
  const confidence = average([
    parserConfidence,
    resumeConfidence,
    interviewConfidence,
    calibrationCompleteness,
    evidenceCompleteness,
  ]);

  return {
    score: confidence,
    confidence,
    evidence: [
      `Parser confidence ${roundScore(parserConfidence)}.`,
      `Role calibration ${input.role.calibration.version} is present.`,
    ],
    missing_data: missingCriticalEvidence,
  };
}

function fromUpstreamDimension(dimension: UpstreamScoreDimension): DimensionDraft {
  return {
    score: dimension.score ?? 0,
    confidence: dimension.confidence ?? 60,
    evidence: normalizeEvidence(dimension.evidence),
    missing_data: dimension.missing_data ?? [],
  };
}

function buildCandidateExplanation(input: {
  candidate: CandidateProfile;
  role: RoleProfile;
  company?: CompanyProfile;
  dimensions: Record<MatchDimensionName, ScoreDimension>;
  hardGates: HardGateOutcome[];
  matchScore: number;
  matchConfidence: number;
}): MatchExplanation {
  const failedGates = input.hardGates.filter((gate) => !gate.passed);
  const missingEvidence = collectMissingEvidence(input.dimensions);
  const risks = collectRisks(input.dimensions, input.matchConfidence, failedGates);

  return {
    summary: failedGates.length
      ? `This role is not currently eligible because a role-essential hard gate is unmet. The ${input.matchScore}/100 match signal remains decision support, not a candidate quality judgment.`
      : `This is a ${input.matchScore}/100 match for ${input.role.title} with ${input.matchConfidence}/100 confidence.`,
    supporting_evidence: collectSupportingEvidence(input.dimensions),
    missing_evidence: missingEvidence,
    risks_uncertainties: risks,
    suggested_next_step: failedGates.length
      ? "Review eligibility evidence with the candidate before any employer sharing or human review step."
      : "Candidate can review the explanation and decide whether to share this match with the employer.",
  };
}

function buildEmployerExplanation(input: {
  role: RoleProfile;
  company?: CompanyProfile;
  dimensions: Record<MatchDimensionName, ScoreDimension>;
  hardGates: HardGateOutcome[];
  matchScore: number;
  matchConfidence: number;
}): MatchExplanation {
  const failedGates = input.hardGates.filter((gate) => !gate.passed);

  return {
    summary: `Candidate accepted sharing for ${input.role.title}. Match score is ${input.matchScore}/100 with ${input.matchConfidence}/100 confidence and requires meaningful human review.`,
    supporting_evidence: collectSupportingEvidence(input.dimensions),
    missing_evidence: collectMissingEvidence(input.dimensions),
    risks_uncertainties: collectRisks(input.dimensions, input.matchConfidence, failedGates),
    suggested_next_step:
      "Employer reviewer should inspect the evidence, gaps, consent record, and hard-gate outcomes before any hiring decision.",
  };
}

function collectSupportingEvidence(
  dimensions: Record<MatchDimensionName, ScoreDimension>,
): string[] {
  return unique(MATCH_DIMENSIONS.flatMap((name) => dimensions[name].evidence).filter(Boolean)).slice(
    0,
    8,
  );
}

function collectMissingEvidence(
  dimensions: Record<MatchDimensionName, ScoreDimension>,
): string[] {
  return unique(
    MATCH_DIMENSIONS.flatMap((name) => dimensions[name].missing_data).filter(Boolean),
  );
}

function collectRisks(
  dimensions: Record<MatchDimensionName, ScoreDimension>,
  confidence: number,
  failedGates: HardGateOutcome[],
): string[] {
  const risks = new Set<string>();
  const missingEvidence = collectMissingEvidence(dimensions);

  if (missingEvidence.length > 0 || confidence < 75) {
    risks.add("Human review required because evidence or confidence is incomplete.");
  }

  if (failedGates.length > 0) {
    risks.add("Role-essential hard gate failure requires eligibility review.");
  }

  return [...risks];
}

function buildOverallMatchDimension(input: {
  score: number;
  confidence: number;
  evidence: string[];
  missingData: string[];
  version: string;
  generatedAt: string;
  auditEventId: string;
}): ScoreDimension {
  return {
    score: input.score,
    confidence: input.confidence,
    evidence: input.evidence,
    missing_data: input.missingData,
    version: input.version,
    generated_at: input.generatedAt,
    reviewed_by_human: false,
    human_override: null,
    audit_event_id: input.auditEventId,
  };
}

function normalizeCandidateDecision(
  candidateDecision: CandidateDecisionInput | null | undefined,
  matchId: string,
): CandidateDecision | null {
  if (!candidateDecision) {
    return null;
  }

  return {
    decision: candidateDecision.decision,
    decided_at: candidateDecision.decided_at,
    consent_record_id:
      candidateDecision.decision === "accepted"
        ? candidateDecision.consent_record_id ?? null
        : null,
    audit_event_id:
      candidateDecision.audit_event_id ??
      `audit_candidate_match_decision_${sanitizeForId(matchId)}`,
  };
}

function getStatus(candidateDecision: CandidateDecision | null): MatchStatus {
  if (candidateDecision?.decision === "accepted" && candidateDecision.consent_record_id) {
    return "candidate_accepted";
  }

  if (candidateDecision?.decision === "declined") {
    return "candidate_declined";
  }

  return "candidate_visible";
}

function evaluateRequiredLanguages(
  candidate: CandidateProfile,
  role: RoleProfile,
  options: LanguageEvaluationOptions = {},
): LanguageEvaluation {
  const requiredLanguages = role.requirements.required_languages ?? [];

  if (requiredLanguages.length === 0) {
    return {
      passed: true,
      evidence: ["No role-essential language requirement configured."],
      missing: [],
      failed: [],
      score: 80,
      confidence: 75,
    };
  }

  const results = requiredLanguages.map((requirement) => {
    const candidateLanguage = candidate.languages.find(
      (language) => normalize(language.language) === normalize(requirement.language),
    );
    const assessedLevel = candidateLanguage?.assessed_level;
    const declaredLevel = candidateLanguage?.declared_level;
    const hasAssessedLevel = Boolean(assessedLevel && assessedLevel !== "unknown");
    const bestLevel = hasAssessedLevel ? assessedLevel : declaredLevel;
    const meetsMinimum = bestLevel ? compareCefr(bestLevel, requirement.minimum_level) >= 0 : false;
    const passed =
      meetsMinimum && (!options.requireAssessedForPass || hasAssessedLevel);
    const missingAssessed = !assessedLevel || assessedLevel === "unknown";
    const failure =
      !candidateLanguage || !bestLevel
        ? `${requirement.language} ${requirement.minimum_level} required, candidate evidence not found`
        : options.requireAssessedForPass && !hasAssessedLevel
          ? `${requirement.language} ${requirement.minimum_level} requires assessed communication evidence, candidate declaration ${bestLevel} is not enough for a role-essential hard gate`
          : `${requirement.language} ${requirement.minimum_level} required, candidate evidence ${bestLevel}`;

    return {
      requirement,
      passed,
      candidateLanguage,
      bestLevel,
      missingAssessed,
      failure,
    };
  });

  const passedCount = results.filter((result) => result.passed).length;
  const score = (passedCount / requiredLanguages.length) * 100;
  const missing = results
    .filter((result) => result.missingAssessed)
    .map((result) => `Assessed level for ${result.requirement.language} is not available.`);
  const failed = results
    .filter((result) => !result.passed)
    .map((result) => result.failure);

  return {
    passed: failed.length === 0,
    evidence: results
      .filter((result) => result.passed)
      .flatMap((result) => [
        `${result.requirement.language} meets ${result.requirement.minimum_level} requirement using ${
          result.bestLevel
        } evidence.`,
        ...(result.candidateLanguage?.evidence ?? []),
      ]),
    missing,
    failed,
    score,
    confidence: missing.length ? 65 : 85,
  };
}

function compareCefr(candidateLevel: string, requiredLevel: string): number {
  return CEFR_LEVELS.indexOf(candidateLevel) - CEFR_LEVELS.indexOf(requiredLevel);
}

function candidateHasSkill(candidate: CandidateProfile, skill: string): boolean {
  const skillNeedle = normalize(skill);
  const skillNames = candidate.skills.map((candidateSkill) => candidateSkill.name);
  if (containsNormalized(skillNames, skill)) {
    return true;
  }

  return candidate.experience.some((experience) =>
    [
      experience.title,
      experience.industry,
      experience.function,
      ...(experience.responsibilities ?? []),
      ...(experience.measurable_impact ?? []),
      ...(experience.tools ?? []),
    ]
      .filter(isString)
      .some((value) => normalize(value).includes(skillNeedle)),
  );
}

function collectEvidenceForSkills(candidate: CandidateProfile, skills: string[]): string[] {
  return skills.flatMap((skill) => {
    const matchingSkill = candidate.skills.find(
      (candidateSkill) => normalize(candidateSkill.name) === normalize(skill),
    );

    return matchingSkill?.evidence ?? [];
  });
}

function hasLocationOverlap(candidate: CandidateProfile, role: RoleProfile): boolean {
  const candidateLocations = [
    candidate.contact?.location,
    ...(candidate.preferences.locations ?? []),
  ].filter(isString);
  const roleLocations = role.location_constraints ?? [];

  return hasOverlap(candidateLocations, roleLocations);
}

function hasOverlap(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0) {
    return false;
  }

  return left.some((leftValue) =>
    right.some(
      (rightValue) =>
        normalize(leftValue).includes(normalize(rightValue)) ||
        normalize(rightValue).includes(normalize(leftValue)),
    ),
  );
}

function tokenOverlap(left: string[], right: Array<string | undefined>): boolean {
  const rightText = normalize(right.filter(Boolean).join(" "));

  return left.some((leftValue) => {
    const tokens = normalize(leftValue)
      .split(" ")
      .filter((token) => token.length > 2);

    return tokens.some((token) => rightText.includes(token));
  });
}

function containsNormalized(values: string[], expected: string): boolean {
  const normalizedExpected = normalize(expected);

  return values.some((value) => normalize(value).includes(normalizedExpected));
}

function hasAffirmativeWorkAuthorizationEvidence(value: string | undefined): boolean {
  const normalized = normalize(value);

  if (!normalized) {
    return false;
  }

  if (
    normalized.includes("does not require sponsorship") ||
    normalized.includes("no sponsorship required")
  ) {
    return true;
  }

  const negativePatterns = [
    "no authorization",
    "not authorized",
    "need sponsorship",
    "needs sponsorship",
    "requires sponsorship",
    "unknown",
    "not sure",
    "none"
  ];
  if (negativePatterns.some((pattern) => normalized.includes(pattern))) {
    return false;
  }

  const affirmativePatterns = [
    "authorized",
    "eligible",
    "right to work",
    "work permit",
    "valid visa",
    "visa valid",
    "permanent resident",
    "citizen"
  ];

  return affirmativePatterns.some((pattern) => normalized.includes(pattern));
}

function normalizeEvidence(evidence?: Array<string | EvidenceObject>): string[] {
  return (
    evidence
      ?.map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item.snippet;
      })
      .filter(isString) ?? []
  );
}

function confidenceFromEvidence(evidenceCount: number): number {
  return clamp(55 + evidenceCount * 8, 45, 90);
}

function average(values: number[]): number {
  const cleanValues = values.filter(isNumber);
  if (cleanValues.length === 0) {
    return 0;
  }

  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sanitizeForId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
