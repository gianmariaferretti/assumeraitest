import type { BarsCompetency } from "../scoring/bars/types";
import type { InterviewQuestion } from "./types";

/**
 * Server-side BARS competency definitions, one per interview module.
 *
 * The /candidate/interview/turn route used to accept the full competency
 * object (anchors included) from the request body, which let a candidate
 * rewrite the rating scale they were scored against. Competencies are now
 * derived server-side from the module being assessed and are never read from
 * the client.
 */

export const MODULE_COMPETENCY_VERSION = "module-competency-v1";

function anchors(
  below: string[],
  meets: string[],
  exceeds: string[],
  exceptional: string[]
): BarsCompetency["bars"] {
  return [
    { level: "below_standard", scoreRange: [1, 3], descriptors: below },
    { level: "meets_standard", scoreRange: [4, 6], descriptors: meets },
    { level: "exceeds_standard", scoreRange: [7, 9], descriptors: exceeds },
    { level: "exceptional", scoreRange: [10, 10], descriptors: exceptional }
  ];
}

const MODULE_COMPETENCIES: Record<string, BarsCompetency> = {
  motivation: {
    id: "motivation_role_fit",
    name: "Role motivation and work preference",
    tier: 1,
    description:
      "Understands the role, articulates realistic expectations, and connects their own goals to the work.",
    sbiQuestions: [],
    bars: anchors(
      ["generic interest with no link to this role", "expectations contradict the role's reality"],
      ["names concrete reasons tied to the role", "realistic view of day-to-day work"],
      ["links past choices and evidence to the role's demands", "states trade-offs they accept"],
      ["coherent career narrative grounded in verifiable decisions and outcomes"]
    ),
    redFlags: [],
    moduleId: "motivation"
  },
  language: {
    id: "language_role_communication",
    name: "Role communication",
    tier: 1,
    description:
      "Communicates role-relevant content clearly and structures an answer for a professional audience. Never assesses accent or native-speaker status.",
    sbiQuestions: [],
    bars: anchors(
      ["unstructured answer that a colleague could not act on"],
      ["clear main point with adequate supporting detail"],
      ["well-structured answer adapted to the audience, with concrete examples"],
      ["precise, audience-aware communication that anticipates follow-up questions"]
    ),
    redFlags: [],
    moduleId: "language"
  },
  domain: {
    id: "domain_knowledge",
    name: "Domain knowledge",
    tier: 2,
    description:
      "Demonstrates role-specific reasoning and technical or commercial knowledge with concrete evidence.",
    sbiQuestions: [],
    bars: anchors(
      ["buzzwords without working knowledge", "cannot explain a claimed skill"],
      ["sound fundamentals applied to a concrete situation"],
      ["explains causal mechanisms, trade-offs, and limits of an approach"],
      ["expert reasoning with measured outcomes and transferable insight"]
    ),
    redFlags: [],
    moduleId: "domain"
  },
  work_sample: {
    id: "work_sample_execution",
    name: "Work sample",
    tier: 2,
    description:
      "Produces a small role-relevant work product or structured approach with observable quality.",
    sbiQuestions: [],
    bars: anchors(
      ["vague description with no personal contribution visible"],
      ["complete structured approach the reviewer can evaluate"],
      ["concrete artifact or method with quality checks and measurable results"],
      ["work product that would pass review with minimal changes, with evidence"]
    ),
    redFlags: [],
    moduleId: "work_sample"
  },
  case: {
    id: "case_scenario_judgment",
    name: "Scenario judgment",
    tier: 2,
    description:
      "Shows judgment under ambiguity in a realistic role scenario: assumptions, options, and a defensible decision.",
    sbiQuestions: [],
    bars: anchors(
      ["jumps to a conclusion without surfacing assumptions"],
      ["identifies key constraints and proposes a workable path"],
      ["weighs alternatives explicitly and explains the chosen trade-off"],
      ["structured decision with risks, mitigations, and a clear success measure"]
    ),
    redFlags: [],
    moduleId: "case"
  }
};

const FALLBACK_COMPETENCY: BarsCompetency = {
  id: "general_role_evidence",
  name: "Role-relevant evidence",
  tier: 1,
  description: "Provides concrete, verifiable evidence relevant to the target role.",
  sbiQuestions: [],
  bars: anchors(
    ["claims without supporting evidence"],
    ["one concrete example with context"],
    ["specific actions and measurable results"],
    ["multiple verifiable results with reflection on what generalizes"]
  ),
  redFlags: []
};

/**
 * Resolve the server-side competency for a module. When the planned question is
 * available its rubric is appended to the meets_standard descriptors so the
 * evaluator anchors stay grounded in what was actually asked.
 */
export function competencyForModule(
  moduleId: string,
  question?: InterviewQuestion
): BarsCompetency {
  const base = MODULE_COMPETENCIES[moduleId] ?? FALLBACK_COMPETENCY;
  if (!question || question.rubric.length === 0) {
    return base;
  }

  return {
    ...base,
    bars: base.bars.map((anchor) =>
      anchor.level === "meets_standard"
        ? { ...anchor, descriptors: [...anchor.descriptors, ...question.rubric] }
        : anchor
    )
  };
}
