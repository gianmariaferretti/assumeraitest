import {
  clampDriverStrength,
  JOB_DRIVERS,
  type RoleDriverContext,
  type RoleDriverContextEntry,
} from "./types";

/**
 * Role-wizard form parsing for the company work-context reality (Phase 14).
 *
 * For each driver the wizard submits `driver_context.<driver>.level` (0..100,
 * how much of this the day-to-day actually offers) and
 * `driver_context.<driver>.note` (a concrete description in the company's own
 * words, e.g. "two releases a week, little long-range planning"). A driver
 * counts only when BOTH are provided: the note is what the candidate reads as
 * the realistic job preview.
 */
export function readDriverContextFromFormData(formData: FormData): RoleDriverContext | undefined {
  const entries: RoleDriverContextEntry[] = [];

  for (const driver of JOB_DRIVERS) {
    const rawLevel = formData.get(`driver_context.${driver}.level`);
    const rawNote = formData.get(`driver_context.${driver}.note`);
    if (typeof rawLevel !== "string" || typeof rawNote !== "string") {
      continue;
    }
    const level = Number.parseInt(rawLevel, 10);
    const note = rawNote.trim();
    if (!Number.isFinite(level) || note.length === 0) {
      continue;
    }

    entries.push({
      driver,
      level: clampDriverStrength(level),
      note: note.slice(0, 300),
    });
  }

  if (entries.length === 0) {
    return undefined;
  }

  return { version: "driver-context-v1", entries };
}
