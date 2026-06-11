import type { BarsCompetency } from "../scoring/bars/types";
import { isAgilityQuestionId, type CanonicalSeniorityBand } from "./canonical-questions";
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

export const LEARNING_AGILITY_COMPETENCY_ID = "learning_agility";

/**
 * Learning agility (Phase 15): how a candidate engages with genuinely new
 * material — questions asked, structure imposed, hypotheses formed, updating
 * on feedback. NO PENALTY FOR UNFAMILIARITY: the anchors score the learning
 * PROCESS only; prior familiarity with a concept is never required, and
 * admitting unfamiliarity before reasoning meets the bar, never lowers it.
 * Delivered by the canonical_agility_* items (STAR + micro-learning task).
 */
const LEARNING_AGILITY_COMPETENCY: BarsCompetency = {
  id: LEARNING_AGILITY_COMPETENCY_ID,
  name: "Learning agility",
  tier: 2,
  description:
    "Engages with genuinely new material: structures the unfamiliar, forms hypotheses, and updates on feedback. Scores the learning process only — prior familiarity with the concept is never required, and admitting unfamiliarity never lowers the score.",
  sbiQuestions: [],
  bars: anchors(
    [
      "bluffs familiarity instead of engaging with the new material",
      "gives up without attempting to reason about the new idea"
    ],
    [
      "engages honestly with the new idea and produces a workable application",
      "admitting unfamiliarity and then reasoning through it meets this bar"
    ],
    [
      "imposes structure on the unfamiliar: explicit assumptions, a hypothesis, and a check of their own answer"
    ],
    [
      "transfers the new idea beyond the given example and refines the answer mid-response as understanding improves"
    ]
  ),
  redFlags: [],
  moduleId: "domain"
};

/**
 * Seniority weighting for learning agility (Phase 15): agility predicts most
 * where there is least track record, so it weighs more for juniors; for
 * experienced profiles past behavior carries more of the evidence — but
 * agility still counts and is never zeroed.
 */
export function learningAgilityWeightForSeniority(
  band: CanonicalSeniorityBand | undefined
): number {
  if (band === "junior") {
    return 1.25;
  }
  if (band === "experienced") {
    return 0.85;
  }
  return 1;
}

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
  // Learning-agility items (Phase 15) carry their own competency regardless
  // of the module they are delivered in: the anchors score the learning
  // process, never the module's domain knowledge.
  const base =
    question && isAgilityQuestionId(question.id)
      ? LEARNING_AGILITY_COMPETENCY
      : MODULE_COMPETENCIES[moduleId] ?? FALLBACK_COMPETENCY;
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
