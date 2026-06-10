import {
  resumeParserProviderResultSchema,
  type ResumeDocumentInput,
  type ResumeParserProvider,
  type ResumeParserProviderResult
} from "./contracts";
import { recordLlmUsage, type LlmUsageRecorder } from "../../lib/llm-budget/core";
import { logLlmTelemetry } from "../../lib/log";

const ANTHROPIC_API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_ANTHROPIC_MODEL_FALLBACKS = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-haiku-20241022"
];

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface AnthropicResumeParserProviderOptions {
  readonly apiKey?: string;
  readonly endpoint?: string;
  readonly fetchImpl?: FetchLike;
  readonly maxTokens?: number;
  readonly model?: string;
  /** Usage hook for the daily LLM budget; defaults to the global recorder. */
  readonly recordUsage?: LlmUsageRecorder;
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

type AnthropicUserContentBlock =
  | {
      readonly type: "document";
      readonly source: {
        readonly type: "base64";
        readonly media_type: "application/pdf";
        readonly data: string;
      };
    }
  | {
      readonly type: "text";
      readonly text: string;
    };

export function createAnthropicResumeParserProvider(
  options: AnthropicResumeParserProviderOptions = {}
): ResumeParserProvider {
  const model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
  const modelCandidates = resolveModelCandidates(model);

  return {
    name: "anthropic-resume-parser",
    version: `anthropic-resume-parser:${model}`,
    async parse(document: ResumeDocumentInput): Promise<ResumeParserProviderResult> {
      const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is required when the Anthropic resume parser is explicitly selected."
        );
      }

      const fetchImpl = options.fetchImpl ?? globalThis.fetch;

      if (!fetchImpl) {
        throw new Error("A fetch implementation is required for the Anthropic resume parser.");
      }

      let lastFailure: AnthropicRequestFailure | undefined;

      for (const candidateModel of modelCandidates) {
        const startedAt = Date.now();
        const response = await fetchImpl(options.endpoint ?? ANTHROPIC_API_ENDPOINT, {
          method: "POST",
          headers: {
            "anthropic-version": ANTHROPIC_API_VERSION,
            "content-type": "application/json",
            "x-api-key": apiKey
          },
          body: JSON.stringify({
            model: candidateModel,
            max_tokens: options.maxTokens ?? 3000,
            system: buildSystemPrompt(),
            messages: [
              {
                role: "user",
                content: buildUserContent(document)
              }
            ]
          })
        });

        if (!response.ok) {
          lastFailure = await readAnthropicRequestFailure(response, candidateModel);
          logLlmTelemetry({
            site: "resume_parser",
            provider: "anthropic",
            model: candidateModel,
            latencyMs: Date.now() - startedAt,
            outcome: "error",
            fallbackReason: `anthropic_request_failed_${lastFailure.status}`
          });

          if (response.status === 404 && candidateModel !== modelCandidates.at(-1)) {
            continue;
          }

          throw createAnthropicRequestError(lastFailure);
        }

        const message = (await response.json()) as AnthropicMessageResponse;
        (options.recordUsage ?? recordLlmUsage)({
          model: candidateModel,
          inputTokens: message.usage?.input_tokens ?? 0,
          outputTokens: message.usage?.output_tokens ?? 0
        });
        logLlmTelemetry({
          site: "resume_parser",
          provider: "anthropic",
          model: candidateModel,
          latencyMs: Date.now() - startedAt,
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
          outcome: "ok"
        });
        const text = extractTextContent(message);
        const parsed = parseJsonObject(text);

        return normalizeAnthropicParserResult(parsed, document);
      }

      throw createAnthropicRequestError(lastFailure);
    }
  };
}

interface AnthropicRequestFailure {
  readonly status: number;
  readonly model: string;
  readonly message: string;
}

function buildUserContent(document: ResumeDocumentInput): string | AnthropicUserContentBlock[] {
  const instruction = JSON.stringify({
    task: "resume_profile_extraction",
    candidate_id: document.candidate_id,
    resume_document_id: document.resume_document_id,
    source_filename: document.source_filename ?? null,
    content_type: document.content_type ?? null,
    allowed_output_contract: "ResumeParserProviderResult",
    resume_text:
      isPdfDocument(document) && document.raw_file_base64
        ? "Read the attached PDF document. Use only explicitly stated resume evidence."
        : document.raw_text
  });

  if (!isPdfDocument(document) || !document.raw_file_base64) {
    return instruction;
  }

  return [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: document.raw_file_base64
      }
    },
    {
      type: "text",
      text: instruction
    }
  ];
}

function isPdfDocument(document: ResumeDocumentInput): boolean {
  return (
    document.content_type?.toLowerCase().includes("pdf") === true ||
    document.source_filename?.toLowerCase().endsWith(".pdf") === true
  );
}

function buildSystemPrompt(): string {
  return [
    "Extract candidate-owned resume profile data only.",
    "Do not score, rank, recommend, accept, reject, or predict hiring outcomes.",
    "Do not infer protected attributes, age, nationality, citizenship, personality, emotion, accent, biometrics, health, disability, family status, religion, race, ethnicity, gender, pregnancy, or similar traits.",
    "Use only explicitly stated resume evidence.",
    "Resume section names vary. Treat headings such as Employment History, Work History, Professional Experience, Career History, Relevant Experience, Adult Care Experience, Childcare Experience, Education, Academic Background, Qualifications, Honors, Awards, Skills, Tools, Languages, and Projects as possible evidence sections.",
    "Extract every dated job, employer, title, and date range, even when the resume also has separate narrative experience sections.",
    "Extract every education record and degree, including GPA, grades, honors, scholarships, Dean's List, Chancellor's List, thesis, and projects when stated.",
    "Do not drop older roles just because a later role exists. Keep the full employment history in chronological evidence order, newest first when clear.",
    "If bullets are under a role-specific heading, attach them to the most relevant experience record. If the connection is ambiguous, preserve the bullets in responsibilities and list the ambiguity in unresolved_ambiguities.",
    "Return strict JSON only matching ResumeParserProviderResult.",
    "Use exact keys from this contract; do not invent aliases such as personal_info, field_of_study, position, description, proficiency, or skill string arrays.",
    buildOutputContractPrompt()
  ].join(" ");
}

function buildOutputContractPrompt(): string {
  return JSON.stringify({
    profile: {
      candidate_id: "same candidate_id from request",
      profile_version: "candidate-profile-v0",
      confirmed_by_candidate: false,
      created_at: "uploaded_at or ISO timestamp",
      updated_at: "uploaded_at or ISO timestamp",
      source_refs: { resume_document_id: "same resume_document_id from request" },
      contact: {
        full_name: "string if present",
        email: "valid email if present",
        phone: "string if present",
        location: "string if present",
        work_authorization: "string only if explicitly stated"
      },
      education: [
        {
          institution: "string",
          degree: "string",
          field: "string",
          start_date: "string if present",
          end_date: "string if present",
          grades: "GPA, grade, or marks string if present",
          honors: ["honors, scholarships, or awards if present"],
          projects: ["strings"]
        }
      ],
      experience: [
        {
          company: "string",
          title: "string",
          start_date: "string",
          end_date: "string or null",
          responsibilities: ["strings"],
          measurable_impact: ["strings"],
          tools: ["strings"],
          evidence_quality: 0
        }
      ],
      skills: [
        {
          name: "string",
          category: "technical|business|work|language|other",
          evidence_count: 1,
          evidence: ["strings"]
        }
      ],
      languages: [
        {
          language: "string",
          declared_level: "A1|A2|B1|B2|C1|C2|unknown",
          assessed_level: "unknown",
          evidence: ["strings"]
        }
      ],
      certifications: ["strings"],
      portfolio: ["strings"],
      preferences: {
        target_roles: ["strings"],
        locations: ["strings"],
        work_modes: ["remote|hybrid|onsite"]
      },
      privacy_boundary: {
        candidate_owned: true,
        employer_visible_without_consent: false,
        sharing_snapshot_required: true,
        active_consent_record_ids: []
      }
    },
    parser_confidence: "integer 0-100 based on extraction completeness; do not return 0 when profile evidence was extracted",
    field_confidence: {
      "contact.full_name": "integer 0-100",
      "contact.email": "integer 0-100",
      "education.0.institution": "integer 0-100",
      "experience.0.company": "integer 0-100"
    },
    missing_data: [],
    unresolved_ambiguities: []
  });
}

function normalizeAnthropicParserResult(
  value: unknown,
  document: ResumeDocumentInput
): ResumeParserProviderResult {
  const direct = resumeParserProviderResultSchema.safeParse(value);
  if (direct.success) {
    return repairAnthropicProviderConfidence(direct.data);
  }

  const root = asRecord(value) ?? {};
  const rawProfile = asRecord(root.profile) ?? root;
  const generatedAt = document.uploaded_at ?? new Date().toISOString();
  const profile = {
    candidate_id: readString(rawProfile.candidate_id) ?? document.candidate_id,
    profile_version: readString(rawProfile.profile_version) ?? "candidate-profile-v0",
    confirmed_by_candidate: readBoolean(rawProfile.confirmed_by_candidate) ?? false,
    created_at: readString(rawProfile.created_at) ?? generatedAt,
    updated_at: readString(rawProfile.updated_at) ?? generatedAt,
    source_refs: {
      resume_document_id:
        readString(asRecord(rawProfile.source_refs)?.resume_document_id) ??
        document.resume_document_id
    },
    contact: normalizeContact(rawProfile),
    education: normalizeEducation(
      readFirstDefined(
        rawProfile.education,
        rawProfile.education_history,
        rawProfile.academic_background,
        rawProfile.qualifications
      )
    ),
    experience: normalizeExperience(
      readFirstDefined(
        rawProfile.experience,
        rawProfile.employment_history,
        rawProfile.work_experience,
        rawProfile.professional_experience,
        rawProfile.work_history,
        rawProfile.career_history
      )
    ),
    skills: normalizeSkills(rawProfile.skills),
    languages: normalizeLanguages(rawProfile.languages),
    certifications: readStringArray(rawProfile.certifications),
    portfolio: readStringArray(rawProfile.portfolio),
    preferences: normalizePreferences(rawProfile.preferences),
    parse_metadata: {
      resume_document_id: document.resume_document_id,
      parser_confidence: readNumber(root.parser_confidence),
      missing_data: readStringArray(root.missing_data)
    },
    privacy_boundary: {
      candidate_owned: true,
      employer_visible_without_consent: false,
      sharing_snapshot_required: true,
      active_consent_record_ids: []
    }
  };
  const normalized = {
    profile,
    parser_confidence: clampConfidence(readNumber(root.parser_confidence) ?? 72),
    field_confidence: readConfidenceRecord(root.field_confidence),
    missing_data: readStringArray(root.missing_data),
    unresolved_ambiguities: readStringArray(root.unresolved_ambiguities)
  };

  const parsedNormalized = resumeParserProviderResultSchema.parse(normalized);

  return resumeParserProviderResultSchema.parse(
    repairAnthropicProviderConfidence(parsedNormalized)
  );
}

function repairAnthropicProviderConfidence(
  result: ResumeParserProviderResult
): ResumeParserProviderResult {
  if (!isUnusableProviderConfidence(result.parser_confidence, result.field_confidence)) {
    return result;
  }

  const fieldConfidence = deriveFieldConfidenceFromProfile(result.profile);

  return {
    ...result,
    parser_confidence: deriveParserConfidenceFromProfile(
      fieldConfidence,
      result.missing_data
    ),
    field_confidence: fieldConfidence
  };
}

function isUnusableProviderConfidence(
  parserConfidence: number,
  fieldConfidence: Record<string, number>
): boolean {
  return parserConfidence === 0 && Object.keys(fieldConfidence).length === 0;
}

function deriveParserConfidenceFromProfile(
  fieldConfidence: Record<string, number>,
  missingData: readonly string[]
): number {
  const values = Object.values(fieldConfidence);
  if (values.length === 0) {
    return 35;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const missingPenalty = Math.min(missingData.length * 3, 18);
  return clampConfidence(Math.round(average - missingPenalty));
}

function deriveFieldConfidenceFromProfile(
  profile: ResumeParserProviderResult["profile"]
): Record<string, number> {
  const contact = profile.contact ?? {};
  const preferences = profile.preferences;
  const confidence: Record<string, number> = {
    "contact.full_name": contact.full_name ? 90 : 35,
    "contact.email": contact.email ? 94 : 25,
    "contact.location": contact.location ? 84 : 40,
    "preferences.target_roles": preferences.target_roles.length > 0 ? 78 : 35,
    "preferences.locations": preferences.locations.length > 0 ? 76 : 35,
    "preferences.work_modes": preferences.work_modes.length > 0 ? 76 : 35
  };

  profile.education.forEach((education, index) => {
    confidence[`education.${index}.institution`] = education.institution ? 76 : 30;
    confidence[`education.${index}.degree`] = education.degree ? 76 : 30;
    confidence[`education.${index}.field`] = education.field ? 74 : 30;
    confidence[`education.${index}.end_date`] = education.end_date ? 70 : 45;
    confidence[`education.${index}.grades`] = education.grades ? 68 : 45;
    confidence[`education.${index}.honors`] = education.honors?.length ? 66 : 45;
  });

  profile.experience.forEach((experience, index) => {
    confidence[`experience.${index}.company`] = experience.company ? 78 : 30;
    confidence[`experience.${index}.title`] = experience.title ? 78 : 30;
    confidence[`experience.${index}.start_date`] = experience.start_date ? 76 : 30;
    confidence[`experience.${index}.end_date`] = experience.end_date ? 68 : 45;
    confidence[`experience.${index}.responsibilities`] =
      experience.responsibilities?.length ? 72 : 45;
    confidence[`experience.${index}.measurable_impact`] =
      experience.measurable_impact?.length ? 70 : 45;
  });

  confidence.skills = profile.skills.length > 0 ? 78 : 35;
  confidence.languages = profile.languages.length > 0 ? 74 : 35;

  return confidence;
}

function normalizeContact(rawProfile: Record<string, unknown>) {
  const rawContact = asRecord(rawProfile.contact) ?? {};
  const personalInfo = asRecord(rawProfile.personal_info) ?? {};
  const contact = {
    full_name:
      readString(rawContact.full_name) ??
      readString(rawContact.name) ??
      readString(personalInfo.full_name) ??
      readString(personalInfo.name),
    email: readString(rawContact.email) ?? readString(personalInfo.email),
    phone: readString(rawContact.phone) ?? readString(personalInfo.phone),
    location: readString(rawContact.location) ?? readString(personalInfo.location),
    work_authorization:
      readString(rawContact.work_authorization) ??
      readString(personalInfo.work_authorization)
  };

  return compactObject(contact);
}

function normalizeEducation(value: unknown) {
  return readRecordArray(value).map((education) => ({
    institution:
      readString(education.institution) ??
      readString(education.school) ??
      readString(education.university) ??
      readString(education.college) ??
      readString(education.institution_name) ??
      "",
    degree: readString(education.degree) ?? "",
    field:
      readString(education.field) ??
      readString(education.field_of_study) ??
      readString(education.major) ??
      readString(education.area_of_study) ??
      "",
    ...compactObject({
      start_date: readString(education.start_date),
      end_date:
        readString(education.end_date) ??
        readString(education.graduation_year) ??
        readString(education.graduation_date),
      grades:
        readString(education.grades) ??
        readString(education.gpa) ??
        readString(education.grade) ??
        readString(education.marks),
      honors:
        readStringArrayOrUndefined(education.honors) ??
        readStringArrayOrUndefined(education.awards) ??
        readStringArrayOrUndefined(education.honors_awards) ??
        readStringArrayOrUndefined(education.scholarships),
      projects: readStringArrayOrUndefined(education.projects),
      ranking_confidence: readNumber(education.ranking_confidence),
      enrichment_needed: readBoolean(education.enrichment_needed)
    })
  }));
}

function normalizeExperience(value: unknown) {
  return readRecordArray(value).map((experience) => ({
    company:
      readString(experience.company) ??
      readString(experience.employer) ??
      readString(experience.organization) ??
      "",
    title:
      readString(experience.title) ??
      readString(experience.position) ??
      readString(experience.role) ??
      readString(experience.job_title) ??
      "",
    start_date:
      readString(experience.start_date) ??
      readString(experience.start) ??
      readString(experience.from) ??
      "unknown",
    ...compactObject({
      end_date:
        readString(experience.end_date) ??
        readString(experience.end) ??
        readString(experience.to) ??
        null,
      industry: readString(experience.industry),
      function: readString(experience.function),
      responsibilities:
        readStringArrayOrUndefined(experience.responsibilities) ??
        readStringArrayOrUndefined(experience.description) ??
        readStringArrayOrUndefined(experience.bullets) ??
        readStringArrayOrUndefined(experience.duties),
      measurable_impact:
        readStringArrayOrUndefined(experience.measurable_impact) ??
        readStringArrayOrUndefined(experience.achievements) ??
        readStringArrayOrUndefined(experience.impact),
      tools:
        readStringArrayOrUndefined(experience.tools) ??
        readStringArrayOrUndefined(experience.technologies),
      leadership_scope: readString(experience.leadership_scope),
      evidence_quality: readNumber(experience.evidence_quality)
    })
  }));
}

function normalizeSkills(value: unknown) {
  return readArray(value).map((skill) => {
    if (typeof skill === "string") {
      return {
        name: skill,
        category: inferSkillCategory(skill),
        evidence_count: 1,
        evidence: ["Anthropic resume extraction"]
      };
    }

    const record = asRecord(skill) ?? {};
    const name = readString(record.name) ?? readString(record.skill) ?? "";

    return {
      name,
      category: normalizeSkillCategory(readString(record.category) ?? name),
      evidence_count: Math.max(0, Math.round(readNumber(record.evidence_count) ?? 1)),
      evidence: readStringArray(record.evidence)
    };
  });
}

function normalizeLanguages(value: unknown) {
  return readRecordArray(value).map((language) => ({
    language: readString(language.language) ?? readString(language.name) ?? "",
    ...compactObject({
      declared_level: normalizeCefr(
        readString(language.declared_level) ?? readString(language.proficiency)
      ),
      assessed_level: normalizeCefr(readString(language.assessed_level)) ?? "unknown",
      evidence: readStringArrayOrUndefined(language.evidence)
    })
  }));
}

function normalizePreferences(value: unknown) {
  const preferences = asRecord(value) ?? {};

  return {
    target_roles:
      readStringArray(preferences.target_roles).length > 0
        ? readStringArray(preferences.target_roles)
        : readStringArray(preferences.desired_roles),
    locations:
      readStringArray(preferences.locations).length > 0
        ? readStringArray(preferences.locations)
        : readStringArray(preferences.preferred_locations),
    work_modes: (
      readStringArray(preferences.work_modes).length > 0
        ? readStringArray(preferences.work_modes)
        : readStringArray(preferences.work_setup)
    ).filter(
      (mode): mode is "remote" | "hybrid" | "onsite" =>
        mode === "remote" || mode === "hybrid" || mode === "onsite"
    )
  };
}

function inferSkillCategory(value: string): "technical" | "business" | "work" | "language" | "other" {
  return normalizeSkillCategory(value);
}

function normalizeSkillCategory(
  value: string
): "technical" | "business" | "work" | "language" | "other" {
  const normalized = value.toLowerCase();

  if (/\b(python|sql|javascript|typescript|react|node|api|aws|docker|kubernetes|excel|power bi)\b/.test(normalized)) {
    return "technical";
  }

  if (/\b(sales|crm|finance|marketing|pipeline|revenue|business)\b/.test(normalized)) {
    return "business";
  }

  if (/\b(english|german|italian|french|spanish|language)\b/.test(normalized)) {
    return "language";
  }

  if (/\b(leadership|communication|collaboration|management)\b/.test(normalized)) {
    return "work";
  }

  return "other";
}

function normalizeCefr(value: string | undefined): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "unknown" | undefined {
  const normalized = value?.toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/)?.[1];
  return normalized as "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | undefined;
}

function readFirstDefined(...values: readonly unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return readArray(value).flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

function readStringArray(value: unknown): string[] {
  return readArray(value).flatMap((item) => {
    const text = readString(item);
    return text ? [text] : [];
  });
}

function readStringArrayOrUndefined(value: unknown): string[] | undefined {
  const values = readStringArray(value);
  return values.length > 0 ? values : undefined;
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readConfidenceRecord(value: unknown): Record<string, number> {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record).flatMap(([key, item]) => {
      const numberValue = readNumber(item);
      return numberValue === undefined ? [] : [[key, clampConfidence(numberValue)]];
    })
  );
}

function clampConfidence(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as Partial<T>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function resolveModelCandidates(primaryModel: string): string[] {
  return uniqueNonEmpty([
    primaryModel,
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

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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

    return sanitizeProviderErrorMessage(message);
  } catch {
    return "";
  }
}

function sanitizeProviderErrorMessage(message: string): string {
  return message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, "[redacted]").trim();
}

function createAnthropicRequestError(failure: AnthropicRequestFailure | undefined): Error {
  if (!failure) {
    return new Error("Anthropic resume parser request failed before a response was received.");
  }

  const detail = failure.message ? ` ${failure.message}` : "";
  return new Error(
    `Anthropic resume parser request failed with status ${failure.status} using model ${failure.model}.${detail}`
  );
}

function extractTextContent(message: AnthropicMessageResponse): string {
  const text = message.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic resume parser response did not contain text JSON.");
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
      throw new Error("Anthropic resume parser response was not valid JSON.");
    }

    return JSON.parse(candidate.slice(start, end + 1));
  }
}
