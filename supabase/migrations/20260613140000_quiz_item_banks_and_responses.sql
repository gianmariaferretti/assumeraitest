-- ============================================================================
-- AssumerAI — Deterministic quiz item banks + candidate responses (Phase 0)
-- ============================================================================
-- Foundations for the deterministic/interactive assessment modules. Two hard
-- security rules are enforced at the schema + RLS level:
--
--  1. The ANSWER KEY is server-only. `quiz_item_banks.items` stores the full
--     entries (public projection + correct key + rationale); the table is
--     service-role read/write ONLY (no anon/authenticated grant at all), so a
--     key can never be fetched by a client. The client receives only the
--     public projection, assembled server-side.
--  2. Candidate responses are owner-readable but service-role write only — the
--     server stamps issued_at/answered_at (timing is never client-trusted) and
--     grades server-side.
--
-- Grading is deterministic and auditable: every response row keeps the
-- candidate's raw answer. Scores remain recommendations for human review.
-- ============================================================================

-- --- 1. Item banks (service-role only; answer keys live here) ----------------

create table if not exists public.quiz_item_banks (
  bank_id text primary key,
  module_id text not null,
  version text not null,
  -- Full bank: array of { public: QuizItemPublic, key: QuizItemKey }.
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quiz_item_banks_module_idx
  on public.quiz_item_banks(module_id, version);

comment on table public.quiz_item_banks is
  'Deterministic quiz item banks including server-only answer keys. Service-role read/write ONLY — never exposed to clients; the server serves only the public item projection.';

alter table public.quiz_item_banks enable row level security;

-- No policies and no grants for anon/authenticated: the answer key is never
-- client-readable. All access goes through the service role (bypasses RLS).
revoke all privileges on table public.quiz_item_banks from anon, authenticated;

-- --- 2. Candidate responses (owner-read, service-role write) ------------------

create table if not exists public.quiz_item_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  module_id text not null,
  item_id text not null,
  -- The candidate's raw answer (shape depends on item type); audit evidence.
  answer jsonb,
  -- Server-stamped timing; the client clock is never trusted.
  issued_at timestamptz not null,
  answered_at timestamptz not null,
  -- Deterministic grading outcome, recorded for audit.
  correct boolean,
  awarded numeric check (awarded is null or awarded >= 0),
  within_time boolean,
  created_at timestamptz not null default now(),
  -- One response per item per session.
  unique (user_id, interview_session_id, item_id)
);

create index if not exists quiz_item_responses_module_idx
  on public.quiz_item_responses(user_id, interview_session_id, module_id, created_at);

comment on table public.quiz_item_responses is
  'Per-item candidate quiz answers with server-stamped timing and deterministic grading outcome. Service-role write only; owner read-only. Scores are recommendations for human review, never automated decisions.';

alter table public.quiz_item_responses enable row level security;

-- Candidates read their own responses only; all writes go through the service
-- role after server-side validation, timing stamping, and grading.
drop policy if exists quiz_item_responses_owner_select on public.quiz_item_responses;
create policy quiz_item_responses_owner_select on public.quiz_item_responses
  for select using ((select auth.uid()) = user_id);

revoke all privileges on table public.quiz_item_responses from anon, authenticated;
grant select on table public.quiz_item_responses to authenticated;
