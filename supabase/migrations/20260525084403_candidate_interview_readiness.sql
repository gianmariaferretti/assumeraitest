-- Candidate interview Supabase readiness foundation.
-- Candidate-owned data stays private by default. Employers read only future
-- consent-backed sharing snapshots, never raw profile/CV/transcript tables.

create extension if not exists "pgcrypto";

create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  profile_status text not null default 'draft'
    check (profile_status in ('draft', 'confirmed')),
  profile_json jsonb not null default '{}'::jsonb,
  source_resume_document_id text,
  parser_confidence numeric check (
    parser_confidence is null or parser_confidence between 0 and 100
  ),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_boundary jsonb not null default
    '{"candidate_owned":true,"employer_visible_without_consent":false,"sharing_snapshot_required":true}'::jsonb,
  check ((privacy_boundary->>'candidate_owned')::boolean is true),
  check ((privacy_boundary->>'employer_visible_without_consent')::boolean is false)
);

create table if not exists public.candidate_resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_document_id text not null,
  original_filename text,
  content_type text,
  size_bytes bigint,
  resume_document jsonb not null default '{}'::jsonb,
  parse_draft jsonb not null default '{}'::jsonb,
  score_readiness jsonb not null default '{}'::jsonb,
  next_step jsonb not null default '{}'::jsonb,
  parser_confidence numeric check (
    parser_confidence is null or parser_confidence between 0 and 100
  ),
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resume_document_id)
);

create table if not exists public.candidate_interview_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latest_resume_document_id text,
  latest_interview_session_id text,
  interview_language text not null default 'en'
    check (interview_language in ('en', 'it', 'fr')),
  profile_confirmed_at timestamptz,
  disclosure_acknowledged_at timestamptz,
  disclosure_version text,
  disclosure_audit_event_id text,
  device_check_completed_at timestamptz,
  interview_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  resume_document_id text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  interview_language text not null default 'en'
    check (interview_language in ('en', 'it', 'fr')),
  role_id text,
  role_title text,
  session_payload jsonb not null default '{}'::jsonb,
  provider_payload jsonb not null default '{}'::jsonb,
  question_plan jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, interview_session_id)
);

create table if not exists public.candidate_interview_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id text not null,
  response_id text not null,
  question_id text not null,
  module_id text,
  answer_text text not null,
  transcript_payload jsonb not null default '{}'::jsonb,
  analysis_flags jsonb not null default '{}'::jsonb,
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, interview_session_id, response_id)
);

create table if not exists public.candidate_compliance_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_type text not null check (
    workflow_type in (
      'interview_disclosure',
      'human_review',
      'data_export',
      'data_deletion',
      'match_decision',
      'sharing_snapshot'
    )
  ),
  workflow_id text not null,
  workflow_payload jsonb not null default '{}'::jsonb,
  audit_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workflow_type, workflow_id)
);

create table if not exists public.candidate_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audit_event_id text not null,
  event_type text not null,
  target_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, audit_event_id)
);

create table if not exists public.candidate_sharing_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null,
  role_id text not null,
  consent_record_id text not null,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  shared_sections text[] not null default '{}'::text[],
  snapshot_payload jsonb not null default '{}'::jsonb,
  audit_event_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists candidate_resume_documents_user_updated_idx
  on public.candidate_resume_documents(user_id, updated_at desc);

create index if not exists candidate_interview_sessions_user_updated_idx
  on public.candidate_interview_sessions(user_id, updated_at desc);

create index if not exists candidate_interview_responses_session_idx
  on public.candidate_interview_responses(user_id, interview_session_id, answered_at);

create index if not exists candidate_compliance_workflows_user_type_idx
  on public.candidate_compliance_workflows(user_id, workflow_type, updated_at desc);

create index if not exists candidate_audit_events_target_idx
  on public.candidate_audit_events(user_id, target_type, target_id, created_at desc);

create unique index if not exists candidate_active_sharing_snapshot_unique_idx
  on public.candidate_sharing_snapshots(user_id, company_id, role_id)
  where status = 'active';

alter table public.candidate_profiles enable row level security;
alter table public.candidate_resume_documents enable row level security;
alter table public.candidate_interview_progress enable row level security;
alter table public.candidate_interview_sessions enable row level security;
alter table public.candidate_interview_responses enable row level security;
alter table public.candidate_compliance_workflows enable row level security;
alter table public.candidate_audit_events enable row level security;
alter table public.candidate_sharing_snapshots enable row level security;

drop policy if exists candidate_profiles_owner_select on public.candidate_profiles;
create policy candidate_profiles_owner_select on public.candidate_profiles
  for select using (auth.uid() = user_id);

drop policy if exists candidate_profiles_owner_insert on public.candidate_profiles;
create policy candidate_profiles_owner_insert on public.candidate_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_profiles_owner_update on public.candidate_profiles;
create policy candidate_profiles_owner_update on public.candidate_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists candidate_resume_documents_owner_all on public.candidate_resume_documents;
drop policy if exists candidate_resume_documents_owner_select on public.candidate_resume_documents;
create policy candidate_resume_documents_owner_select on public.candidate_resume_documents
  for select using (auth.uid() = user_id);

drop policy if exists candidate_resume_documents_owner_insert on public.candidate_resume_documents;
create policy candidate_resume_documents_owner_insert on public.candidate_resume_documents
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_resume_documents_owner_update on public.candidate_resume_documents;
create policy candidate_resume_documents_owner_update on public.candidate_resume_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists candidate_interview_progress_owner_all on public.candidate_interview_progress;
drop policy if exists candidate_interview_progress_owner_select on public.candidate_interview_progress;
create policy candidate_interview_progress_owner_select on public.candidate_interview_progress
  for select using (auth.uid() = user_id);

drop policy if exists candidate_interview_progress_owner_insert on public.candidate_interview_progress;
create policy candidate_interview_progress_owner_insert on public.candidate_interview_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_interview_progress_owner_update on public.candidate_interview_progress;
create policy candidate_interview_progress_owner_update on public.candidate_interview_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists candidate_interview_sessions_owner_all on public.candidate_interview_sessions;
drop policy if exists candidate_interview_sessions_owner_select on public.candidate_interview_sessions;
create policy candidate_interview_sessions_owner_select on public.candidate_interview_sessions
  for select using (auth.uid() = user_id);

drop policy if exists candidate_interview_sessions_owner_insert on public.candidate_interview_sessions;
create policy candidate_interview_sessions_owner_insert on public.candidate_interview_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_interview_sessions_owner_update on public.candidate_interview_sessions;
create policy candidate_interview_sessions_owner_update on public.candidate_interview_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists candidate_interview_responses_owner_all on public.candidate_interview_responses;
drop policy if exists candidate_interview_responses_owner_select on public.candidate_interview_responses;
create policy candidate_interview_responses_owner_select on public.candidate_interview_responses
  for select using (auth.uid() = user_id);

drop policy if exists candidate_interview_responses_owner_insert on public.candidate_interview_responses;
create policy candidate_interview_responses_owner_insert on public.candidate_interview_responses
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_interview_responses_owner_update on public.candidate_interview_responses;
create policy candidate_interview_responses_owner_update on public.candidate_interview_responses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists candidate_compliance_workflows_owner_all on public.candidate_compliance_workflows;
drop policy if exists candidate_compliance_workflows_owner_select on public.candidate_compliance_workflows;
create policy candidate_compliance_workflows_owner_select on public.candidate_compliance_workflows
  for select using (auth.uid() = user_id);

drop policy if exists candidate_compliance_workflows_owner_insert on public.candidate_compliance_workflows;
create policy candidate_compliance_workflows_owner_insert on public.candidate_compliance_workflows
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_compliance_workflows_owner_update on public.candidate_compliance_workflows;
create policy candidate_compliance_workflows_owner_update on public.candidate_compliance_workflows
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists candidate_audit_events_owner_all on public.candidate_audit_events;
drop policy if exists candidate_audit_events_owner_select on public.candidate_audit_events;
create policy candidate_audit_events_owner_select on public.candidate_audit_events
  for select using (auth.uid() = user_id);

drop policy if exists candidate_audit_events_owner_insert on public.candidate_audit_events;
create policy candidate_audit_events_owner_insert on public.candidate_audit_events
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_sharing_snapshots_owner_select on public.candidate_sharing_snapshots;
create policy candidate_sharing_snapshots_owner_select on public.candidate_sharing_snapshots
  for select using (auth.uid() = user_id);

drop policy if exists candidate_sharing_snapshots_owner_insert on public.candidate_sharing_snapshots;
create policy candidate_sharing_snapshots_owner_insert on public.candidate_sharing_snapshots
  for insert with check (auth.uid() = user_id);

drop policy if exists candidate_sharing_snapshots_owner_update on public.candidate_sharing_snapshots;
create policy candidate_sharing_snapshots_owner_update on public.candidate_sharing_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
