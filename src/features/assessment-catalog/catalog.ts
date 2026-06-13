import type { ModuleRequirement } from "../roles/role-profile";
import type { ModuleScorerType } from "../scoring/module-scoring/scorer-types";

import type { AssessmentModuleDefinition } from "./types";

/**
 * The 22-module catalog. Phase 1 + Phase 2 modules are `active` with content;
 * Phase 3 modules are `draft` (declared so the journey, matching surface, and
 * routing are forward-compatible, but not yet user-facing).
 *
 * CORE = motivation + communication/problem-solving. Every non-core module
 * `unlocks_after` the CORE, so nothing unlockable appears until the CORE is
 * complete (the journey rule), and each unlock grows the candidate's match
 * surface.
 */

export const ASSESSMENT_CATALOG: readonly AssessmentModuleDefinition[] = [
  // ---- TRACK 0: CORE (mandatory, ~20 min total) --------------------------
  {
    module_id: "motivation",
    title: "Motivation & fit",
    track: "core",
    scorer_type: "behavioral",
    status: "active",
    phase: 1,
    duration_budget_seconds: 600,
    competencies: ["motivation_role_fit"],
    core: true,
    description: "Why this role, values alignment, realistic expectations.",
  },
  {
    module_id: "comm_problem_solving",
    title: "Communication & problem-solving",
    track: "core",
    scorer_type: "behavioral", // mixed: behavioral comms + deterministic puzzles
    status: "active",
    phase: 1,
    duration_budget_seconds: 600,
    competencies: ["communication_clarity", "problem_structuring", "logical_puzzles"],
    core: true,
    description: "Structure an ambiguous problem and reason through short logic puzzles.",
  },

  // ---- TRACK A: TECHNICAL --------------------------------------------------
  {
    module_id: "coding_with_ai",
    title: "Coding (work-sample, with AI)",
    track: "technical",
    scorer_type: "work_sample",
    status: "active",
    phase: 1,
    duration_budget_seconds: 1800,
    competencies: ["coding_correctness", "ai_collaboration"],
    auto_trigger_keywords: ["javascript", "typescript", "python", "go", "java", "c#", "rust"],
    description: "Realistic editor task with the AI assistant active; collaboration is reviewed, not penalized.",
  },
  {
    module_id: "ai_fluency",
    title: "AI fluency / prompt engineering",
    track: "technical",
    scorer_type: "deterministic", // mixed: quiz + LLM open scenario
    status: "active",
    phase: 2,
    duration_budget_seconds: 900,
    competencies: ["responsible_ai_use", "prompt_quality", "hallucination_detection"],
    description: "Instruct, evaluate, and correct AI output; spot hallucinations; use AI responsibly.",
  },
  {
    module_id: "data_literacy",
    title: "Data literacy & analysis",
    track: "technical",
    scorer_type: "interactive", // mixed: chart end-state + LLM interpretation
    status: "active",
    phase: 2,
    duration_budget_seconds: 900,
    competencies: ["data_reading", "evidence_interpretation"],
    description: "Read and manipulate a chart, interpret numbers, decide on evidence.",
  },
  {
    module_id: "sql_query",
    title: "SQL / query",
    track: "technical",
    scorer_type: "interactive",
    status: "active",
    phase: 2,
    duration_budget_seconds: 900,
    competencies: ["sql_correctness", "query_shape"],
    auto_trigger_keywords: ["sql", "postgresql", "mysql", "bigquery"],
    description: "Practical queries on a per-session sandbox DB, graded by result-set equality.",
  },
  {
    module_id: "cloud_devops",
    title: "Cloud / DevOps / systems",
    track: "technical",
    scorer_type: "deterministic",
    status: "draft",
    phase: 3,
    duration_budget_seconds: 900,
    competencies: ["infra_troubleshooting", "cicd_iac"],
    auto_trigger_keywords: ["kubernetes", "docker", "terraform", "aws", "gcp", "azure"],
    description: "Infra troubleshooting, IaC, CI/CD.",
  },
  {
    module_id: "cybersecurity",
    title: "Cybersecurity",
    track: "technical",
    scorer_type: "deterministic",
    status: "draft",
    phase: 3,
    duration_budget_seconds: 900,
    competencies: ["vulnerability_recognition", "threat_modeling"],
    description: "Recognize vulnerabilities and reason about threat models.",
  },
  {
    module_id: "software_proficiency",
    title: "Software / tool proficiency",
    track: "technical",
    scorer_type: "interactive",
    status: "draft",
    phase: 3,
    duration_budget_seconds: 600,
    competencies: ["spreadsheet_proficiency"],
    description: "In-app spreadsheet/tool tasks graded on resulting state.",
  },

  // ---- TRACK B: COGNITIVE (deterministic, maximum defensibility) ----------
  {
    module_id: "numerical_reasoning",
    title: "Numerical reasoning",
    track: "cognitive",
    scorer_type: "deterministic",
    status: "active",
    phase: 2,
    duration_budget_seconds: 720,
    competencies: ["numerical_reasoning"],
    description: "Data, percentages, and interpretation under time.",
  },
  {
    module_id: "logical_reasoning",
    title: "Logical / abstract reasoning",
    track: "cognitive",
    scorer_type: "deterministic",
    status: "active",
    phase: 1,
    duration_budget_seconds: 720,
    competencies: ["logical_reasoning"],
    description: "Patterns, sequences, deduction.",
  },
  {
    module_id: "verbal_reasoning",
    title: "Verbal reasoning",
    track: "cognitive",
    scorer_type: "deterministic",
    status: "draft",
    phase: 3,
    duration_budget_seconds: 720,
    competencies: ["verbal_reasoning"],
    description: "Comprehension and inference from text.",
  },
  {
    module_id: "attention_to_detail",
    title: "Attention to detail / accuracy",
    track: "cognitive",
    scorer_type: "deterministic",
    status: "active",
    phase: 2,
    duration_budget_seconds: 480,
    competencies: ["attention_to_detail"],
    description: "Error-checking under time.",
  },

  // ---- TRACK C: LANGUAGE (Versant-style, CEFR-anchored) -------------------
  {
    module_id: "language_reading",
    title: "Language — Reading",
    track: "language",
    scorer_type: "deterministic",
    status: "active",
    phase: 1,
    duration_budget_seconds: 720,
    competencies: ["reading_comprehension"],
    description: "Written comprehension, CEFR A1–C2.",
  },
  {
    module_id: "language_listening",
    title: "Language — Listening",
    track: "language",
    scorer_type: "deterministic",
    status: "active",
    phase: 2,
    duration_budget_seconds: 720,
    competencies: ["listening_comprehension"],
    description: "Audio comprehension, CEFR.",
  },
  {
    module_id: "language_writing",
    title: "Language — Writing",
    track: "language",
    scorer_type: "language",
    status: "active",
    phase: 1,
    duration_budget_seconds: 900,
    competencies: ["writing_grammar", "writing_register", "writing_clarity"],
    description: "Grammar, register, clarity, CEFR.",
  },
  {
    module_id: "language_speaking",
    title: "Language — Speaking",
    track: "language",
    scorer_type: "language",
    status: "active",
    phase: 2,
    duration_budget_seconds: 600,
    competencies: ["speaking_fluency", "speaking_intelligibility"],
    description: "Fluency and intelligibility from the transcript; never accent.",
  },

  // ---- TRACK D: HUMAN / WORK STYLE (maximum caution) ----------------------
  {
    module_id: "work_style",
    title: "Work style / preferences",
    track: "human",
    scorer_type: "deterministic",
    status: "active",
    phase: 2,
    duration_budget_seconds: 480,
    competencies: ["work_style_profile"],
    descriptive_only: true,
    description: "Work-style fit profile (autonomy/collaboration, ambiguity). Never a trait score.",
  },
  {
    module_id: "situational_judgment",
    title: "Situational judgment (SJT)",
    track: "human",
    scorer_type: "deterministic", // mixed: choices + LLM justification
    status: "active",
    phase: 2,
    duration_budget_seconds: 720,
    competencies: ["situational_judgment"],
    description: "Realistic role dilemmas: choose and justify.",
  },
  {
    module_id: "leadership",
    title: "Leadership / management",
    track: "human",
    scorer_type: "behavioral",
    status: "draft",
    phase: 3,
    duration_budget_seconds: 900,
    competencies: ["delegation", "stakeholder_management"],
    senior_only: true,
    description: "Delegation, stakeholder management, managerial empathy (senior roles).",
  },

  // ---- META-MODULES --------------------------------------------------------
  {
    module_id: "role_knowledge",
    title: "Role-specific knowledge",
    track: "meta",
    scorer_type: "deterministic",
    status: "draft",
    phase: 3,
    duration_budget_seconds: 720,
    competencies: ["role_knowledge"],
    description: "Reusable job-knowledge template, filled per domain.",
  },
  {
    module_id: "identity_check",
    title: "Identity / honesty check",
    track: "meta",
    scorer_type: "deterministic",
    status: "draft",
    phase: 3,
    duration_budget_seconds: 120,
    competencies: ["identity_verification"],
    descriptive_only: true,
    description: "Lightweight verification before high-value modules; never auto-rejects.",
  },
];

const CATALOG_BY_ID = new Map(ASSESSMENT_CATALOG.map((module) => [module.module_id, module]));

export function getModuleDefinition(moduleId: string): AssessmentModuleDefinition | undefined {
  return CATALOG_BY_ID.get(moduleId);
}

export function coreModuleIds(): string[] {
  return ASSESSMENT_CATALOG.filter((module) => module.core).map((module) => module.module_id);
}

export function activeModules(): AssessmentModuleDefinition[] {
  return ASSESSMENT_CATALOG.filter((module) => module.status === "active");
}

/** Module → scorer type (the catalog is the single source of truth). */
export function scorerTypeForModule(moduleId: string): ModuleScorerType {
  return CATALOG_BY_ID.get(moduleId)?.scorer_type ?? "behavioral";
}

/** True when a module is descriptive-only and must not feed a quality score. */
export function isDescriptiveOnly(moduleId: string): boolean {
  return CATALOG_BY_ID.get(moduleId)?.descriptive_only === true;
}

export interface DefaultModulePlanOptions {
  /** Only include active modules (default true); drafts are forward-compat. */
  readonly activeOnly?: boolean;
  /** Mark coding/technical auto-trigger modules; default true. */
  readonly includeAutoTrigger?: boolean;
}

/**
 * Build a default `ModuleRequirement[]` for the candidate journey: CORE modules
 * required; every other module `unlocks_after` the CORE; modules with
 * auto-trigger keywords become `auto_trigger`, the rest `optional` (each unlock
 * grows the match surface without blocking the match gate).
 */
export function defaultModulePlan(options: DefaultModulePlanOptions = {}): ModuleRequirement[] {
  const activeOnly = options.activeOnly ?? true;
  const core = coreModuleIds();
  const modules = activeOnly ? activeModules() : [...ASSESSMENT_CATALOG];

  return modules
    .filter((module) => !module.core)
    .map((module) => {
      const base: ModuleRequirement = {
        module_id: module.module_id,
        level: module.auto_trigger_keywords ? "auto_trigger" : "optional",
        unlocks_after: core,
        rationale: module.description,
      };
      if (module.auto_trigger_keywords) {
        return { ...base, auto_trigger_keywords: [...module.auto_trigger_keywords] };
      }
      return base;
    });
}
