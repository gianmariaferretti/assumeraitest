-- Company dashboard v2 data/domain.
-- Access remains membership-row based. Candidate-visible match materialization
-- keeps employer evidence hidden until candidate sharing consent is recorded.

alter table public.company_workspaces
  add column if not exists domain text,
  add column if not exists hiring_locations text[] not null default '{}'::text[],
  add column if not exists team_size text,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_email text,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.company_roles
  add column if not exists paused_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_reason text,
  add column if not exists activated_at timestamptz;

create index if not exists company_workspaces_domain_idx
  on public.company_workspaces(domain)
  where domain is not null;

create index if not exists company_roles_active_materialization_idx
  on public.company_roles(company_id, updated_at desc)
  where status = 'active';

drop policy if exists company_candidate_matches_candidate_insert on public.company_candidate_matches;
drop policy if exists company_candidate_matches_candidate_update on public.company_candidate_matches;

drop policy if exists company_memberships_self_insert on public.company_memberships;
drop policy if exists company_memberships_self_update on public.company_memberships;

drop policy if exists company_memberships_owner_bootstrap_insert on public.company_memberships;
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

drop policy if exists company_memberships_owner_update on public.company_memberships;
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

drop policy if exists company_workspaces_member_update on public.company_workspaces;
create policy company_workspaces_member_update on public.company_workspaces
  for update using (
    exists (
      select 1 from public.company_memberships member
      where member.company_id = company_workspaces.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.role in ('owner', 'admin', 'recruiter')
    )
  ) with check (
    exists (
      select 1 from public.company_memberships member
      where member.company_id = company_workspaces.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
        and member.role in ('owner', 'admin', 'recruiter')
    )
  );

drop policy if exists company_audit_events_no_update_documentation on public.company_audit_events;
create policy company_audit_events_no_update_documentation on public.company_audit_events
  for delete using (false);
