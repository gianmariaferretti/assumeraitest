import { assertQuestionBankAllowed } from "./safety";
import { buildInterviewArcQuestions } from "./interview-arc";
import {
  localizeInterviewQuestions,
  localizedModuleDefinition,
  resolveCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "./interview-language";
import type {
  Difficulty,
  FollowUpRule,
  InterviewModule,
  InterviewQuestion,
  ModuleId,
  RoleFamily,
  RoleProfileInput
} from "./types";

export const DEFAULT_MODULE_ORDER: ModuleId[] = [
  "motivation",
  "language",
  "domain",
  "work_sample",
  "case"
];

const MODULE_DEFINITIONS: Record<ModuleId, Omit<InterviewModule, "roleSpecificFocus" | "requiredEvidence">> = {
  motivation: {
    id: "motivation",
    title: "Role motivation and work preference",
    purpose: "Understand role interest, preferred working style, and realistic expectations.",
    targetMinutes: 3,
    version: "interview-module-v0"
  },
  language: {
    id: "language",
    title: "Role communication",
    purpose: "Gather role-relevant written communication evidence without accent or native-status signals.",
    targetMinutes: 3,
    version: "interview-module-v0"
  },
  domain: {
    id: "domain",
    title: "Domain knowledge",
    purpose: "Check role-specific reasoning and technical or commercial knowledge.",
    targetMinutes: 4,
    version: "interview-module-v0"
  },
  work_sample: {
    id: "work_sample",
    title: "Work sample",
    purpose: "Collect a small role-relevant work product or structured approach.",
    targetMinutes: 5,
    version: "interview-module-v0"
  },
  case: {
    id: "case",
    title: "Scenario judgment",
    purpose: "Observe judgment under ambiguity in a realistic role scenario.",
    targetMinutes: 5,
    version: "interview-module-v0"
  }
};

const COMMON_DISALLOWED_SIGNALS = [
  "Protected characteristics",
  "Chronological age",
  "Family status",
  "Health or disability status",
  "Religion, ethnicity, nationality, or similar traits",
  "Accent, facial expression, emotion, biometric, or personality scoring"
];

const DEFAULT_FOLLOW_UP_RULES: FollowUpRule[] = [
  { reason: "clarify_evidence", trigger: "answer is ambiguous or lacks a concrete example" },
  { reason: "validate_role_requirement", trigger: "role-essential requirement needs more evidence" },
  { reason: "resolve_contradiction", trigger: "answer conflicts with earlier interview evidence" },
  { reason: "increase_confidence", trigger: "answer is too thin to support a confident human review" }
];

interface QuestionTemplate {
  prompt: string;
  expectedSignals: string[];
  evidenceRequirements: string[];
  difficulty?: Difficulty;
}

const QUESTION_TEMPLATES: Record<RoleFamily, Record<ModuleId, QuestionTemplate>> = {
  sales: {
    motivation: {
      prompt:
        "Describe the sales environment where you do your best work and one habit you use to keep outreach consistent.",
      expectedSignals: ["clear sales motivation", "self-management", "realistic outbound cadence"],
      evidenceRequirements: ["specific habit", "sales environment example"]
    },
    language: {
      prompt:
        "Write a concise follow-up note to a German-speaking prospect after a first discovery call. Keep it professional and evidence-based.",
      expectedSignals: ["clear written communication", "customer orientation", "professional tone"],
      evidenceRequirements: ["prospect context", "next step"]
    },
    domain: {
      prompt: "Walk through how you qualify an outbound account before adding it to a sequence.",
      expectedSignals: ["account research", "qualification criteria", "pipeline discipline"],
      evidenceRequirements: ["qualification steps", "CRM or pipeline evidence"]
    },
    work_sample: {
      prompt:
        "Draft a three-step outreach plan for a prospect who opened the pricing page but has not replied.",
      expectedSignals: ["sequencing", "objection awareness", "measured follow-up"],
      evidenceRequirements: ["three steps", "reason for each step"],
      difficulty: "intermediate"
    },
    case: {
      prompt:
        "A prospect says the product is interesting but not budgeted this quarter. What do you do next?",
      expectedSignals: ["objection handling", "commercial judgment", "next-step clarity"],
      evidenceRequirements: ["response path", "qualification decision"],
      difficulty: "intermediate"
    }
  },
  consulting: {
    motivation: {
      prompt: "Describe a client problem you would enjoy owning from ambiguous brief to recommendation.",
      expectedSignals: ["client orientation", "structured ownership", "comfort with ambiguity"],
      evidenceRequirements: ["client problem example", "ownership scope"]
    },
    language: {
      prompt:
        "Write a short client update explaining a delivery delay and the next action in clear business English.",
      expectedSignals: ["clarity", "accountability", "client-ready communication"],
      evidenceRequirements: ["delay context", "next action"]
    },
    domain: {
      prompt:
        "Explain how you would identify and document technology risk in a process that relies on spreadsheets.",
      expectedSignals: ["risk identification", "control thinking", "documentation discipline"],
      evidenceRequirements: ["risk examples", "documentation approach"],
      difficulty: "intermediate"
    },
    work_sample: {
      prompt:
        "Given a messy dataset with duplicates and missing owners, outline your first five cleanup actions.",
      expectedSignals: ["structured analysis", "data quality triage", "prioritization"],
      evidenceRequirements: ["five actions", "reasoning for order"],
      difficulty: "intermediate"
    },
    case: {
      prompt: "A client disagrees with your risk rating. How do you handle the meeting?",
      expectedSignals: ["stakeholder management", "evidence-based reasoning", "professional judgment"],
      evidenceRequirements: ["meeting approach", "evidence handling"],
      difficulty: "intermediate"
    }
  },
  ai_analyst: {
    motivation: {
      prompt:
        "Describe the AI governance or analysis work that gives you energy and why it matters for users.",
      expectedSignals: ["user focus", "AI governance interest", "responsible analysis motivation"],
      evidenceRequirements: ["work example", "user impact"]
    },
    language: {
      prompt: "Summarize an AI model limitation for a nontechnical stakeholder in plain English.",
      expectedSignals: ["plain-language explanation", "risk communication", "technical accuracy"],
      evidenceRequirements: ["limitation", "business implication"]
    },
    domain: {
      prompt:
        "How would you evaluate whether a model output is reliable enough for a business workflow?",
      expectedSignals: ["evaluation design", "evidence quality", "risk-aware thresholds"],
      evidenceRequirements: ["checks", "decision criteria"],
      difficulty: "intermediate"
    },
    work_sample: {
      prompt:
        "Review a hypothetical chatbot that cites no sources. What checks and guardrails would you propose?",
      expectedSignals: ["source awareness", "guardrail thinking", "user safety"],
      evidenceRequirements: ["checks", "guardrails"],
      difficulty: "intermediate"
    },
    case: {
      prompt:
        "A team wants to automate a high-impact decision with limited evidence. What questions do you ask before approval?",
      expectedSignals: ["human review awareness", "risk triage", "evidence requirements"],
      evidenceRequirements: ["approval questions", "review conditions"],
      difficulty: "advanced"
    }
  },
  python_developer: {
    motivation: {
      prompt:
        "Describe the kind of backend engineering work where you are most effective and how you collaborate around tradeoffs.",
      expectedSignals: ["backend motivation", "collaboration", "tradeoff awareness"],
      evidenceRequirements: ["project example", "collaboration detail"]
    },
    language: {
      prompt: "Write a short pull request note explaining a database performance fix to reviewers.",
      expectedSignals: ["technical clarity", "review readiness", "concise writing"],
      evidenceRequirements: ["fix summary", "testing note"]
    },
    domain: {
      prompt:
        "Explain how you would design a Python API endpoint that validates input, writes to SQL, and stays testable.",
      expectedSignals: ["Python API design", "SQL awareness", "testability"],
      evidenceRequirements: ["validation approach", "persistence approach", "test plan"],
      difficulty: "intermediate"
    },
    work_sample: {
      prompt:
        "A Python service is returning duplicate records after a pagination change. Walk through your debugging plan.",
      expectedSignals: ["debugging structure", "data reasoning", "regression testing"],
      evidenceRequirements: ["debugging steps", "test or monitoring evidence"],
      difficulty: "intermediate"
    },
    case: {
      prompt:
        "A product manager needs a quick integration that may become permanent. How do you balance delivery and maintainability?",
      expectedSignals: ["delivery judgment", "maintainability", "communication with product"],
      evidenceRequirements: ["tradeoff explanation", "risk mitigation"],
      difficulty: "intermediate"
    }
  },
  operations: {
    motivation: {
      prompt: "Describe an operations process you would improve first and how you decide it is worth changing.",
      expectedSignals: ["process improvement motivation", "prioritization", "impact awareness"],
      evidenceRequirements: ["process example", "impact measure"]
    },
    language: {
      prompt: "Write a concise internal update about a process incident and the next recovery step.",
      expectedSignals: ["clear update", "operational ownership", "recovery focus"],
      evidenceRequirements: ["incident context", "next step"]
    },
    domain: {
      prompt: "How would you measure whether a handoff process is reliable?",
      expectedSignals: ["metric selection", "process reliability", "root-cause thinking"],
      evidenceRequirements: ["metrics", "review cadence"],
      difficulty: "intermediate"
    },
    work_sample: {
      prompt:
        "A weekly report has mismatched source data and deadline pressure. What steps do you take?",
      expectedSignals: ["triage", "data reconciliation", "stakeholder communication"],
      evidenceRequirements: ["triage steps", "communication plan"],
      difficulty: "intermediate"
    },
    case: {
      prompt:
        "Two teams disagree about ownership of an operational failure. How do you resolve it?",
      expectedSignals: ["cross-functional judgment", "evidence gathering", "resolution path"],
      evidenceRequirements: ["resolution steps", "owner alignment"],
      difficulty: "intermediate"
    }
  }
};

function languageFocus(roleProfile: RoleProfileInput): string {
  const languages = roleProfile.requirements?.required_languages ?? [];

  if (languages.length === 0) {
    return "Role-relevant written communication";
  }

  return languages.map((language) => `${language.language} ${language.minimum_level}`).join(", ");
}

function skillFocus(roleProfile: RoleProfileInput): string {
  const requiredSkills = roleProfile.requirements?.required_skills ?? [];

  return requiredSkills.length > 0 ? requiredSkills.join(", ") : roleProfile.title ?? "role requirements";
}

function evidenceFocus(roleProfile: RoleProfileInput): string[] {
  const evidence = roleProfile.calibration?.required_evidence ?? [];
  const requiredSkills = roleProfile.requirements?.required_skills ?? [];

  return evidence.length > 0 ? evidence : requiredSkills.slice(0, 3);
}

export function createModulePlan(
  roleProfile: RoleProfileInput,
  interviewLanguage?: CandidateInterviewLanguageCode
): InterviewModule[] {
  const language = resolveCandidateInterviewLanguageCode(interviewLanguage);
  const focusByModule: Record<ModuleId, string> = {
    motivation: `${roleProfile.title ?? "Target role"} motivation and work preference`,
    language: languageFocus(roleProfile),
    domain: skillFocus(roleProfile),
    work_sample: evidenceFocus(roleProfile).join(", ") || skillFocus(roleProfile),
    case: `${roleProfile.title ?? "Target role"} scenario judgment`
  };

  return DEFAULT_MODULE_ORDER.map((moduleId) => ({
    ...MODULE_DEFINITIONS[moduleId],
    ...localizedModuleDefinition(moduleId, language),
    roleSpecificFocus: focusByModule[moduleId],
    requiredEvidence:
      moduleId === "language"
        ? [languageFocus(roleProfile)]
        : evidenceFocus(roleProfile).length > 0
          ? evidenceFocus(roleProfile)
          : [focusByModule[moduleId]]
  }));
}

export function inferRoleFamily(roleProfile: RoleProfileInput): RoleFamily {
  const requiredSkills = roleProfile.requirements?.required_skills ?? [];
  const niceToHaveSkills = roleProfile.requirements?.nice_to_have_skills ?? [];
  const searchable = [
    roleProfile.title,
    roleProfile.role_type,
    ...requiredSkills,
    ...niceToHaveSkills
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (searchable.includes("sdr") || searchable.includes("sales") || roleProfile.role_type === "sales") {
    return "sales";
  }
  if (searchable.includes("consulting") || searchable.includes("risk analyst")) {
    return "consulting";
  }
  if (searchable.includes("ai analyst") || roleProfile.role_type === "ai_analyst") {
    return "ai_analyst";
  }
  if (searchable.includes("python") || roleProfile.role_type === "engineering") {
    return "python_developer";
  }
  if (searchable.includes("operations") || searchable.includes("ops")) {
    return "operations";
  }

  return "operations";
}

function rubricFor(moduleId: ModuleId): string[] {
  switch (moduleId) {
    case "motivation":
      return ["Role relevance", "Specificity", "Candidate-owned preference without protected traits"];
    case "language":
      return ["Clarity", "Audience fit", "Evidence-based communication without accent or native-status signals"];
    case "domain":
      return ["Role knowledge", "Structured reasoning", "Evidence of practical judgment"];
    case "work_sample":
      return ["Approach quality", "Completeness", "Role-relevant artifacts or checks"];
    case "case":
      return ["Judgment under ambiguity", "Stakeholder awareness", "Evidence-based next step"];
  }
}

function makeQuestion(
  roleFamily: RoleFamily,
  moduleId: ModuleId,
  template: QuestionTemplate
): InterviewQuestion {
  return {
    id: `${roleFamily}-${moduleId.replace("_", "-")}-v0`,
    version: "interview-question-v0",
    moduleId,
    roleFamily,
    difficulty: template.difficulty ?? "baseline",
    prompt: template.prompt,
    rubric: rubricFor(moduleId),
    expectedSignals: template.expectedSignals,
    disallowedSignals: COMMON_DISALLOWED_SIGNALS,
    evidenceRequirements: template.evidenceRequirements,
    timeTargetSeconds: MODULE_DEFINITIONS[moduleId].targetMinutes * 60,
    followUpRules: DEFAULT_FOLLOW_UP_RULES
  };
}

export function createQuestionBank(): InterviewQuestion[] {
  const questions = Object.entries(QUESTION_TEMPLATES).flatMap(([roleFamily, moduleTemplates]) =>
    DEFAULT_MODULE_ORDER.map((moduleId) =>
      makeQuestion(roleFamily as RoleFamily, moduleId, moduleTemplates[moduleId])
    )
  );

  assertQuestionBankAllowed(questions);
  return questions;
}

export function selectQuestionBankForRole(
  roleProfile: RoleProfileInput,
  questionBank = createQuestionBank(),
  interviewLanguage?: CandidateInterviewLanguageCode
): InterviewQuestion[] {
  assertQuestionBankAllowed(questionBank);

  const roleFamily = inferRoleFamily(roleProfile);
  const selected = questionBank.filter((question) => question.roleFamily === roleFamily);

  const ordered = DEFAULT_MODULE_ORDER.flatMap((moduleId) =>
    selected.filter((question) => question.moduleId === moduleId).slice(0, 1)
  );

  const localized = localizeInterviewQuestions(ordered, interviewLanguage);

  // Realistic arc (Phase 11): canonical opening/motivation/self-awareness/
  // closing items frame the localized module questions. The motivation
  // module's own question is replaced by the canonical block; behavioral and
  // situational module questions keep their resume-aware treatment.
  const arc = buildInterviewArcQuestions({
    moduleQuestions: localized.filter((question) => question.moduleId !== "motivation"),
    roleFamily,
    seniority: roleProfile.seniority,
    language: interviewLanguage
  });
  assertQuestionBankAllowed(arc);
  return arc;
}
