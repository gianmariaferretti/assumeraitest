# AssumerAI

AI-powered structured job interviews. Candidates upload a CV, confirm the
parsed profile, and complete a structured, psychometric interview conducted by
an AI interviewer; companies review evidence-based scorecards and matches.
Every score is a recommendation for meaningful human review — never an
automated hiring decision.

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Supabase
(Postgres, Auth, RLS, Storage), the Anthropic API, and Deepgram live
transcription. Every external call has an injectable client/`fetchImpl` and a
deterministic fallback, so the product keeps working offline and in tests.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys at minimum
npm run dev                  # http://localhost:3000
```

Apply database migrations with the Supabase CLI:

```bash
supabase start               # local stack, applies supabase/migrations
# or against a hosted project:
supabase db push
```

Everything degrades gracefully without secrets: missing `ANTHROPIC_API_KEY`
activates deterministic interview fallbacks, missing `SUPABASE_SERVICE_ROLE_KEY`
switches server stores to in-memory local-dev mode, and unset Sentry DSNs make
error reporting a no-op.

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | — (required) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key | — (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role; required in production for server-authoritative interview state, evaluator runs, storage, rate limiting | — |
| `ANTHROPIC_API_KEY` | Planner / interviewer / evaluator / resume parser | — (deterministic fallbacks) |
| `ANTHROPIC_MODEL` (+ `_FALLBACKS`, `_INTERVIEW…`, `_INTERVIEWER…`, `_EVALUATOR…` variants) | Per-function model overrides | sensible defaults |
| `DEEPGRAM_KEY` | Live transcription token grants | — (voice disabled) |
| `TTS_PROVIDER` / `LIVE_INTERVIEW_PROVIDER` | `elevenlabs \| openai \| mock` | `mock` (offline-safe) |
| `RESUME_PARSER_PROVIDER` | `auto \| anthropic \| local` | `auto` |
| `RESUME_UPLOAD_MAX_BYTES` | Resume upload cap (content verified by magic bytes, not extension) | `8388608` (8MB) |
| `RETENTION_DAYS_RAW_CV` | Raw CV retention window | `30` |
| `RETENTION_HOURS_RAW_MEDIA` | Raw interview media retention window | `24` |
| `RATE_LIMIT_TURN_PER_MINUTE` | Interview turn rate limit (per user and per IP) | `10` |
| `RATE_LIMIT_RESUME_UPLOAD_PER_HOUR` | Resume upload rate limit | `5` |
| `RATE_LIMIT_DEEPGRAM_TOKEN_PER_HOUR` | Transcription token rate limit | `10` |
| `LLM_DAILY_BUDGET_EUR` | Daily Anthropic spend cutoff (503 + deterministic fallbacks beyond it) | `25` |
| `CRON_SECRET` | Auth for `/api/cron/*` (Vercel sends `Authorization: Bearer`) | — (cron disabled) |
| `LOG_LEVEL` | JSON-lines log verbosity | `info` |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error reporting (server / client); no-op when unset | — |
| `SITE_PASSWORD` | Optional site lock | — |
| `ASSUMERAI_ALLOW_LOCAL_CANDIDATE_FALLBACK` | Explicitly allow cookie/in-memory fallbacks outside tests | `false` |

See `.env.example` for the full annotated list.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (webpack; `npm run dev:turbo` for Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript strict, no emit |
| `npm run lint` | ESLint |
| `node --test` | Full node:test suite (`npm test` adds the spec reporter) |
| `npm run test:fairness` | Counterfactual fairness suite only |
| `npm run fairness:report` | Regenerates `docs/fairness/latest.md` |
| `npm run adverse-impact:report` | Regenerates `docs/fairness/adverse-impact-latest.md` |

CI (`.github/workflows/ci.yml`) runs typecheck + lint + tests on every push
and PR, plus a second job that boots the Supabase CLI stack and verifies all
migrations apply cleanly.

## Architecture

```
CV upload ─► resume parsing (Anthropic|local) ─► candidate confirmation
        ─► server-authoritative interview session (per-module Session Store)
        ─► per turn: planner → funnel state machine → interviewer → BARS evaluator
        ─► aggregation → scorecard → matching (required-modules hard gate)
        ─► company review (human decision, SLA'd) — never automated rejection
```

### Interview engine

The structured interview is built on four separable functions — planner,
interviewer, funnel state machine, evaluator — wired per-turn by
`conduct-turn.ts`. Structure is enforced deterministically so the LLM stays
warm and human while the protocol stays rigid and auditable:

- **Planner** — `src/features/interview-flow/claude-resume-question-planner.ts`
  grounds questions in the confirmed CV and role (runs once per session).
- **Interviewer** — `src/features/interview-flow/interviewer-agent.ts` says one
  warm line per turn (higher temperature). It never decides flow, never scores.
- **Funnel state machine** — `src/features/interview-flow/funnel-state-machine.ts`
  deterministically drives rapport → exploration → challenge → closing and the
  STAR follow-up budget.
- **Evaluator** — `src/features/scoring/bars/evaluator.ts` scores one answer
  against one competency's behavioral anchors (low temperature), with STAR
  completeness, red flags, and a follow-up recommendation.
- **Aggregation** — `src/features/scoring/aggregation.ts` rolls answers up to
  competency → module → overall scorecard.
- **Match guard** — `src/features/matching/matching-engine.ts` blocks a match
  until every required module is complete.

Interview state is **server-authoritative**: `candidate_module_sessions` is the
single source of truth (service-role write only), turns are issued server-side
with anti-replay ids, and any session/state field arriving from the client is
rejected. Per-route rate limits, payload caps, and a daily LLM budget guard sit
in front of every provider call. Full flow, file map, and defensibility
mechanisms (BARS, STAR, funnel, Cohen's κ, adverse impact): see
[`docs/interview-engine.md`](docs/interview-engine.md).

### Data protection

Raw CVs live in the private `candidate-documents` Supabase bucket
(`{candidate_id}/{objectKey}`, owner read-only, service-role writes) and are
deleted by the `/api/cron/retention` job after their retention window, with an
audit event per deletion. Protected traits are never asked for, scored, or
inferred (`interview-flow/safety.ts`), and every generated line passes the
safety filter.

### Observability

`src/lib/log.ts` emits one JSON line per event (level, msg, correlationId,
route, candidate/workspace id). Every Anthropic/Deepgram call logs model,
latency, token usage, and outcome (`ok | fallback | error`) — a deterministic
fallback always produces a WARN line, so silent degradation is visible. Sentry
(`@sentry/nextjs`) is wired for client and server via the instrumentation
hooks and stays a no-op until a DSN is configured; `correlationId` travels as
a tag.

## Fairness reports

Scoring rigor and fairness are first-class, documented in
[`docs/scoring/methodology.md`](docs/scoring/methodology.md):

- **Counterfactual fairness** — `npm run test:fairness` proves score invariance
  to neutral attribute swaps (name, school, city); `npm run fairness:report`
  writes [`docs/fairness/latest.md`](docs/fairness/latest.md).
- **Adverse impact** — the four-fifths-rule monitor over neutral cohort proxies
  is exposed at `GET /admin/adverse-impact` and via
  `npm run adverse-impact:report`
  ([`docs/fairness/adverse-impact-latest.md`](docs/fairness/adverse-impact-latest.md)).
- **Inter-rater reliability** — ensemble evaluation with Cohen's κ monitoring;
  ambiguous items route to human review.
