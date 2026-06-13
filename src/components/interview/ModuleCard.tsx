"use client";

import type { ModuleState } from "@/features/interview-flow";
import type { ModuleSessionState } from "@/features/interview-flow";

/**
 * Candidate-facing interview module cards (the dashboard from the "who decides
 * which modules" flow). Blocked modules are never rendered. Completed modules
 * show their done state and cannot be restarted. Tailwind core classes only.
 */

export interface ModuleCardModel {
  moduleId: string;
  title: string;
  description?: string;
  /** Unlock-engine state (required / auto_triggered / optional / blocked / completed). */
  state: ModuleState;
  /** Sub-session lifecycle, used to choose Start vs Resume. */
  sessionState?: ModuleSessionState;
  unlockReason: string;
  estimatedMinutes?: number;
  visibleToCandidate: boolean;
  requiredForMatch: boolean;
}

const STATE_BADGE: Record<ModuleState, { label: string; icon: string; className: string }> = {
  completed: { label: "Completed", icon: "✓", className: "bg-emerald-100 text-emerald-800" },
  auto_triggered: { label: "Unlocked", icon: "⚡", className: "bg-amber-100 text-amber-800" },
  required: { label: "Required", icon: "●", className: "bg-violet-100 text-violet-800" },
  optional: { label: "Optional", icon: "○", className: "bg-slate-100 text-slate-700" },
  blocked: { label: "Locked", icon: "🔒", className: "bg-slate-100 text-slate-400" },
  // Visible-as-locked: shown with the prerequisite reason, but not startable.
  locked_pending_prerequisite: {
    label: "Locked",
    icon: "🔒",
    className: "bg-slate-100 text-slate-500",
  },
};

export function ModuleCard({
  model,
  onStart,
}: {
  model: ModuleCardModel;
  onStart?: (moduleId: string) => void;
}) {
  // Blocked modules are never shown to the candidate.
  if (model.state === "blocked" || !model.visibleToCandidate) {
    return null;
  }

  const badge = STATE_BADGE[model.state];
  const isCompleted = model.state === "completed";
  const isLockedPending = model.state === "locked_pending_prerequisite";
  const ctaLabel = model.sessionState === "in_progress" ? "Riprendi" : "Inizia";

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{model.title}</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          <span aria-hidden>{badge.icon}</span>
          {badge.label}
        </span>
      </div>

      {model.description ? (
        <p className="text-sm text-slate-600">{model.description}</p>
      ) : null}

      <p className="text-xs text-slate-500">{model.unlockReason}</p>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-xs text-slate-500">
          {typeof model.estimatedMinutes === "number"
            ? `~${model.estimatedMinutes} min`
            : "Self-paced"}
        </span>

        {isCompleted ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
            ✓ Completed
          </span>
        ) : isLockedPending ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-400">
            🔒 Locked
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onStart?.(model.moduleId)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </article>
  );
}

export interface ModuleDashboardScorecard {
  status: "preview" | "final";
  partialScore: number;
  finalScore: number | null;
}

export interface ModuleDashboardInFlight {
  competencyName: string;
  funnelPhase: string;
  secondsRemaining?: number;
}

export function ModuleDashboard({
  modules,
  scorecard,
  inFlight,
  onStartModule,
}: {
  modules: ModuleCardModel[];
  scorecard?: ModuleDashboardScorecard;
  inFlight?: ModuleDashboardInFlight;
  onStartModule?: (moduleId: string) => void;
}) {
  // Never render blocked modules in the grid.
  const visibleModules = modules.filter(
    (module) => module.visibleToCandidate && module.state !== "blocked",
  );

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        {scorecard ? <ScorecardSummary scorecard={scorecard} /> : null}
        {inFlight ? <InFlightPanel inFlight={inFlight} /> : null}
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((module) => (
          <ModuleCard key={module.moduleId} model={module} onStart={onStartModule} />
        ))}
      </div>
    </section>
  );
}

function ScorecardSummary({ scorecard }: { scorecard: ModuleDashboardScorecard }) {
  const isFinal = scorecard.status === "final";
  const displayScore = isFinal ? scorecard.finalScore ?? scorecard.partialScore : scorecard.partialScore;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {isFinal ? "Final score" : "Partial score"}
      </p>
      <p className="text-2xl font-semibold text-slate-900">{displayScore}/10</p>
      <p className="text-xs text-slate-500">
        {isFinal
          ? "All required modules complete — this is your final score."
          : "Updates after each module; final once required modules are complete."}
      </p>
    </div>
  );
}

function InFlightPanel({ inFlight }: { inFlight: ModuleDashboardInFlight }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-right">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In progress</p>
      <p className="text-sm font-semibold text-slate-900">{inFlight.competencyName}</p>
      <p className="text-xs text-slate-500">
        Phase: {inFlight.funnelPhase}
        {typeof inFlight.secondsRemaining === "number"
          ? ` · ${Math.max(0, Math.round(inFlight.secondsRemaining))}s left`
          : ""}
      </p>
    </div>
  );
}
