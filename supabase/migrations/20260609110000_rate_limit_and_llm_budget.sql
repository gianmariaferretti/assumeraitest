-- ============================================================================
-- AssumerAI — Rate limiting + LLM budget guard (Phase 2)
-- ============================================================================
-- rate_limit_events backs a Postgres sliding-window rate limiter (no new infra
-- dependency). llm_usage_daily is the per-day, per-model token counter behind
-- the LLM_DAILY_BUDGET_EUR cutoff. Both tables are service-role only: they are
-- written by server routes and never exposed to candidate or company clients.
-- ============================================================================

-- --- 1. Sliding-window rate limit events -------------------------------------

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  subject text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists rate_limit_events_window_idx
  on public.rate_limit_events(bucket, subject, occurred_at desc);

comment on table public.rate_limit_events is
  'One row per rate-limited request. The limiter counts rows per (bucket, subject) inside a sliding window; old rows are pruned lazily. Service-role only.';

alter table public.rate_limit_events enable row level security;

-- No policies: only the service role (which bypasses RLS) can read or write.
revoke all privileges on table public.rate_limit_events from anon, authenticated;

-- --- 2. Daily LLM usage counters ---------------------------------------------

create table if not exists public.llm_usage_daily (
  usage_date date not null,
  model text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  calls bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (usage_date, model)
);

comment on table public.llm_usage_daily is
  'Per-day, per-model LLM token and call counters. Routes consult the estimated daily cost against LLM_DAILY_BUDGET_EUR and return 503 before calling the API once the budget is exhausted. Service-role only.';

alter table public.llm_usage_daily enable row level security;

revoke all privileges on table public.llm_usage_daily from anon, authenticated;

-- Atomic upsert-increment used by the recordUsage hook.
create or replace function public.record_llm_usage(
  p_usage_date date,
  p_model text,
  p_input_tokens bigint,
  p_output_tokens bigint
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.llm_usage_daily (usage_date, model, input_tokens, output_tokens, calls)
  values (p_usage_date, p_model, greatest(p_input_tokens, 0), greatest(p_output_tokens, 0), 1)
  on conflict (usage_date, model) do update set
    input_tokens = public.llm_usage_daily.input_tokens + greatest(excluded.input_tokens, 0),
    output_tokens = public.llm_usage_daily.output_tokens + greatest(excluded.output_tokens, 0),
    calls = public.llm_usage_daily.calls + 1,
    updated_at = now();
$$;

revoke all on function public.record_llm_usage(date, text, bigint, bigint) from anon, authenticated, public;
