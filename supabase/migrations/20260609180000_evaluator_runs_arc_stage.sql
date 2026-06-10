-- ============================================================================
-- AssumerAI — Realistic interview arc metadata on evaluator runs (Phase 11)
-- ============================================================================
-- Every planned turn carries an arc stage (opening → motivation →
-- self_awareness → behavioral_core → situational → closing) and a scoring
-- mode. baseline_only runs (the warm-up opening, the closing courtesy
-- questions) are recorded for audit but NEVER enter competency scores;
-- low_weight runs count at reduced weight. Table stays service-role write
-- only, unchanged.
-- ============================================================================

alter table public.interview_evaluator_runs
  add column if not exists arc_stage text
    check (
      arc_stage is null
      or arc_stage in (
        'opening',
        'motivation',
        'self_awareness',
        'behavioral_core',
        'situational',
        'closing'
      )
    ),
  add column if not exists scoring_mode text not null default 'full'
    check (scoring_mode in ('baseline_only', 'low_weight', 'full'));

comment on column public.interview_evaluator_runs.arc_stage is
  'Realistic-arc stage of the answered question (Phase 11).';
comment on column public.interview_evaluator_runs.scoring_mode is
  'baseline_only = recorded for audit, never enters competency scores; low_weight = reduced aggregation weight; full = normal BARS weight.';
