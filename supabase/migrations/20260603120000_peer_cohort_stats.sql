-- ============================================================================
-- AssumerAI — Peer cohort statistics (Z-score normalization)
-- ============================================================================
-- Aggregate, non-personal norming data: mean/stdev of scores per
-- (role_family, seniority) cohort, so a raw BARS score can be expressed as a
-- Z-score against peers. mean/stdev are NULL until the cohort is large enough.
-- Reference data: readable by authenticated users; written only by the service
-- role (recompute job), never by candidates.
-- ============================================================================

create table if not exists public.peer_cohort_stats (
  cohort_id              text primary key,            -- "${role_family}|${seniority}"
  role_family            text not null,
  seniority              text not null,
  sample_size            integer not null,
  mean_score             numeric(5,2),                -- null when sample_size < threshold
  stdev_score            numeric(5,2),
  cohort_status          text not null check (cohort_status in
                           ('insufficient','emerging','established')),
  last_computed_at       timestamptz not null default now(),
  version                text not null default 'peer-cohort-v0'
);

create index if not exists idx_peer_cohort_role
  on public.peer_cohort_stats (role_family, seniority);

comment on table public.peer_cohort_stats is
  'Aggregate per-cohort norming stats for Z-score normalization. No personal data. Service-role write only.';

alter table public.peer_cohort_stats enable row level security;

-- Authenticated users may read norming reference data (non-personal aggregate).
drop policy if exists peer_cohort_stats_authenticated_select on public.peer_cohort_stats;
create policy peer_cohort_stats_authenticated_select
  on public.peer_cohort_stats
  for select
  to authenticated
  using (true);

-- No insert/update/delete policy -> only the service role can write the norms.
