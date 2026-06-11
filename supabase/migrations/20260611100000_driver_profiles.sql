-- ============================================================================
-- AssumerAI — Job-driver profiles (Phase 14)
-- ============================================================================
-- The interview's trade-off + revealed-preference items produce a DESCRIPTIVE
-- driver profile (no correct set of drivers). Driver signals are FLAG-ONLY by
-- design: at match time they yield transparency flags and a realistic job
-- preview, never a score — the matching weights have no driver dimension.
-- Anti-proxy guardrail: the lifestyle driver is hard-coded flag-only in code
-- (FLAG_ONLY_NEVER_COMPARED) — the candidate side of it is never compared
-- against a role and never surfaced to companies.
-- ============================================================================

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  profile jsonb not null default '{}'::jsonb,
  version text not null default 'driver-profile-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, interview_session_id)
);

comment on table public.driver_profiles is
  'Descriptive job-driver (career-anchor) signals from the interview trade-off and revealed-preference items. Service-role write; candidates read their own profile. Flag-only: never a score input; the lifestyle driver is hard-coded never-compared (anti-proxy).';

alter table public.driver_profiles enable row level security;

drop policy if exists driver_profiles_owner_select on public.driver_profiles;
create policy driver_profiles_owner_select on public.driver_profiles
  for select using ((select auth.uid()) = user_id);

revoke all privileges on table public.driver_profiles from anon, authenticated;
grant select on table public.driver_profiles to authenticated;
