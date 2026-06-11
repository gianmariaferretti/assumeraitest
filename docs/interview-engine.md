# AssumerAI interview engine

A structured, psychometric, EU AI Act–aware interview. Structure is enforced
deterministically; the LLM stays warm and human while the protocol stays rigid
and auditable. Every score is traceable to an observed behavior and is always a
recommendation for human review — never an automated hiring decision.

## End-to-end flow

```
                         ┌────────────────────────────────────────────┐
Company job posting ───► │ Job profile: calibration.module_plan        │
CV parser  ────────────► │   required · optional · auto_trigger · blocked│
System core ───────────► │   (motivation is always required)           │
                         └───────────────────┬────────────────────────┘
                                             │
 Candidate CV → cv_json ──► Unlock engine (resolveModuleStatuses)
                                             │  CV skills × module_plan
                                             ▼
                         Per-module candidate dashboard (ModuleCard grid)
                         states: required · auto_triggered · optional · completed
                                             │
                         For each module, one turn at a time (conductTurn):
                                             │
        ┌───────────────┬───────────────────┼───────────────────┬─────────────┐
        ▼               ▼                   ▼                   ▼             ▼
    Planner        Funnel state         Interviewer          Evaluator     Aggregation
 (CV-grounded     machine (where        agent (one warm      (BARS score   (answer →
  questions +     we are: rapport→      line per turn,       1–10 + STAR   competency →
  funnel phases   exploration→          never scores)        + red flags)  module →
  + cv_hooks)     challenge→closing)                                       scorecard)
                                             │
                                             ▼
                         Scorecard: partial immediately · final when required complete
                                             │
                                             ▼
                         Match guard (required_modules hard gate)
                         → candidate is matched only once required modules complete
```

## The platform-interview principle (one interview, many matches)

AssumerAI runs ONE platform interview per candidate BEFORE any matching; the
candidate is then matched to MULTIPLE companies and roles. The interviewer is
a **neutral AssumerAI career interviewer**, never an employer:

- No question may reference a specific company, employer, or "this role"
  ("our company", "why do you want to work with us", "what do you know about
  us" are forbidden in every language — enforced at runtime by
  `platform-neutrality.ts` inside the safety filter, and on every generated
  interviewer line).
- Everything company-specific (scoring keys, work-context demands, realistic
  job preview) lives on the company side and is applied by the **matching
  engine AFTER the interview**.
- The interview produces a reusable candidate profile that matching compares
  against EACH company's declared keys.

## The realistic interview arc

Every interview follows the arc of a real first-round interview
(`interview-arc.ts` + `canonical-questions.ts`, canonical phrasing in
EN/IT/FR/DE/ES):

| Stage | Funnel | Scoring | Content |
|-------|--------|---------|---------|
| a. Opening | rapport | `baseline_only` | "Tell me about yourself…" — calibrates a communication baseline, NEVER moves a competency score |
| b. Motivation | rapport | `low_weight` | Role-FAMILY motivation ("Why sales?"), never company motivation; also drivers input |
| c. Self-awareness bridge | exploration | on-ramp `low_weight`, probe `full` | "Your main strengths?" + mandatory STAR probe — the classic question is the on-ramp, the follow-up carries the score |
| d. Behavioral core | exploration/challenge | `full` | Existing STAR items in natural recruiter language; mandatory failure/rejection item for sales |
| e. Situational | challenge | `full` | One generic role-family scenario (never branded with a client company) |
| f. Closing | closing | `baseline_only` | "Anything to add?" + accurate next steps (profile review → matching → 14-day verdict); candidate questions recorded as a light curiosity signal, never a hard score |

**Why the arc** — procedural justice: candidates judged by a process that
looks and feels like a fair interview accept its outcomes more readily. The
warm-up reduces anxiety and therefore measurement noise on everything that
follows; classic questions ("strengths?") act as STAR on-ramps that preserve
validity because the scored evidence is the concrete example, not the
self-description. Seniority calibrates the STAR/SJT mix: juniors get more
situational items (less past behavior to probe), experienced profiles more
past-behavioral depth.

The realistic job preview intentionally does NOT happen in the interview — it
happens at match time on the company side, when there is an actual company to
preview.

## The four psychometric functions

| Function | File | Role | Temperature |
|----------|------|------|-------------|
| 1. Planner | `src/features/interview-flow/claude-resume-question-planner.ts` | Ground questions in confirmed CV + role; emit `funnelPhases` and `cvHooks` | n/a (planning) |
| 2. Interviewer | `src/features/interview-flow/interviewer-agent.ts` | Say one warm line per turn; never decides flow, never scores | high (0.6) |
| 3. Evaluator | `src/features/scoring/bars/evaluator.ts` | Score one answer vs one competency's BARS anchors | low (0.1) |
| 4. Scorecard | `src/features/scoring/aggregation.ts` | Roll up answer → competency → module → overall | deterministic |

Supporting pieces:

- **Funnel state machine** — `src/features/interview-flow/funnel-state-machine.ts`:
  the single source of truth for "what happens next". Pure and deterministic.
- **Module unlock engine** — `src/features/interview-flow/module-unlock-engine.ts`:
  joins the role's `module_plan` with parsed CV skills (incl. base synonyms,
  e.g. `JS → javascript`) to decide each module's state.
- **Per-module session store** — `src/features/interview-flow/session-state.ts`
  (`module_sessions`, `recordResponseForModule`, `advanceModule`,
  `computeGlobalStatus`): each module runs and resumes independently.
- **Turn orchestrator** — `src/features/interview-flow/conduct-turn.ts`: wires
  the four functions together for a single turn and emits an audit record.
- **Inter-rater monitor** — `src/features/scoring/bars/inter-rater-monitor.ts`:
  intra-LLM variance + Cohen's κ.
- **Match guard** — `src/features/matching/matching-engine.ts`
  (`required_modules` hard gate).

## Data model (Supabase)

| Table | Migration | Purpose |
|-------|-----------|---------|
| `company_roles.module_plan` | `20260603100000_role_module_plan.sql` | The three-list job profile |
| `candidate_module_sessions` | `20260603110000_candidate_module_sessions.sql` + `20260609100000_server_authoritative_interview_turns.sql` | Async per-module Session Store — single source of truth; owner read-only, service-role write only |
| `candidate_interview_turns` | `20260609100000_server_authoritative_interview_turns.sql` | Server-issued turn ledger with anti-replay unique constraint (service-role write only) |
| `interview_evaluator_runs` | `20260603090000_interview_evaluator_and_outcomes.sql` | Audit log of every BARS evaluation (service-role write only) |
| `hire_outcomes` | `20260603090000_interview_evaluator_and_outcomes.sql` | Manager ratings at 3/6/12 months for predictive validity |

## Routes (server-authoritative trust model)

Interview state lives in `candidate_module_sessions`; the client never submits
session state. A request that includes session/state fields is rejected with
400 `client_state_rejected`.

- `POST /candidate/interview/turn` — body is exactly
  `{ moduleId, turnId, candidateAnswer: { answerText } }`. The server derives
  the planned question, competency (`module-competencies.ts`), funnel phase,
  and elapsed time (`turn_started_at` → now, clamped) from persisted state.
  `turnId` is generated server-side when a question is issued; replaying an
  evaluated turn returns 409. Hard caps (max turns per module, max total
  duration from the module plan) close the module gracefully.
- `POST /candidate/interview/module/[moduleId]/start` — opens/resumes a module
  from persisted state and returns the pending server-issued turn (idempotent
  across disconnects).
- `POST /candidate/interview/session-snapshot` — persists the server-derived
  aggregate snapshot; the client may only contribute the presentation-layer
  `providerSession`.
- `POST /candidate/interview/session/reset` — starts the interview over with a
  fresh server session built from the current primary question plan.

## Voice (optional)

- `src/features/live-interview/tts-provider.ts` — `elevenlabs | openai | mock`
  behind `TTS_PROVIDER` (default `mock`, offline-safe), injectable `fetchImpl`.

## Defensibility mechanisms

- **BARS (Behaviorally Anchored Rating Scales)** — a 1–10 score maps to
  pre-defined observable behavior, not impressions. Bands: below_standard 1–3,
  meets_standard 4–6, exceeds_standard 7–9, exceptional 10.
- **STAR** — every behavioral answer must establish Situation, Task, Action,
  Result; missing elements trigger a single targeted follow-up before moving on.
- **Funnel** — rapport → exploration → challenge → closing is enforced
  deterministically; challenge never precedes exploration evidence.
- **Cohen's κ + intra-LLM variance** — inter-rater reliability monitoring
  (target κ ≥ 0.70); ambiguous items route to human review.
- **Predictive validity** — `hire_outcomes` links interview score to manager
  ratings at 3/6/12 months (Pearson r), wired from day one.
- **Adverse-impact / safety hooks** — every generated line and evidence snippet
  passes `interview-flow/safety.ts`; protected traits are never asked for, scored,
  or inferred. Low score / low confidence means an evidence gap for human review,
  not a negative judgment of the person.
- **Auditability** — every evaluator call is logged to `interview_evaluator_runs`
  with provenance (source, provider model, fallback reason, scoring version).
- **No automated rejection** — matches are recommendations requiring meaningful
  human review; the match guard blocks (never silently rejects) until required
  modules are complete.

## Integrity signals (anti-cheating v1 — honest signals only)

During the interview the client reports coarse, neutral counters per turn:
tab `visibilitychange` events, window blur/focus changes, paste events, and
audio continuity gaps from the transcription stream; the server adds the
response latency it derived itself (`turn_started_at` → answer). **No
keystroke logging, no camera analysis, no biometrics** — the same philosophy
enforced by `interview-flow/safety.ts`.

- Per-turn rows live in `integrity_signals`
  (`20260609150000_integrity_signals.sql`): service-role write only after
  server-side validation/clamping; a candidate can read their own rows and
  never anyone else's.
- A per-module `integritySummary` (counts, max gap, descriptive anomaly
  flags) is computed server-side in `interview-flow/integrity-signals.ts` and
  stored on the module session payload.
- The company review page surfaces the summary **read-only** with neutral
  wording ("3 tab switches, 1 long pause") for consent-approved matches only.

**Hard rule: integrity data is context for the human reviewer and is NEVER an
input to any score computation.** Nothing under `src/features/scoring/`
imports the integrity module; the summary is folded into the session strictly
after the evaluator has run, and removing it changes no score. A flagged
module means "look closer", never "score lower".

## Scoring rigor

Five capabilities take scoring from "solid MVP" to "enterprise-grade defensible",
without needing real hire data. They compose: ensemble lowers per-decision
variance → bootstrap propagates and interprets it → Z-score makes scores
comparable across roles → counterfactual verifies invariance to neutral
attributes → adverse impact verifies aggregate balance of decisions. Full
formulas and references: [`docs/scoring/methodology.md`](scoring/methodology.md).

| Capability | File | What it adds |
|------------|------|--------------|
| Ensemble multi-rater | `src/features/scoring/bars/ensemble-evaluator.ts` | N=3 raters (prompt jitter), median score, modal level, majority STAR, empirical confidence from IQR; all runs persisted with a shared `replicate_group_id` |
| Bootstrap CI | `src/features/scoring/bootstrap.ts` | 95% percentile-bootstrap interval on every competency/module/scorecard score; `scoresStatisticallyDistinguishable()` |
| Z-score peer cohort | `src/features/scoring/peer-cohort.ts` + `peer_cohort_stats` | score as σ from peers (role_family + seniority); honest `insufficient`/`emerging`/`established` norming |
| Counterfactual fairness | `src/features/fairness/counterfactual/` | offline suite proving score invariance to neutral swaps (name, school, city); `npm run test:fairness`, `npm run fairness:report` |
| Adverse impact monitor | `src/features/audit/adverse-impact-monitor.ts` + `adverse_impact_snapshots` | four-fifths rule by neutral proxy; `GET /admin/adverse-impact`, `npm run adverse-impact:report` |

Thresholds are named `export const`s (e.g. `FOUR_FIFTHS_THRESHOLD = 0.8`,
`COUNTERFACTUAL_DELTA_THRESHOLD = 1.0`, `COHORT_ESTABLISHED_AT_OR_ABOVE = 30`,
`BOOTSTRAP_DEFAULT_ITERATIONS = 1000`) so the audit trail can cite them.
