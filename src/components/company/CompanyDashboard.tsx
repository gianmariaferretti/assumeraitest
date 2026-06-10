"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  LayoutDashboard,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SquarePen,
  UsersRound,
  XCircle
} from "lucide-react";

import type {
  CompanyDashboardData,
  CompanyDashboardMatch,
  CompanyDashboardRole
} from "@/features/company-workspace";
import { useI18n, type Language } from "@/lib/i18n";

type QueueKey = "new" | "hold" | "overdue" | "advanced" | "declined";
type CompanyDashboardCopy = ReturnType<typeof useI18n>["t"]["companyDashboard"];

const queueDefinitions: readonly {
  readonly key: QueueKey;
  readonly copyKey: keyof CompanyDashboardCopy["queues"];
}[] = [
  { key: "new", copyKey: "new" },
  { key: "hold", copyKey: "hold" },
  { key: "overdue", copyKey: "overdue" },
  { key: "advanced", copyKey: "advanced" },
  { key: "declined", copyKey: "declined" }
];

export function CompanyDashboard({
  dashboard,
  focusRoleId,
  onboardingIncomplete = false
}: {
  readonly dashboard: CompanyDashboardData;
  readonly focusRoleId?: string;
  readonly onboardingIncomplete?: boolean;
}) {
  const { language, t } = useI18n();
  const copy = t.companyDashboard;
  const [query, setQuery] = useState("");
  const visibleRoles = focusRoleId
    ? dashboard.roles.filter((role) => role.roleId === focusRoleId)
    : dashboard.roles;
  const visibleMatches = focusRoleId
    ? dashboard.matches.filter((match) => match.roleId === focusRoleId)
    : dashboard.matches;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMatches = useMemo(
    () =>
      normalizedQuery
        ? visibleMatches.filter((match) => matchMatchesQuery(match, normalizedQuery))
        : visibleMatches,
    [normalizedQuery, visibleMatches]
  );
  const filteredRoles = useMemo(
    () =>
      normalizedQuery
        ? visibleRoles.filter((role) => roleMatchesQuery(role, normalizedQuery))
        : visibleRoles,
    [normalizedQuery, visibleRoles]
  );
  const focusedRole = focusRoleId ? visibleRoles[0] : undefined;
  const isFirstRun =
    !focusRoleId && dashboard.roles.length === 0 && dashboard.matches.length === 0;

  if (isFirstRun) {
    return (
      <CompanyFirstRunDashboard
        copy={copy}
        dashboard={dashboard}
        onboardingIncomplete={onboardingIncomplete}
      />
    );
  }

  const sortedMatches = sortMatchesForReview(filteredMatches);
  const upcomingMatches = getUpcomingMatches(filteredMatches);
  const advancedCount = filteredMatches.filter(
    (match) => match.status === "company_advanced"
  ).length;
  const averageScore = calculateAverageScore(filteredMatches);
  const acceptanceRate =
    filteredMatches.length > 0 ? Math.round((advancedCount / filteredMatches.length) * 100) : 0;

  return (
    <main className="company-shell">
      <CompanyDashboardStyles />
      <div className="company-app-shell">
        <CompanySidebar
          copy={copy}
          dashboard={dashboard}
          focusRoleId={focusRoleId}
          visibleMatches={visibleMatches}
        />

        <section className="company-workspace" aria-label={copy.workspaceLabel}>
          <CompanyTopbar copy={copy} query={query} setQuery={setQuery} />

          {onboardingIncomplete ? (
            <section className="company-onboarding-banner" aria-label={copy.onboarding.title}>
              <div>
                <strong>{copy.onboarding.title}</strong>
                <p>{copy.onboarding.body}</p>
              </div>
              <Link href="/company/onboarding">{copy.actions.completeOnboarding}</Link>
            </section>
          ) : null}

          <header className="company-dashboard-heading company-anchor-target" id="overview">
            <div>
              <p>{focusRoleId ? copy.overview.focusLabel : copy.workspaceLabel}</p>
              <h1>
                {focusRoleId && focusedRole
                  ? `${copy.overview.focusPrefix} ${focusedRole.title}`
                  : `${copy.overview.greeting}, ${dashboard.companyName}`}
              </h1>
              <span>{copy.overview.summary}</span>
            </div>
            <div className="company-health-pill">
              <CheckCircle2 aria-hidden="true" size={15} />
              {copy.overview.allSystems}
            </div>
          </header>

          <section className="company-metrics" aria-label={copy.panels.workspaceMetrics}>
            <Metric
              detail={copy.metricDetails.activeRoles}
              icon={BriefcaseBusiness}
              label={copy.metrics.activeRoles}
              value={dashboard.metrics.activeRoles}
            />
            <Metric
              detail={copy.metricDetails.acceptedCandidates}
              icon={UsersRound}
              label={copy.metrics.acceptedCandidates}
              value={dashboard.metrics.acceptedCandidates}
            />
            <Metric
              detail={copy.metricDetails.overdueReviews}
              icon={AlertCircle}
              label={copy.metrics.overdueReviews}
              tone={dashboard.metrics.overdueReviews > 0 ? "urgent" : "neutral"}
              value={dashboard.metrics.overdueReviews}
            />
            <Metric
              detail={copy.metricDetails.unresolvedHolds}
              icon={Clock3}
              label={copy.metrics.unresolvedHolds}
              value={dashboard.metrics.unresolvedHolds}
            />
          </section>

          <section className="company-content-grid">
            <section
              className="company-panel company-candidate-panel company-anchor-target"
              id="candidates"
              aria-label={copy.candidateTable.title}
            >
              <div className="company-panel-heading">
                <div>
                  <h2>{copy.candidateTable.title}</h2>
                  <p>{copy.candidateTable.subtitle}</p>
                </div>
                <div className="company-table-tools" aria-label={copy.candidateTable.controls}>
                  <span>
                    <Filter aria-hidden="true" size={13} />
                    {copy.candidateTable.filters}
                  </span>
                  <span>
                    <SlidersHorizontal aria-hidden="true" size={13} />
                    {copy.candidateTable.sortScore}
                  </span>
                </div>
              </div>

              {sortedMatches.length > 0 ? (
                <div className="company-candidate-table">
                  <div className="company-candidate-table-head">
                    <span>{copy.candidateTable.candidate}</span>
                    <span>{copy.candidateTable.role}</span>
                    <span>{copy.candidateTable.score}</span>
                    <span>{copy.candidateTable.status}</span>
                    <span>{copy.candidateTable.action}</span>
                  </div>
                  <div className="company-candidate-table-body">
                    {sortedMatches.map((match) => (
                      <CandidateQueueRow
                        copy={copy}
                        key={match.matchId}
                        language={language}
                        match={match}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={UsersRound}
                  text={normalizedQuery ? copy.empty.noSearchResults : copy.empty.noMatches}
                  title={copy.candidateTable.emptyTitle}
                />
              )}
            </section>

            <aside className="company-side-stack">
              <RolePipelinePanel copy={copy} roles={filteredRoles} />
              <ScheduleReviewPanel
                copy={copy}
                language={language}
                matches={upcomingMatches}
              />
            </aside>
          </section>

          <section className="company-lower-grid">
            <AnalyticsPanel
              acceptanceRate={acceptanceRate}
              averageScore={averageScore}
              copy={copy}
              reviewLoad={filteredMatches.length}
            />
            <section className="company-panel company-queue-panel" aria-label={copy.panels.candidateQueues}>
              <div className="company-panel-heading">
                <div>
                  <h2>{copy.panels.candidateQueues}</h2>
                  <p>{copy.panels.candidateQueuesHint}</p>
                </div>
                <span className="company-count-pill">{copy.candidateTable.allRoles}</span>
              </div>
              <div className="company-queue-tabs">
                {queueDefinitions.map((queue) => {
                  const queueMatches = filterQueueMatches(filteredMatches, queue.key);
                  const queueCopy = copy.queues[queue.copyKey];
                  return (
                    <section className="queue-section" key={queue.key} aria-label={queueCopy.label}>
                      <div className="queue-heading">
                        <div>
                          <h3>{queueCopy.label}</h3>
                          <p>{queueCopy.description}</p>
                        </div>
                        <strong>{queueMatches.length}</strong>
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          </section>

          {focusedRole ? (
            <section className="company-panel company-role-detail-panel">
              <div className="company-panel-heading">
                <div>
                  <h2>{copy.panels.roleDetail}</h2>
                  <p>{copy.rolePipeline.roleDetailHint}</p>
                </div>
              </div>
              <RoleBlock copy={copy} role={focusedRole} showEditor />
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function CompanyFirstRunDashboard({
  copy,
  dashboard,
  onboardingIncomplete
}: {
  readonly copy: CompanyDashboardCopy;
  readonly dashboard: CompanyDashboardData;
  readonly onboardingIncomplete: boolean;
}) {
  const primaryHref = onboardingIncomplete ? "/company/onboarding" : "/company/roles/new";
  const primaryLabel = onboardingIncomplete
    ? copy.actions.finishSetup
    : copy.actions.createFirstRole;

  return (
    <main className="company-shell">
      <CompanyDashboardStyles />
      <div className="company-app-shell first-run">
        <CompanySidebar
          copy={copy}
          dashboard={dashboard}
          focusRoleId={undefined}
          visibleMatches={dashboard.matches}
        />

        <section className="company-workspace" aria-label={copy.firstRun.stepsLabel}>
          <CompanyTopbar copy={copy} query="" setQuery={() => undefined} />

          <section className="company-first-run company-anchor-target" id="overview">
            <div className="company-first-run-copy">
              <p>{copy.firstRun.startLabel}</p>
              <h1>{copy.firstRun.firstRunTitle}</h1>
              <span>{copy.firstRun.body}</span>
              <div className="company-first-run-actions">
                <Link className="company-primary-action" href={primaryHref}>
                  <Plus aria-hidden="true" size={16} />
                  {primaryLabel}
                </Link>
                <Link className="company-secondary-action" href="/company/onboarding">
                  {copy.actions.companyDetails}
                </Link>
              </div>
            </div>

            <div className="company-start-steps">
              <div className={onboardingIncomplete ? "company-start-step current" : "company-start-step done"}>
                <span>01</span>
                <strong>{copy.firstRun.companyDetails}</strong>
                <p>
                  {onboardingIncomplete
                    ? copy.firstRun.companyDetailsTodo
                    : copy.firstRun.ready}
                </p>
              </div>
              <div
                className={onboardingIncomplete ? "company-start-step" : "company-start-step current"}
                id="roles"
              >
                <span>02</span>
                <strong>{copy.firstRun.firstRole}</strong>
                <p>{copy.firstRun.firstRoleBody}</p>
              </div>
              <div className="company-start-step" id="candidates">
                <span>03</span>
                <strong>{copy.firstRun.candidateQueue}</strong>
                <p>{copy.firstRun.candidateQueueBody}</p>
              </div>
            </div>
          </section>

          <section className="company-first-run-mini-grid">
            <section className="company-panel company-anchor-target" id="schedule" aria-label={copy.scheduleReview.title}>
              <div className="company-panel-heading">
                <div>
                  <h2>{copy.scheduleReview.title}</h2>
                  <p>{copy.scheduleReview.subtitle}</p>
                </div>
              </div>
              <EmptyState
                icon={CalendarDays}
                text={copy.empty.noUpcomingReviews}
                title={copy.scheduleReview.emptyTitle}
              />
            </section>
            <section className="company-panel company-anchor-target" id="analytics" aria-label={copy.analytics.title}>
              <div className="company-panel-heading">
                <div>
                  <h2>{copy.analytics.title}</h2>
                  <p>{copy.analytics.subtitle}</p>
                </div>
              </div>
              <div className="company-analytics-grid">
                <AnalyticsStat label={copy.analytics.advanceRate} value={copy.analytics.noData} />
                <AnalyticsStat label={copy.analytics.averageScore} value={copy.analytics.noData} />
                <AnalyticsStat label={copy.analytics.reviewLoad} value="0" />
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}

export function CompanyDashboardSetupFallback() {
  const { t } = useI18n();
  const copy = t.companyDashboard;

  return (
    <main className="company-shell">
      <CompanyDashboardStyles />
      <section className="company-setup-fallback" aria-label={copy.firstRun.stepsLabel}>
        <div className="company-first-run-copy">
          <p>{copy.workspaceLabel}</p>
          <h1>{copy.firstRun.fallbackTitle}</h1>
          <span>{copy.firstRun.fallbackBody}</span>
        </div>

        <div className="company-fallback-steps">
          {[
            copy.firstRun.companyDetails,
            copy.firstRun.firstRole,
            copy.firstRun.candidateQueue
          ].map((label, index) => (
            <div className="company-fallback-step" key={label}>
              <span>
                {copy.firstRun.stepLabel} {index + 1}
              </span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>

        <div className="company-first-run-actions">
          <Link className="company-primary-action" href="/company/onboarding">
            <Plus aria-hidden="true" size={16} />
            {copy.actions.finishSetup}
          </Link>
          <Link className="company-secondary-action" href="/company/profile">
            {copy.firstRun.backToProfile}
          </Link>
        </div>
      </section>
    </main>
  );
}

function CompanySidebar({
  copy,
  dashboard,
  focusRoleId,
  visibleMatches
}: {
  readonly copy: CompanyDashboardCopy;
  readonly dashboard: CompanyDashboardData;
  readonly focusRoleId?: string;
  readonly visibleMatches: readonly CompanyDashboardMatch[];
}) {
  const roleHref = focusRoleId
    ? `/company/roles/${focusRoleId}`
    : dashboard.roles[0]
      ? `/company/roles/${dashboard.roles[0].roleId}`
      : "/company/roles/new";

  return (
    <aside className="company-sidebar">
      <div className="company-sidebar-brand">
        <span>{getInitials(dashboard.companyName)}</span>
        <div>
          <strong>{dashboard.companyName}</strong>
          <small>{copy.nav.workspace}</small>
        </div>
      </div>

      <nav className="company-sidebar-nav" aria-label={copy.nav.label}>
        <CompanyNavItem active href="/company/dashboard" icon={LayoutDashboard} label={copy.nav.overview} />
        <CompanyNavItem href={roleHref} icon={BriefcaseBusiness} label={copy.nav.roles} />
        <CompanyNavItem href="/company/dashboard#candidates" icon={UsersRound} label={copy.nav.candidates} />
        <CompanyNavItem href="/company/dashboard#schedule" icon={CalendarDays} label={copy.nav.schedule} />
        <CompanyNavItem href="/company/dashboard#analytics" icon={BarChart3} label={copy.nav.analytics} />
        <CompanyNavItem href="/company/onboarding" icon={Settings} label={copy.nav.settings} />
      </nav>

      <div className="company-sidebar-footer">
        <ShieldCheck aria-hidden="true" size={16} />
        <div>
          <strong>{copy.overview.consentGated}</strong>
          <span className="company-sidebar-footer-count">
            <b>{visibleMatches.length}</b>
            {copy.nav.visibleMatches}
          </span>
        </div>
      </div>
    </aside>
  );
}

function CompanyTopbar({
  copy,
  query,
  setQuery
}: {
  readonly copy: CompanyDashboardCopy;
  readonly query: string;
  readonly setQuery: (value: string) => void;
}) {
  return (
    <div className="company-topbar">
      <label className="company-search">
        <Search aria-hidden="true" size={15} />
        <span className="sr-only">{copy.search.label}</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.search.placeholder}
          type="search"
          value={query}
        />
      </label>
      <div className="company-topbar-actions">
        <Link className="company-secondary-action compact" href="/company/onboarding">
          {copy.actions.companyProfile}
        </Link>
        <Link className="company-primary-action compact" href="/company/roles/new">
          <Plus aria-hidden="true" size={15} />
          {copy.actions.newRole}
        </Link>
      </div>
    </div>
  );
}

function CompanyNavItem({
  active = false,
  href,
  icon: Icon,
  label
}: {
  readonly active?: boolean;
  readonly href: string;
  readonly icon: typeof LayoutDashboard;
  readonly label: string;
}) {
  return (
    <Link className={active ? "company-nav-item active" : "company-nav-item"} href={href}>
      <Icon aria-hidden="true" size={15} />
      <span>{label}</span>
    </Link>
  );
}

function RolePipelinePanel({
  copy,
  roles
}: {
  readonly copy: CompanyDashboardCopy;
  readonly roles: readonly CompanyDashboardRole[];
}) {
  const maxRoleCount = Math.max(
    1,
    ...roles.map((role) => role.openMatchCount + role.overdueMatchCount)
  );

  return (
    <section
      className="company-panel company-pipeline company-role-pipeline company-anchor-target"
      id="roles"
      aria-label={copy.rolePipeline.title}
    >
      <div className="company-panel-heading">
        <div>
          <h2>{copy.rolePipeline.title}</h2>
          <p>{copy.rolePipeline.subtitle}</p>
        </div>
        <span className="company-count-pill">{copy.rolePipeline.allRoles}</span>
      </div>

      {roles.length > 0 ? (
        <div className="company-pipeline-list">
          {roles.slice(0, 5).map((role) => {
            const total = role.openMatchCount + role.overdueMatchCount;
            const width = Math.max(8, Math.round((total / maxRoleCount) * 100));
            const overdueWidth = total > 0 ? Math.round((role.overdueMatchCount / total) * 100) : 0;

            return (
              <Link className="company-pipeline-row" href={`/company/roles/${role.roleId}`} key={role.roleId}>
                <div className="company-pipeline-title">
                  <strong>{role.title}</strong>
                  <span>{getRoleStatusLabel(role.status, copy)}</span>
                </div>
                <div className="company-pipeline-bar" aria-hidden="true">
                  <span style={{ width: `${width}%` }}>
                    <i style={{ width: `${overdueWidth}%` }} />
                  </span>
                </div>
                <div className="company-pipeline-meta">
                  <span>
                    {role.openMatchCount} {copy.rolePipeline.accepted}
                  </span>
                  <span>
                    {role.overdueMatchCount} {copy.rolePipeline.overdue}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={BriefcaseBusiness} text={copy.empty.roles} title={copy.rolePipeline.emptyTitle} />
      )}
    </section>
  );
}

function ScheduleReviewPanel({
  copy,
  language,
  matches
}: {
  readonly copy: CompanyDashboardCopy;
  readonly language: Language;
  readonly matches: readonly CompanyDashboardMatch[];
}) {
  return (
    <section className="company-panel company-schedule-panel company-anchor-target" id="schedule" aria-label={copy.scheduleReview.title}>
      <div className="company-panel-heading">
        <div>
          <h2>{copy.scheduleReview.title}</h2>
          <p>{copy.scheduleReview.subtitle}</p>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="company-schedule-list">
          {matches.slice(0, 4).map((match) => (
            <Link className="company-schedule-item" href={`/company/review/${match.matchId}`} key={match.matchId}>
              <span>{getScheduleLabel(match, copy)}</span>
              <strong>{match.candidateName}</strong>
              <small>
                {match.reviewDueAt
                  ? formatDate(match.reviewDueAt, language)
                  : copy.scheduleReview.noDate}
              </small>
              {formatReviewCountdown(match, copy) ? (
                <small className={match.isOverdue ? "review-countdown overdue" : "review-countdown"}>
                  {formatReviewCountdown(match, copy)}
                </small>
              ) : null}
              <ChevronRight aria-hidden="true" size={14} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarDays} text={copy.empty.noUpcomingReviews} title={copy.scheduleReview.emptyTitle} />
      )}
    </section>
  );
}

function AnalyticsPanel({
  acceptanceRate,
  averageScore,
  copy,
  reviewLoad
}: {
  readonly acceptanceRate: number;
  readonly averageScore: number;
  readonly copy: CompanyDashboardCopy;
  readonly reviewLoad: number;
}) {
  return (
    <section className="company-panel company-analytics-panel company-anchor-target" id="analytics" aria-label={copy.analytics.title}>
      <div className="company-panel-heading">
        <div>
          <h2>{copy.analytics.title}</h2>
          <p>{copy.analytics.subtitle}</p>
        </div>
      </div>

      <div className="company-analytics-grid">
        <AnalyticsStat label={copy.analytics.advanceRate} value={`${acceptanceRate}%`} />
        <AnalyticsStat label={copy.analytics.averageScore} value={averageScore > 0 ? String(averageScore) : copy.analytics.noData} />
        <AnalyticsStat label={copy.analytics.reviewLoad} value={String(reviewLoad)} />
      </div>
    </section>
  );
}

function AnalyticsStat({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="company-analytics-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RoleBlock({
  copy,
  role,
  showEditor
}: {
  readonly copy: CompanyDashboardCopy;
  readonly role: CompanyDashboardRole;
  readonly showEditor: boolean;
}) {
  const statusClass =
    role.status === "closed"
      ? "role-status-closed"
      : role.status === "paused"
        ? "role-status-paused"
        : "role-status-active";

  return (
    <article className={`role-block ${statusClass}`}>
      <Link className="role-row" href={`/company/roles/${role.roleId}`}>
        <div>
          <strong>{role.title}</strong>
          <span>{role.locationConstraints.join(", ") || copy.role.locationPending}</span>
          <em>{getRoleStatusLabel(role.status, copy)}</em>
        </div>
        <dl>
          <div>
            <dt>{copy.role.open}</dt>
            <dd>{role.openMatchCount}</dd>
          </div>
          <div>
            <dt>{copy.role.overdue}</dt>
            <dd>{role.overdueMatchCount}</dd>
          </div>
        </dl>
      </Link>

      {showEditor ? (
        <div className="role-detail-tools">
          <form action={`/company/roles/${role.roleId}/update`} className="role-edit-form" method="post">
            <div className="role-edit-grid">
              <label>
                {copy.role.title}
                <input defaultValue={role.title} name="title" required />
              </label>
              <label>
                {copy.role.locations}
                <input
                  defaultValue={role.locationConstraints.join(", ")}
                  name="location_constraints"
                  required
                />
              </label>
              <label>
                {copy.role.workModes}
                <input defaultValue={role.workModes.join(", ")} name="work_modes" required />
              </label>
              <label>
                {copy.role.requiredSkills}
                <textarea name="requirements.required_skills" required rows={3} />
              </label>
              <label>
                {copy.role.clientFacingPercentage}
                <input
                  defaultValue={readNumber(role.dailyWorkReality.client_facing_percentage) ?? 40}
                  max={100}
                  min={0}
                  name="daily_work_reality.client_facing_percentage"
                  required
                  type="number"
                />
              </label>
              <label>
                {copy.role.meetingLoad}
                <select
                  defaultValue={readString(role.dailyWorkReality.meeting_load) ?? "medium"}
                  name="daily_work_reality.meeting_load"
                  required
                >
                  <option value="medium">{copy.role.meetingMedium}</option>
                  <option value="low">{copy.role.meetingLow}</option>
                  <option value="high">{copy.role.meetingHigh}</option>
                </select>
              </label>
            </div>
            <button type="submit">
              <SquarePen aria-hidden="true" size={15} />
              {copy.actions.saveEdits}
            </button>
          </form>

          <form action={`/company/roles/${role.roleId}/status`} className="role-lifecycle-actions" method="post">
            <button disabled={role.status === "paused"} name="action" type="submit" value="pause">
              <PauseCircle aria-hidden="true" size={15} />
              {copy.actions.pause}
            </button>
            <button disabled={role.status === "closed"} name="action" type="submit" value="close">
              <XCircle aria-hidden="true" size={15} />
              {copy.actions.close}
            </button>
            <button name="action" type="submit" value="activate">
              <PlayCircle aria-hidden="true" size={15} />
              {role.status === "closed" ? copy.actions.reopen : copy.actions.activate}
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function CandidateQueueRow({
  copy,
  language,
  match
}: {
  readonly copy: CompanyDashboardCopy;
  readonly language: Language;
  readonly match: CompanyDashboardMatch;
}) {
  const statusLabel = formatCompanyMatchStatus(match.status, copy);

  return (
    <Link
      className={match.isOverdue ? "company-candidate-row overdue" : "company-candidate-row"}
      data-reviewDueAt={match.reviewDueAt ?? ""}
      href={`/company/review/${match.matchId}`}
    >
      <div className="candidate-cell-main">
        <span className="candidate-avatar" aria-hidden="true">
          {getInitials(match.candidateName)}
        </span>
        <div>
          <strong>{match.candidateName}</strong>
          <p>{match.candidateHeadline}</p>
        </div>
      </div>
      <span>{match.roleTitle}</span>
      <strong className="candidate-score">{match.matchScore}</strong>
      <div className="candidate-status-stack">
        <span className={match.isOverdue ? "status-pill urgent" : "status-pill"}>{statusLabel}</span>
        <small>
          {match.reviewDueAt
            ? `${copy.match.reviewDueAt} ${formatDate(match.reviewDueAt, language)}`
            : copy.match.pending}
        </small>
        {formatReviewCountdown(match, copy) ? (
          <small className={match.isOverdue ? "review-countdown overdue" : "review-countdown"}>
            {formatReviewCountdown(match, copy)}
          </small>
        ) : null}
        <small>
          {match.contactVisibility === "visible_after_advance"
            ? copy.candidateTable.contactVisible
            : copy.candidateTable.contactHidden}
        </small>
      </div>
      <span className="candidate-open-review">
        {copy.candidateTable.openReview}
        <ChevronRight aria-hidden="true" size={13} />
      </span>
    </Link>
  );
}

function Metric({
  detail,
  icon: Icon,
  label,
  tone = "neutral",
  value
}: {
  readonly detail: string;
  readonly icon: typeof BriefcaseBusiness;
  readonly label: string;
  readonly tone?: "neutral" | "urgent";
  readonly value: number;
}) {
  return (
    <div className={tone === "urgent" ? "company-metric urgent" : "company-metric"}>
      <div className="company-metric-top">
        <Icon aria-hidden="true" size={15} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
  title
}: {
  readonly icon: typeof BriefcaseBusiness;
  readonly text: string;
  readonly title: string;
}) {
  return (
    <div className="empty-state">
      <Icon aria-hidden="true" size={18} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function filterQueueMatches(
  matches: readonly CompanyDashboardMatch[],
  queue: QueueKey
): readonly CompanyDashboardMatch[] {
  if (queue === "new") return matches.filter((match) => match.status === "candidate_accepted");
  if (queue === "hold") return matches.filter((match) => match.status === "company_hold");
  if (queue === "overdue") {
    return matches.filter(
      (match) =>
        match.isOverdue &&
        match.status !== "company_advanced" &&
        match.status !== "company_declined"
    );
  }
  if (queue === "advanced") return matches.filter((match) => match.status === "company_advanced");
  return matches.filter((match) => match.status === "company_declined");
}

function sortMatchesForReview(
  matches: readonly CompanyDashboardMatch[]
): readonly CompanyDashboardMatch[] {
  return [...matches].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.status === "candidate_accepted" && b.status !== "candidate_accepted") return -1;
    if (b.status === "candidate_accepted" && a.status !== "candidate_accepted") return 1;
    return b.matchScore - a.matchScore;
  });
}

function getUpcomingMatches(
  matches: readonly CompanyDashboardMatch[]
): readonly CompanyDashboardMatch[] {
  return [...matches]
    .filter((match) => match.reviewDueAt || match.companyFollowUpAt || match.isOverdue)
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return readTimestamp(a.reviewDueAt ?? a.companyFollowUpAt) - readTimestamp(b.reviewDueAt ?? b.companyFollowUpAt);
    });
}

function matchMatchesQuery(match: CompanyDashboardMatch, query: string): boolean {
  return [
    match.candidateName,
    match.candidateHeadline,
    match.roleTitle,
    match.transcriptExcerpt,
    match.transcriptText,
    match.companyDecisionReason,
    match.companyNextStep,
    String(match.matchScore)
  ].some((value) => value?.toLowerCase().includes(query));
}

function roleMatchesQuery(role: CompanyDashboardRole, query: string): boolean {
  return [
    role.title,
    role.status,
    role.locationConstraints.join(" "),
    role.workModes.join(" ")
  ].some((value) => value.toLowerCase().includes(query));
}

function calculateAverageScore(matches: readonly CompanyDashboardMatch[]): number {
  if (matches.length === 0) return 0;
  return Math.round(
    matches.reduce((total, match) => total + match.matchScore, 0) / matches.length
  );
}

function getScheduleLabel(match: CompanyDashboardMatch, copy: CompanyDashboardCopy): string {
  if (match.isOverdue) return copy.scheduleReview.overdue;
  if (match.status === "company_hold") return copy.scheduleReview.followUp;
  return copy.scheduleReview.review;
}

/**
 * Per-match verdict countdown against the 14-day review SLA:
 * "{n} days left", "due today", or "overdue by {n} days".
 */
function formatReviewCountdown(
  match: CompanyDashboardMatch,
  copy: CompanyDashboardCopy,
  nowMs = Date.now()
): string | null {
  if (!match.reviewDueAt) return null;
  const dueMs = Date.parse(match.reviewDueAt);
  if (!Number.isFinite(dueMs)) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((dueMs - nowMs) / dayMs);
  if (daysLeft > 0) {
    return copy.match.daysLeft.replace("{days}", String(daysLeft));
  }
  if (daysLeft === 0) {
    return copy.match.dueToday;
  }
  return copy.match.overdueByDays.replace("{days}", String(Math.abs(daysLeft)));
}

function getRoleStatusLabel(
  status: CompanyDashboardRole["status"],
  copy: CompanyDashboardCopy
): string {
  if (status === "closed") return copy.role.statusClosed;
  if (status === "paused") return copy.role.statusPaused;
  return copy.role.statusActive;
}

function formatCompanyMatchStatus(status: string, copy: CompanyDashboardCopy): string {
  if (status === "company_advanced") return copy.match.advanced;
  if (status === "company_hold") return copy.match.hold;
  if (status === "company_declined") return copy.match.declined;
  return copy.match.new;
}

function formatDate(value: string, language: Language): string {
  const localeByLanguage: Record<Language, string> = {
    en: "en",
    fr: "fr-FR",
    it: "it-IT"
  };

  return new Intl.DateTimeFormat(localeByLanguage[language], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getInitials(value: string): string {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "A";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readTimestamp(value: string | null | undefined): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function CompanyDashboardStyles() {
  return (
    <style>{`
      .company-shell {
        background:
          radial-gradient(circle at 88% 8%, rgba(120, 168, 240, 0.14), transparent 28%),
          linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
        color: #111827;
        font-family: var(--font-geist-sans), sans-serif;
        min-height: 100dvh;
        padding: 86px clamp(12px, 2.2vw, 24px) 44px;
      }

      .company-shell * {
        box-sizing: border-box;
      }

      .company-app-shell {
        display: grid;
        gap: 14px;
        grid-template-columns: 184px minmax(0, 1fr);
        margin: 0 auto;
        max-width: 1280px;
      }

      .company-sidebar,
      .company-panel,
      .company-metric,
      .company-first-run,
      .company-setup-fallback,
      .company-onboarding-banner {
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 8px;
        box-shadow: 0 18px 44px -34px rgba(15, 23, 42, 0.34);
      }

      .company-sidebar {
        align-self: start;
        display: grid;
        gap: 16px;
        min-height: calc(100dvh - 116px);
        padding: 12px;
        position: sticky;
        top: 86px;
      }

      .company-sidebar-brand {
        align-items: center;
        display: flex;
        gap: 9px;
        min-width: 0;
        padding: 4px 3px 8px;
      }

      .company-sidebar-brand > span,
      .candidate-avatar {
        align-items: center;
        background: linear-gradient(135deg, #9cebd8, #8bb8ff 62%, #f0a7d4);
        border-radius: 999px;
        color: #0f172a;
        display: inline-flex;
        font-size: 0.68rem;
        font-weight: 900;
        height: 26px;
        justify-content: center;
        width: 26px;
      }

      .company-sidebar-brand div {
        display: grid;
        min-width: 0;
      }

      .company-sidebar-brand strong,
      .company-sidebar-footer strong,
      .candidate-cell-main strong,
      .company-schedule-item strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .company-sidebar-brand small,
      .company-sidebar-footer span,
      .company-dashboard-heading span,
      .company-panel-heading p,
      .company-metric p,
      .candidate-cell-main p,
      .candidate-status-stack small,
      .queue-heading p,
      .empty-state p,
      .company-schedule-item small,
      .company-pipeline-meta,
      .company-pipeline-title span {
        color: #64748b;
        font-size: 0.76rem;
        line-height: 1.35;
        margin: 0;
      }

      .company-sidebar-nav {
        display: grid;
        gap: 3px;
      }

      .company-nav-item {
        align-items: center;
        border-radius: 7px;
        color: #475569;
        display: flex;
        font-size: 0.82rem;
        font-weight: 760;
        gap: 8px;
        min-height: 32px;
        padding: 7px 8px;
        text-decoration: none;
        transition: background 160ms ease, color 160ms ease, transform 160ms ease;
      }

      .company-nav-item:hover,
      .company-nav-item.active {
        background: #eef5ff;
        color: #0f172a;
      }

      .company-nav-item:active,
      .company-primary-action:active,
      .company-secondary-action:active,
      .role-edit-form button:active,
      .role-lifecycle-actions button:active {
        transform: translateY(1px);
      }

      .company-sidebar-footer {
        align-items: center;
        align-self: end;
        background: #f8fafc;
        border: 1px solid rgba(15, 23, 42, 0.07);
        border-radius: 8px;
        display: flex;
        gap: 8px;
        min-width: 0;
        padding: 10px;
      }

      .company-sidebar-footer > div {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .company-sidebar-footer-count {
        align-items: baseline;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .company-sidebar-footer-count b {
        color: #0f172a;
        font-family: var(--font-geist-mono), monospace;
        font-size: 0.75rem;
        line-height: 1;
      }

      .company-workspace {
        display: grid;
        gap: 12px;
        min-width: 0;
      }

      .company-anchor-target {
        scroll-margin-top: 104px;
      }

      .company-topbar {
        align-items: center;
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .company-search {
        align-items: center;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 999px;
        color: #94a3b8;
        display: flex;
        gap: 8px;
        min-height: 38px;
        padding: 0 12px;
      }

      .company-search input {
        background: transparent;
        border: 0;
        color: #0f172a;
        font: inherit;
        font-size: 0.84rem;
        min-width: 0;
        outline: 0;
        width: 100%;
      }

      .company-topbar-actions,
      .company-first-run-actions,
      .role-lifecycle-actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: end;
      }

      .company-primary-action,
      .company-secondary-action,
      .company-onboarding-banner a,
      .role-edit-form button,
      .role-lifecycle-actions button {
        align-items: center;
        border-radius: 999px;
        display: inline-flex;
        font: inherit;
        font-size: 0.84rem;
        font-weight: 850;
        gap: 7px;
        justify-content: center;
        min-height: 38px;
        padding: 8px 13px;
        text-align: center;
        text-decoration: none;
        transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        white-space: normal;
      }

      .company-primary-action.compact,
      .company-secondary-action.compact {
        min-height: 36px;
        padding: 7px 12px;
      }

      .company-primary-action,
      .company-onboarding-banner a,
      .role-edit-form button {
        background: #0f172a;
        border: 1px solid #0f172a;
        color: #ffffff;
      }

      .company-secondary-action,
      .role-lifecycle-actions button {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(15, 23, 42, 0.11);
        color: #0f172a;
      }

      .role-lifecycle-actions button:disabled {
        cursor: not-allowed;
        opacity: 0.48;
      }

      .company-onboarding-banner {
        align-items: center;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        padding: 12px 14px;
      }

      .company-onboarding-banner p {
        color: #64748b;
        font-size: 0.82rem;
        line-height: 1.45;
        margin: 3px 0 0;
      }

      .company-dashboard-heading {
        align-items: end;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        padding: 4px 2px 2px;
      }

      .company-dashboard-heading p,
      .company-first-run-copy > p,
      .company-start-step span,
      .company-fallback-step span {
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        margin: 0;
        text-transform: uppercase;
      }

      .company-dashboard-heading h1 {
        color: #0f172a;
        font-size: clamp(1.35rem, 2vw, 1.9rem);
        letter-spacing: -0.02em;
        line-height: 1.08;
        margin: 4px 0 3px;
        overflow-wrap: anywhere;
      }

      .company-health-pill,
      .company-count-pill,
      .company-table-tools span,
      .status-pill {
        align-items: center;
        background: #eefdf7;
        border: 1px solid rgba(20, 184, 166, 0.18);
        border-radius: 999px;
        color: #0f766e;
        display: inline-flex;
        font-size: 0.74rem;
        font-weight: 850;
        gap: 6px;
        min-height: 26px;
        padding: 5px 9px;
        white-space: nowrap;
      }

      .company-metrics,
      .company-content-grid,
      .company-lower-grid {
        display: grid;
        gap: 12px;
      }

      .company-metrics {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .company-metric {
        display: grid;
        gap: 7px;
        min-height: 94px;
        padding: 12px;
      }

      .company-metric.urgent {
        border-color: rgba(220, 38, 38, 0.2);
      }

      .company-metric-top {
        align-items: center;
        color: #64748b;
        display: flex;
        font-size: 0.76rem;
        font-weight: 820;
        gap: 7px;
      }

      .company-metric strong {
        color: #0f172a;
        font-family: var(--font-geist-mono), monospace;
        font-size: 1.55rem;
        line-height: 1;
      }

      .company-content-grid {
        align-items: start;
        grid-template-columns: minmax(0, 1.58fr) minmax(280px, 0.8fr);
      }

      .company-lower-grid {
        grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1fr);
      }

      .company-panel {
        display: grid;
        gap: 12px;
        padding: 14px;
      }

      .company-side-stack {
        display: grid;
        gap: 12px;
      }

      .company-panel-heading,
      .queue-heading {
        align-items: start;
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }

      .company-panel-heading h2,
      .queue-heading h3 {
        color: #0f172a;
        font-size: 0.98rem;
        letter-spacing: -0.01em;
        margin: 0;
      }

      .company-table-tools {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: end;
      }

      .company-table-tools span,
      .company-count-pill {
        background: #f8fafc;
        border-color: rgba(15, 23, 42, 0.08);
        color: #475569;
      }

      .company-candidate-table {
        border: 1px solid rgba(15, 23, 42, 0.07);
        border-radius: 8px;
        overflow: hidden;
      }

      .company-candidate-table-head,
      .company-candidate-row {
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(190px, 1.25fr) minmax(140px, 0.85fr) 62px minmax(156px, 0.8fr) 86px;
      }

      .company-candidate-table-head {
        background: #f8fafc;
        color: #64748b;
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.07em;
        padding: 9px 12px;
        text-transform: uppercase;
      }

      .company-candidate-table-body {
        display: grid;
      }

      .company-candidate-row {
        align-items: center;
        border-top: 1px solid rgba(15, 23, 42, 0.07);
        color: inherit;
        min-height: 62px;
        padding: 9px 12px;
        text-decoration: none;
      }

      .company-candidate-row:first-child {
        border-top: 0;
      }

      .company-candidate-row:hover {
        background: #fbfdff;
      }

      .company-candidate-row.overdue {
        background: #fffafa;
      }

      .candidate-cell-main {
        align-items: center;
        display: flex;
        gap: 9px;
        min-width: 0;
      }

      .candidate-cell-main div,
      .candidate-status-stack,
      .company-pipeline-title {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .candidate-cell-main strong,
      .company-pipeline-title strong {
        color: #0f172a;
        font-size: 0.84rem;
      }

      .candidate-cell-main p {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .candidate-score {
        color: #0f766e;
        font-family: var(--font-geist-mono), monospace;
        font-size: 0.94rem;
      }

      .status-pill {
        justify-self: start;
        min-height: 23px;
        padding: 3px 8px;
      }

      .status-pill.urgent {
        background: #fff1f2;
        border-color: rgba(225, 29, 72, 0.2);
        color: #be123c;
      }

      .candidate-open-review {
        align-items: center;
        color: #2563eb;
        display: flex;
        font-size: 0.78rem;
        font-weight: 850;
        gap: 4px;
        justify-content: end;
      }

      .company-pipeline-list,
      .company-schedule-list,
      .company-queue-tabs,
      .role-detail-tools,
      .role-list {
        display: grid;
        gap: 8px;
      }

      .company-pipeline-row,
      .company-schedule-item {
        border: 1px solid rgba(15, 23, 42, 0.07);
        border-radius: 8px;
        color: inherit;
        display: grid;
        gap: 8px;
        padding: 10px;
        text-decoration: none;
      }

      .company-pipeline-bar {
        background: #edf2f7;
        border-radius: 999px;
        height: 8px;
        overflow: hidden;
      }

      .company-pipeline-bar > span {
        background: linear-gradient(90deg, #2563eb, #14b8a6);
        border-radius: inherit;
        display: block;
        height: 100%;
        min-width: 8px;
        overflow: hidden;
      }

      .company-pipeline-bar i {
        background: #f97316;
        display: block;
        height: 100%;
      }

      .company-pipeline-meta {
        display: flex;
        gap: 8px;
        justify-content: space-between;
      }

      .company-schedule-item {
        align-items: center;
        grid-template-columns: minmax(64px, 0.34fr) minmax(0, 1fr) auto auto;
      }

      .company-schedule-item > span {
        color: #2563eb;
        font-size: 0.74rem;
        font-weight: 850;
      }

      .company-analytics-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .company-analytics-stat {
        background: #f8fafc;
        border: 1px solid rgba(15, 23, 42, 0.06);
        border-radius: 8px;
        display: grid;
        gap: 8px;
        padding: 11px;
      }

      .company-analytics-stat span {
        color: #64748b;
        font-size: 0.74rem;
        font-weight: 820;
      }

      .company-analytics-stat strong {
        color: #0f172a;
        font-family: var(--font-geist-mono), monospace;
        font-size: 1.18rem;
      }

      .queue-section,
      .role-block {
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 8px;
      }

      .queue-section {
        padding: 10px;
      }

      .queue-heading strong {
        color: #0f172a;
        font-family: var(--font-geist-mono), monospace;
        font-size: 1rem;
      }

      .company-first-run {
        display: grid;
        gap: 22px;
        grid-template-columns: minmax(0, 0.95fr) minmax(260px, 0.62fr);
        padding: clamp(18px, 3vw, 30px);
      }

      .company-first-run-mini-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .company-setup-fallback {
        display: grid;
        gap: 18px;
        margin: 0 auto;
        max-width: 780px;
        padding: clamp(18px, 3vw, 30px);
      }

      .company-first-run-copy {
        align-content: start;
        display: grid;
        gap: 12px;
      }

      .company-first-run-copy h1 {
        color: #0f172a;
        font-size: clamp(1.55rem, 2.8vw, 2.45rem);
        letter-spacing: -0.025em;
        line-height: 1.06;
        margin: 0;
        max-width: 760px;
        overflow-wrap: anywhere;
      }

      .company-first-run-copy > span,
      .company-start-step p {
        color: #64748b;
        line-height: 1.45;
        margin: 0;
      }

      .company-start-steps {
        border-left: 1px solid rgba(15, 23, 42, 0.1);
        display: grid;
        gap: 0;
        padding-left: 16px;
      }

      .company-fallback-steps {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .company-fallback-step {
        background: #f8fafc;
        border: 1px solid rgba(15, 23, 42, 0.07);
        border-radius: 8px;
        display: grid;
        gap: 8px;
        min-height: 88px;
        padding: 12px;
      }

      .company-start-step {
        border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        display: grid;
        gap: 6px;
        padding: 15px 0;
      }

      .company-start-step:first-child {
        padding-top: 0;
      }

      .company-start-step:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .company-start-step strong {
        color: #0f172a;
      }

      .company-start-step.current span {
        color: #2563eb;
      }

      .company-start-step.done span {
        color: #0f766e;
      }

      .role-block {
        display: grid;
        gap: 0;
        overflow: hidden;
      }

      .role-status-closed {
        background: #f8fafc;
        opacity: 0.82;
      }

      .role-status-paused {
        background: #fffaf0;
        border-color: rgba(217, 119, 6, 0.2);
      }

      .role-status-active {
        background: #ffffff;
      }

      .role-row {
        color: inherit;
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1fr) auto;
        padding: 12px;
        text-decoration: none;
      }

      .role-row div {
        display: grid;
        gap: 4px;
      }

      .role-row span,
      .role-row em {
        color: #64748b;
        font-size: 0.78rem;
        font-style: normal;
      }

      .role-row dl {
        display: flex;
        gap: 12px;
        margin: 0;
      }

      .role-row dt,
      .role-row dd {
        margin: 0;
      }

      .role-row dt {
        color: #64748b;
        font-size: 0.68rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .role-row dd {
        color: #0f172a;
        font-family: var(--font-geist-mono), monospace;
        font-weight: 900;
      }

      .role-detail-tools {
        border-top: 1px solid rgba(15, 23, 42, 0.08);
        padding: 12px;
      }

      .role-edit-form {
        display: grid;
        gap: 12px;
      }

      .role-edit-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .role-edit-form label {
        display: grid;
        font-size: 0.8rem;
        font-weight: 850;
        gap: 7px;
      }

      .role-edit-form input,
      .role-edit-form select,
      .role-edit-form textarea {
        background: #fbfdff;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 8px;
        color: #0f172a;
        font: inherit;
        min-height: 38px;
        padding: 9px 10px;
      }

      .empty-state {
        align-items: center;
        background: #f8fafc;
        border: 1px dashed rgba(15, 23, 42, 0.12);
        border-radius: 8px;
        display: flex;
        gap: 10px;
        min-height: 76px;
        padding: 13px;
      }

      .empty-state strong {
        color: #0f172a;
        font-size: 0.86rem;
      }

      .sr-only {
        border: 0;
        clip: rect(0, 0, 0, 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }

      @media (max-width: 1080px) {
        .company-app-shell {
          grid-template-columns: 1fr;
        }

        .company-sidebar {
          min-height: auto;
          position: static;
        }

        .company-sidebar-nav {
          display: flex;
          gap: 5px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .company-nav-item {
          flex: 0 0 auto;
        }

        .company-sidebar-footer {
          display: none;
        }
      }

      @media (max-width: 920px) {
        .company-shell {
          padding-left: 10px;
          padding-right: 10px;
        }

        .company-topbar,
        .company-metrics,
        .company-content-grid,
        .company-lower-grid,
        .company-first-run,
        .company-first-run-mini-grid,
        .company-fallback-steps,
        .role-row,
        .role-edit-grid {
          grid-template-columns: 1fr;
        }

        .company-topbar-actions {
          justify-content: start;
        }

        .company-dashboard-heading,
        .company-panel-heading,
        .company-onboarding-banner,
        .queue-heading {
          align-items: start;
          display: grid;
        }

        .company-candidate-table {
          border: 0;
          overflow: visible;
        }

        .company-candidate-table-head {
          display: none;
        }

        .company-candidate-row {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 8px;
          gap: 8px;
          grid-template-columns: 1fr;
          margin-bottom: 8px;
        }

        .candidate-open-review {
          justify-content: start;
        }

        .company-schedule-item {
          grid-template-columns: 1fr auto;
        }

        .company-schedule-item small {
          grid-column: 1 / -1;
        }

        .company-start-steps {
          border-left: 0;
          border-top: 1px solid rgba(15, 23, 42, 0.1);
          padding-left: 0;
          padding-top: 16px;
        }
      }
    `}</style>
  );
}
