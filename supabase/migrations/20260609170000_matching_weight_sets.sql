-- ============================================================================
-- AssumerAI — Versioned matching weight sets (Phase 10)
-- ============================================================================
-- DEFAULT_MATCH_WEIGHTS moves from code into a versioned, service-role-managed
-- table. The matcher loads the single active row per run and records
-- weights_version on every computed match; the in-code defaults remain the
-- fallback whenever this table is unreachable.
-- ============================================================================

create table if not exists public.matching_weight_sets (
  version text primary key,
  weights jsonb not null,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- At most one active weight set at a time.
create unique index if not exists matching_weight_sets_single_active_idx
  on public.matching_weight_sets(active)
  where active;

comment on table public.matching_weight_sets is
  'Versioned match-dimension weights. The active row drives scoring; matches record weights_version for auditability. Service-role only; in-code defaults are the fallback.';

alter table public.matching_weight_sets enable row level security;

-- No policies: only the service role (which bypasses RLS) reads or writes.
revoke all privileges on table public.matching_weight_sets from anon, authenticated;

-- Seed: the current in-code DEFAULT_MATCH_WEIGHTS, active.
insert into public.matching_weight_sets (version, weights, active, notes)
values (
  'match-weights-v0',
  '{
    "RoleSkillFit": 0.22,
    "ExperienceDomainFit": 0.18,
    "InterviewEvidenceFit": 0.15,
    "LanguageLocationAvailabilityFit": 0.12,
    "CandidatePreferenceFit": 0.1,
    "CompanyBarFit": 0.1,
    "GrowthPotentialFit": 0.07,
    "EducationCredentialFit": 0.04,
    "MatchConfidence": 0.02
  }'::jsonb,
  true,
  'Seeded from the in-code DEFAULT_MATCH_WEIGHTS at the Phase 10 split.'
)
on conflict (version) do nothing;
