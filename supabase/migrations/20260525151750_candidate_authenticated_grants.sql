-- Expose candidate-owned tables to signed-in Supabase users while keeping RLS
-- as the row boundary.

grant usage on schema public to authenticated;

grant select, insert, update on table public.candidate_profiles to authenticated;
grant select, insert, update on table public.candidate_resume_documents to authenticated;
grant select, insert, update on table public.candidate_interview_progress to authenticated;
grant select, insert, update on table public.candidate_interview_sessions to authenticated;
grant select, insert, update on table public.candidate_interview_responses to authenticated;
grant select, insert, update on table public.candidate_compliance_workflows to authenticated;
grant select, insert on table public.candidate_audit_events to authenticated;
grant select, insert, update on table public.candidate_sharing_snapshots to authenticated;
