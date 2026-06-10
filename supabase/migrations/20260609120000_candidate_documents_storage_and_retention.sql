-- ============================================================================
-- AssumerAI — Real candidate document storage + retention markers (Phase 3)
-- ============================================================================
-- Private storage bucket "candidate-documents". Objects live under
-- {candidate_id}/{objectKey} so the first path folder is the owner: candidates
-- may READ their own documents (signed URLs are minted server-side anyway);
-- every write/delete goes through the service role, which bypasses RLS.
-- candidate_resume_documents gains raw-deletion markers so the retention cron
-- is idempotent and auditable.
-- ============================================================================

-- --- 1. Private bucket -------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('candidate-documents', 'candidate-documents', false)
on conflict (id) do nothing;

-- --- 2. Storage RLS: owner read-only, service-role writes --------------------

drop policy if exists candidate_documents_owner_select on storage.objects;
create policy candidate_documents_owner_select on storage.objects
  for select using (
    bucket_id = 'candidate-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- No insert/update/delete policies for candidates: uploads, overwrites, and
-- retention deletions are service-role only.

-- --- 3. Retention markers on raw resume documents ----------------------------

alter table public.candidate_resume_documents
  add column if not exists raw_deleted_at timestamptz,
  add column if not exists raw_deleted_audit_event_id text;

comment on column public.candidate_resume_documents.raw_deleted_at is
  'Set by the retention cron when the raw CV bytes were deleted from storage. Parsed profile data is unaffected.';
comment on column public.candidate_resume_documents.raw_deleted_audit_event_id is
  'candidate_audit_events.audit_event_id of the retention deletion record.';

create index if not exists candidate_resume_documents_retention_idx
  on public.candidate_resume_documents(uploaded_at)
  where raw_deleted_at is null;
