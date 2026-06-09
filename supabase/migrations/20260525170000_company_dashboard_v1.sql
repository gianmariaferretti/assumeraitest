-- Company dashboard v1.
-- Company access is authorized through membership rows. Candidate data is
-- visible to companies only after a candidate-accepted match has an active
-- consent-backed sharing snapshot.

create extension if not exists "pgcrypto";

create table if not exists public.company_workspaces (
  company_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  website text,
  headquarters_country text,
  profile_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.company_workspaces(company_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'recruiter', 'reviewer')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.company_roles (
  role_id text primary key,
  company_id text not null references public.company_workspaces(company_id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'closed')),
  location_constraints text[] not null default '{}'::text[],
  work_modes text[] not null default '{}'::text[],
  requirements jsonb not null default '{}'::jsonb,
  daily_work_reality jsonb not null default '{}'::jsonb,
  calibration jsonb not null default '{}'::jsonb,
  review_sla_days integer not null default 14 check (review_sla_days between 1 and 45),
  role_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_candidate_matches (
  match_id text primary key,
  company_id text not null references public.company_workspaces(company_id) on delete cascade,
  role_id text not null references public.company_roles(role_id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (
    status in (
      'candidate_visible',
      'candidate_accepted',
      'candidate_declined',
      'company_advanced',
      'company_hold',
      'company_declined',
      'closed'
    )
  ),
  candidate_decision text check (candidate_decision in ('accepted', 'declined')),
  candidate_decided_at timestamptz,
  consent_record_id text,
  sharing_snapshot_id text,
  match_score numeric not null default 0 check (match_score between 0 and 100),
  match_confidence numeric not null default 0 check (match_confidence between 0 and 100),
  human_review_required boolean not null default true,
  recommendation_only boolean not null default true,
  review_due_at timestamptz,
  company_decision_reason text,
  company_next_step text,
  company_follow_up_at timestamptz,
  company_decision_at timestamptz,
  company_decided_by uuid references auth.users(id) on delete set null,
  contact_visibility text not null default 'hidden_until_advance'
    check (contact_visibility in ('hidden_until_advance', 'visible_after_advance')),
  shared_profile_payload jsonb not null default '{}'::jsonb,
  scorecard_payload jsonb not null default '{}'::jsonb,
  evidence_payload jsonb not null default '{}'::jsonb,
  transcript_payload jsonb not null default '{}'::jsonb,
  audit_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recommendation_only is true),
  check (
    status not in ('candidate_accepted', 'company_advanced', 'company_hold', 'company_declined')
    or (consent_record_id is not null and sharing_snapshot_id is not null)
  )
);

create table if not exists public.company_review_decisions (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.company_candidate_matches(match_id) on delete cascade,
  company_id text not null references public.company_workspaces(company_id) on delete cascade,
  role_id text not null references public.company_roles(role_id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('advance', 'hold', 'decline')),
  reason text not null,
  next_step text,
  follow_up_at timestamptz,
  audit_event_id text not null,
  created_at timestamptz not null default now(),
  unique (audit_event_id)
);

create table if not exists public.company_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.company_workspaces(company_id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  audit_event_id text not null,
  event_type text not null,
  target_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, audit_event_id)
);

create index if not exists company_memberships_user_idx
  on public.company_memberships(user_id, status);

create index if not exists company_roles_company_status_idx
  on public.company_roles(company_id, status, updated_at desc);

create index if not exists company_candidate_matches_company_status_due_idx
  on public.company_candidate_matches(company_id, status, review_due_at);

create index if not exists company_candidate_matches_candidate_idx
  on public.company_candidate_matches(candidate_user_id, updated_at desc);

create index if not exists company_review_decisions_match_idx
  on public.company_review_decisions(match_id, created_at desc);

alter table public.company_workspaces enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_roles enable row level security;
alter table public.company_candidate_matches enable row level security;
alter table public.company_review_decisions enable row level security;
alter table public.company_audit_events enable row level security;

revoke all privileges on table public.company_workspaces from anon, authenticated;
revoke all privileges on table public.company_memberships from anon, authenticated;
revoke all privileges on table public.company_roles from anon, authenticated;
revoke all privileges on table public.company_candidate_matches from anon, authenticated;
revoke all privileges on table public.company_review_decisions from anon, authenticated;
revoke all privileges on table public.company_audit_events from anon, authenticated;

grant select, insert, update on table public.company_workspaces to authenticated;
grant select, insert, update on table public.company_memberships to authenticated;
grant select, insert, update on table public.company_roles to authenticated;
grant select, insert, update on table public.company_candidate_matches to authenticated;
grant select, insert on table public.company_review_decisions to authenticated;
grant select, insert on table public.company_audit_events to authenticated;

drop policy if exists company_memberships_self_select on public.company_memberships;
create policy company_memberships_self_select on public.company_memberships
  for select using ((select auth.uid()) = user_id);

drop policy if exists company_memberships_self_insert on public.company_memberships;
create policy company_memberships_owner_bootstrap_insert on public.company_memberships
  for insert with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and status = 'active'
    and exists (
      select 1 from public.company_workspaces workspace
      where workspace.company_id = company_memberships.company_id
        and workspace.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists company_memberships_self_update on public.company_memberships;
create policy company_memberships_owner_update on public.company_memberships
  for update using (
    exists (
      select 1 from public.company_workspaces workspace
      where workspace.company_id = company_memberships.company_id
        and workspace.owner_user_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.company_workspaces workspace
      where workspace.company_id = company_memberships.company_id
        and workspace.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists company_workspaces_member_select on public.company_workspaces;
create policy company_workspaces_member_select on public.company_workspaces
  for select using (
    owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.company_memberships member
      where member.company_id = company_workspaces.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_workspaces_owner_insert on public.company_workspaces;
create policy company_workspaces_owner_insert on public.company_workspaces
  for insert with check (owner_user_id = (select auth.uid()));

drop policy if exists company_workspaces_owner_update on public.company_workspaces;
create policy company_workspaces_owner_update on public.company_workspaces
  for update using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

drop policy if exists company_roles_member_select on public.company_roles;
create policy company_roles_member_select on public.company_roles
  for select using (
    exists (
      select 1 from public.company_memberships member
      where member.company_id = company_roles.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_roles_member_insert on public.company_roles;
create policy company_roles_member_insert on public.company_roles
  for insert with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.company_memberships member
      where member.company_id = company_roles.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_roles_member_update on public.company_roles;
create policy company_roles_member_update on public.company_roles
  for update using (
    exists (
      select 1 from public.company_memberships member
      where member.company_id = company_roles.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  ) with check (
    exists (
      select 1 from public.company_memberships member
      where member.company_id = company_roles.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_candidate_matches_candidate_select on public.company_candidate_matches;
create policy company_candidate_matches_candidate_select on public.company_candidate_matches
  for select using ((select auth.uid()) = candidate_user_id);

drop policy if exists company_candidate_matches_candidate_insert on public.company_candidate_matches;

drop policy if exists company_candidate_matches_candidate_update on public.company_candidate_matches;

drop policy if exists company_candidate_matches_member_select on public.company_candidate_matches;
create policy company_candidate_matches_member_select on public.company_candidate_matches
  for select using (
    status in ('candidate_accepted', 'company_advanced', 'company_hold', 'company_declined', 'closed')
    and consent_record_id is not null
    and sharing_snapshot_id is not null
    and exists (
      select 1 from public.company_memberships member
      where member.company_id = company_candidate_matches.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_candidate_matches_member_update on public.company_candidate_matches;
create policy company_candidate_matches_member_update on public.company_candidate_matches
  for update using (
    status in ('candidate_accepted', 'company_hold')
    and exists (
      select 1 from public.company_memberships member
      where member.company_id = company_candidate_matches.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  ) with check (
    status in ('company_advanced', 'company_hold', 'company_declined', 'closed')
    and exists (
      select 1 from public.company_memberships member
      where member.company_id = company_candidate_matches.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_review_decisions_member_select on public.company_review_decisions;
create policy company_review_decisions_member_select on public.company_review_decisions
  for select using (
    exists (
      select 1 from public.company_memberships member
      where member.company_id = company_review_decisions.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_review_decisions_member_insert on public.company_review_decisions;
create policy company_review_decisions_member_insert on public.company_review_decisions
  for insert with check (
    reviewer_user_id = (select auth.uid())
    and exists (
      select 1 from public.company_memberships member
      where member.company_id = company_review_decisions.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_audit_events_member_select on public.company_audit_events;
create policy company_audit_events_member_select on public.company_audit_events
  for select using (
    exists (
      select 1 from public.company_memberships member
      where member.company_id = company_audit_events.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists company_audit_events_member_insert on public.company_audit_events;
create policy company_audit_events_member_insert on public.company_audit_events
  for insert with check (
    actor_user_id = (select auth.uid())
    and exists (
      select 1 from public.company_memberships member
      where member.company_id = company_audit_events.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

drop policy if exists candidate_sharing_snapshots_company_select on public.candidate_sharing_snapshots;
create policy candidate_sharing_snapshots_company_select on public.candidate_sharing_snapshots
  for select using (
    status = 'active'
    and exists (
      select 1 from public.company_memberships member
      where member.company_id = candidate_sharing_snapshots.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );
