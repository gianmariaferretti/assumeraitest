import { enrichCompanyProfile } from "../company-enrichment";

import {
  getCandidatePreferenceFit,
  getCompanyBarFit,
  getEducationCredentialFit,
  getExperienceDomainFit,
  getGrowthPotentialFit,
  getInterviewEvidenceFit,
  getLanguageLocationAvailabilityFit,
  getMatchConfidence,
  getRoleSkillFit,
  getValuesAlignmentFit,
} from "./dimensions";
import {
  MATCHING_MODEL_VERSION,
  MATCHING_VERSION,
  type CandidateDecision,
  type CandidateDecisionInput,
  type CandidateProfile,
  type CompanyMatch,
  type CompanyProfile,
  type DimensionDraft,
  type EmployerMatchView,
  type EmployerVisibility,
  type HardGateOutcome,
  type MatchExplanation,
  type MatchStatus,
  type MatchingScoreInput,
  type RoleProfile,
  type ScoreDimension,
} from "./engine-types";
import { average, roundScore, sanitizeForId, unique } from "./engine-utils";
import { evaluateHardGates, evaluateRequiredModulesGate } from "./gates";
import {
  calculateWeightedMatchScore,
  DEFAULT_MATCH_WEIGHT_SET,
  MATCH_DIMENSIONS,
  resolveWeights,
  type MatchDimensionName,
} from "./weights";

/**
 * Deterministic matching engine core. Wires the per-dimension scorers
 * (./dimensions), the eligibility gates (./gates), and the versioned weights
 * (./weights) into one auditable CompanyMatch. Pure: persistence lives in
 * ./persistence.ts and in the company-workspace materializer.
 */

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
  const weightSet = input.weightSet ?? DEFAULT_MATCH_WEIGHT_SET;

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
      weightsVersion: weightSet.version,
    });
  }

  const hardGates = [
    ...(moduleGate ? [moduleGate] : []),
    ...evaluateHardGates(scoringInput),
  ];
  const dimensions = buildDimensions(scoringInput, hardGates, generatedAt, version, auditEventId);
  const weights = resolveWeights(scoringInput.role.calibration?.weights, weightSet.weights);
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
    weights_version: weightSet.version,
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
    ValuesAlignmentFit: getValuesAlignmentFit(input),
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
  weightsVersion: string;
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
    weights_version: args.weightsVersion,
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
