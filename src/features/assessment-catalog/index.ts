export {
  activeModules,
  ASSESSMENT_CATALOG,
  coreModuleIds,
  defaultModulePlan,
  getModuleDefinition,
  isDescriptiveOnly,
  scorerTypeForModule,
  type DefaultModulePlanOptions,
} from "./catalog";
export type {
  AssessmentModuleDefinition,
  AssessmentPhase,
  AssessmentTrack,
} from "./types";
export { getItemBank, hasItemBank } from "./item-banks";
export {
  summarizeWorkStylePreferences,
  WORK_STYLE_PREFERENCE_DIMENSIONS,
  type WorkStyleForcedChoice,
  type WorkStylePreferenceProfile,
} from "./work-style-preference";
export {
  buildRoleKnowledgeBank,
  ROLE_KNOWLEDGE_DOMAINS,
  type RoleKnowledgeDomainSpec,
  type RoleKnowledgeItemSpec,
} from "./role-knowledge-template";
export {
  runIdentityCheck,
  type IdentityCheckResult,
  type IdentityCheckSignals,
  type IdentityCheckVerdict,
} from "./identity-check";
