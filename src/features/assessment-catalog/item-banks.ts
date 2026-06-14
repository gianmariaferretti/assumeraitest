import type { QuizItemBankEntry } from "../scoring/quiz-engine/types";

import { buildRoleKnowledgeBank, ROLE_KNOWLEDGE_DOMAINS } from "./role-knowledge-template";

/**
 * Seed deterministic item banks for the Phase 1–2 answer-key modules. These are
 * SEEDS that prove the engine end-to-end and pin the schema; calibrated,
 * distractor-balanced, full-size banks (and the optional adaptive form) are a
 * content workstream on top of this. `competency_tag` matches the module's
 * catalog competency so grading rolls up correctly.
 *
 * All items are employer-neutral and assess only the named skill — never any
 * protected attribute (consistent with safety.ts).
 */

function single(
  itemId: string,
  competency: string,
  difficulty: 1 | 2 | 3 | 4 | 5,
  stem: string,
  options: readonly { id: string; label: string }[],
  correctId: string,
  rationale: string,
  timeLimit = 60,
): QuizItemBankEntry {
  return {
    public: {
      item_id: itemId,
      type: "single_choice",
      stem,
      options,
      competency_tag: competency,
      difficulty,
      time_limit_seconds: timeLimit,
    },
    key: { item_id: itemId, correct: { type: "single_choice", option_id: correctId }, rationale },
  };
}

function numeric(
  itemId: string,
  competency: string,
  difficulty: 1 | 2 | 3 | 4 | 5,
  stem: string,
  value: number,
  rationale: string,
  timeLimit = 90,
): QuizItemBankEntry {
  return {
    public: {
      item_id: itemId,
      type: "numeric_entry",
      stem,
      competency_tag: competency,
      difficulty,
      time_limit_seconds: timeLimit,
    },
    key: { item_id: itemId, correct: { type: "numeric_entry", value, tolerance: 0 }, rationale },
  };
}

/** Logic puzzles for the CORE communication & problem-solving module. */
const LOGIC_PUZZLES: QuizItemBankEntry[] = [
  numeric(
    "puzzle_9_ball_known_heavier",
    "logical_puzzles",
    2,
    "Nine visually identical balls are equally heavy except one that is slightly HEAVIER. Using a balance scale, what is the minimum number of weighings that GUARANTEES finding the heavier ball?",
    2,
    "A balance has three outcomes (left, right, equal), so two weighings distinguish 3×3 = 9 cases. Split into three groups of 3, weigh two groups to find the heavy group, then weigh two of its balls.",
  ),
  numeric(
    "puzzle_12_ball_unknown",
    "logical_puzzles",
    4,
    "Twelve identical balls include one odd ball of UNKNOWN weight (it may be heavier OR lighter). What is the minimum number of balance weighings that guarantees identifying the odd ball?",
    3,
    "The unknown-direction variant is the classic 12-ball / 3-weighing puzzle: three weighings give 3^3 = 27 outcomes, enough to locate the odd ball among 12 and determine heavier/lighter.",
  ),
  single(
    "puzzle_sequence_next",
    "logical_puzzles",
    2,
    "What number continues the sequence 2, 6, 12, 20, 30, …?",
    [
      { id: "a", label: "36" },
      { id: "b", label: "42" },
      { id: "c", label: "40" },
      { id: "d", label: "44" },
    ],
    "b",
    "Differences are 4, 6, 8, 10, 12 → next term is 30 + 12 = 42 (n·(n+1)).",
  ),
];

const LOGICAL_REASONING: QuizItemBankEntry[] = [
  single(
    "logic_syllogism_1",
    "logical_reasoning",
    2,
    "All zorbs are blue. Some blue things are round. Which MUST be true?",
    [
      { id: "a", label: "All zorbs are round." },
      { id: "b", label: "Some zorbs are round." },
      { id: "c", label: "All zorbs are blue." },
      { id: "d", label: "No zorbs are round." },
    ],
    "c",
    "Only 'all zorbs are blue' is entailed; the round overlap is not guaranteed to include any zorb.",
  ),
  single(
    "logic_odd_one_out",
    "logical_reasoning",
    1,
    "Which does not belong: 3, 5, 7, 9, 11?",
    [
      { id: "a", label: "9" },
      { id: "b", label: "5" },
      { id: "c", label: "11" },
      { id: "d", label: "7" },
    ],
    "a",
    "All others are prime; 9 = 3×3 is composite.",
  ),
];

const NUMERICAL_REASONING: QuizItemBankEntry[] = [
  single(
    "num_percent_change",
    "numerical_reasoning",
    2,
    "Revenue rose from €80k to €100k. What is the percentage increase?",
    [
      { id: "a", label: "20%" },
      { id: "b", label: "25%" },
      { id: "c", label: "80%" },
      { id: "d", label: "120%" },
    ],
    "b",
    "(100−80)/80 = 0.25 = 25%.",
  ),
  numeric(
    "num_share_of_total",
    "numerical_reasoning",
    2,
    "A team closed 12 of 48 deals. What percentage is that? Enter the number only.",
    25,
    "12/48 = 0.25 = 25%.",
  ),
];

const ATTENTION_TO_DETAIL: QuizItemBankEntry[] = [
  single(
    "attn_mismatch",
    "attention_to_detail",
    1,
    "Which pair is NOT identical? (A) 4815162342 / 4815162342  (B) IBAN IT60 / IBAN IT60  (C) 90210-4471 / 90210-4417",
    [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ],
    "c",
    "The last two digits are transposed: 4471 vs 4417.",
    45,
  ),
];

/** Reading comprehension; CEFR tagged via competency + difficulty band. */
const LANGUAGE_READING: QuizItemBankEntry[] = [
  single(
    "read_b1_main_idea",
    "reading_comprehension",
    2,
    'Passage: "The team postponed the launch after testing revealed a data issue that, while small, could mislead users." What was the main reason for the delay?',
    [
      { id: "a", label: "A data issue that could mislead users." },
      { id: "b", label: "The team wanted more features." },
      { id: "c", label: "Users requested a delay." },
      { id: "d", label: "The launch was cancelled entirely." },
    ],
    "a",
    "The passage states the postponement followed a data issue that could mislead users (CEFR B1, main-idea).",
  ),
  single(
    "read_b2_inference",
    "reading_comprehension",
    3,
    'Passage: "Although she rarely missed a deadline, this one slipped through." What can we infer?',
    [
      { id: "a", label: "She usually meets deadlines." },
      { id: "b", label: "She never meets deadlines." },
      { id: "c", label: "She has no deadlines." },
      { id: "d", label: "She missed every deadline." },
    ],
    "a",
    "'Rarely missed' implies she usually meets deadlines (CEFR B2, inference).",
  ),
];

/** SJT: choices have a best-practice key; the justification is LLM-scored separately. */
const SITUATIONAL_JUDGMENT: QuizItemBankEntry[] = [
  single(
    "sjt_conflicting_priorities",
    "situational_judgment",
    3,
    "Two stakeholders give you conflicting urgent priorities and both are unavailable. What is the BEST first action?",
    [
      { id: "a", label: "Pick one at random and start." },
      { id: "b", label: "Make explicit assumptions, prioritize by stated impact, and document a short note for both." },
      { id: "c", label: "Do nothing until someone replies." },
      { id: "d", label: "Escalate immediately to their manager without attempting anything." },
    ],
    "b",
    "Surfacing assumptions, prioritizing by impact, and communicating transparently is the strongest judgment under ambiguity.",
    90,
  ),
];

/** AI-fluency responsible-use quiz part (open scenario is LLM-scored separately). */
const AI_FLUENCY_QUIZ: QuizItemBankEntry[] = [
  single(
    "ai_hallucination_check",
    "responsible_ai_use",
    3,
    "An AI assistant cites a specific statistic with a confident tone but no source. What is the responsible next step before using it?",
    [
      { id: "a", label: "Use it; the confident tone is sufficient." },
      { id: "b", label: "Verify the statistic against a primary source before relying on it." },
      { id: "c", label: "Discard all AI output as unreliable." },
      { id: "d", label: "Ask the AI to sound more confident." },
    ],
    "b",
    "Confident tone is not evidence; verifying against a primary source is the responsible step (hallucination awareness).",
  ),
];

/** Cloud / DevOps / systems (module 7); auto-triggered by infra CV skills. */
const CLOUD_DEVOPS: QuizItemBankEntry[] = [
  single(
    "cloud_rollback",
    "infra_troubleshooting",
    3,
    "A new deployment causes elevated 5xx errors in production. What is the safest FIRST action?",
    [
      { id: "a", label: "Roll back to the last known-good release, then investigate." },
      { id: "b", label: "Push a quick hotfix straight to production without testing." },
      { id: "c", label: "Wait to see if the errors resolve themselves." },
      { id: "d", label: "Delete the production logs to reduce noise." },
    ],
    "a",
    "Restoring service via rollback first, then diagnosing, minimizes user impact (standard incident response).",
  ),
  single(
    "cloud_iac",
    "cicd_iac",
    2,
    "What is the main benefit of infrastructure-as-code (IaC)?",
    [
      { id: "a", label: "Reproducible, reviewable, version-controlled infrastructure." },
      { id: "b", label: "It removes the need for any testing." },
      { id: "c", label: "It makes infrastructure impossible to change." },
      { id: "d", label: "It only works for a single cloud provider." },
    ],
    "a",
    "IaC makes infrastructure reproducible, reviewable, and versioned like application code.",
  ),
];

/** Cybersecurity (module 8); deterministic part — open case is LLM-scored. */
const CYBERSECURITY: QuizItemBankEntry[] = [
  single(
    "sec_sql_injection",
    "vulnerability_recognition",
    3,
    "User input is concatenated directly into a SQL string. Which vulnerability is this, and the right fix?",
    [
      { id: "a", label: "SQL injection — use parameterized queries / prepared statements." },
      { id: "b", label: "Cross-site scripting — escape HTML output." },
      { id: "c", label: "No vulnerability — concatenation is safe." },
      { id: "d", label: "Clickjacking — set frame headers." },
    ],
    "a",
    "Concatenating untrusted input into SQL is classic SQL injection; parameterized queries are the fix.",
  ),
  single(
    "sec_least_privilege",
    "threat_modeling",
    2,
    "Which principle limits the blast radius if one service's credentials leak?",
    [
      { id: "a", label: "Least privilege." },
      { id: "b", label: "Security through obscurity." },
      { id: "c", label: "Shared admin accounts." },
      { id: "d", label: "Disabling all logging." },
    ],
    "a",
    "Least privilege limits what leaked credentials can access, shrinking the blast radius.",
  ),
];

/** Verbal reasoning (module 12): inference from text. */
const VERBAL_REASONING: QuizItemBankEntry[] = [
  single(
    "verbal_inference",
    "verbal_reasoning",
    3,
    'Statement: "No proposal was approved unless it included a budget." A proposal was approved. What MUST be true?',
    [
      { id: "a", label: "It included a budget." },
      { id: "b", label: "It was submitted late." },
      { id: "c", label: "It was the only proposal." },
      { id: "d", label: "It was rejected." },
    ],
    "a",
    "Approval required a budget, so any approved proposal must have included one.",
  ),
  single(
    "verbal_assumption",
    "verbal_reasoning",
    3,
    'Argument: "We should ship now; every week of delay loses customers." Which assumption does this rely on?',
    [
      { id: "a", label: "Shipping now will not itself lose more customers than delay." },
      { id: "b", label: "Customers never change their minds." },
      { id: "c", label: "The product has no competitors." },
      { id: "d", label: "Delay is free." },
    ],
    "a",
    "The argument assumes shipping now does not cause greater loss (e.g. via quality issues) than the delay it avoids.",
  ),
];

const ITEM_BANKS: Readonly<Record<string, readonly QuizItemBankEntry[]>> = {
  comm_problem_solving: LOGIC_PUZZLES,
  logical_reasoning: LOGICAL_REASONING,
  numerical_reasoning: NUMERICAL_REASONING,
  attention_to_detail: ATTENTION_TO_DETAIL,
  language_reading: LANGUAGE_READING,
  situational_judgment: SITUATIONAL_JUDGMENT,
  ai_fluency: AI_FLUENCY_QUIZ,
  // Phase 3 (enterprise breadth):
  cloud_devops: CLOUD_DEVOPS,
  cybersecurity: CYBERSECURITY,
  verbal_reasoning: VERBAL_REASONING,
  // Role-specific knowledge (module 21): the reusable template, seeded with the
  // sales domain as the default variant; other domains build their own bank.
  role_knowledge: buildRoleKnowledgeBank(ROLE_KNOWLEDGE_DOMAINS[0]),
};

export function getItemBank(moduleId: string): readonly QuizItemBankEntry[] {
  return ITEM_BANKS[moduleId] ?? [];
}

export function hasItemBank(moduleId: string): boolean {
  return moduleId in ITEM_BANKS;
}
