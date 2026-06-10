/**
 * Legacy entry point of the matching engine, preserved as a façade.
 *
 * Phase 10 split the 1581-line module into:
 *   - dimensions/  one file per match dimension
 *   - gates.ts     required_modules + role-essential hard gates
 *   - weights.ts   dimensions, versioned weights, score aggregation
 *   - persistence.ts  matching_weight_sets loader (in-code fallback)
 *   - engine.ts    createCompanyMatch and explanation/visibility builders
 *   - index.ts     the full public API (server-side)
 *
 * Every existing `from "./matching-engine"` import keeps working unchanged.
 * This façade is importable from client components (candidate match inbox),
 * so it re-exports the PURE surface only; the server-only weight-set loader
 * lives in ./persistence and is exported through ./index.
 */

export {
  MATCH_DIMENSIONS,
  DEFAULT_MATCH_WEIGHTS,
  DEFAULT_MATCH_WEIGHTS_VERSION,
  DEFAULT_MATCH_WEIGHT_SET,
  calculateWeightedMatchScore,
  resolveWeights,
  type MatchDimensionName,
  type MatchWeightSet,
} from "./weights";
export {
  MATCHING_MODEL_VERSION,
  MATCHING_VERSION,
  type CandidateDecision,
  type CandidateDecisionInput,
  type CandidateProfile,
  type CompanyMatch,
  type CompanyProfile,
  type DecisionPolicy,
  type EmployerMatchView,
  type EmployerVisibility,
  type EmployerVisibilityState,
  type HardGateOutcome,
  type InterviewScorecard,
  type MatchExplanation,
  type MatchingScoreInput,
  type ModuleCompletionInput,
  type ResumeScorecard,
  type RoleProfile,
  type ScoreDimension,
} from "./engine-types";
export {
  buildEmployerVisibility,
  createCompanyMatch,
  getEmployerMatchView,
} from "./engine";
export { evaluateHardGates, evaluateRequiredModulesGate } from "./gates";
