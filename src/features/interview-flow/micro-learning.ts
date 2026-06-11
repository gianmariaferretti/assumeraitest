/**
 * Micro-learning task (Phase 15).
 *
 * The learning-agility micro-task presents one genuinely small new idea from
 * a CURATED concept bank and asks the candidate to apply it on the spot. The
 * concept is fully explained inside the prompt itself, so prior familiarity
 * is never required — the BARS anchors score the learning PROCESS (engaging,
 * structuring, applying, self-correcting), never knowledge of the concept
 * ("no penalty for unfamiliarity").
 *
 * Concept selection is DETERMINISTIC (stable hash of the plan seed): the same
 * role family / seniority / language always yields the same concept, so the
 * server-authoritative plan reconstructs identically with no LLM involved.
 */

export const MICRO_LEARNING_CONCEPT_IDS = [
  "goodhart_measure",
  "premortem",
  "swiss_cheese",
] as const;

export type MicroLearningConceptId = (typeof MICRO_LEARNING_CONCEPT_IDS)[number];

export const MICRO_LEARNING_QUESTION_PREFIX = "canonical_agility_micro_";

export function microLearningQuestionId(conceptId: MicroLearningConceptId): string {
  return `${MICRO_LEARNING_QUESTION_PREFIX}${conceptId}`;
}

/** Deterministic FNV-1a hash — no randomness, stable across processes. */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Pick one concept from the curated bank, stably, from any seed string. */
export function selectMicroLearningConceptId(seed: string): MicroLearningConceptId {
  return MICRO_LEARNING_CONCEPT_IDS[fnv1a(seed) % MICRO_LEARNING_CONCEPT_IDS.length];
}
