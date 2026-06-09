import type { ModuleRequirement, RoleCalibration } from "./role-profile";

/**
 * The system core module: every interview opens with motivation, so it is always
 * required even when the company never listed it. Mirrors the candidate flow's
 * `motivation` interview module in `interview-flow/question-bank.ts`.
 */
export const CORE_MODULE_ID = "motivation";

type CalibrationLike = Pick<RoleCalibration, "module_plan" | "interview_modules"> | null | undefined;

/**
 * Resolve the structured three-list module plan for a role.
 *
 * Backwards compatible: if the calibration already carries an explicit
 * `module_plan` it is returned unchanged. Otherwise a plan is derived from the
 * legacy `interview_modules` string list — every listed module becomes
 * `required`, and the `motivation` core module is always added as `required`.
 */
export function toModulePlan(calibration: CalibrationLike): ModuleRequirement[] {
  if (calibration?.module_plan && calibration.module_plan.length > 0) {
    return calibration.module_plan;
  }

  const legacyModules = calibration?.interview_modules ?? [];
  const orderedIds = uniqueStrings([CORE_MODULE_ID, ...legacyModules]);

  return orderedIds.map((moduleId) => ({
    module_id: moduleId,
    level: "required" as const,
    rationale:
      moduleId === CORE_MODULE_ID
        ? "System core module: every interview includes motivation."
        : "Derived from legacy calibration.interview_modules.",
  }));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
