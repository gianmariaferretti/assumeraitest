-- ============================================================================
-- AssumerAI — Role module plan (three-list job profile)
-- ============================================================================
-- Adds a structured module plan to company_roles so a role can declare which
-- interview modules are required, optional, auto-triggered (by CV keywords), or
-- blocked. Additive only: the legacy calibration.interview_modules string list
-- keeps working, and toModulePlan() derives a plan from it when this column is
-- empty. Default '[]' so existing rows remain valid.
-- ============================================================================

alter table public.company_roles
  add column if not exists module_plan jsonb not null default '[]'::jsonb;

comment on column public.company_roles.module_plan is
  'Structured interview module plan: array of { module_id, level (required|optional|auto_trigger|blocked), auto_trigger_keywords?, rationale? }. Empty array means derive from legacy calibration.interview_modules.';
