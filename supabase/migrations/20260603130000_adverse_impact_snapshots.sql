-- ============================================================================
-- AssumerAI — Adverse impact snapshots (four-fifths rule monitoring)
-- ============================================================================
-- Periodic selection-rate-by-cohort snapshots for the EU AI Act Annex III §4
-- bias-output monitoring obligation. Uses ONLY neutral proxy dimensions (never
-- direct protected attributes, which are not collected). Aggregate, non-personal.
-- Service-role write only; readable by authenticated (admin) users.
-- ============================================================================

create table if not exists public.adverse_impact_snapshots (
  snapshot_id        uuid primary key default gen_random_uuid(),
  computed_at        timestamptz not null default now(),
  window_start       timestamptz not null,
  window_end         timestamptz not null,
  cohort_dimension   text not null,            -- e.g. "role_family"
  cohort_value       text not null,            -- e.g. "sales"
  reference_value    text not null,            -- cohort with the max selection rate
  n_applied          integer not null,
  n_selected         integer not null,
  selection_rate     numeric(5,4) not null,
  ratio_vs_reference numeric(5,4) not null,
  status             text not null check (status in ('pass','warn','fail')),
  version            text not null default 'adverse-impact-v0'
);

create index if not exists idx_ai_snapshots_dim
  on public.adverse_impact_snapshots (cohort_dimension, computed_at desc);

comment on table public.adverse_impact_snapshots is
  'Four-fifths-rule selection-rate snapshots by neutral cohort proxy. No protected attributes. Service-role write only.';

alter table public.adverse_impact_snapshots enable row level security;

-- Authenticated (admin) users read the snapshots for the compliance dashboard.
drop policy if exists adverse_impact_snapshots_authenticated_select on public.adverse_impact_snapshots;
create policy adverse_impact_snapshots_authenticated_select
  on public.adverse_impact_snapshots
  for select
  to authenticated
  using (true);

-- No insert/update/delete policy -> only the service role writes snapshots.
