-- ============================================================================
-- AssumerAI — Work-style profiles + values-alignment weights (Phase 13)
-- ============================================================================
-- The interview produces a DESCRIPTIVE work-style profile (no right answer at
-- interview time); each company declares its own expectations in the role
-- wizard and the matching engine compares profile vs key AFTER the interview.
-- ============================================================================

-- --- 1. Candidate work-style profiles ----------------------------------------

create table if not exists public.work_style_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  profile jsonb not null default '{}'::jsonb,
  version text not null default 'work-style-profile-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, interview_session_id)
);

comment on table public.work_style_profiles is
  'Descriptive work-style classifications from the interview SJT dilemmas (bipolar dimensions, neither pole better). Service-role write; candidates read their own profile. Normative judgment happens per-company in matching.';

alter table public.work_style_profiles enable row level security;

drop policy if exists work_style_profiles_owner_select on public.work_style_profiles;
create policy work_style_profiles_owner_select on public.work_style_profiles
  for select using ((select auth.uid()) = user_id);

revoke all privileges on table public.work_style_profiles from anon, authenticated;
grant select on table public.work_style_profiles to authenticated;

-- --- 2. Versioned weights including the values-alignment dimension -----------
-- "values alignment on declared work-style dimensions" — low default weight.

insert into public.matching_weight_sets (version, weights, active, notes)
values (
  'match-weights-v1',
  '{
    "RoleSkillFit": 0.22,
    "ExperienceDomainFit": 0.18,
    "InterviewEvidenceFit": 0.15,
    "LanguageLocationAvailabilityFit": 0.12,
    "CandidatePreferenceFit": 0.1,
    "CompanyBarFit": 0.1,
    "GrowthPotentialFit": 0.07,
    "EducationCredentialFit": 0.04,
    "MatchConfidence": 0.02,
    "ValuesAlignmentFit": 0.05
  }'::jsonb,
  false,
  'Phase 13: adds ValuesAlignmentFit (values alignment on declared work-style dimensions) at a low default weight. Weights are normalized at scoring time.'
)
on conflict (version) do nothing;

-- Activate v1 as the single active set.
update public.matching_weight_sets set active = false where version = 'match-weights-v0';
update public.matching_weight_sets set active = true where version = 'match-weights-v1';
