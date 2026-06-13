/**
 * Deterministic quiz engine (Phase 0) — the highest-leverage new piece.
 *
 * A pure, auditable item-bank + grader that will power the deterministic and
 * interactive modules (cognitive, language reading/listening, SJT, role
 * knowledge, etc.). Three hard rules baked into the types:
 *
 *  1. The answer KEY is server-only. `QuizItemPublic` is the client-safe
 *     projection and carries no correct answer; `QuizItemKey` never leaves the
 *     server and is never serialized into a `QuizForm`.
 *  2. Timing is server-authoritative. The server stamps `issued_at` /
 *     `answered_at`; the client clock is never trusted.
 *  3. Every graded item stores the candidate's answer + correctness as audit
 *     evidence.
 */

export type QuizItemType =
  | "single_choice"
  | "multi_choice"
  | "numeric_entry"
  | "ordering"
  | "matching"
  | "hotspot";

export type QuizDifficulty = 1 | 2 | 3 | 4 | 5;

export interface QuizOption {
  readonly id: string;
  readonly label: string;
}

export interface QuizAsset {
  readonly kind: "image" | "audio" | "dataset" | "code";
  readonly mime_type: string;
  /** Signed URL from our storage (large assets). */
  readonly url?: string;
  /** Small inline dataset/code payload. */
  readonly inline?: string;
}

/** CLIENT-SAFE projection of an item. NEVER contains the answer key. */
export interface QuizItemPublic {
  readonly item_id: string;
  readonly type: QuizItemType;
  readonly stem: string;
  readonly options?: readonly QuizOption[];
  readonly competency_tag: string;
  readonly difficulty: QuizDifficulty;
  readonly time_limit_seconds: number;
  readonly asset?: QuizAsset;
  /** Points an item can award (default 1); partial credit scales within this. */
  readonly max_points?: number;
}

/** SERVER-ONLY answer key. Never serialized to the client. */
export type QuizAnswerKey =
  | { readonly type: "single_choice"; readonly option_id: string }
  | { readonly type: "multi_choice"; readonly option_ids: readonly string[] }
  | { readonly type: "numeric_entry"; readonly value: number; readonly tolerance?: number }
  | { readonly type: "ordering"; readonly order: readonly string[] }
  | { readonly type: "matching"; readonly pairs: readonly (readonly [string, string])[] }
  | {
      readonly type: "hotspot";
      readonly region: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
    };

export interface QuizItemKey {
  readonly item_id: string;
  readonly correct: QuizAnswerKey;
  /** Plain-language rationale — candidate report + audit string. */
  readonly rationale: string;
}

export interface QuizItemBankEntry {
  readonly public: QuizItemPublic;
  readonly key: QuizItemKey;
}

/** Full server-side bank (public projection + keys). */
export interface QuizItemBank {
  readonly bank_id: string;
  readonly module_id: string;
  readonly version: string;
  readonly items: readonly QuizItemBankEntry[];
}

export type QuizFormMode = "fixed" | "adaptive";

/** What the candidate runs — public items only, with a module deadline. */
export interface QuizForm {
  readonly form_id: string;
  readonly module_id: string;
  readonly version: string;
  readonly mode: QuizFormMode;
  readonly items: readonly QuizItemPublic[];
  readonly module_time_limit_seconds: number;
}

/** A candidate's answer to one item; timestamps are server-stamped. */
export interface QuizItemResponse {
  readonly item_id: string;
  /** Validated per item type at grade time. */
  readonly answer: unknown;
  /** Server-issued instant the item was presented. */
  readonly issued_at: string;
  /** Server-stamped instant the answer was received. */
  readonly answered_at: string;
}

export interface GradedQuizItem {
  readonly item_id: string;
  readonly competency_tag: string;
  readonly correct: boolean;
  /** 0..max_points; partial credit allowed (e.g. multi_choice, ordering). */
  readonly awarded: number;
  readonly max_points: number;
  readonly within_time: boolean;
  /** Verbatim candidate answer rendered for audit. */
  readonly candidate_answer_audit: string;
  readonly rationale: string;
}
