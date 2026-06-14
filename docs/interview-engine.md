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
| b2. Job drivers (Phase 14) | rapport | `baseline_only` | Trade-off item + revealed-preference STAR ("a real fork in your path") — descriptive career-driver extraction, FLAG-ONLY at match time (realistic preview + discussion flags, never a score; lifestyle driver hard-coded never-compared) |
| c. Self-awareness bridge | exploration | on-ramp `low_weight`, probe `full` | "Your main strengths?" + mandatory STAR probe — the classic question is the on-ramp, the follow-up carries the score |
| d. Behavioral core | exploration/challenge | `full` | Existing STAR items in natural recruiter language; mandatory failure/rejection item for sales |
| d2. Learning agility (Phase 15) | challenge | `full` | STAR learning episode + ONE micro-learning task (deterministic pick from a curated, fully-in-prompt concept bank) — dedicated `learning_agility` BARS competency scoring the learning PROCESS; no penalty for unfamiliarity; seniority-weighted (more for juniors, never zeroed) |
| e. Situational | challenge | `full` | One generic role-family scenario (never branded with a client company) |
| e2. Work-style SJT (Phase 13) | challenge | `baseline_only` | Two dilemmas with NO right answer — descriptive style classification only; judged per-company at match time against declared keys |
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

- `src/features/live-interview/tts-provider.ts` —
  `elevenlabs | openai | openai-audio-native | mock` behind `TTS_PROVIDER`
  (default `mock`, offline-safe), injectable `fetchImpl`.
- **`openai-audio-native`** (experience-only, opt-in): one chat-completion
  call with audio modality speaks the interviewer line directly, so intonation
  adapts to the conversational content instead of a flat TTS read. Independent
  implementation of the publicly known voice-native-interview idea (the
  best-known reference implementation is PolyForm Noncommercial and was not
  consulted). Trade-offs on record: de facto OpenAI-only today (tension with
  the multi-provider strategy and EU data-residency/GDPR posture), higher
  latency and cost than TTS — hence the default stays `mock`. Zero impact on
  integrity or scoring; the interview runs identically without it.

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

## Anti-cheating v2 — anchored follow-ups + copilot-shaped flags

Threat model: an external "answer copilot" (an invisible overlay that captures
the question, sends it to an LLM, and has the candidate read or paste the
answer back). Vectors we DELIBERATELY do not fight: no camera proctoring, no
keystroke biometrics, no process inspection, no virtual-audio detection, no
voice-print or audio features of any kind (`safety.ts` is non-negotiable).
The real moat is the adaptive conversation, not surveillance.

1. **Anchored follow-ups** (`interview-flow/anchor-entities.ts`, wired in
   `conduct-turn.ts` + `interviewer-agent.ts`) — in exploration/challenge,
   when the funnel decides to follow up WITHIN its existing budget, the probe
   is grounded on 1–3 concrete entities extracted from the candidate's last
   answer (a technology, a metric, a named decision). Deterministic text
   extraction with an optional Anthropic pass behind the usual provider
   pattern (injectable `fetchImpl`, budget recorder, offline fallback); LLM
   anchors must appear verbatim in the answer. Every generated follow-up
   passes the full `inspectQuestionSafety` gate before reaching the candidate;
   anchors can never be protected traits. Outsourcing each anchored turn to an
   external tool gets slower and less coherent as the thread tightens.

2. **`uniform_response_onset`** — server-derived response latencies only. On
   ≥ 4 turns (configurable), a near-constant onset (std dev ≤ 2s) whose mean
   sits in the plausible LLM-round-trip band (≥ 8s) raises a descriptive
   flag. What matters is the LOW VARIANCE — deliberately not a long-latency
   rule; uniformly fast instinctive answerers never flag.

3. **`low_disfluency_text`** — derived EXCLUSIVELY from the transcript TEXT
   (`interview-flow/text-disfluency.ts`): written fillers, false starts,
   self-corrections across the five interview languages. A streak of ≥ 3 long,
   near-zero-disfluency voice answers flags. This does not violate
   `safety.ts`: it reads the same text the evaluator already scores — never
   audio, prosody, or accent. Text-mode turns are EXEMPT (typed answers are
   legitimately clean; Phase 12 fairness).

4. **`large_paste_burst`** — paste SHAPE on code-capable modules
   (`work_sample`, `case`): one very large single insertion (≥ 400 chars,
   configurable) or a spike of pastes within seconds. A content signal, not
   biometrics: the client reports only the length of the largest paste and the
   burst count, validated and clamped server-side like every other counter.

All v2 flags are descriptive "look closer" context with neutral reviewer
wording ("uniform response onset across 5 turns"), shown read-only on
consent-approved matches only, and — like v1 — NEVER an input to any score.
No voice-print exists anywhere in signals, comments, or docs, and none may be
added: it would contradict both `safety.ts` and the no-biometrics pitch.

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

## Assessment module library (22 modules)

The interview engine extends into a configurable library of 22 assessment
modules across four tracks + meta-modules, on top of the existing behavioral
flow (which is unchanged). The library is driven by a single catalog and a
scorer abstraction so aggregation and matching stay agnostic to how a module
is graded.

**Scorer abstraction** — `src/features/scoring/module-scoring/`. Every module
declares a `ModuleScorerType` (`behavioral | deterministic | work_sample |
language | interactive`) and every scorer emits the same scorer-agnostic
`ModuleScoreResult` (0–100, per-competency evidence + plain-language reason +
`needs_human_review`). `buildModuleScoreResult` enforces the shared rules:
confidence-weighted roll-up, low-confidence → human review, and a fallback
that can never claim high confidence. `behavioral-scorer-adapter.ts` projects
the engine's native 1–10 BARS scale onto this shape; `to-matching-scorecard.ts`
bridges results into the matching `InterviewScorecard` without touching the
matching engine; `combine-results.ts` merges the parts of a mixed module.

**Scorers**
- Deterministic quiz engine — `src/features/scoring/quiz-engine/`: client-safe
  item projection (answer key is server-only), 6 item types, partial credit,
  server-authoritative timing (client clock never trusted; late answers graded
  + flagged), verbatim audit evidence.
- LLM open-response — `src/features/scoring/open-response/`: writing/speaking
  (transcript only — never accent)/scenario/SJT justification; safety-routed
  (protected-trait reasons drop to fallback); deterministic neutral fallback.
- Work sample — `src/features/scoring/work-sample-scoring/`: deterministic
  correctness from automated test results + the AI-assistant transcript
  captured as review evidence (collaboration-with-AI is reviewed, never
  auto-scored or penalized).
- Interactive — `src/features/scoring/interactive/`: result-set equality (SQL)
  and cell/chart end-state grading, computed in a sandbox and graded inside our
  trust boundary.

**Catalog & journey** — `src/features/assessment-catalog/`. `catalog.ts`
declares all 22 modules (all active across Phases 1–3; the `phase` field records build order):
track, scorer type, competencies, time budget (CORE = motivation + comm/
problem-solving ≈ 20 min), CV auto-trigger keywords, and `descriptive_only`
modules (work-style preferences) that never feed a quality score. `defaultModulePlan`
gates every non-core module `unlocks_after` the CORE — so nothing unlockable
appears until the CORE is done, and the unlock engine reports
`locked_pending_prerequisite` (visible-as-locked, with a readable reason).
Completing the CORE unlocks the set (coding auto-triggered by the CV); the
existing `evaluateRequiredModulesGate` opens the match once required modules
are complete. Seed item banks (`item-banks.ts`) include the classic 9-ball
(2 weighings) and 12-ball unknown-direction (3 weighings) puzzles, tagged by
difficulty.

**Modalities** — `QuizRunner.tsx` (timed, never receives keys) and
`CodeEditorPanel.tsx` (editor + logged AI-assistant transcript). Migration
`20260613140000_quiz_item_banks_and_responses.sql`: banks are service-role only
(keys never client-readable); responses are owner-read / service-role write with
server-stamped timing.

Every module is a recommendation for human review with evidence + an audit
reason; no module returns an automated hire/reject, and none scores protected
attributes (the `safety.ts` boundary is preserved across all new scorers).

**Phase 3 (enterprise breadth)** completes the library: cloud/DevOps and
cybersecurity (deterministic banks + auto-trigger from infra CV skills),
verbal reasoning, software/tool proficiency (interactive end-state), a
role-knowledge TEMPLATE (`role-knowledge-template.ts` — one architecture,
many domain variants, e.g. sales/finance), leadership (a senior-only
`leadership_management` BARS competency, scored behaviorally), and a
descriptive identity/honesty check (`identity-check.ts`) that stores only
coarse boolean signals and NEVER auto-rejects — an unmet signal flags for
human review.

