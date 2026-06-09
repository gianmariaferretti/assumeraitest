import type {
  InterviewQuestion,
  QuestionBankValidationResult,
  QuestionSafetyResult,
  QuestionSafetyViolation
} from "./types";

const DISALLOWED_PROMPT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bhow old\b|\bage\b|\bdate of birth\b|\bborn\b/i, reason: "direct age question" },
  {
    pattern:
      /\bmarried\b|\bspouse\b|\bchildren\b|\bfamily status\b|\bpregnan|\bparental status\b|\bcaregiver\b/i,
    reason: "family or caregiver status question"
  },
  { pattern: /\bhealth\b|\bmedical\b|\bdisab/i, reason: "health or disability question" },
  { pattern: /\breligion\b|\bchurch\b|\bmosque\b|\bsynagogue\b|\bfaith\b/i, reason: "religion question" },
  {
    pattern:
      /\brace\b|\bethnic|\bnationality\b|\bcitizenship\b|\bpassport\b|\bvisa\b|\bwork authorization\b|\bwork authorisation\b/i,
    reason: "protected origin or immigration-status question"
  },
  { pattern: /\bgender\b|\bsex\b|\bpregnan/i, reason: "gender or pregnancy question" },
  { pattern: /\bunion\b|\bpolitical\b|\bparty affiliation\b/i, reason: "protected association question" },
  {
    pattern:
      /\baccent\b|\bnative speaker\b|\bmother tongue\b|\bfirst language\b|\bpronunciation\b|\bvoice tone\b|\bface\b|\bfacial expression\b|\bemotion\b|\bbiometric\b|\bpersonality\b/i,
    reason: "biometric, accent, emotion, or personality signal"
  }
];

const REQUIRED_DISALLOWED_SIGNALS = [
  "Protected characteristics",
  "Accent, facial expression, emotion, biometric, or personality scoring"
];

function inspectText(questionId: string, field: string, value: string): QuestionSafetyViolation[] {
  return DISALLOWED_PROMPT_PATTERNS.flatMap(({ pattern, reason }) =>
    pattern.test(value) ? [{ questionId, field, reason }] : []
  );
}

export function containsDisallowedQuestionText(value: string): boolean {
  return DISALLOWED_PROMPT_PATTERNS.some(({ pattern }) => pattern.test(value));
}

export function inspectQuestionSafety(question: InterviewQuestion): QuestionSafetyResult {
  const inspectedFields: Array<{ field: string; value: string }> = [
    { field: "prompt", value: question.prompt },
    ...question.expectedSignals.map((value, index) => ({ field: `expectedSignals[${index}]`, value })),
    ...question.evidenceRequirements.map((value, index) => ({
      field: `evidenceRequirements[${index}]`,
      value
    }))
  ];
  const violations = inspectedFields.flatMap(({ field, value }) =>
    inspectText(question.id, field, value)
  );

  return { safe: violations.length === 0, violations };
}

export function validateQuestionBank(questions: InterviewQuestion[]): QuestionBankValidationResult {
  const violations: QuestionSafetyViolation[] = [];

  for (const question of questions) {
    if (!question.id) {
      violations.push({ questionId: "(missing)", field: "id", reason: "question id is required" });
    }
    if (question.version !== "interview-question-v0") {
      violations.push({
        questionId: question.id,
        field: "version",
        reason: "question version must be interview-question-v0"
      });
    }
    if (!question.prompt.trim()) {
      violations.push({ questionId: question.id, field: "prompt", reason: "prompt is required" });
    }
    if (question.rubric.length === 0) {
      violations.push({ questionId: question.id, field: "rubric", reason: "rubric is required" });
    }
    if (question.expectedSignals.length === 0) {
      violations.push({
        questionId: question.id,
        field: "expectedSignals",
        reason: "expected signals are required"
      });
    }
    if (question.evidenceRequirements.length === 0) {
      violations.push({
        questionId: question.id,
        field: "evidenceRequirements",
        reason: "evidence requirements are required"
      });
    }
    if (question.followUpRules.length === 0) {
      violations.push({
        questionId: question.id,
        field: "followUpRules",
        reason: "follow-up rules are required"
      });
    }
    for (const requiredSignal of REQUIRED_DISALLOWED_SIGNALS) {
      if (!question.disallowedSignals.includes(requiredSignal)) {
        violations.push({
          questionId: question.id,
          field: "disallowedSignals",
          reason: `missing disallowed signal: ${requiredSignal}`
        });
      }
    }

    violations.push(...inspectQuestionSafety(question).violations);
  }

  return { valid: violations.length === 0, violations };
}

export function assertQuestionBankAllowed(questions: InterviewQuestion[]): void {
  const validation = validateQuestionBank(questions);

  if (!validation.valid) {
    const reasons = validation.violations
      .map((violation) => `${violation.questionId}.${violation.field}: ${violation.reason}`)
      .join("; ");
    throw new Error(`Interview question bank contains disallowed or incomplete questions: ${reasons}`);
  }
}
