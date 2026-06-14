import type { QuizItemBankEntry } from "../scoring/quiz-engine/types";

/**
 * Role-specific knowledge framework (module 21) — ONE architecture, many
 * variants. The "job knowledge" category (sales, finance, marketing,
 * bookkeeping, …) is the same deterministic quiz engine filled per domain, so a
 * new domain is content, not code. A domain spec is a list of single-choice
 * knowledge items; the builder stamps them into the deterministic item-bank
 * shape with a shared competency tag and the domain's id, employer-neutral and
 * assessing only job knowledge.
 */

export interface RoleKnowledgeItemSpec {
  readonly id: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly stem: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly correct_option_id: string;
  readonly rationale: string;
  readonly time_limit_seconds?: number;
}

export interface RoleKnowledgeDomainSpec {
  readonly domain_id: string;
  readonly title: string;
  /** Competency tag the items roll up into (default `role_knowledge`). */
  readonly competency_tag?: string;
  readonly items: readonly RoleKnowledgeItemSpec[];
}

export function buildRoleKnowledgeBank(domain: RoleKnowledgeDomainSpec): QuizItemBankEntry[] {
  const competencyTag = domain.competency_tag ?? "role_knowledge";
  return domain.items.map((item) => ({
    public: {
      item_id: `${domain.domain_id}_${item.id}`,
      type: "single_choice" as const,
      stem: item.stem,
      options: [...item.options],
      competency_tag: competencyTag,
      difficulty: item.difficulty,
      time_limit_seconds: item.time_limit_seconds ?? 60,
    },
    key: {
      item_id: `${domain.domain_id}_${item.id}`,
      correct: { type: "single_choice" as const, option_id: item.correct_option_id },
      rationale: item.rationale,
    },
  }));
}

/** Seed domains proving the template; calibrated banks are a content workstream. */
export const ROLE_KNOWLEDGE_DOMAINS: readonly RoleKnowledgeDomainSpec[] = [
  {
    domain_id: "sales",
    title: "Sales",
    items: [
      {
        id: "qualification",
        difficulty: 2,
        stem: "A prospect shows interest but has no budget authority. What is the most useful next step?",
        options: [
          { id: "a", label: "Push for a close anyway." },
          { id: "b", label: "Identify and reach the budget holder while keeping the champion engaged." },
          { id: "c", label: "Drop the lead." },
          { id: "d", label: "Offer the deepest discount immediately." },
        ],
        correct_option_id: "b",
        rationale: "Multi-threading to the economic buyer while keeping the champion is standard qualification practice.",
      },
    ],
  },
  {
    domain_id: "finance",
    title: "Finance",
    items: [
      {
        id: "working_capital",
        difficulty: 3,
        stem: "Which change INCREASES working capital, all else equal?",
        options: [
          { id: "a", label: "Collecting receivables faster into cash." },
          { id: "b", label: "Taking on more short-term debt due within the year." },
          { id: "c", label: "Increasing accounts payable." },
          { id: "d", label: "Prepaying next year's rent in cash now." },
        ],
        correct_option_id: "a",
        rationale: "Faster receivable collection raises current assets (cash) relative to current liabilities, increasing working capital.",
      },
    ],
  },
];
