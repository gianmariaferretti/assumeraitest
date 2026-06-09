-- ============================================================================
-- AssumerAI — Server-authoritative interview sessions (Phase 1 security)
-- ============================================================================
-- candidate_module_sessions becomes the single source of truth for interview
-- state. Candidates can read their own rows but can no longer write them: all
-- writes go through server routes using the service role, so session state,
-- timing, and planned questions cannot be tampered with from the client.
--
-- candidate_interview_turns records every turn the server issues. A turn id is
-- generated server-side when a question is issued and may be evaluated exactly
-- once: the unique constraint is the anti-replay guarantee.
-- ============================================================================

-- --- 1. Active-turn tracking on module sub-sessions -------------------------

alter table public.candidate_module_sessions
  add column if not exists active_turn_id text,
  add column if not exists turn_started_at timestamptz,
  add column if not exists turn_count integer not null default 0;

comment on column public.candidate_module_sessions.active_turn_id is
  'Server-issued id of the currently pending turn; null when no question is awaiting an answer.';
comment on column public.candidate_module_sessions.turn_started_at is
  'Server timestamp when the pending question was issued; elapsed time is derived from it server-side.';
comment on column public.candidate_module_sessions.turn_count is
  'Evaluated turns so far in this module; enforced against the module turn cap server-side.';

-- --- 2. Issued-turn ledger with anti-replay unique constraint ----------------

create table if not exists public.candidate_interview_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  module_id text not null,
  turn_id text not null,
  question_id text not null,
  status text not null default 'issued'
    check (status in ('issued', 'evaluated', 'expired')),
  issued_at timestamptz not null default now(),
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  -- Anti-replay: a turn id exists once per (candidate, interview session) and
  -- transitions issued -> evaluated exactly once.
  unique (user_id, interview_session_id, turn_id)
);

create index if not exists candidate_interview_turns_module_idx
  on public.candidate_interview_turns(user_id, interview_session_id, module_id, issued_at desc);

comment on table public.candidate_interview_turns is
  'Server-issued interview turns. turn_id is generated server-side when a question is issued; an already-evaluated turn is rejected with 409. Service-role write only.';

alter table public.candidate_interview_turns enable row level security;

-- Owner read-only; every write happens through the service role (bypasses RLS).
drop policy if exists candidate_interview_turns_owner_select on public.candidate_interview_turns;
create policy candidate_interview_turns_owner_select on public.candidate_interview_turns
  for select using ((select auth.uid()) = user_id);

revoke all privileges on table public.candidate_interview_turns from anon, authenticated;
grant select on table public.candidate_interview_turns to authenticated;

-- --- 3. Tighten candidate_module_sessions to service-role writes -------------
-- Dropping the owner write policies (and grants) only removes candidate write
-- access; owner SELECT stays so the candidate can resume their own interview.

drop policy if exists candidate_module_sessions_owner_insert on public.candidate_module_sessions;
drop policy if exists candidate_module_sessions_owner_update on public.candidate_module_sessions;

revoke insert, update, delete on table public.candidate_module_sessions from anon, authenticated;
grant select on table public.candidate_module_sessions to authenticated;

comment on table public.candidate_module_sessions is
  'Independent per-module interview sub-sessions. One row per (candidate, interview session, module). Single source of truth for interview state: owner read-only, service-role write only.';
