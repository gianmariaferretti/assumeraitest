export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "unknown";
export type WorkMode = "remote" | "hybrid" | "onsite";

export interface Evidence {
  source: string;
  snippet: string;
  confidence?: number;
}

export interface ScoreDimension {
  score: number;
  confidence: number;
  evidence: Evidence[];
  missing_data: string[];
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  audit_event_id: string;
}

export interface EducationRecord {
  institution: string;
  institution_canonical?: string;
  degree: string;
  field: string;
  start_date?: string;
  end_date?: string;
  grades?: string;
  honors?: string[];
  projects?: string[];
  ranking_confidence?: number;
  enrichment_needed?: boolean;
  university_signal?: {
    institution_id: string;
    canonical_name: string;
    country?: string;
    tier: string;
    score: number;
    confidence: number;
    source_id: string;
    source_version: string;
    ranking_year?: string;
    license_review_status: string;
    scoring_approved: boolean;
    enrichment_needed: boolean;
    manual_review_required: boolean;
    retrieved_at: string;
    stale_after: string;
    evidence: readonly string[];
  };
}

export interface ExperienceRecord {
  company: string;
  title: string;
  start_date: string;
  end_date?: string | null;
  duration_months?: number | null;
  industry?: string;
  function?: string;
  responsibilities?: string[];
  measurable_impact?: string[];
  tools?: string[];
  leadership_scope?: string;
  evidence_quality?: number;
}

export interface SkillRecord {
  name: string;
  category: "technical" | "business" | "work" | "language" | "other";
  recency?: string;
  evidence_count: number;
  evidence?: string[];
}

export interface LanguageRecord {
  language: string;
  declared_level?: CefrLevel;
  assessed_level?: CefrLevel;
  evidence?: string[];
  [extraField: string]: unknown;
}

export interface CandidateProfile {
  candidate_id: string;
  profile_version: string;
  confirmed_by_candidate: boolean;
  created_at: string;
  updated_at: string;
  contact?: Record<string, unknown>;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  skills: SkillRecord[];
  languages: LanguageRecord[];
  certifications?: string[];
  portfolio?: string[];
  preferences: {
    target_roles: string[];
    locations: string[];
    work_modes: WorkMode[];
    company_sizes?: string[];
    salary_range?: {
      currency?: string;
      min?: number;
      max?: number;
    };
    industries?: string[];
    work_style?: string[];
  };
  parse_metadata?: {
    parser_version?: string;
    parser_confidence?: number;
    missing_data?: string[];
    audit_event_id?: string;
  };
}

export interface RoleProfile {
  role_id: string;
  company_id: string;
  title: string;
  status: "draft" | "open" | "paused" | "closed";
  seniority?: string;
  role_type?: string;
  location_constraints?: string[];
  work_modes?: WorkMode[];
  requirements: {
    required_skills: string[];
    nice_to_have_skills: string[];
    required_languages?: Array<{
      language: string;
      minimum_level: Exclude<CefrLevel, "unknown">;
    }>;
    certifications?: string[];
    hard_gates?: Array<{
      gate_type: string;
      description: string;
      lawful_basis_note: string;
      role_essential: boolean;
    }>;
  };
  calibration: {
    version: string;
    score_bars: Record<string, number>;
    weights: Record<string, number>;
    required_evidence?: string[];
    interview_modules?: string[];
    created_by: string;
    created_at: string;
    audit_event_id?: string;
  };
  created_at: string;
  updated_at: string;
}

export const RESUME_SCORING_VERSION = "resume-scoring-v0";
export const RESUME_MODEL_VERSION = "deterministic-resume-v0";

export const DEFAULT_RESUME_SCORING_WEIGHTS = {
  ExperienceRelevanceScore: 0.3,
  SkillFitScore: 0.18,
  ImpactEvidenceScore: 0.14,
  CareerProgressionScore: 0.1,
  LanguageFitScore: 0.1,
  CareerStageAdjustedDensityScore: 0.08,
  EducationSignalScore: 0.06,
  RolePreferenceFitScore: 0.04,
} as const;

export type FormulaDimensionName = keyof typeof DEFAULT_RESUME_SCORING_WEIGHTS;

export type ResumeScoreDimensionName =
  | "ResumeParseConfidenceScore"
  | "EducationSignalScore"
  | "UniversitySignalScore"
  | "ExperienceRelevanceScore"
  | "ExperienceDepthScore"
  | "ImpactEvidenceScore"
  | "CareerProgressionScore"
  | "CareerStageAdjustedDensityScore"
  | "SkillFitScore"
  | "LanguageFitScore"
  | "RolePreferenceFitScore";

export type ResumeScoreMap = Record<ResumeScoreDimensionName, ScoreDimension>;

export interface ResumeScorecard {
  candidate_id: string;
  role_id: string;
  overall_resume_screen_score: number;
  confidence_score: number;
  scores: ResumeScoreMap;
  formula: typeof DEFAULT_RESUME_SCORING_WEIGHTS;
  human_review_required: boolean;
  risk_flags: string[];
  recommendations: string[];
  version: string;
  generated_at: string;
  reviewed_by_human: boolean;
  audit_event_id: string;
}

export interface AuditEvent {
  audit_event_id: string;
  event_type: "score.generated";
  actor_type: "system";
  actor_id: null;
  occurred_at: string;
  target_type: "candidate";
  target_id: string;
  summary: string;
  details: Record<string, unknown>;
  model_version: string;
  scoring_version: string;
  input_hash: string;
  confidence: number;
  correlation_id: string;
}

export interface ResumeScoringInput {
  candidateProfile: CandidateProfile;
  roleProfile: RoleProfile;
  generatedAt?: string;
  auditEventId?: string;
  correlationId?: string;
}

export interface ResumeScoringResult {
  scorecard: ResumeScorecard;
  auditEvent: AuditEvent;
}

interface RoleMatchSummary {
  requiredMatches: string[];
  missingRequired: string[];
  niceMatches: string[];
  requiredCoverage: number;
  niceCoverage: number;
}

interface DimensionContext {
  generatedAt: string;
  auditEventId: string;
}

const FORMULA_DIMENSIONS = Object.keys(
  DEFAULT_RESUME_SCORING_WEIGHTS,
) as FormulaDimensionName[];

const CEFR_LEVELS: Record<CefrLevel, number> = {
  unknown: 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export function scoreResume(input: ResumeScoringInput): ResumeScoringResult {
  const { candidateProfile, roleProfile } = input;

  if (!candidateProfile.confirmed_by_candidate) {
    throw new Error(
      "Resume scoring requires a profile confirmed by the candidate.",
    );
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const auditEventId =
    input.auditEventId ??
    `audit_resume_score_${safeId(candidateProfile.candidate_id)}_${safeId(
      roleProfile.role_id,
    )}_${Date.parse(generatedAt)}`;
  const correlationId =
    input.correlationId ??
    `corr_resume_score_${safeId(candidateProfile.candidate_id)}_${safeId(
      roleProfile.role_id,
    )}`;
  const context: DimensionContext = { generatedAt, auditEventId };
  const roleMatches = summarizeRoleMatches(candidateProfile, roleProfile);

  const resumeParseConfidenceScore = buildResumeParseConfidenceScore(
    candidateProfile,
    context,
  );
  const universitySignalScore = buildUniversitySignalScore(
    candidateProfile,
    context,
  );
  const educationSignalScore = buildEducationSignalScore(
    candidateProfile,
    roleProfile,
    universitySignalScore,
    context,
  );
  const experienceRelevanceScore = buildExperienceRelevanceScore(
    candidateProfile,
    roleProfile,
    roleMatches,
    context,
  );
  const experienceDepthScore = buildExperienceDepthScore(
    candidateProfile,
    context,
  );
  const impactEvidenceScore = buildImpactEvidenceScore(
    candidateProfile,
    context,
  );
  const careerProgressionScore = buildCareerProgressionScore(
    candidateProfile,
    context,
  );
  const careerStageAdjustedDensityScore =
    buildCareerStageAdjustedDensityScore(candidateProfile, context);
  const skillFitScore = buildSkillFitScore(
    candidateProfile,
    roleProfile,
    roleMatches,
    context,
  );
  const languageFitScore = buildLanguageFitScore(
    candidateProfile,
    roleProfile,
    context,
  );
  const rolePreferenceFitScore = buildRolePreferenceFitScore(
    candidateProfile,
    roleProfile,
    context,
  );

  const scores: ResumeScoreMap = {
    ResumeParseConfidenceScore: resumeParseConfidenceScore,
    EducationSignalScore: educationSignalScore,
    UniversitySignalScore: universitySignalScore,
    ExperienceRelevanceScore: experienceRelevanceScore,
    ExperienceDepthScore: experienceDepthScore,
    ImpactEvidenceScore: impactEvidenceScore,
    CareerProgressionScore: careerProgressionScore,
    CareerStageAdjustedDensityScore: careerStageAdjustedDensityScore,
    SkillFitScore: skillFitScore,
    LanguageFitScore: languageFitScore,
    RolePreferenceFitScore: rolePreferenceFitScore,
  };

  const overallResumeScreenScore = calculateOverallResumeScreenScore(scores);
  const confidenceScore = calculateConfidenceScore(scores, candidateProfile);
  const riskFlags = buildRiskFlags(
    candidateProfile,
    scores,
    roleMatches,
    confidenceScore,
  );
  const humanReviewRequired = riskFlags.length > 0;

  const scorecard: ResumeScorecard = {
    candidate_id: candidateProfile.candidate_id,
    role_id: roleProfile.role_id,
    overall_resume_screen_score: overallResumeScreenScore,
    confidence_score: confidenceScore,
    scores,
    formula: DEFAULT_RESUME_SCORING_WEIGHTS,
    human_review_required: humanReviewRequired,
    risk_flags: riskFlags,
    recommendations: buildRecommendations(
      overallResumeScreenScore,
      confidenceScore,
      humanReviewRequired,
    ),
    version: RESUME_SCORING_VERSION,
    generated_at: generatedAt,
    reviewed_by_human: false,
    audit_event_id: auditEventId,
  };

  const auditEvent: AuditEvent = {
    audit_event_id: auditEventId,
    event_type: "score.generated",
    actor_type: "system",
    actor_id: null,
    occurred_at: generatedAt,
    target_type: "candidate",
    target_id: candidateProfile.candidate_id,
    summary:
      "Generated deterministic resume scorecard for human review decision support.",
    details: {
      role_id: roleProfile.role_id,
      score: overallResumeScreenScore,
      confidence: confidenceScore,
      human_review_required: humanReviewRequired,
      risk_flags: riskFlags,
      formula: DEFAULT_RESUME_SCORING_WEIGHTS,
      dimension_scores: Object.fromEntries(
        Object.entries(scores).map(([name, dimension]) => [
          name,
          {
            score: dimension.score,
            confidence: dimension.confidence,
            missing_data: dimension.missing_data,
          },
        ]),
      ),
    },
    model_version: RESUME_MODEL_VERSION,
    scoring_version: RESUME_SCORING_VERSION,
    input_hash: createStableInputHash(candidateProfile, roleProfile),
    confidence: confidenceScore,
    correlation_id: correlationId,
  };

  return { scorecard, auditEvent };
}

export function calculateOverallResumeScreenScore(
  scores: Pick<ResumeScoreMap, FormulaDimensionName>,
): number {
  const weightedScore = FORMULA_DIMENSIONS.reduce((sum, dimensionName) => {
    return (
      sum +
      DEFAULT_RESUME_SCORING_WEIGHTS[dimensionName] *
        scores[dimensionName].score
    );
  }, 0);

  return roundScore(weightedScore);
}

function buildResumeParseConfidenceScore(
  candidateProfile: CandidateProfile,
  context: DimensionContext,
): ScoreDimension {
  const parserConfidence = candidateProfile.parse_metadata?.parser_confidence;
  const missingData = candidateProfile.parse_metadata?.missing_data ?? [];

  return dimension(
    parserConfidence ?? 50,
    parserConfidence === undefined ? 35 : 90,
    [
      evidence(
        "parse_metadata.parser_confidence",
        parserConfidence === undefined
          ? "Parser confidence missing; neutral score used with low confidence."
          : `Parser reported ${parserConfidence} confidence.`,
        parserConfidence ?? 35,
      ),
    ],
    missingData,
    context,
  );
}

function buildUniversitySignalScore(
  candidateProfile: CandidateProfile,
  context: DimensionContext,
): ScoreDimension {
  if (candidateProfile.education.length === 0) {
    return dimension(
      50,
      25,
      [
        evidence(
          "education",
          "No education record available; neutral university prior used.",
          25,
        ),
      ],
      ["Education record"],
      context,
    );
  }

  const rankingConfidences = candidateProfile.education.map((education) =>
    clampScore(
      education.university_signal?.confidence ?? education.ranking_confidence ?? 35,
    ),
  );
  const unknownUniversity = candidateProfile.education.some((education) => {
    const canonical = normalize(education.institution_canonical ?? "");
    return (
      education.university_signal?.enrichment_needed === true ||
      education.enrichment_needed === true ||
      canonical === "unknown" ||
      (education.university_signal?.confidence ?? education.ranking_confidence ?? 100) <= 20
    );
  });

  if (unknownUniversity) {
    return dimension(
      50,
      Math.min(30, average(rankingConfidences)),
      [
        evidence(
          "education.institution",
          "Unknown university uses neutral prior; enrichment needed before any stronger signal.",
          25,
        ),
      ],
      ["University ranking source"],
      context,
    );
  }

  const approvedSignals = candidateProfile.education
    .map((education) => education.university_signal)
    .filter(
      (signal): signal is NonNullable<EducationRecord["university_signal"]> =>
        Boolean(signal?.scoring_approved && !signal.enrichment_needed),
    );

  if (approvedSignals.length > 0) {
    const score = roundScore(average(approvedSignals.map((signal) => signal.score)));
    const confidence = roundScore(
      average(approvedSignals.map((signal) => signal.confidence)),
    );

    return dimension(
      score,
      confidence,
      approvedSignals.flatMap((signal) => [
        evidence(
          "education.university_signal",
          `${signal.canonical_name} enrichment ${signal.tier} from ${signal.source_id}; scoring use is ${signal.license_review_status}.`,
          signal.confidence,
        ),
        ...signal.evidence.map((snippet) =>
          evidence("education.university_signal.evidence", snippet, signal.confidence),
        ),
      ]),
      [],
      context,
    );
  }

  const rankingConfidence = average(rankingConfidences);
  const cappedSignal = Math.min(75, 50 + rankingConfidence * 0.25);

  return dimension(
    cappedSignal,
    rankingConfidence,
    [
      evidence(
        "education.ranking_confidence",
        "Known institution signal is capped and contributes only inside education.",
        rankingConfidence,
      ),
    ],
    [],
    context,
  );
}

function buildEducationSignalScore(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfile,
  universitySignalScore: ScoreDimension,
  context: DimensionContext,
): ScoreDimension {
  if (candidateProfile.education.length === 0) {
    return dimension(
      50,
      30,
      [
        evidence(
          "education",
          "Education is missing; neutral education score used.",
          30,
        ),
      ],
      ["Education record"],
      context,
    );
  }

  const roleTerms = roleSearchTerms(roleProfile);
  const educationText = candidateProfile.education
    .map((education) =>
      [
        education.degree,
        education.field,
        ...(education.honors ?? []),
        ...(education.projects ?? []),
      ].join(" "),
    )
    .join(" ");
  const roleRelevantEducation = roleTerms.some((term) =>
    textMatchesTerm(educationText, term),
  );
  const projectEvidenceCount = candidateProfile.education.reduce(
    (sum, education) => sum + (education.projects?.length ?? 0),
    0,
  );
  const honorsCount = candidateProfile.education.reduce(
    (sum, education) => sum + (education.honors?.length ?? 0),
    0,
  );
  const credentialScore = clampScore(
    55 +
      (roleRelevantEducation ? 15 : 0) +
      Math.min(projectEvidenceCount * 6, 12) +
      Math.min(honorsCount * 4, 8),
  );
  const score = roundScore(
    credentialScore * 0.65 + universitySignalScore.score * 0.35,
  );
  const confidence = roundScore(
    Math.max(35, (credentialScore + universitySignalScore.confidence) / 2),
  );

  return dimension(
    score,
    confidence,
    [
      evidence(
        "education",
        roleRelevantEducation
          ? "Education includes role-relevant field, project, or credential evidence."
          : "Education present; role-specific credential evidence is limited.",
        confidence,
      ),
    ],
    universitySignalScore.missing_data,
    context,
  );
}

function buildExperienceRelevanceScore(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfile,
  roleMatches: RoleMatchSummary,
  context: DimensionContext,
): ScoreDimension {
  const roleTerms = roleSearchTerms(roleProfile);
  const relevantExperiences = candidateProfile.experience.filter((experience) =>
    roleTerms.some((term) => textMatchesTerm(experienceText(experience), term)),
  );
  const relevanceRatio =
    candidateProfile.experience.length === 0
      ? 0
      : relevantExperiences.length / candidateProfile.experience.length;
  const score = clampScore(
    35 +
      roleMatches.requiredCoverage * 40 +
      roleMatches.niceCoverage * 12 +
      relevanceRatio * 13,
  );

  return dimension(
    score,
    evidenceConfidence(candidateProfile, score),
    [
      evidence(
        "experience",
        roleMatches.requiredMatches.length > 0
          ? `Experience evidence matches role requirements: ${safeList(
              roleMatches.requiredMatches,
            )}.`
          : "Experience is present but direct role-requirement evidence is limited.",
        score,
      ),
    ],
    roleMatches.missingRequired.map(
      (skill) => `Role-critical experience evidence for ${skill}`,
    ),
    context,
  );
}

function buildExperienceDepthScore(
  candidateProfile: CandidateProfile,
  context: DimensionContext,
): ScoreDimension {
  const totalMonths = totalExperienceMonths(candidateProfile);
  const experienceCount = candidateProfile.experience.length;
  const score = clampScore(
    35 + Math.min(totalMonths / 1.2, 45) + Math.min(experienceCount * 5, 20),
  );
  const confidence = experienceCount === 0 ? 20 : 75;

  return dimension(
    score,
    confidence,
    [
      evidence(
        "experience.duration_months",
        `${totalMonths} months of candidate-provided role duration evidence.`,
        confidence,
      ),
    ],
    experienceCount === 0 ? ["Experience records"] : [],
    context,
  );
}

function buildImpactEvidenceScore(
  candidateProfile: CandidateProfile,
  context: DimensionContext,
): ScoreDimension {
  const impactItems = candidateProfile.experience.flatMap(
    (experience) => experience.measurable_impact ?? [],
  );
  const qualityScores = candidateProfile.experience
    .map((experience) => experience.evidence_quality)
    .filter((value): value is number => typeof value === "number");
  const averageQuality = qualityScores.length > 0 ? average(qualityScores) : 45;
  const score = clampScore(30 + averageQuality * 0.45 + impactItems.length * 8);
  const confidence = clampScore(
    qualityScores.length > 0 ? averageQuality : impactItems.length * 20,
  );

  return dimension(
    score,
    confidence,
    [
      evidence(
        "experience.measurable_impact",
        impactItems.length > 0
          ? `${impactItems.length} measurable impact item(s) provided.`
          : "No measurable impact evidence provided.",
        confidence,
      ),
    ],
    impactItems.length === 0 ? ["Measurable impact evidence"] : [],
    context,
  );
}

function buildCareerProgressionScore(
  candidateProfile: CandidateProfile,
  context: DimensionContext,
): ScoreDimension {
  const sortedExperience = [...candidateProfile.experience].sort((left, right) =>
    left.start_date.localeCompare(right.start_date),
  );
  const currentRole = sortedExperience.some((experience) => !experience.end_date);
  const leadershipEvidence = sortedExperience.some((experience) => {
    const scope = normalize(experience.leadership_scope ?? "");
    return (
      scope.length > 0 &&
      !scope.includes("individual contributor") &&
      !scope.includes("intern")
    );
  });
  const titleProgression = hasTitleProgression(sortedExperience);
  const score = clampScore(
    50 +
      Math.min(sortedExperience.length * 8, 20) +
      (currentRole ? 8 : 0) +
      (leadershipEvidence ? 10 : 0) +
      (titleProgression ? 12 : 0),
  );
  const confidence = sortedExperience.length > 0 ? 72 : 25;

  return dimension(
    score,
    confidence,
    [
      evidence(
        "experience.title",
        "Career progression evaluated from role sequence and scope, not chronological age.",
        confidence,
      ),
    ],
    sortedExperience.length === 0 ? ["Career sequence evidence"] : [],
    context,
  );
}

function buildCareerStageAdjustedDensityScore(
  candidateProfile: CandidateProfile,
  context: DimensionContext,
): ScoreDimension {
  const totalMonths = totalExperienceMonths(candidateProfile);
  const stage = careerStageFromMonths(totalMonths);
  const evidenceItems =
    candidateProfile.skills.reduce(
      (sum, skill) => sum + skill.evidence_count,
      0,
    ) +
    candidateProfile.experience.reduce(
      (sum, experience) =>
        sum +
        (experience.measurable_impact?.length ?? 0) +
        (experience.responsibilities?.length ?? 0),
      0,
    ) +
    (candidateProfile.portfolio?.length ?? 0) +
    (candidateProfile.certifications?.length ?? 0);
  const monthsForDensity = Math.max(totalMonths, 12);
  const annualizedEvidenceDensity = (evidenceItems / monthsForDensity) * 12;
  const stageBoost =
    stage === "emerging" ? 12 : stage === "junior" ? 8 : stage === "mid" ? 4 : 0;
  const score = clampScore(45 + annualizedEvidenceDensity * 10 + stageBoost);
  const confidence = totalMonths > 0 ? 70 : 35;

  return dimension(
    score,
    confidence,
    [
      evidence(
        "experience.duration_months",
        `${stage} career-stage density uses opportunity timeline evidence, not age.`,
        confidence,
      ),
    ],
    totalMonths === 0 ? ["Professional opportunity timeline"] : [],
    context,
  );
}

function buildSkillFitScore(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfile,
  roleMatches: RoleMatchSummary,
  context: DimensionContext,
): ScoreDimension {
  const score = clampScore(
    25 + roleMatches.requiredCoverage * 55 + roleMatches.niceCoverage * 20,
  );
  const matchedSkills = [
    ...roleMatches.requiredMatches,
    ...roleMatches.niceMatches,
  ];

  return dimension(
    score,
    evidenceConfidence(candidateProfile, score),
    [
      evidence(
        "skills",
        matchedSkills.length > 0
          ? `Skill evidence matches: ${safeList(matchedSkills)}.`
          : "No direct skill evidence matched role requirements.",
        score,
      ),
    ],
    roleMatches.missingRequired.map((skill) => `Required skill: ${skill}`),
    context,
  );
}

function buildLanguageFitScore(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfile,
  context: DimensionContext,
): ScoreDimension {
  const requiredLanguages = roleProfile.requirements.required_languages ?? [];

  if (requiredLanguages.length === 0) {
    return dimension(
      75,
      65,
      [
        evidence(
          "role.requirements.required_languages",
          "No required language gate configured for this role.",
          65,
        ),
      ],
      [],
      context,
    );
  }

  const scores = requiredLanguages.map((requiredLanguage) => {
    const candidateLanguage = candidateProfile.languages.find(
      (language) =>
        normalize(language.language) === normalize(requiredLanguage.language),
    );

    if (!candidateLanguage) {
      return {
        score: 20,
        missing: `${requiredLanguage.language} ${requiredLanguage.minimum_level} missing`,
        evidence: null,
      };
    }

    const candidateLevel =
      candidateLanguage.assessed_level &&
      candidateLanguage.assessed_level !== "unknown"
        ? candidateLanguage.assessed_level
        : candidateLanguage.declared_level ?? "unknown";
    const meetsRequirement =
      CEFR_LEVELS[candidateLevel] >= CEFR_LEVELS[requiredLanguage.minimum_level];
    const languageEvidenceCount = candidateLanguage.evidence?.length ?? 0;

    return {
      score: meetsRequirement ? 100 : 45,
      missing: meetsRequirement
        ? null
        : `${requiredLanguage.language} ${requiredLanguage.minimum_level} below minimum`,
      evidence: evidence(
        "languages",
        `${requiredLanguage.language} ${candidateLevel} compared with role minimum ${requiredLanguage.minimum_level}.`,
        languageEvidenceCount > 0 ? 80 : 55,
      ),
    };
  });
  const missingLanguages = scores
    .map((score) => score.missing)
    .filter((value): value is string => value !== null);
  const languageEvidence = scores
    .map((score) => score.evidence)
    .filter((value): value is Evidence => value !== null);

  return dimension(
    average(scores.map((score) => score.score)),
    missingLanguages.length === 0 ? 82 : 45,
    languageEvidence.length > 0
      ? languageEvidence
      : [
          evidence(
            "languages",
            "Required language evidence is missing.",
            35,
          ),
        ],
    missingLanguages.map((language) => `Required language evidence: ${language}`),
    context,
  );
}

function buildRolePreferenceFitScore(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfile,
  context: DimensionContext,
): ScoreDimension {
  const targetRoleMatch = candidateProfile.preferences.target_roles.some(
    (targetRole) =>
      textMatchesTerm(targetRole, roleProfile.title) ||
      textMatchesTerm(roleProfile.title, targetRole) ||
      (roleProfile.role_type
        ? textMatchesTerm(targetRole, roleProfile.role_type)
        : false),
  );
  const workModeMatch = (roleProfile.work_modes ?? []).some((workMode) =>
    candidateProfile.preferences.work_modes.includes(workMode),
  );
  const locationMatch = (roleProfile.location_constraints ?? []).some(
    (locationConstraint) =>
      candidateProfile.preferences.locations.some(
        (candidateLocation) =>
          textMatchesTerm(candidateLocation, locationConstraint) ||
          textMatchesTerm(locationConstraint, candidateLocation),
      ),
  );
  const industryMatch = (candidateProfile.preferences.industries ?? []).some(
    (industry) =>
      candidateProfile.experience.some((experience) =>
        textMatchesTerm(experience.industry ?? "", industry),
      ),
  );
  const score = clampScore(
    40 +
      (targetRoleMatch ? 25 : 0) +
      (workModeMatch ? 20 : 0) +
      (locationMatch ? 10 : 0) +
      (industryMatch ? 5 : 0),
  );

  return dimension(
    score,
    70,
    [
      evidence(
        "preferences",
        "Role preference fit uses target roles, work modes, locations, and industries supplied by the candidate.",
        70,
      ),
    ],
    score < 60 ? ["Candidate role preference alignment"] : [],
    context,
  );
}

function summarizeRoleMatches(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfile,
): RoleMatchSummary {
  const searchableText = [
    candidateProfile.skills
      .map((skill) =>
        [skill.name, skill.category, ...(skill.evidence ?? [])].join(" "),
      )
      .join(" "),
    candidateProfile.experience.map(experienceText).join(" "),
    (candidateProfile.certifications ?? []).join(" "),
    (candidateProfile.portfolio ?? []).join(" "),
  ].join(" ");
  const requiredMatches = roleProfile.requirements.required_skills.filter(
    (skill) => textMatchesTerm(searchableText, skill),
  );
  const niceMatches = roleProfile.requirements.nice_to_have_skills.filter(
    (skill) => textMatchesTerm(searchableText, skill),
  );
  const missingRequired = roleProfile.requirements.required_skills.filter(
    (skill) => !requiredMatches.includes(skill),
  );

  return {
    requiredMatches,
    missingRequired,
    niceMatches,
    requiredCoverage: coverage(
      requiredMatches.length,
      roleProfile.requirements.required_skills.length,
    ),
    niceCoverage: coverage(
      niceMatches.length,
      roleProfile.requirements.nice_to_have_skills.length,
    ),
  };
}

function buildRiskFlags(
  candidateProfile: CandidateProfile,
  scores: ResumeScoreMap,
  roleMatches: RoleMatchSummary,
  confidenceScore: number,
): string[] {
  const riskFlags = new Set<string>();
  const parserConfidence = candidateProfile.parse_metadata?.parser_confidence;

  if (parserConfidence === undefined || parserConfidence < 60) {
    riskFlags.add("low_parser_confidence");
  }

  if (confidenceScore < 60) {
    riskFlags.add("low_score_confidence");
  }

  if (scores.UniversitySignalScore.missing_data.includes("University ranking source")) {
    riskFlags.add("unknown_university_enrichment_needed");
  }

  if (roleMatches.missingRequired.length > 0) {
    riskFlags.add("missing_critical_role_evidence");
  }

  if (
    scores.LanguageFitScore.missing_data.some((item) =>
      item.startsWith("Required language evidence:"),
    )
  ) {
    riskFlags.add("missing_required_language_evidence");
  }

  return [...riskFlags].sort();
}

function buildRecommendations(
  score: number,
  confidence: number,
  humanReviewRequired: boolean,
): string[] {
  const recommendations: string[] = [];

  if (score >= 75 && confidence >= 70) {
    recommendations.push(
      "Strong resume fit signal; reviewer should verify evidence and consent.",
    );
  } else if (score >= 60) {
    recommendations.push(
      "Moderate resume fit signal; reviewer should inspect missing evidence.",
    );
  } else {
    recommendations.push(
      "Limited resume fit evidence; reviewer should inspect role requirements and candidate corrections.",
    );
  }

  if (humanReviewRequired) {
    recommendations.push("Manual review required before employer action.");
  }

  return recommendations;
}

function calculateConfidenceScore(
  scores: ResumeScoreMap,
  candidateProfile: CandidateProfile,
): number {
  const confidenceDimensions: ResumeScoreDimensionName[] = [
    "ResumeParseConfidenceScore",
    "EducationSignalScore",
    "UniversitySignalScore",
    "ExperienceRelevanceScore",
    "ImpactEvidenceScore",
    "CareerProgressionScore",
    "CareerStageAdjustedDensityScore",
    "SkillFitScore",
    "LanguageFitScore",
    "RolePreferenceFitScore",
  ];
  const dimensionConfidence = average(
    confidenceDimensions.map((dimensionName) => scores[dimensionName].confidence),
  );
  const parserConfidence = candidateProfile.parse_metadata?.parser_confidence ?? 35;
  const missingDataPenalty = Math.min(
    (candidateProfile.parse_metadata?.missing_data?.length ?? 0) * 4,
    12,
  );

  return clampScore(
    dimensionConfidence * 0.65 + parserConfidence * 0.35 - missingDataPenalty,
  );
}

function dimension(
  score: number,
  confidence: number,
  evidenceItems: Evidence[],
  missingData: string[],
  context: DimensionContext,
): ScoreDimension {
  return {
    score: clampScore(score),
    confidence: clampScore(confidence),
    evidence: evidenceItems.length > 0 ? evidenceItems : [],
    missing_data: unique(missingData.filter(Boolean)),
    version: RESUME_SCORING_VERSION,
    generated_at: context.generatedAt,
    reviewed_by_human: false,
    audit_event_id: context.auditEventId,
  };
}

function evidence(source: string, snippet: string, confidence: number): Evidence {
  return {
    source,
    snippet,
    confidence: clampScore(confidence),
  };
}

function roleSearchTerms(roleProfile: RoleProfile): string[] {
  return unique([
    roleProfile.title,
    roleProfile.role_type ?? "",
    roleProfile.seniority ?? "",
    ...roleProfile.requirements.required_skills,
    ...roleProfile.requirements.nice_to_have_skills,
    ...(roleProfile.calibration.required_evidence ?? []),
  ]);
}

function experienceText(experience: ExperienceRecord): string {
  return [
    experience.title,
    experience.industry,
    experience.function,
    ...(experience.responsibilities ?? []),
    ...(experience.measurable_impact ?? []),
    ...(experience.tools ?? []),
    experience.leadership_scope,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function textMatchesTerm(text: string, term: string): boolean {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);

  if (normalizedText.length === 0 || normalizedTerm.length === 0) {
    return false;
  }

  if (normalizedText.includes(normalizedTerm)) {
    return true;
  }

  const termTokens = normalizedTerm
    .split(" ")
    .filter((token) => token.length >= 3);

  return termTokens.some((token) => normalizedText.includes(token));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function totalExperienceMonths(candidateProfile: CandidateProfile): number {
  return candidateProfile.experience.reduce((sum, experience) => {
    if (typeof experience.duration_months === "number") {
      return sum + experience.duration_months;
    }

    return sum;
  }, 0);
}

function careerStageFromMonths(totalMonths: number): string {
  const years = totalMonths / 12;

  if (years < 2) {
    return "emerging";
  }

  if (years < 5) {
    return "junior";
  }

  if (years < 8) {
    return "mid";
  }

  if (years < 12) {
    return "senior";
  }

  return "advanced";
}

function hasTitleProgression(experience: ExperienceRecord[]): boolean {
  if (experience.length < 2) {
    return false;
  }

  const firstRank = titleRank(experience[0]?.title ?? "");
  const lastRank = titleRank(experience[experience.length - 1]?.title ?? "");

  return lastRank > firstRank;
}

function titleRank(title: string): number {
  const normalizedTitle = normalize(title);

  if (normalizedTitle.includes("intern")) {
    return 1;
  }

  if (normalizedTitle.includes("associate") || normalizedTitle.includes("junior")) {
    return 2;
  }

  if (normalizedTitle.includes("analyst") || normalizedTitle.includes("developer")) {
    return 3;
  }

  if (
    normalizedTitle.includes("account executive") ||
    normalizedTitle.includes("manager") ||
    normalizedTitle.includes("lead")
  ) {
    return 4;
  }

  if (normalizedTitle.includes("senior") || normalizedTitle.includes("principal")) {
    return 5;
  }

  return 3;
}

function evidenceConfidence(
  candidateProfile: CandidateProfile,
  fallbackScore: number,
): number {
  const evidenceCount =
    candidateProfile.skills.reduce(
      (sum, skill) => sum + skill.evidence_count,
      0,
    ) +
    candidateProfile.experience.reduce(
      (sum, experience) =>
        sum +
        (experience.responsibilities?.length ?? 0) +
        (experience.measurable_impact?.length ?? 0),
      0,
    );

  return clampScore(Math.max(45, Math.min(90, fallbackScore * 0.8 + evidenceCount)));
}

function createStableInputHash(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfile,
): string {
  const sanitizedInput = JSON.stringify({
    candidate_id: candidateProfile.candidate_id,
    profile_version: candidateProfile.profile_version,
    role_id: roleProfile.role_id,
    role_calibration_version: roleProfile.calibration.version,
    experience: candidateProfile.experience.map((experience) => ({
      title: experience.title,
      start_date: experience.start_date,
      end_date: experience.end_date,
      duration_months: experience.duration_months,
      industry: experience.industry,
      function: experience.function,
      responsibilities: experience.responsibilities,
      measurable_impact: experience.measurable_impact,
      tools: experience.tools,
      leadership_scope: experience.leadership_scope,
      evidence_quality: experience.evidence_quality,
    })),
    education: candidateProfile.education.map((education) => ({
      institution_canonical: education.institution_canonical,
      degree: education.degree,
      field: education.field,
      projects: education.projects,
      honors: education.honors,
      ranking_confidence: education.ranking_confidence,
      enrichment_needed: education.enrichment_needed,
      university_signal: education.university_signal
        ? {
            institution_id: education.university_signal.institution_id,
            source_id: education.university_signal.source_id,
            source_version: education.university_signal.source_version,
            tier: education.university_signal.tier,
            score: education.university_signal.score,
            confidence: education.university_signal.confidence,
            enrichment_needed: education.university_signal.enrichment_needed,
            scoring_approved: education.university_signal.scoring_approved,
          }
        : undefined,
    })),
    skills: candidateProfile.skills,
    languages: candidateProfile.languages.map((language) => ({
      language: language.language,
      declared_level: language.declared_level,
      assessed_level: language.assessed_level,
      evidence: language.evidence,
    })),
    preferences: candidateProfile.preferences,
    parse_metadata: candidateProfile.parse_metadata,
    role_requirements: roleProfile.requirements,
  });
  let hash = 0;

  for (let index = 0; index < sanitizedInput.length; index += 1) {
    hash = (hash * 31 + sanitizedInput.charCodeAt(index)) >>> 0;
  }

  return `resume_input_${hash.toString(16).padStart(8, "0")}`;
}

function safeId(value: string): string {
  return normalize(value).replace(/\s+/g, "_") || "unknown";
}

function safeList(values: string[]): string {
  return values.slice(0, 4).join(", ");
}

function coverage(matches: number, total: number): number {
  if (total === 0) {
    return 1;
  }

  return matches / total;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function clampScore(value: number): number {
  return roundScore(Math.min(100, Math.max(0, value)));
}

function roundScore(value: number): number {
  return Number(value.toFixed(2));
}
