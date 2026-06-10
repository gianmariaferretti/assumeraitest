/**
 * Full public API of the matching engine (Phase 10 split): the pure surface
 * (re-exported by the legacy matching-engine.ts façade, safe for client
 * components) plus the server-only weight-set persistence loader.
 */

export * from "./matching-engine";
export {
  loadActiveMatchWeights,
  parseMatchWeightSetRow,
  type MatchWeightSetClient,
} from "./persistence";
