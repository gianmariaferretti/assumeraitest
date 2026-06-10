-- ============================================================================
-- AssumerAI — Candidate contestation + human review loop (Phase 8)
-- ============================================================================
-- One row per candidate "Request human review" action from the results page.
-- The candidate creates and reads their own requests (owner-only RLS);
-- reviewer outcomes (uphold | adjust with reason) are recorded service-role
-- only through the admin review queue. Adjustments produce NEW audit records
-- and never overwrite the original interview_evaluator_runs rows.
-- ============================================================================

create table if not exists public.human_review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  target_type text not null check (
    target_type in (
      'candidate_profile',
      'resume_scorecard',
      'interview_scorecard',
      'company_match',
      'data_access'
    )
  ),
  target_id text not null,
  summary text not null,
  evidence_notes text,
  status text not null default 'open' check (status in ('open', 'upheld', 'adjusted')),
  request_payload jsonb not null default '{}'::jsonb,
  audit_event_id text not null,
  requested_at timestamptz not null,
  -- Reviewer outcome (service-role writes only).
  outcome_reason text,
  outcome_payload jsonb not null default '{}'::jsonb,
  resolution_audit_event_id text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id),
  -- An adjustment must always carry its reason.
  check (status <> 'adjusted' or outcome_reason is not null)
);

create index if not exists human_review_requests_open_idx
  on public.human_review_requests(status, requested_at)
  where status = 'open';

comment on table public.human_review_requests is
  'Candidate-initiated human review requests. Owner-only create/read; reviewer outcomes are service-role writes. Outcomes never modify interview_evaluator_runs — the original evaluation stays immutable.';

alter table public.human_review_requests enable row level security;

drop policy if exists human_review_requests_owner_select on public.human_review_requests;
create policy human_review_requests_owner_select on public.human_review_requests
  for select using ((select auth.uid()) = user_id);

drop policy if exists human_review_requests_owner_insert on public.human_review_requests;
create policy human_review_requests_owner_insert on public.human_review_requests
  for insert with check ((select auth.uid()) = user_id);

-- No owner update/delete: outcomes are recorded through the service role.
revoke all privileges on table public.human_review_requests from anon, authenticated;
grant select, insert on table public.human_review_requests to authenticated;
