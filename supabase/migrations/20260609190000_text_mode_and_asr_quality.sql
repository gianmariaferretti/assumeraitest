-- ============================================================================
-- AssumerAI — Accessible text interview mode + ASR-quality safeguards (Phase 12)
-- ============================================================================
-- Text mode is a first-class, fully equivalent interview mode chosen BEFORE
-- the interview starts. Per-turn Deepgram confidence is stored on the turn
-- ledger so low-transcription-confidence modules are auto-routed to human
-- review. Accommodation requests reuse the human-review request table; the
-- free-text reason is owner + service-role only and never visible to
-- companies, and never enters scoring.
-- ============================================================================

-- --- 1. Candidate's pre-interview mode choice -------------------------------

alter table public.candidate_interview_progress
  add column if not exists interview_mode text not null default 'voice'
    check (interview_mode in ('voice', 'text'));

comment on column public.candidate_interview_progress.interview_mode is
  'Interview mode chosen by the candidate before the interview starts. Text is a first-class equivalent mode, not a fallback.';

-- --- 2. Mode on the per-module session rows ----------------------------------

alter table public.candidate_module_sessions
  add column if not exists interview_mode text not null default 'voice'
    check (interview_mode in ('voice', 'text'));

comment on column public.candidate_module_sessions.interview_mode is
  'Mode the module was conducted in (voice | text). Everything downstream of the answer text is mode-agnostic.';

-- --- 3. Per-turn ASR confidence ----------------------------------------------

alter table public.candidate_interview_turns
  add column if not exists asr_confidence numeric
    check (asr_confidence is null or (asr_confidence >= 0 and asr_confidence <= 1));

comment on column public.candidate_interview_turns.asr_confidence is
  'Deepgram transcription confidence for the turn (voice mode only; null in text mode). Module averages below ASR_CONFIDENCE_REVIEW_THRESHOLD auto-route the evaluation to human review.';

-- --- 4. Accommodation requests in the human-review table ---------------------
-- The reason text stays owner + service-role only (existing RLS); it is
-- excluded from the company-gated review queue listing and never enters
-- scoring.

alter table public.human_review_requests
  drop constraint if exists human_review_requests_target_type_check;
alter table public.human_review_requests
  add constraint human_review_requests_target_type_check check (
    target_type in (
      'candidate_profile',
      'resume_scorecard',
      'interview_scorecard',
      'company_match',
      'data_access',
      'accommodation_request'
    )
  );
