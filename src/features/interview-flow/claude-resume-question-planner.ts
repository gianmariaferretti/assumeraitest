import type { CandidateProfile } from "../resume-parsing";
import type {
  ResumeScorecard,
  ResumeScoreDimensionName,
  ScoreDimension
} from "../scoring/resume/resume-score";
import { createResumeAwareQuestionPlan } from "./resume-question-planner";
import {
  resolveCandidateInterviewLanguage,
  type CandidateInterviewLanguageCode
} from "./interview-language";
import { assertQuestionBankAllowed, containsDisallowedQuestionText } from "./safety";
import type { FunnelPhase } from "../scoring/bars/types";
import { recordLlmUsage, type LlmUsageRecorder } from "../../lib/llm-budget/core";
import { logLlmTelemetry } from "../../lib/log";
import type {
  InterviewQuestion,
  ResumeQuestionGrounding,
  RoleProfileInput
} from "./types";

/** Canonical SBI funnel order. Stable; the funnel state machine enforces it. */
export const FUNNEL_PHASES: readonly FunnelPhase[] = [
  "rapport",
  "exploration",
  "challenge",
  "closing"
];

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_ANTHROPIC_INTERVIEW_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_ANTHROPIC_MODEL_FALLBACKS = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-haiku-20241022"
];
const EXPERIENCE_SCORE_DIMENSIONS: ResumeScoreDimensionName[] = [
  "ExperienceRelevanceScore",
  "ExperienceDepthScore",
  "ImpactEvidenceScore",
  "CareerProgressionScore",
  "CareerStageAdjustedDensityScore"
];
const ANTHROPIC_OUTPUT_SAFETY_FAILURE = "anthropic_output_failed_safety_check";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type ClaudeResumeQuestionPlanSource = "anthropic" | "deterministic_fallback";

export interface ClaudeResumeQuestionPlanOptions {
  readonly apiKey?: string | null;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  /** Usage hook for the daily LLM budget; defaults to the global recorder. */
  readonly recordUsage?: LlmUsageRecorder;
}

export interface CreateClaudeResumeQuestionPlanInput {
  readonly questions: InterviewQuestion[];
  readonly roleProfile: RoleProfileInput;
  readonly candidateProfile: CandidateProfile;
  readonly interviewLanguage?: CandidateInterviewLanguageCode;
  readonly resumeScorecard?: ResumeScorecard;
  readonly options?: ClaudeResumeQuestionPlanOptions;
}

export interface BaseClaudeResumeQuestionPlanResult {
  readonly questions: InterviewQuestion[];
  readonly source: ClaudeResumeQuestionPlanSource;
  readonly providerModel?: string;
  readonly fallbackReason?: string;
}

export interface ClaudeResumeQuestionPlanResult extends BaseClaudeResumeQuestionPlanResult {
  /** Always the canonical SBI funnel order: rapport → exploration → challenge → closing. */
  readonly funnelPhases: readonly FunnelPhase[];
  /** 1-2 short, safety-filtered CV anchors for the rapport phase. */
  readonly cvHooks: string[];
}

interface ClaudeQuestionAdaptation {
  readonly questionId: string;
  readonly prompt?: string;
  readonly expectedSignals: string[];
  readonly evidenceRequirements: string[];
  readonly resumeGrounding?: ResumeQuestionGrounding;
}

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}

interface AnthropicMessageResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
  };
}

interface AnthropicRequestFailure {
  readonly status: number;
  readonly model: string;
  readonly message: string;
}

class AnthropicOutputSafetyError extends Error {
  constructor() {
    super(ANTHROPIC_OUTPUT_SAFETY_FAILURE);
  }
}

export async function createClaudeResumeAwareQuestionPlan(
  input: CreateClaudeResumeQuestionPlanInput
): Promise<ClaudeResumeQuestionPlanResult> {
  const base = await runResumeAwareQuestionPlan(input);

  return {
    ...base,
    funnelPhases: FUNNEL_PHASES,
    cvHooks: buildCvHooks(input.candidateProfile)
  };
}

function buildCvHooks(candidateProfile: CandidateProfile): string[] {
  const hooks: string[] = [];

  const recentExperience = candidateProfile.experience[0];
  if (recentExperience) {
    const title = safeProviderText(recentExperience.title);
    const company = safeProviderText(recentExperience.company);
    if (title && company) {
      hooks.push(`${title} at ${company}`);
    } else if (title) {
      hooks.push(title);
    }
  }

  for (const skill of candidateProfile.skills) {
    const name = safeProviderText(skill.name);
    if (name) {
      hooks.push(`your work with ${name}`);
      break;
    }
  }

  return unique(hooks).slice(0, 2);
}

async function runResumeAwareQuestionPlan(
  input: CreateClaudeResumeQuestionPlanInput
): Promise<BaseClaudeResumeQuestionPlanResult> {
  assertQuestionBankAllowed(input.questions);

  const deterministicQuestions = createResumeAwareQuestionPlan(
    input.questions,
    input.roleProfile,
    input.candidateProfile,
    input.interviewLanguage
  );
  const apiKey = input.options?.apiKey ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackResult(deterministicQuestions, "anthropic_api_key_missing");
  }

  const fetchImpl = input.options?.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    return fallbackResult(deterministicQuestions, "anthropic_fetch_unavailable");
  }

  const modelCandidates = resolveModelCandidates(
    input.options?.model ??
      process.env.ANTHROPIC_INTERVIEW_MODEL ??
      process.env.ANTHROPIC_MODEL ??
      DEFAULT_ANTHROPIC_INTERVIEW_MODEL
  );
  let lastFailure: AnthropicRequestFailure | undefined;

  for (const model of modelCandidates) {
    const startedAt = Date.now();
    try {
      const response = await fetchImpl(input.options?.endpoint ?? ANTHROPIC_API_ENDPOINT, {
        method: "POST",
        headers: {
          "anthropic-version": ANTHROPIC_API_VERSION,
          "content-type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          model,
          max_tokens: input.options?.maxTokens ?? 2500,
          system: buildSystemPrompt(input.interviewLanguage),
          messages: [
            {
              role: "user",
              content: JSON.stringify(buildUserPayload(input))
            }
          ]
        })
      });

      if (!response.ok) {
        lastFailure = await readAnthropicRequestFailure(response, model);
        logLlmTelemetry({
          site: "resume_question_planner",
          provider: "anthropic",
          model,
          latencyMs: Date.now() - startedAt,
          outcome: "error",
          fallbackReason: `anthropic_request_failed_${lastFailure.status}`
        });
        if (response.status === 404 && model !== modelCandidates.at(-1)) {
          continue;
        }

        return fallbackResult(
          deterministicQuestions,
          `anthropic_request_failed_${lastFailure.status}`
        );
      }

      const message = (await response.json()) as AnthropicMessageResponse;
      (input.options?.recordUsage ?? recordLlmUsage)({
        model,
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0
      });
      logLlmTelemetry({
        site: "resume_question_planner",
        provider: "anthropic",
        model,
        latencyMs: Date.now() - startedAt,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
        outcome: "ok"
      });
      const parsed = parseJsonObject(extractTextContent(message));
      const adaptedQuestions = applyClaudeAdaptations(deterministicQuestions, parsed);

      assertQuestionBankAllowed(adaptedQuestions);
      return {
        questions: adaptedQuestions,
        source: "anthropic",
        providerModel: model
      };
    } catch (error) {
      const fallbackReason =
        error instanceof AnthropicOutputSafetyError
          ? ANTHROPIC_OUTPUT_SAFETY_FAILURE
          : "anthropic_generation_failed";

      return fallbackResult(deterministicQuestions, fallbackReason);
    }
  }

  return fallbackResult(
    deterministicQuestions,
    lastFailure ? `anthropic_request_failed_${lastFailure.status}` : "anthropic_generation_failed"
  );
}

function fallbackResult(
  questions: InterviewQuestion[],
  fallbackReason: string
): BaseClaudeResumeQuestionPlanResult {
  // Silent degradation must be visible: every fallback is a WARN log line.
  logLlmTelemetry({
    site: "resume_question_planner",
    provider: "anthropic",
    outcome: "fallback",
    fallbackReason
  });
  assertQuestionBankAllowed(questions);

  return {
    questions,
    source: "deterministic_fallback",
    fallbackReason
  };
}

function buildSystemPrompt(interviewLanguage?: CandidateInterviewLanguageCode): string {
  const language = resolveCandidateInterviewLanguage(interviewLanguage);
  return [
    "Generate candidate interview question adaptations for human-reviewed hiring evidence only.",
    "This is a structured behavioral interview for evidence collection, not generic HR prompts or conversational screening.",
    `Write candidate-facing prompt text in ${language.questionLanguageName}. Keep JSON keys, questionId values, scoring concepts, evidence fields, and safety constraints language-stable.`,
    "Treat the selected interview language only as interview delivery and transcription context, not as native status, nationality, accent, quality, eligibility, or protected-trait evidence.",
    "Use confirmed resume evidence, role requirements, and these resume experience scoring dimensions: ExperienceRelevanceScore, ExperienceDepthScore, ImpactEvidenceScore, CareerProgressionScore, CareerStageAdjustedDensityScore.",
    "Low score or low confidence means an evidence gap for review, not a negative candidate quality signal.",
    "Use SBI question design: ask about a specific past behavior or event, target one competency per question, and ask one question at a time.",
    "Require STAR completeness: each core behavioral answer should establish Situation, Task, Action, Result; if any are absent, produce a targeted follow-up for missing STAR elements before moving on.",
    "Use BARS-style evidence: match observed behavior to behavioral anchors in expectedSignals and evidenceRequirements; no impressionistic scoring or vibe-based judgment.",
    "Use funnel sequencing: opening, exploration, challenge, and closing. Do not place challenge questions in opening or before opening and exploration evidence is established.",
    "Do not use hypotheticals for core behavioral questions; use specific past behavior instead. Scenario or work-sample prompts may ask role-relevant tasks, but they must not replace behavioral evidence.",
    "Do not score final hiring outcomes, rank, recommend, accept, reject, or predict hiring outcomes.",
    "Do not ask for or infer protected attributes, direct chronological age, nationality, citizenship, family status, health, disability, religion, race, ethnicity, gender, pregnancy, personality, emotion, biometrics, face, voice tone, native speaker status, or accent.",
    "Generate role-relevant experience questions only from the supplied structured resume profile and scorecard excerpts.",
    "PLATFORM NEUTRALITY: this is ONE AssumerAI platform interview matched to MULTIPLE companies afterwards. The interviewer is a neutral career interviewer, never an employer. No question may reference a specific company, employer, or 'this role/position': phrasings like 'our company', 'why do you want to work with us', 'what do you know about us', 'why did you apply for this position' are forbidden in every language.",
    "REALISTIC ARC: questions whose questionId starts with 'canonical_' are fixed arc items (opening warm-up, role-family motivation, self-awareness bridge, closing). You MAY lightly personalize their wording with confirmed CV context (e.g. 'I see you moved from X to Y — tell me about that move') but must preserve their intent, stage, and employer neutrality. Never remove them, never turn the opening into an assessment question, and keep the closing's accurate process description (profile review, matching with multiple companies, 14-day verdict).",
    "Return strict JSON only with the output_contract fields: adaptations and languageAssessmentPlan. Preserve questionId from the input. Do not add extra prose."
  ].join(" ");
}

function buildUserPayload(input: CreateClaudeResumeQuestionPlanInput): Record<string, unknown> {
  const language = resolveCandidateInterviewLanguage(input.interviewLanguage);
  return {
    task: "resume_aware_interview_question_adaptation",
    interview_language: {
      code: language.code,
      label: language.label,
      instruction:
        "Use this as delivery context only for candidate-facing question delivery. Do not use it as language ability, nationality, accent, native-status, or score evidence."
    },
    output_contract: {
      adaptations: [
        {
          questionId: "same id from base_questions",
          prompt: "candidate-facing question text",
          expectedSignals: ["role-relevant evidence signals only"],
          evidenceRequirements: ["resume or role evidence a human reviewer should verify"],
          resumeEvidence: ["short resume snippets used"],
          roleEvidence: ["short role requirement snippets used"],
          missingRoleEvidence: ["role evidence gaps to explore without negative wording"]
        }
      ],
      languageAssessmentPlan: {
        standard: "CEFR",
        rules: [
          "Use language_assessment_plan as the separate CEFR assessment scope.",
          "Do not use interview_language as CEFR evidence; it is delivery context only.",
          "Assess only communication content against role language requirements and CEFR descriptors.",
          "Exclude native speaker status, accent, nationality, and protected traits."
        ],
        languages: [
          {
            language: "same language from language_assessment_plan.languages_to_assess",
            roleMinimumLevel: "CEFR minimum from role requirements when present",
            candidateDeclaredLevel: "declared CEFR from candidate resume when present",
            candidateAssessedLevel: "assessed CEFR from candidate resume when present",
            evidenceToCollect: ["CEFR evidence gaps or confirmation points for human review"],
            prohibitedSignals: ["native speaker status", "accent", "nationality", "protected traits"]
          }
        ]
      }
    },
    role: {
      role_id: input.roleProfile.role_id ?? null,
      title: safeProviderText(input.roleProfile.title) ?? "Target role",
      role_type: safeProviderText(input.roleProfile.role_type),
      seniority: safeProviderText(input.roleProfile.seniority),
      requirements: {
        required_skills: safeProviderTextArray(input.roleProfile.requirements?.required_skills),
        nice_to_have_skills: safeProviderTextArray(input.roleProfile.requirements?.nice_to_have_skills),
        required_languages: (input.roleProfile.requirements?.required_languages ?? []).map(
          (language) => ({
            language: safeProviderText(language.language),
            minimum_level: language.minimum_level
          })
        ),
        required_evidence: safeProviderTextArray(input.roleProfile.calibration?.required_evidence)
      }
    },
    candidate_resume: buildCandidateResumePayload(input.candidateProfile),
    language_assessment_plan: buildLanguageAssessmentPlan(input.candidateProfile, input.roleProfile),
    resume_score_signals: buildResumeScoreSignals(input.resumeScorecard),
    base_questions: input.questions.map((question) => ({
      questionId: question.id,
      moduleId: question.moduleId,
      prompt: question.prompt,
      rubric: question.rubric,
      expectedSignals: question.expectedSignals,
      evidenceRequirements: question.evidenceRequirements
    }))
  };
}

function buildLanguageAssessmentPlan(
  candidateProfile: CandidateProfile,
  roleProfile: RoleProfileInput
): Record<string, unknown> {
  const candidateLanguages = candidateProfile.languages.flatMap((candidateLanguage) => {
    const language = safeProviderText(candidateLanguage.language);
    if (!language) {
      return [];
    }

    return [
      {
        language,
        key: languageKey(language),
        declaredLevel: candidateLanguage.declared_level ?? "unknown",
        assessedLevel: candidateLanguage.assessed_level ?? "unknown",
        candidateEvidence: safeProviderTextArray(candidateLanguage.evidence)
      }
    ];
  });
  const requiredLanguages = (roleProfile.requirements?.required_languages ?? []).flatMap(
    (requiredLanguage) => {
      const language = safeProviderText(requiredLanguage.language);
      if (!language) {
        return [];
      }

      return [
        {
          language,
          key: languageKey(language),
          minimumLevel: requiredLanguage.minimum_level
        }
      ];
    }
  );
  const candidateByLanguage = new Map(
    candidateLanguages.map((candidateLanguage) => [candidateLanguage.key, candidateLanguage])
  );
  const requiredByLanguage = new Map(
    requiredLanguages.map((requiredLanguage) => [requiredLanguage.key, requiredLanguage])
  );
  const languageKeys = unique([
    ...requiredLanguages.map((requiredLanguage) => requiredLanguage.key),
    ...candidateLanguages.map((candidateLanguage) => candidateLanguage.key)
  ]);

  return {
    standard: "CEFR",
    source:
      "Derived only from candidate_resume.languages and role.required_languages; interview_language is delivery context only.",
    rules: [
      "Use role.required_languages to prioritize required CEFR checks.",
      "Use candidate_resume.languages to identify declared levels, previously assessed levels, and evidence gaps.",
      "Do not use interview_language as CEFR evidence; selected interview_language is delivery context only.",
      "Do not infer native speaker status, accent, nationality, or protected traits.",
      "Treat missing language evidence as a human-review gap, not as a final hiring outcome."
    ],
    languages_to_assess: languageKeys.map((key) => {
      const candidateLanguage = candidateByLanguage.get(key);
      const requiredLanguage = requiredByLanguage.get(key);
      const language = requiredLanguage?.language ?? candidateLanguage?.language ?? key;
      const assessmentFocus = requiredLanguage
        ? [
            `Verify role.required_languages minimum CEFR ${requiredLanguage.minimumLevel} for ${language}.`
          ]
        : [`Confirm candidate_resume.languages evidence for ${language}.`];

      return {
        language,
        roleMinimumLevel: requiredLanguage?.minimumLevel ?? null,
        candidateDeclaredLevel: candidateLanguage?.declaredLevel ?? "unknown",
        candidateAssessedLevel: candidateLanguage?.assessedLevel ?? "unknown",
        candidateEvidence: candidateLanguage?.candidateEvidence ?? [],
        assessmentFocus
      };
    })
  };
}

function buildCandidateResumePayload(candidateProfile: CandidateProfile): Record<string, unknown> {
  return {
    confirmed_by_candidate: candidateProfile.confirmed_by_candidate,
    experience: candidateProfile.experience.map((experience) => ({
      title: safeProviderText(experience.title),
      company: safeProviderText(experience.company),
      industry: safeProviderText(experience.industry),
      function: safeProviderText(experience.function),
      duration_months: experience.duration_months ?? null,
      responsibilities: safeProviderTextArray(experience.responsibilities),
      measurable_impact: safeProviderTextArray(experience.measurable_impact),
      tools: safeProviderTextArray(experience.tools),
      leadership_scope: safeProviderText(experience.leadership_scope)
    })),
    skills: candidateProfile.skills.map((skill) => ({
      name: safeProviderText(skill.name),
      category: skill.category,
      recency: safeProviderText(skill.recency),
      evidence_count: skill.evidence_count,
      evidence: safeProviderTextArray(skill.evidence)
    })),
    languages: candidateProfile.languages.map((language) => ({
      language: safeProviderText(language.language),
      declared_level: language.declared_level ?? "unknown",
      assessed_level: language.assessed_level ?? "unknown",
      evidence: safeProviderTextArray(language.evidence)
    })),
    education_projects: candidateProfile.education.flatMap((education) =>
      safeProviderTextArray(education.projects).map((project) => ({
        degree: safeProviderText(education.degree),
        field: safeProviderText(education.field),
        project
      }))
    ),
    preferences: {
      target_roles: safeProviderTextArray(candidateProfile.preferences.target_roles),
      work_modes: candidateProfile.preferences.work_modes,
      industries: safeProviderTextArray(candidateProfile.preferences.industries),
      work_style: safeProviderTextArray(candidateProfile.preferences.work_style)
    },
    parse_metadata: {
      parser_confidence: candidateProfile.parse_metadata?.parser_confidence ?? null,
      missing_data: safeProviderTextArray(candidateProfile.parse_metadata?.missing_data)
    }
  };
}

function buildResumeScoreSignals(resumeScorecard: ResumeScorecard | undefined): Record<string, unknown> {
  if (!resumeScorecard) {
    return {
      available: false,
      note: "No deterministic resume scorecard was available for this request."
    };
  }

  return {
    available: true,
    overall_resume_screen_score: resumeScorecard.overall_resume_screen_score,
    confidence_score: resumeScorecard.confidence_score,
    human_review_required: resumeScorecard.human_review_required,
    risk_flags: resumeScorecard.risk_flags,
    experience_dimensions: EXPERIENCE_SCORE_DIMENSIONS.map((name) =>
      buildScoreDimensionPayload(name, resumeScorecard.scores[name])
    )
  };
}

function buildScoreDimensionPayload(
  name: ResumeScoreDimensionName,
  dimension: ScoreDimension
): Record<string, unknown> {
  return {
    name,
    score: dimension.score,
    confidence: dimension.confidence,
    evidence: dimension.evidence
      .map((item) => safeProviderText(item.snippet))
      .filter((item): item is string => Boolean(item))
      .slice(0, 4),
    missing_data: safeProviderTextArray(dimension.missing_data)
  };
}

function applyClaudeAdaptations(
  deterministicQuestions: InterviewQuestion[],
  parsed: unknown
): InterviewQuestion[] {
  const adaptations = readClaudeAdaptations(parsed);
  const adaptationsByQuestionId = new Map(
    adaptations.map((adaptation) => [adaptation.questionId, adaptation])
  );
  const adaptedQuestions = deterministicQuestions.map((question) => {
    const adaptation = adaptationsByQuestionId.get(question.id);
    if (!adaptation) {
      return question;
    }

    return {
      ...question,
      prompt: adaptation.prompt ?? question.prompt,
      expectedSignals: unique([...question.expectedSignals, ...adaptation.expectedSignals]),
      evidenceRequirements: unique([
        ...adaptation.evidenceRequirements,
        ...question.evidenceRequirements
      ]),
      resumeGrounding: adaptation.resumeGrounding ?? question.resumeGrounding
    };
  });

  assertQuestionBankAllowed(adaptedQuestions);
  return adaptedQuestions;
}

function readClaudeAdaptations(value: unknown): ClaudeQuestionAdaptation[] {
  const root = asRecord(value) ?? {};
  const rawAdaptations = readArray(root.adaptations ?? root.questions);

  return rawAdaptations.flatMap((item) => {
    const record = asRecord(item);
    if (!record) {
      return [];
    }

    const questionId = readSafeGeneratedText(record.questionId ?? record.id);
    if (!questionId) {
      return [];
    }

    return [
      {
        questionId,
        prompt: readSafeGeneratedText(record.prompt),
        expectedSignals: readSafeGeneratedTextArray(record.expectedSignals),
        evidenceRequirements: readSafeGeneratedTextArray(record.evidenceRequirements),
        resumeGrounding: buildResumeGrounding(record)
      }
    ];
  });
}

function buildResumeGrounding(record: Record<string, unknown>): ResumeQuestionGrounding | undefined {
  const resumeEvidence = readSafeGeneratedTextArray(record.resumeEvidence);
  const roleEvidence = readSafeGeneratedTextArray(record.roleEvidence);
  const missingRoleEvidence = readSafeGeneratedTextArray(record.missingRoleEvidence);

  if (
    resumeEvidence.length === 0 &&
    roleEvidence.length === 0 &&
    missingRoleEvidence.length === 0
  ) {
    return undefined;
  }

  return {
    resumeEvidence,
    roleEvidence,
    missingRoleEvidence
  };
}

function readSafeGeneratedText(value: unknown): string | undefined {
  const text = readString(value);
  if (!text) {
    return undefined;
  }

  if (containsDisallowedQuestionText(text)) {
    throw new AnthropicOutputSafetyError();
  }

  return text;
}

function readSafeGeneratedTextArray(value: unknown): string[] {
  return unique(readArray(value).flatMap((item) => readSafeGeneratedText(item) ?? []));
}

function safeProviderText(value: unknown): string | undefined {
  const text = readString(value);
  if (!text || containsDisallowedQuestionText(text)) {
    return undefined;
  }

  return text;
}

function safeProviderTextArray(values: readonly unknown[] | undefined): string[] {
  return unique((values ?? []).flatMap((value) => safeProviderText(value) ?? []));
}

async function readAnthropicRequestFailure(
  response: Response,
  model: string
): Promise<AnthropicRequestFailure> {
  return {
    status: response.status,
    model,
    message: await readSafeAnthropicErrorMessage(response)
  };
}

async function readSafeAnthropicErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: unknown; type?: unknown };
      message?: unknown;
    };
    const message =
      typeof body.error?.message === "string"
        ? body.error.message
        : typeof body.message === "string"
          ? body.message
          : "";

    return message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, "[redacted]").trim();
  } catch {
    return "";
  }
}

function extractTextContent(message: AnthropicMessageResponse): string {
  const text = message.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude question generation response did not contain text JSON.");
  }

  return text;
}

function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Claude question generation response was not valid JSON.");
    }

    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function resolveModelCandidates(primaryModel: string): string[] {
  return unique([
    primaryModel,
    ...parseModelList(process.env.ANTHROPIC_INTERVIEW_MODEL_FALLBACKS),
    ...parseModelList(process.env.ANTHROPIC_MODEL_FALLBACKS),
    ...DEFAULT_ANTHROPIC_MODEL_FALLBACKS
  ]);
}

function parseModelList(value: string | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function languageKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
