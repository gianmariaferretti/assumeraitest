/**
 * Identity / honesty check (module 22) — process integrity, NOT a skill.
 *
 * A lightweight confirmation before high-value modules. It is descriptive and
 * flag-only by construction:
 *  - it NEVER returns a quality score and never enters the match score;
 *  - it NEVER auto-rejects — a failed/ambiguous signal flags for HUMAN REVIEW;
 *  - it stores only coarse boolean signals, never sensitive ID data (no
 *    document numbers, no biometrics) — consistent with safety.ts.
 *
 * The verification signals (consent given, a liveness/presence confirmation,
 * the candidate re-affirming their declared identity) are captured by a
 * lightweight UI and passed in as booleans; this module only decides whether
 * everything lines up or a reviewer should take a look.
 */

export type IdentityCheckVerdict = "confirmed" | "needs_human_review";

export interface IdentityCheckSignals {
  /** Candidate explicitly consented to the lightweight check. */
  readonly consent_given: boolean;
  /** A presence/liveness confirmation completed (no biometric stored). */
  readonly presence_confirmed: boolean;
  /** Candidate re-affirmed the identity they declared at sign-up. */
  readonly declared_identity_reaffirmed: boolean;
}

export interface IdentityCheckResult {
  readonly module_id: "identity_check";
  readonly descriptive_only: true;
  readonly verdict: IdentityCheckVerdict;
  /** Always true when not fully confirmed; NEVER an automated rejection. */
  readonly needs_human_review: boolean;
  /** Coarse, non-sensitive reasons for the reviewer. */
  readonly reasons: readonly string[];
  readonly auto_reject: false;
}

export function runIdentityCheck(signals: IdentityCheckSignals): IdentityCheckResult {
  const reasons: string[] = [];
  if (!signals.consent_given) {
    reasons.push("Consent for the identity check was not recorded.");
  }
  if (!signals.presence_confirmed) {
    reasons.push("Presence confirmation was not completed.");
  }
  if (!signals.declared_identity_reaffirmed) {
    reasons.push("The candidate did not re-affirm their declared identity.");
  }

  const confirmed = reasons.length === 0;
  return {
    module_id: "identity_check",
    descriptive_only: true,
    verdict: confirmed ? "confirmed" : "needs_human_review",
    // A flag always routes to a human; it is never an automated rejection.
    needs_human_review: !confirmed,
    reasons: confirmed ? ["All lightweight identity signals lined up."] : reasons,
    auto_reject: false,
  };
}
