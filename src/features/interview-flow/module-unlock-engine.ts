import type { ModuleRequirement } from "../roles/role-profile";
import type { CandidateProfile } from "../resume-parsing";

/**
 * Module unlock engine — the deterministic heart of the "who decides which
 * modules" flowchart. Given a role's module plan and the parsed CV, it resolves
 * each module to a candidate-facing state. No LLM: a pure, auditable join.
 */

export type ModuleState =
  | "required"
  | "auto_triggered"
  | "optional"
  | "blocked"
  | "completed";

export interface ModuleStatus {
  module_id: string;
  state: ModuleState;
  /** Plain-language, candidate-readable reason — also an AI Act audit string. */
  unlock_reason: string;
  blocking_reasons?: string[];
  required_for_match: boolean;
  /** Blocked modules are never shown to the candidate. */
  visible_to_candidate: boolean;
}

export interface ResolveModuleStatusesArgs {
  rolePlan: ModuleRequirement[];
  /** Candidate skills (raw or already normalized — matching re-normalizes). */
  cvSkills: string[];
  /** System core modules, always required. Defaults to ["motivation"]. */
  systemCoreModules?: string[];
  /** Modules the candidate has already finished. */
  completedModuleIds?: string[];
}

const DEFAULT_CORE_MODULES = ["motivation"];

/**
 * Base skill synonyms so a CV that says "JS" satisfies an auto-trigger keyword
 * of "javascript". Keys and values are compared lowercase. Intentionally small;
 * extend as real roles need it.
 */
const SKILL_SYNONYMS: Record<string, string> = {
  js: "javascript",
  "js.": "javascript",
  ecmascript: "javascript",
  ts: "typescript",
  py: "python",
  py3: "python",
  golang: "go",
  node: "nodejs",
  "node.js": "nodejs",
  postgres: "postgresql",
  k8s: "kubernetes",
  ml: "machine learning",
  "c sharp": "c#",
  csharp: "c#",
};

export function resolveModuleStatuses(args: ResolveModuleStatusesArgs): ModuleStatus[] {
  const coreModules = args.systemCoreModules ?? DEFAULT_CORE_MODULES;
  const coreSet = new Set(coreModules);
  const completedSet = new Set(args.completedModuleIds ?? []);
  const planById = new Map(args.rolePlan.map((entry) => [entry.module_id, entry]));
  const cvCanonical = args.cvSkills.map(canonicalizeSkill).filter(Boolean);

  const orderedIds = uniqueStrings([
    ...coreModules,
    ...args.rolePlan.map((entry) => entry.module_id),
  ]);

  return orderedIds.map((moduleId) => {
    const base = resolveBaseStatus(moduleId, coreSet, planById.get(moduleId), cvCanonical);

    if (completedSet.has(moduleId)) {
      return {
        ...base,
        state: "completed",
        unlock_reason: "Module already completed.",
      };
    }

    return base;
  });
}

/**
 * Normalized skill extraction from a parsed candidate profile. Returns unique
 * canonical skill names (applying base synonyms), ready for unlock matching.
 */
export function extractCandidateSkills(profile: CandidateProfile): string[] {
  return uniqueStrings(profile.skills.map((skill) => canonicalizeSkill(skill.name)));
}

function resolveBaseStatus(
  moduleId: string,
  coreSet: Set<string>,
  planEntry: ModuleRequirement | undefined,
  cvCanonical: string[],
): ModuleStatus {
  if (coreSet.has(moduleId)) {
    return {
      module_id: moduleId,
      state: "required",
      unlock_reason: "System core module: every candidate completes it.",
      required_for_match: true,
      visible_to_candidate: true,
    };
  }

  const level = planEntry?.level ?? "optional";

  if (level === "blocked") {
    return {
      module_id: moduleId,
      state: "blocked",
      unlock_reason: "Module is blocked for this role and not shown to the candidate.",
      blocking_reasons: [planEntry?.rationale ?? "Blocked by role module plan."],
      required_for_match: false,
      visible_to_candidate: false,
    };
  }

  if (level === "required") {
    return {
      module_id: moduleId,
      state: "required",
      unlock_reason: "Role marks this module as required.",
      required_for_match: true,
      visible_to_candidate: true,
    };
  }

  if (level === "auto_trigger") {
    const match = findKeywordMatch(planEntry?.auto_trigger_keywords ?? [], cvCanonical);
    if (match) {
      return {
        module_id: moduleId,
        state: "auto_triggered",
        unlock_reason: `CV skill "${match.cvSkill}" matches auto-trigger keyword "${match.keyword}".`,
        required_for_match: true,
        visible_to_candidate: true,
      };
    }

    return {
      module_id: moduleId,
      state: "optional",
      unlock_reason: "Auto-trigger keywords were not found in the CV; offered as optional.",
      required_for_match: false,
      visible_to_candidate: true,
    };
  }

  // level === "optional"
  return {
    module_id: moduleId,
    state: "optional",
    unlock_reason: "Role marks this module as optional.",
    required_for_match: false,
    visible_to_candidate: true,
  };
}

interface KeywordMatch {
  keyword: string;
  cvSkill: string;
}

function findKeywordMatch(
  keywords: readonly string[],
  cvCanonical: readonly string[],
): KeywordMatch | undefined {
  for (const keyword of keywords) {
    const canonicalKeyword = canonicalizeSkill(keyword);
    if (!canonicalKeyword) {
      continue;
    }
    const wordBoundary = new RegExp(`\\b${escapeRegExp(canonicalKeyword)}\\b`);
    const match = cvCanonical.find(
      (skill) => skill === canonicalKeyword || wordBoundary.test(skill),
    );
    if (match) {
      return { keyword, cvSkill: match };
    }
  }

  return undefined;
}

function canonicalizeSkill(value: string): string {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return SKILL_SYNONYMS[normalized] ?? normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
