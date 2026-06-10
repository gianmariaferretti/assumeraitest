import type { HardGateOutcome, MatchingScoreInput, RoleHardGate } from "./engine-types";
import {
  containsNormalized,
  evaluateRequiredLanguages,
  hasAffirmativeWorkAuthorizationEvidence,
  hasLocationOverlap,
  hasOverlap,
} from "./engine-utils";

/**
 * Hard gates: eligibility checks, never quality scores.
 *
 * The required_modules gate blocks a match BEFORE scoring (the Phase 5 match
 * guard); the role-essential gates (language, certification,
 * location/availability, work authorization) flag eligibility for human
 * review. Every explanation states explicitly that a failed gate is not a
 * candidate quality judgment.
 */

export function evaluateRequiredModulesGate(input: MatchingScoreInput): HardGateOutcome | null {
  const statuses = input.requiredModuleStatuses;
  if (!statuses || statuses.length === 0) {
    return null;
  }

  const incomplete = statuses.filter((module) => module.required_for_match && !module.completed);
  if (incomplete.length === 0) {
    return {
      gate_type: "required_modules",
      passed: true,
      role_essential: true,
      explanation:
        "All required interview modules are complete; the match can proceed to scoring.",
    };
  }

  const names = incomplete.map((module) => module.module_id).join(", ");
  return {
    gate_type: "required_modules",
    passed: false,
    role_essential: true,
    explanation: `Required interview modules are not yet complete: ${names}. This is a process gate, not a candidate quality score; the match opens once they are finished.`,
  };
}

export function evaluateHardGates(input: MatchingScoreInput): HardGateOutcome[] {
  return input.role.requirements.hard_gates
    .filter((gate) => gate.role_essential)
    .map((gate) => {
      if (gate.gate_type === "language") {
        return evaluateLanguageHardGate(input, gate);
      }

      if (gate.gate_type === "certification") {
        return evaluateCertificationHardGate(input, gate);
      }

      if (gate.gate_type === "location_timezone" || gate.gate_type === "availability") {
        return evaluateLocationAvailabilityHardGate(input, gate);
      }

      if (gate.gate_type === "work_authorization") {
        return evaluateWorkAuthorizationHardGate(input, gate);
      }

      return {
        gate_type: gate.gate_type,
        passed: false,
        role_essential: true,
        explanation: `${gate.description} could not be evaluated from available candidate evidence. This is an eligibility review item, not a candidate quality score.`,
      };
    });
}

function evaluateLanguageHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const languageEvaluation = evaluateRequiredLanguages(input.candidate, input.role, {
    requireAssessedForPass: true,
  });
  const passed = languageEvaluation.passed;

  return {
    gate_type: gate.gate_type,
    passed,
    role_essential: true,
    explanation: passed
      ? `${gate.description} is currently supported by candidate language evidence.`
      : `${gate.description} is not currently eligible: ${languageEvaluation.failed.join(
          "; ",
        )}. This is not a candidate quality score.`,
  };
}

function evaluateCertificationHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const requiredCertifications = input.role.requirements.certifications ?? [];
  const candidateCertifications = input.candidate.certifications ?? [];
  const missing = requiredCertifications.filter(
    (certification) => !containsNormalized(candidateCertifications, certification),
  );

  return {
    gate_type: gate.gate_type,
    passed: missing.length === 0,
    role_essential: true,
    explanation:
      missing.length === 0
        ? `${gate.description} is supported by candidate certification evidence.`
        : `${gate.description} is not currently eligible: missing ${missing.join(
            ", ",
          )}. This is not a candidate quality score.`,
  };
}

function evaluateLocationAvailabilityHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const locationMatch = hasLocationOverlap(input.candidate, input.role);
  const workModeMatch = hasOverlap(
    input.candidate.preferences.work_modes,
    input.role.work_modes ?? [],
  );
  const passed =
    gate.gate_type === "location_timezone" ? locationMatch : workModeMatch;
  const evidenceLabel =
    gate.gate_type === "location_timezone"
      ? "candidate location evidence"
      : "candidate availability or work-mode evidence";

  return {
    gate_type: gate.gate_type,
    passed,
    role_essential: true,
    explanation: passed
      ? `${gate.description} is supported by ${evidenceLabel}.`
      : `${gate.description} is not currently eligible from available ${evidenceLabel}. This is not a candidate quality score.`,
  };
}

function evaluateWorkAuthorizationHardGate(
  input: MatchingScoreInput,
  gate: RoleHardGate,
): HardGateOutcome {
  const authorization = input.candidate.contact?.work_authorization;
  const hasAffirmativeAuthorization = hasAffirmativeWorkAuthorizationEvidence(authorization);

  return {
    gate_type: gate.gate_type,
    passed: hasAffirmativeAuthorization,
    role_essential: true,
    explanation: hasAffirmativeAuthorization
      ? `${gate.description} has candidate-provided affirmative work authorization evidence.`
      : `${gate.description} is not currently eligible because affirmative work authorization evidence is missing. This is not a candidate quality score.`,
  };
}
