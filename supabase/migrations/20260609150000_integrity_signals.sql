-- ============================================================================
-- AssumerAI — Interview integrity signals (Phase 7, honest signals only)
-- ============================================================================
-- One row per evaluated interview turn with coarse behavioral counters
-- reported by the client (tab switches, window blur, paste events, audio
-- continuity gaps) plus the server-derived response latency. No keystroke
-- logging, no camera analysis, no biometrics.
--
-- Writes are service-role only (the turn route validates and clamps the
-- counters first). A candidate may read their own rows and never anyone
-- else's. Integrity data is context for the human reviewer and is NEVER an
-- input to any score computation.
-- ============================================================================

create table if not exists public.integrity_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  module_id text not null,
  turn_id text not null,
  question_id text,
  tab_hidden_count integer not null default 0 check (tab_hidden_count >= 0),
  window_blur_count integer not null default 0 check (window_blur_count >= 0),
  paste_count integer not null default 0 check (paste_count >= 0),
  audio_gap_count integer not null default 0 check (audio_gap_count >= 0),
  max_audio_gap_seconds numeric not null default 0 check (max_audio_gap_seconds >= 0),
  response_latency_seconds numeric not null default 0 check (response_latency_seconds >= 0),
  created_at timestamptz not null default now(),
  -- One signal row per evaluated turn.
  unique (user_id, interview_session_id, turn_id)
);

create index if not exists integrity_signals_module_idx
  on public.integrity_signals(user_id, interview_session_id, module_id, created_at);

comment on table public.integrity_signals is
  'Per-turn honest interview signals (tab switches, blur, paste, audio gaps, server-derived latency). Service-role write only; owner read-only. Context for human reviewers, never a score input.';

alter table public.integrity_signals enable row level security;

-- Candidates read their own signal rows only; all writes go through the
-- service role (which bypasses RLS) after server-side validation.
drop policy if exists integrity_signals_owner_select on public.integrity_signals;
create policy integrity_signals_owner_select on public.integrity_signals
  for select using ((select auth.uid()) = user_id);

revoke all privileges on table public.integrity_signals from anon, authenticated;
grant select on table public.integrity_signals to authenticated;
