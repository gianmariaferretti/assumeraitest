import type { CandidateProfile } from "../resume-parsing";
import { createLanguageTestPlan } from "../language-assessment";
import {
  localizeResumeAwarePrompt,
  resolveCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "./interview-language";
import { isCanonicalQuestionId } from "./canonical-questions";
import { assertQuestionBankAllowed, containsDisallowedQuestionText } from "./safety";
import type {
  InterviewQuestion,
  ModuleId,
  ResumeQuestionGrounding,
  RoleProfileInput
} from "./types";

type ResumeEvidenceKind =
  | "experience"
  | "responsibility"
  | "impact"
  | "tool"
  | "skill"
  | "language"
  | "education"
  | "project"
  | "preference";

interface ResumeEvidenceItem {
  kind: ResumeEvidenceKind;
  detail: string;
  searchable: string;
  moduleIds: ModuleId[];
}

interface RequirementMatch {
  requirement: string;
  promptEvidence: ResumeEvidenceItem;
  evidenceRequirement: string;
}

interface ResumePlanContext {
  roleTitle: string;
  primaryExperience: string;
  fallbackEvidence: string;
  languageAssessmentPrompt: string;
  languageEvidenceRequirements: string[];
  requirementMatches: RequirementMatch[];
  missingRoleEvidence: string[];
  roleEvidence: string[];
}

const MODULES_BY_KIND: Record<ResumeEvidenceKind, ModuleId[]> = {
  experience: ["motivation", "domain", "case"],
  responsibility: ["domain", "work_sample", "case"],
  impact: ["motivation", "domain", "work_sample"],
  tool: ["domain", "work_sample"],
  skill: ["domain", "work_sample"],
  language: ["language"],
  education: ["motivation", "domain"],
  project: ["domain", "work_sample", "case"],
  preference: ["motivation"]
};

const RESUME_SIGNAL = "confirmed resume evidence connected to role requirements";
const MISSING_EVIDENCE_SIGNAL = "missing role evidence handled as confidence gap, not a negative signal";
const STAR_RESPONSE_FRAME =
  "Please answer with a specific past example using STAR: Situation, Task, Action, Result. Keep it to one competency or evidence target.";
const SBI_RESPONSE_FRAME =
  "This is an SBI structured behavioral interview prompt: specific Situation, Behavior, and Impact evidence only.";

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function safeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const text = compact(value);

  if (!text || containsDisallowedQuestionText(text)) {
    return undefined;
  }

  return text;
}

function addEvidence(
  items: ResumeEvidenceItem[],
  kind: ResumeEvidenceKind,
  detail: string | undefined,
  searchable = detail
): void {
  const safeDetail = safeText(detail);
  const safeSearchable = safeText(searchable);

  if (!safeDetail || !safeSearchable) {
    return;
  }

  items.push({
    kind,
    detail: safeDetail,
    searchable: safeSearchable,
    moduleIds: MODULES_BY_KIND[kind]
  });
}

function evidenceLabelForExperience(title?: string, company?: string): string | undefined {
  const safeTitle = safeText(title);
  const safeCompany = safeText(company);

  if (safeTitle && safeCompany) {
    return `${safeTitle} at ${safeCompany}`;
  }

  return safeTitle ?? safeCompany;
}

function collectResumeEvidence(candidateProfile: CandidateProfile): ResumeEvidenceItem[] {
  const items: ResumeEvidenceItem[] = [];

  for (const experience of candidateProfile.experience) {
    const experienceLabel = evidenceLabelForExperience(experience.title, experience.company);
    const experienceSearch = [
      experienceLabel,
      experience.industry,
      experience.function,
      ...(experience.responsibilities ?? []),
      ...(experience.measurable_impact ?? []),
      ...(experience.tools ?? [])
    ]
      .map((value) => safeText(value))
      .filter(Boolean)
      .join(" ");

    addEvidence(items, "experience", experienceLabel, experienceSearch);

    for (const responsibility of experience.responsibilities ?? []) {
      addEvidence(items, "responsibility", responsibility, `${experienceLabel ?? ""} ${responsibility}`);
    }
    for (const impact of experience.measurable_impact ?? []) {
      addEvidence(items, "impact", impact, `${experienceLabel ?? ""} ${impact}`);
    }
    for (const tool of experience.tools ?? []) {
      addEvidence(items, "tool", tool, `${experienceLabel ?? ""} ${tool}`);
    }
  }

  for (const skill of candidateProfile.skills) {
    const skillName = safeText(skill.name);
    if (!skillName) {
      continue;
    }

    const evidence = (skill.evidence ?? []).map((value) => safeText(value)).filter(Boolean);
    const evidenceSuffix = evidence.length > 0 ? ` (${evidence.slice(0, 2).join(", ")})` : "";
    addEvidence(items, "skill", `resume skill: ${skillName}${evidenceSuffix}`, [
      skillName,
      skill.recency,
      ...evidence
    ].join(" "));
  }

  for (const language of candidateProfile.languages) {
    const languageName = safeText(language.language);
    if (!languageName) {
      continue;
    }

    const level =
      language.declared_level && language.declared_level !== "unknown" ? ` ${language.declared_level}` : "";
    const evidence = (language.evidence ?? []).map((value) => safeText(value)).filter(Boolean);
    addEvidence(
      items,
      "language",
      `resume language evidence: ${languageName}${level}`,
      [languageName, language.declared_level, ...evidence].join(" ")
    );
  }

  for (const education of candidateProfile.education) {
    const educationDetail = [education.degree, education.field, education.institution]
      .map((value) => safeText(value))
      .filter(Boolean)
      .join(" in ");
    addEvidence(items, "education", educationDetail);

    for (const project of education.projects ?? []) {
      addEvidence(items, "project", project, `${educationDetail} ${project}`);
    }
  }

  for (const targetRole of candidateProfile.preferences.target_roles) {
    addEvidence(items, "preference", `target role preference: ${targetRole}`, targetRole);
  }

  return items;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => compact(value)).filter(Boolean))];
}

function roleRequirements(roleProfile: RoleProfileInput): string[] {
  return unique([
    ...(roleProfile.requirements?.required_skills ?? []),
    ...(roleProfile.calibration?.required_evidence ?? [])
  ]).filter((value) => !containsDisallowedQuestionText(value));
}

function normalizeTokens(value: string): string[] {
  return compact(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function evidenceMatchesRequirement(evidence: ResumeEvidenceItem, requirement: string): boolean {
  const evidenceTokens = new Set(normalizeTokens(evidence.searchable));
  const requirementTokens = normalizeTokens(requirement);

  return requirementTokens.some((token) => evidenceTokens.has(token));
}

function evidenceRequirementFor(requirement: string, matches: ResumeEvidenceItem[]): string {
  const skillMatch = matches.find((item) => item.kind === "skill");
  const bestMatch = skillMatch ?? matches[0];

  return bestMatch?.detail ?? `role requirement: ${requirement}`;
}

function promptEvidenceFor(matches: ResumeEvidenceItem[]): ResumeEvidenceItem {
  return (
    matches.find((item) => ["responsibility", "impact", "project"].includes(item.kind)) ??
    matches.find((item) => item.kind === "experience") ??
    matches.find((item) => item.kind === "tool") ??
    matches[0]
  );
}

function buildContext(roleProfile: RoleProfileInput, candidateProfile: CandidateProfile): ResumePlanContext {
  const evidence = collectResumeEvidence(candidateProfile);
  const requirements = roleRequirements(roleProfile);
  const languagePlan = createLanguageTestPlan({
    candidate_id: candidateProfile.candidate_id,
    languages: candidateProfile.languages,
    required_languages: roleProfile.requirements?.required_languages,
    generated_at: candidateProfile.updated_at,
    audit_event_id:
      candidateProfile.parse_metadata?.audit_event_id ??
      candidateProfile.confirmation_metadata?.audit_event_id ??
      `language_test_plan_${candidateProfile.candidate_id}`
  });
  const requirementMatches: RequirementMatch[] = [];
  const missingRoleEvidence: string[] = [];

  for (const requirement of requirements) {
    const matches = evidence.filter((item) => evidenceMatchesRequirement(item, requirement));
    if (matches.length === 0) {
      missingRoleEvidence.push(`role requirement: ${requirement} needs interview evidence`);
      continue;
    }

    requirementMatches.push({
      requirement,
      promptEvidence: promptEvidenceFor(matches),
      evidenceRequirement: evidenceRequirementFor(requirement, matches)
    });
  }

  const primaryExperience =
    evidence.find((item) => item.kind === "experience")?.detail ??
    evidence.find((item) => item.kind === "project")?.detail ??
    "the confirmed resume";
  const fallbackEvidence =
    requirementMatches[0]?.promptEvidence.detail ??
    evidence.find((item) => item.kind !== "preference")?.detail ??
    primaryExperience;
  const languageEvidenceRequirements = [
    ...languagePlan.plans.map(
      (plan) => `CEFR ${plan.target_level} language test for ${plan.language}`
    ),
    ...languagePlan.review_reasons.map(
      (reason) => `language review gap for ${reason.language}: ${reason.reason}`
    )
  ];

  return {
    roleTitle: safeText(roleProfile.title) ?? "target role",
    primaryExperience,
    fallbackEvidence,
    languageAssessmentPrompt: languageAssessmentPrompt(languagePlan, roleProfile.title),
    languageEvidenceRequirements,
    requirementMatches,
    missingRoleEvidence,
    roleEvidence: requirements.map((requirement) => `role requirement: ${requirement}`)
  };
}

function languageAssessmentPrompt(
  languagePlan: ReturnType<typeof createLanguageTestPlan>,
  roleTitle?: string
): string {
  const firstPlan = languagePlan.plans[0];
  if (!firstPlan) {
    return [
      `For the ${roleTitle ?? "target role"} role, complete a short CEFR language check in the target language declared on your resume.`,
      "Use three separate evidence points: grammar/vocabulary, reading comprehension, and spoken production.",
      "If your declared level is unknown, give one brief workplace-language example a human reviewer can use as evidence."
    ].join(" ");
  }

  return [
    `For ${firstPlan.language}, your declared level is ${firstPlan.declared_level} and this role check targets CEFR ${firstPlan.target_level}.`,
    "Give a short workplace-language sample in the target language: first one sentence that shows grammar/vocabulary control, then summarize the key point of a short role update for reading comprehension, then answer aloud as spoken production.",
    "This is a separate language test for communication evidence only."
  ].join(" ");
}

function moduleEvidenceRequirements(
  question: InterviewQuestion,
  context: ResumePlanContext
): string[] {
  const moduleMatches = context.requirementMatches.filter((match) =>
    match.promptEvidence.moduleIds.includes(question.moduleId)
  );
  const matchRequirements =
    moduleMatches.length > 0
      ? moduleMatches.map((match) => match.evidenceRequirement)
      : context.requirementMatches.map((match) => match.evidenceRequirement).slice(0, 2);

  return unique([
    ...matchRequirements,
    ...(question.moduleId === "language" ? context.languageEvidenceRequirements : []),
    ...context.missingRoleEvidence,
    ...question.evidenceRequirements
  ]).filter((value) => !containsDisallowedQuestionText(value));
}

function groundingFor(
  evidenceRequirements: string[],
  context: ResumePlanContext
): ResumeQuestionGrounding {
  const resumeEvidence = evidenceRequirements.filter((item) => item.startsWith("resume "));

  return {
    resumeEvidence,
    roleEvidence: context.roleEvidence,
    missingRoleEvidence: context.missingRoleEvidence
  };
}

function primaryRequirement(context: ResumePlanContext): string {
  return context.requirementMatches[0]?.requirement ?? context.roleEvidence[0]?.replace(/^role requirement: /, "") ?? "the role requirements";
}

function missingRequirement(context: ResumePlanContext): string | undefined {
  return context.missingRoleEvidence[0]?.replace(/^role requirement: /, "").replace(/ needs interview evidence$/, "");
}

function promptForModule(
  question: InterviewQuestion,
  context: ResumePlanContext,
  interviewLanguage?: CandidateInterviewLanguageCode
): string {
  const structuredEvidenceFrame = `${STAR_RESPONSE_FRAME} ${SBI_RESPONSE_FRAME} Use SBI as Situation, Behavior, and Impact evidence. Keep it to one competency or evidence target.`;
  const matchedEvidence = context.requirementMatches.find((match) =>
    match.promptEvidence.moduleIds.includes(question.moduleId)
  )?.promptEvidence.detail;
  const resumeEvidence = matchedEvidence ?? context.fallbackEvidence;
  const requirement = primaryRequirement(context);
  const missing = missingRequirement(context);
  const localized = localizeResumeAwarePrompt(
    question.moduleId,
    {
      roleTitle: context.roleTitle,
      primaryExperience: context.primaryExperience,
      resumeEvidence,
      requirement,
      missing
    },
    interviewLanguage
  );

  if (localized) {
    return localized;
  }

  switch (question.moduleId) {
    case "motivation":
      return `${structuredEvidenceFrame} Your confirmed resume mentions ${context.primaryExperience}. Tell me about a specific past example from that experience that explains why the ${context.roleTitle} role requirement for ${requirement} fits the work you want to do next${missing ? `, and include what a reviewer still needs to learn about ${missing}` : ""}.`;
    case "language":
      // CEFR check uses declared level, target language, grammar/vocabulary, reading comprehension, and spoken production.
      // Safety boundary for reviewers: exclude accent, native speaker status, and nationality as scoring signals.
      return `${context.languageAssessmentPrompt} Connect it to ${resumeEvidence} and the ${context.roleTitle} role requirements using only communication content and role evidence.`;
    case "domain":
      return missing
        ? `${structuredEvidenceFrame} Your confirmed resume mentions ${context.primaryExperience} and ${resumeEvidence}. Tell me about a specific past example where you used that evidence for ${requirement}, and include what a reviewer still needs to learn about ${missing}.`
        : `${structuredEvidenceFrame} Your confirmed resume mentions ${context.primaryExperience} and ${resumeEvidence}. Tell me about a specific past example where you used that evidence to support ${requirement}.`;
    case "work_sample":
      return `${structuredEvidenceFrame} Using your resume evidence from ${resumeEvidence}, tell me about a specific past example where you created a comparable work product for ${context.roleTitle}. Include the Task, your Action, the Result, and the checks a reviewer should use to judge the role requirement for ${requirement}.`;
    case "case":
      return `${structuredEvidenceFrame} Tell me about a specific past example where your resume evidence from ${resumeEvidence} helped you make a judgment under ambiguity for work like ${context.roleTitle}. Include the decision, your personal action, the result, and the role requirement for ${requirement}.`;
  }
}

export function createResumeAwareQuestionPlan(
  questions: InterviewQuestion[],
  roleProfile: RoleProfileInput,
  candidateProfile: CandidateProfile,
  interviewLanguage?: CandidateInterviewLanguageCode
): InterviewQuestion[] {
  assertQuestionBankAllowed(questions);

  const language = resolveCandidateInterviewLanguageCode(interviewLanguage);
  const context = buildContext(roleProfile, candidateProfile);
  const groundedQuestions = questions.map((question) => {
    // Canonical arc items (opening, motivation, self-awareness, closing) keep
    // their exact phrasing in the deterministic fallback: only the LLM planner
    // may lightly personalize them.
    if (isCanonicalQuestionId(question.id)) {
      return { ...question };
    }
    const evidenceRequirements = moduleEvidenceRequirements(question, context);
    const expectedSignals = unique([
      ...question.expectedSignals,
      RESUME_SIGNAL,
      ...(context.missingRoleEvidence.length > 0 ? [MISSING_EVIDENCE_SIGNAL] : [])
    ]);

    return {
      ...question,
      prompt: promptForModule(question, context, language),
      expectedSignals,
      evidenceRequirements,
      resumeGrounding: groundingFor(evidenceRequirements, context)
    };
  });

  assertQuestionBankAllowed(groundedQuestions);
  return groundedQuestions;
}
