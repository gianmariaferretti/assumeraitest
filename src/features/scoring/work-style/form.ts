import {
  clampWorkStylePosition,
  WORK_STYLE_DIMENSIONS,
  type WorkStyleKey,
  type WorkStyleKeyEntry,
} from "./types";

/**
 * Role-wizard form parsing for the company work-style key (Phase 13).
 *
 * For each dimension the wizard submits `work_style.<dimension>.position`
 * (-100..100) and `work_style.<dimension>.statement` (a concrete behavioral
 * statement the company writes, e.g. "here, you'd ship and document" vs
 * "here, you always escalate"). A dimension counts only when BOTH are
 * provided: the statement anchors the expectation in the company's own words.
 */
export function readWorkStyleKeyFromFormData(formData: FormData): WorkStyleKey | undefined {
  const entries: WorkStyleKeyEntry[] = [];

  for (const dimension of WORK_STYLE_DIMENSIONS) {
    const rawPosition = formData.get(`work_style.${dimension}.position`);
    const rawStatement = formData.get(`work_style.${dimension}.statement`);
    if (typeof rawPosition !== "string" || typeof rawStatement !== "string") {
      continue;
    }
    const position = Number.parseInt(rawPosition, 10);
    const statement = rawStatement.trim();
    if (!Number.isFinite(position) || statement.length === 0) {
      continue;
    }

    entries.push({
      dimension,
      position: clampWorkStylePosition(position),
      statement: statement.slice(0, 300),
    });
  }

  if (entries.length === 0) {
    return undefined;
  }

  return { version: "work-style-key-v1", entries };
}
