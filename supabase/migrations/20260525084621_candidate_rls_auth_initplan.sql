-- Optimize candidate RLS policies so auth.uid() is initialized once per query.
-- This keeps the same candidate-owned access boundary and does not add delete
-- policies or employer visibility on private candidate tables.

drop policy if exists candidate_profiles_owner_select on public.candidate_profiles;
create policy candidate_profiles_owner_select on public.candidate_profiles
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_profiles_owner_insert on public.candidate_profiles;
create policy candidate_profiles_owner_insert on public.candidate_profiles
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_profiles_owner_update on public.candidate_profiles;
create policy candidate_profiles_owner_update on public.candidate_profiles
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists candidate_resume_documents_owner_select on public.candidate_resume_documents;
create policy candidate_resume_documents_owner_select on public.candidate_resume_documents
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_resume_documents_owner_insert on public.candidate_resume_documents;
create policy candidate_resume_documents_owner_insert on public.candidate_resume_documents
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_resume_documents_owner_update on public.candidate_resume_documents;
create policy candidate_resume_documents_owner_update on public.candidate_resume_documents
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_progress_owner_select on public.candidate_interview_progress;
create policy candidate_interview_progress_owner_select on public.candidate_interview_progress
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_progress_owner_insert on public.candidate_interview_progress;
create policy candidate_interview_progress_owner_insert on public.candidate_interview_progress
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_progress_owner_update on public.candidate_interview_progress;
create policy candidate_interview_progress_owner_update on public.candidate_interview_progress
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_sessions_owner_select on public.candidate_interview_sessions;
create policy candidate_interview_sessions_owner_select on public.candidate_interview_sessions
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_sessions_owner_insert on public.candidate_interview_sessions;
create policy candidate_interview_sessions_owner_insert on public.candidate_interview_sessions
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_sessions_owner_update on public.candidate_interview_sessions;
create policy candidate_interview_sessions_owner_update on public.candidate_interview_sessions
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_responses_owner_select on public.candidate_interview_responses;
create policy candidate_interview_responses_owner_select on public.candidate_interview_responses
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_responses_owner_insert on public.candidate_interview_responses;
create policy candidate_interview_responses_owner_insert on public.candidate_interview_responses
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_interview_responses_owner_update on public.candidate_interview_responses;
create policy candidate_interview_responses_owner_update on public.candidate_interview_responses
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists candidate_compliance_workflows_owner_select on public.candidate_compliance_workflows;
create policy candidate_compliance_workflows_owner_select on public.candidate_compliance_workflows
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_compliance_workflows_owner_insert on public.candidate_compliance_workflows;
create policy candidate_compliance_workflows_owner_insert on public.candidate_compliance_workflows
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_compliance_workflows_owner_update on public.candidate_compliance_workflows;
create policy candidate_compliance_workflows_owner_update on public.candidate_compliance_workflows
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists candidate_audit_events_owner_select on public.candidate_audit_events;
create policy candidate_audit_events_owner_select on public.candidate_audit_events
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_audit_events_owner_insert on public.candidate_audit_events;
create policy candidate_audit_events_owner_insert on public.candidate_audit_events
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_sharing_snapshots_owner_select on public.candidate_sharing_snapshots;
create policy candidate_sharing_snapshots_owner_select on public.candidate_sharing_snapshots
  for select using ((select auth.uid()) = user_id);

drop policy if exists candidate_sharing_snapshots_owner_insert on public.candidate_sharing_snapshots;
create policy candidate_sharing_snapshots_owner_insert on public.candidate_sharing_snapshots
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists candidate_sharing_snapshots_owner_update on public.candidate_sharing_snapshots;
create policy candidate_sharing_snapshots_owner_update on public.candidate_sharing_snapshots
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
