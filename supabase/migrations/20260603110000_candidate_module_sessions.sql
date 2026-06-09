-- ============================================================================
-- AssumerAI — Candidate per-module interview sub-sessions (async Session Store)
-- ============================================================================
-- Each interview module runs and resumes independently. This table stores one
-- row per (candidate, interview session, module) so progress in one module never
-- blocks another and the candidate can pick up exactly where they left off.
-- candidate_interview_sessions.session_payload remains the aggregate snapshot.
-- Owner-only RLS like the other candidate tables; score writes stay service-role.
-- ============================================================================

create table if not exists public.candidate_module_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  module_id text not null,
  state text not null default 'not_started'
    check (state in ('not_started', 'in_progress', 'completed', 'skipped')),
  module_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, interview_session_id, module_id)
);

create index if not exists candidate_module_sessions_session_idx
  on public.candidate_module_sessions(user_id, interview_session_id, updated_at desc);

comment on table public.candidate_module_sessions is
  'Independent per-module interview sub-sessions. One row per (candidate, interview session, module). Owner-only; module_payload holds the serialized ModuleSession.';

alter table public.candidate_module_sessions enable row level security;

drop policy if exists candidate_module_sessions_owner_select on public.candidate_module_sessions;
create policy candidate_module_sessions_owner_select on public.candidate_module_sessions
  for select using (auth.uid() = user_id);

drop policy if exists candidate_module_sessions_owner_insert on public.candidate_module_sessions;
create policy candidate_module_sessions_owner_insert on public.candidate_module_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_module_sessions_owner_update on public.candidate_module_sessions;
create policy candidate_module_sessions_owner_update on public.candidate_module_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
