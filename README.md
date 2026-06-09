This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Interview engine architecture

AssumerAI runs a structured, psychometric interview built on four separable
functions. Structure is enforced deterministically so the LLM stays warm and
human while the protocol stays rigid and auditable.

```
Job profile (module_plan: required · optional · auto_trigger · blocked)
  → Unlock engine (CV skills × module_plan) → per-module candidate dashboard
  → Per module, one turn at a time:
       planner  →  interviewer  →  evaluator  →  aggregation
  → Match guard: a candidate is matched only once required modules are complete.
```

- **Planner** — `src/features/interview-flow/claude-resume-question-planner.ts`
  grounds questions in the confirmed CV and role, and emits the funnel phases and
  short CV hooks for the rapport phase.
- **Interviewer** — `src/features/interview-flow/interviewer-agent.ts` says one
  warm line per turn (higher temperature). It never decides flow and never scores.
- **Funnel state machine** — `src/features/interview-flow/funnel-state-machine.ts`
  deterministically drives rapport → exploration → challenge → closing and the
  STAR follow-up budget.
- **Evaluator** — `src/features/scoring/bars/evaluator.ts` scores one answer
  against one competency's behavioral anchors (low temperature), with STAR
  completeness, red flags, and a follow-up recommendation.
- **Aggregation** — `src/features/scoring/aggregation.ts` rolls answers up to
  competency → module → overall scorecard (partial immediately, final when all
  required modules are complete).
- **Orchestration** — `src/features/interview-flow/conduct-turn.ts` wires planner,
  interviewer, evaluator and the funnel together for a single turn and produces an
  auditable `interview_evaluator_runs` record.
- **Match guard** — `src/features/matching/matching-engine.ts` adds a
  `required_modules` hard gate that blocks a match before scoring until every
  required module is completed.

Every Anthropic/TTS call has an injectable `fetchImpl` and a deterministic
fallback, and every generated line is filtered through
`interview-flow/safety.ts` so protected traits are never asked for or scored.

See [`docs/interview-engine.md`](docs/interview-engine.md) for the full flow,
file map, and defensibility mechanisms (BARS, STAR, funnel, Cohen's κ, adverse
impact hooks).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
