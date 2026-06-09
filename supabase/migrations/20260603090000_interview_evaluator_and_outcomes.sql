-- ============================================================================
-- AssumerAI — Psychometric evaluation audit + predictive-validity foundations
-- ============================================================================
-- Adds two tables:
--   1. interview_evaluator_runs : audit log of every BARS evaluator call, the
--      substrate for inter-rater reliability monitoring (Cohen's K) and EU AI
--      Act auditability ("every score is traceable to an observed behavior").
--   2. hire_outcomes : manager performance ratings at 3/6/12 months, the
--      substrate for predictive validity (Pearson r between interview score and
--      on-the-job performance). Empty until the first real hires; defined now so
--      the closed-loop is wired from day one.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. interview_evaluator_runs
-- ---------------------------------------------------------------------------
create table if not exists public.interview_evaluator_runs (
  run_id              uuid primary key default gen_random_uuid(),
  interview_session_id uuid not null,
  candidate_id        uuid not null,
  question_id         text not null,
  competency_id       text not null,
  module_id           text,

  -- Evaluation output
  bars_score          smallint not null check (bars_score between 1 and 10),
  bars_level          text not null check (
    bars_level in ('below_standard','meets_standard','exceeds_standard','exceptional')
  ),
  star_situation      boolean not null default false,
  star_task           boolean not null default false,
  star_action         boolean not null default false,
  star_result         boolean not null default false,
  confidence          numeric(4,3) not null check (confidence between 0 and 1),
  human_review_required boolean not null default false,

  -- Provenance / auditability
  source              text not null check (source in ('anthropic','deterministic_fallback')),
  provider_model      text,
  fallback_reason     text,
  scoring_version     text not null default 'bars-evaluator-v0',

  -- For intra-LLM consistency: runs sharing a replicate_group_id are repeats of
  -- the SAME answer (used to compute variance / Cohen's K at runtime).
  replicate_group_id  uuid,
  red_flag_count      smallint not null default 0,
  high_severity_red_flag_count smallint not null default 0,

  created_at          timestamptz not null default now()
);

create index if not exists idx_evaluator_runs_session
  on public.interview_evaluator_runs (interview_session_id);
create index if not exists idx_evaluator_runs_candidate
  on public.interview_evaluator_runs (candidate_id);
create index if not exists idx_evaluator_runs_competency
  on public.interview_evaluator_runs (competency_id);
create index if not exists idx_evaluator_runs_replicate
  on public.interview_evaluator_runs (replicate_group_id)
  where replicate_group_id is not null;
create index if not exists idx_evaluator_runs_review
  on public.interview_evaluator_runs (human_review_required)
  where human_review_required = true;

comment on table public.interview_evaluator_runs is
  'Audit log of every BARS evaluator call. Substrate for inter-rater reliability (Cohen K) and EU AI Act score traceability.';

-- RLS: evaluator runs are system-internal scoring evidence, candidate-private.
alter table public.interview_evaluator_runs enable row level security;

-- A candidate may read their own evaluation runs (right to explanation),
-- but never write them — only the service role inserts.
drop policy if exists evaluator_runs_select_own on public.interview_evaluator_runs;
create policy evaluator_runs_select_own
  on public.interview_evaluator_runs
  for select
  to authenticated
  using (candidate_id = (select auth.uid()));

-- No insert/update/delete policy for authenticated users -> only service_role
-- (which bypasses RLS) can write. This keeps scoring tamper-proof.

-- ---------------------------------------------------------------------------
-- 2. hire_outcomes  (predictive validity — populated post-hire)
-- ---------------------------------------------------------------------------
create table if not exists public.hire_outcomes (
  outcome_id          uuid primary key default gen_random_uuid(),
  candidate_id        uuid not null,
  company_id          uuid not null,
  role_id             uuid not null,
  match_id            uuid,
  interview_session_id uuid,

  -- The interview score we are validating against reality.
  interview_final_score smallint check (interview_final_score between 1 and 10),

  -- Manager-rated on-the-job performance at fixed checkpoints (1-10).
  manager_rating_3m   smallint check (manager_rating_3m between 1 and 10),
  manager_rating_6m   smallint check (manager_rating_6m between 1 and 10),
  manager_rating_12m  smallint check (manager_rating_12m between 1 and 10),

  -- Retention signal for survival analysis.
  still_employed_3m   boolean,
  still_employed_6m   boolean,
  still_employed_12m  boolean,
  separation_reason   text,

  hired_at            timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_hire_outcomes_role
  on public.hire_outcomes (role_id);
create index if not exists idx_hire_outcomes_company
  on public.hire_outcomes (company_id);

comment on table public.hire_outcomes is
  'Manager performance ratings at 3/6/12 months. Substrate for predictive validity (Pearson r vs interview score). Populated only after real hires.';

alter table public.hire_outcomes enable row level security;

-- Candidates may read their own outcome record (transparency); writes are
-- service-role only (entered via reviewed company workflow).
drop policy if exists hire_outcomes_select_own on public.hire_outcomes;
create policy hire_outcomes_select_own
  on public.hire_outcomes
  for select
  to authenticated
  using (candidate_id = (select auth.uid()));

-- updated_at trigger
create or replace function public.touch_hire_outcomes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_hire_outcomes_updated_at on public.hire_outcomes;
create trigger trg_hire_outcomes_updated_at
  before update on public.hire_outcomes
  for each row
  execute function public.touch_hire_outcomes_updated_at();
