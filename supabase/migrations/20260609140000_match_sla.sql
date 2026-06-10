-- ============================================================================
-- AssumerAI — 14-day verdict SLA for employer review (Phase 6)
-- ============================================================================
-- One row per match that entered employer review (the candidate accepted and
-- consented to sharing). The SLA cron reads it to send day-7 / day-12 company
-- reminders and to escalate breaches; the company decision routes stamp
-- verdict_at. Service-role only: candidates and companies read SLA state
-- through their own views (review_due_at on the match row), never this table.
-- ============================================================================

create table if not exists public.match_sla (
  match_id text primary key
    references public.company_candidate_matches(match_id) on delete cascade,
  company_id text not null,
  role_id text not null,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  entered_review_at timestamptz not null,
  verdict_due_at timestamptz not null,
  -- Timestamps of reminders already sent (first = day 7, second = day 12).
  reminded_at timestamptz[] not null default '{}',
  escalated boolean not null default false,
  escalated_at timestamptz,
  verdict_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists match_sla_open_idx
  on public.match_sla(verdict_due_at)
  where verdict_at is null;

comment on table public.match_sla is
  'Employer-review verdict SLA per match: due date, reminder history, breach escalation. Populated when the candidate accepts a match; verdict_at is stamped by the company decision route. Service-role only.';

alter table public.match_sla enable row level security;

-- No policies: only the service role (which bypasses RLS) reads or writes.
revoke all privileges on table public.match_sla from anon, authenticated;
