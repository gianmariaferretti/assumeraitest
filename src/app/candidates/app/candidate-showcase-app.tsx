"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  Gauge,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";

const brandGradient =
  "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)";

const roleFilters = ["Recommended", "Interviewing", "Saved"] as const;
type RoleFilter = (typeof roleFilters)[number];

const candidateProfile = {
  name: "Maya Rinaldi",
  target: "Graduate Product Analyst",
  location: "Milan - hybrid preferred",
  avatar: "/avatar/woman.png",
  readiness: 86,
  headline: "Candidate OS",
  promise: "One CV. One interview. Get matched.",
  momentum: "You did the work, now let it work for you.",
  status: "Free for candidates, always.",
  privacy: "Consent-led visibility",
  scorecard: "scorecard visible to you",
};

const readinessItems = [
  { label: "CV parsed and confirmed", value: 100, meta: "One CV" },
  { label: "Adaptive interview signal", value: 92, meta: "One interview" },
  { label: "Scorecard review", value: 78, meta: "No hidden scoring" },
  { label: "Match preferences", value: 74, meta: "Your call" },
];

const matchedRoles = [
  {
    id: "enel-product-analyst",
    company: "Enel",
    fit: 94,
    filter: "Recommended",
    location: "Rome - hybrid",
    reason:
      "Your energy-sector research project and customer discovery examples map cleanly to the team scorecard.",
    role: "Product Analyst, Energy Solutions",
    salary: "EUR 34k-39k",
    status: "Ready to review",
  },
  {
    id: "ey-tech-risk",
    company: "EY",
    fit: 89,
    filter: "Interviewing",
    location: "Milan - hybrid",
    reason:
      "Strong structured reasoning, fluent stakeholder communication, and a clean Python assessment signal.",
    role: "Technology Risk Consultant",
    salary: "EUR 32k-38k",
    status: "Human interview booked",
  },
  {
    id: "escp-programme",
    company: "ESCP",
    fit: 84,
    filter: "Saved",
    location: "Turin - onsite",
    reason:
      "Your operations internship and multilingual support examples match a student-facing coordination role.",
    role: "Programme Operations Officer",
    salary: "EUR 30k-35k",
    status: "Saved for later",
  },
] satisfies Array<{
  company: string;
  filter: RoleFilter;
  fit: number;
  id: string;
  location: string;
  reason: string;
  role: string;
  salary: string;
  status: string;
}>;

const applicationTracker = [
  {
    company: "EY",
    date: "May 16",
    label: "Human interview",
    note: "Max two human interviews after the AI.",
    tone: "bg-[#a8c5f1]",
  },
  {
    company: "Enel",
    date: "May 18",
    label: "Awaiting team review",
    note: "14-day response window is visible.",
    tone: "bg-[#f7c8d9]",
  },
  {
    company: "JPM",
    date: "May 20",
    label: "Feedback received",
    note: "Feedback always, even on a no.",
    tone: "bg-[#0b2146]",
  },
];

const skillInsights = [
  { label: "Structured thinking", value: 92, note: "Clear trade-offs under ambiguity." },
  { label: "English communication", value: 88, note: "Concise, warm, and client-ready." },
  { label: "Python basics", value: 81, note: "Good fundamentals; practice data cleanup." },
  { label: "Commercial judgement", value: 86, note: "Strong link between customer pain and action." },
];

const nextSteps = [
  "Review the scorecard visible to candidate before sharing with new companies.",
  "Confirm consent-led visibility for the two strongest recommended roles.",
  "Add one customer research example to strengthen product-market signal.",
];

const interviewPrep = [
  {
    label: "No trick questions",
    body: "Prepare for real situations from your CV, not riddles or stress rituals.",
  },
  {
    label: "No hidden scoring",
    body: "You can inspect the same scorecard hiring teams see.",
  },
  {
    label: "No silent inbox",
    body: "Every process ends with a yes, a no, or a reasoned next step.",
  },
];

const commitments = [
  { label: "14-day response", body: "Companies decide within the window or leave the queue." },
  { label: "Max two human interviews", body: "No five-round loops after the AI interview." },
  { label: "Feedback always", body: "A human reason is part of the decision record." },
];

export default function CandidateShowcaseApp() {
  const [activeFilter, setActiveFilter] = useState<RoleFilter>("Recommended");
  const [selectedRoleId, setSelectedRoleId] = useState(matchedRoles[0].id);
  const [focusStep, setFocusStep] = useState(0);
  const [demoMessage, setDemoMessage] = useState(
    "Demo mode: no real workflows will start.",
  );
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const visibleRoles = useMemo(
    () => matchedRoles.filter((role) => role.filter === activeFilter),
    [activeFilter],
  );

  const selectedRole =
    matchedRoles.find((role) => role.id === selectedRoleId) ?? matchedRoles[0];
  const matchedOpportunityTitle =
    activeFilter === "Recommended"
      ? "Recommended matches"
      : activeFilter === "Interviewing"
        ? "Interviewing now"
        : "Saved roles";

  function handleNextStep(step: string) {
    setCompletedSteps((current) =>
      current.includes(step)
        ? current.filter((completedStep) => completedStep !== step)
        : [...current, step],
    );
    setDemoMessage(`Updated next step: ${step}`);
  }

  return (
    <article
      className="min-h-screen bg-[#f5f5f7] pt-24 text-[#040817] [font-family:var(--font-geist-sans),sans-serif]"
      data-demo-only="true"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-12 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.34fr)_minmax(0,1fr)]">
          <aside className="rounded-[8px] border border-white bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image
                  alt=""
                  className="size-14 rounded-full object-cover ring-4 ring-[#f5f5f7]"
                  height={96}
                  priority
                  src={candidateProfile.avatar}
                  width={96}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {candidateProfile.headline}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#040817]">
                    {candidateProfile.name}
                  </h1>
                </div>
              </div>
              <span
                className="inline-flex size-10 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_28px_rgba(168,197,241,0.35)]"
                style={{ backgroundImage: brandGradient }}
              >
                <Sparkles aria-hidden="true" className="size-5 text-[#040817]" />
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-3xl font-light leading-tight text-[#040817]">
                {candidateProfile.promise}
              </p>
              <p className="max-w-md text-sm font-medium leading-6 text-slate-600">
                {candidateProfile.momentum}
              </p>
            </div>

            <div className="mt-6 grid gap-2 text-sm">
              <ProfileLine icon={Briefcase} label={candidateProfile.target} />
              <ProfileLine icon={Target} label={candidateProfile.location} />
              <ProfileLine icon={ShieldCheck} label={candidateProfile.status} />
            </div>

            <div className="mt-6 rounded-[8px] bg-[#040817] p-4 text-white shadow-[0_20px_42px_rgba(4,8,23,0.18)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Profile readiness</p>
                <p className="text-3xl font-semibold">{candidateProfile.readiness}%</p>
              </div>
              <div
                aria-label="Overall profile readiness"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={candidateProfile.readiness}
                className="mt-4 h-2 overflow-hidden rounded-full bg-white/12"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundImage: brandGradient,
                    width: `${candidateProfile.readiness}%`,
                  }}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[candidateProfile.privacy, candidateProfile.scorecard].map((item) => (
                  <span
                    className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-white/76"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <div className="grid gap-4 lg:grid-rows-[auto_1fr]">
            <div className="rounded-[8px] border border-white bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Candidate workspace
                  </p>
                  <h2 className="mt-2 max-w-2xl text-3xl font-light leading-none text-[#040817] sm:text-4xl lg:text-5xl">
                    You did the work, now let it work for you.
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DemoButton
                    icon={FileText}
                    label="Review scorecard"
                    onClick={() =>
                      setDemoMessage("Scorecard preview opened in demo mode.")
                    }
                  />
                  <DemoButton
                    icon={LockKeyhole}
                    label="Update visibility"
                    onClick={() =>
                      setDemoMessage("Visibility preferences marked for review.")
                    }
                    variant="dark"
                  />
                </div>
              </div>
              <p
                aria-live="polite"
                className="mt-4 rounded-[8px] bg-[#f5f5f7] px-4 py-3 text-sm font-medium leading-6 text-slate-600"
                role="status"
              >
                {demoMessage}
              </p>
            </div>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.72fr)]">
              <div className="rounded-[8px] border border-white bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Matched opportunities
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#0b2146]">
                      {matchedOpportunityTitle}
                    </h3>
                  </div>
                  <div className="flex rounded-full bg-[#f5f5f7] p-1">
                    {roleFilters.map((filter) => (
                      <button
                        aria-label={`Show ${filter.toLowerCase()} opportunities`}
                        aria-pressed={activeFilter === filter}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a8c5f1]/70 ${
                          activeFilter === filter
                            ? "bg-[#040817] text-white shadow-[0_10px_24px_rgba(4,8,23,0.16)]"
                            : "text-slate-600 hover:text-[#040817]"
                        }`}
                        key={filter}
                        onClick={() => {
                          setActiveFilter(filter);
                          setSelectedRoleId(
                            matchedRoles.find((role) => role.filter === filter)?.id ??
                              matchedRoles[0].id,
                          );
                        }}
                        type="button"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="grid gap-3">
                    {visibleRoles.map((role) => (
                      <button
                        aria-label={`Select ${role.company} ${role.role}`}
                        aria-pressed={selectedRole.id === role.id}
                        className={`rounded-[8px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a8c5f1]/70 ${
                          selectedRole.id === role.id
                            ? "border-[#a8c5f1] bg-[#f8fbff] shadow-[0_18px_40px_rgba(168,197,241,0.2)]"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                        key={role.id}
                        onClick={() => setSelectedRoleId(role.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#040817]">
                              {role.company}
                            </p>
                            <p className="mt-1 text-base font-semibold leading-tight text-[#0b2146]">
                              {role.role}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#040817] px-2.5 py-1 text-xs font-semibold text-white">
                            {role.fit}%
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-medium text-slate-500">
                          {role.location} - {role.salary}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[8px] bg-[#040817] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                          Match reason
                        </p>
                        <h4 className="mt-2 text-2xl font-semibold leading-tight">
                          {selectedRole.company}
                        </h4>
                      </div>
                      <Gauge aria-hidden="true" className="size-6 text-[#a8c5f1]" />
                    </div>
                    <p className="mt-4 text-sm font-medium leading-6 text-white/72">
                      {selectedRole.reason}
                    </p>
                    <div className="mt-5 grid gap-2 text-sm">
                      <StatusPill label={selectedRole.status} />
                      <StatusPill label="Consent required before sharing" />
                      <StatusPill label="14-day response once accepted" />
                    </div>
                    <button
                      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-[#040817] shadow-[0_18px_38px_rgba(168,197,241,0.22)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a8c5f1]/70"
                      data-demo-action="Open role preview"
                      data-demo-only="true"
                      onClick={() =>
                        setDemoMessage(`Previewing ${selectedRole.company} in demo mode.`)
                      }
                      type="button"
                      style={{ backgroundImage: brandGradient }}
                    >
                      Open role preview
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[8px] border border-white bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Interview prep
                    </p>
                    <h3
                      className="mt-1 text-3xl font-normal italic leading-none text-[#0b2146]"
                      style={{ fontFamily: "var(--font-instrument-serif), serif" }}
                    >
                      Calm, visible, human.
                    </h3>
                  </div>
                  <Video aria-hidden="true" className="size-7 text-[#0b2146]" />
                </div>
                <div className="mt-5 grid gap-3">
                  {interviewPrep.map((item, index) => (
                    <button
                      aria-pressed={focusStep === index}
                      className={`rounded-[8px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#f7c8d9]/70 ${
                        focusStep === index
                          ? "border-[#f7c8d9] bg-[#fff8fb]"
                          : "border-slate-200 bg-white hover:bg-[#f5f5f7]"
                      }`}
                      key={item.label}
                      onClick={() => setFocusStep(index)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#040817]">{item.label}</p>
                        <ChevronRight aria-hidden="true" className="size-4 text-slate-400" />
                      </div>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                        {item.body}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)_minmax(280px,0.62fr)]">
          <Panel eyebrow="Profile readiness" title="CV and scorecard health">
            <div className="grid gap-4">
              {readinessItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <p className="font-semibold text-[#040817]">{item.label}</p>
                    <p className="font-semibold text-slate-500">{item.meta}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f5f5f7]">
                    <div
                      aria-label={`${item.label} readiness`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={item.value}
                      className="h-full rounded-full bg-[#0b2146]"
                      role="progressbar"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Application tracker" title="Every process has a visible state">
            <div className="grid gap-3">
              {applicationTracker.map((item) => (
                <div
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[8px] border border-slate-200 bg-white p-3"
                  key={`${item.company}-${item.label}`}
                >
                  <span className={`mt-1 size-3 rounded-full ${item.tone}`} />
                  <div>
                    <p className="font-semibold leading-tight text-[#040817]">
                      {item.company} - {item.label}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
                      {item.note}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Suggested next steps" title="Three useful moves">
            <div className="grid gap-3">
              {nextSteps.map((step, index) => {
                const isComplete = completedSteps.includes(step);

                return (
                  <button
                    aria-pressed={isComplete}
                    className={`flex items-start gap-3 rounded-[8px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a8c5f1]/70 ${
                      isComplete
                        ? "border-[#a8c5f1] bg-[#f8fbff]"
                        : "border-slate-200 bg-white hover:bg-[#f5f5f7]"
                    }`}
                    data-demo-action="Toggle next step"
                    data-demo-only="true"
                    key={step}
                    onClick={() => handleNextStep(step)}
                    type="button"
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#040817]"
                      style={{ backgroundImage: brandGradient }}
                    >
                      {isComplete ? <CheckCircle2 aria-hidden="true" className="size-4" /> : index + 1}
                    </span>
                    <span className="text-sm font-medium leading-6 text-slate-600">
                      {step}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
          <Panel eyebrow="Skill insights" title="Strengths from your interview signal">
            <div className="grid gap-4 sm:grid-cols-2">
              {skillInsights.map((skill) => (
                <div className="rounded-[8px] border border-slate-200 bg-white p-4" key={skill.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#040817]">{skill.label}</p>
                    <span className="rounded-full bg-[#040817] px-2.5 py-1 text-xs font-semibold text-white">
                      {skill.value}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                    {skill.note}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="rounded-[8px] bg-[#0b2146] p-5 text-white shadow-[0_24px_70px_rgba(11,33,70,0.2)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                  Candidate commitments
                </p>
                <h2 className="mt-2 text-3xl font-light leading-tight sm:text-4xl">
                  Respect is a product feature.
                </h2>
              </div>
              <MessageSquareText aria-hidden="true" className="size-8 text-[#f7c8d9]" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {commitments.map((commitment) => (
                <div
                  className="rounded-[8px] border border-white/12 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  key={commitment.label}
                >
                  <CheckCircle2 aria-hidden="true" className="size-5 text-[#a8c5f1]" />
                  <p className="mt-3 font-semibold leading-tight">{commitment.label}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/64">
                    {commitment.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

function ProfileLine({
  icon: Icon,
  label,
}: {
  icon: typeof Briefcase;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-[#f5f5f7] px-3 py-2 text-slate-700">
      <Icon aria-hidden="true" className="size-4 text-[#0b2146]" />
      <span className="truncate font-medium">{label}</span>
    </div>
  );
}

function DemoButton({
  icon: Icon,
  label,
  onClick,
  variant = "light",
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
  variant?: "dark" | "light";
}) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#a8c5f1]/70 active:scale-[0.98] ${
        variant === "dark"
          ? "bg-[#040817] text-white shadow-[0_18px_38px_rgba(4,8,23,0.18)]"
          : "bg-[#f5f5f7] text-[#040817]"
      }`}
      data-demo-action={label}
      data-demo-only="true"
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white/72">
      <CheckCircle2 aria-hidden="true" className="size-4 text-[#a8c5f1]" />
      <span>{label}</span>
    </div>
  );
}

function Panel({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-[8px] border border-white bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight text-[#0b2146]">
            {title}
          </h2>
        </div>
        <TrendingUp aria-hidden="true" className="size-5 shrink-0 text-[#a8c5f1]" />
      </div>
      {children}
    </section>
  );
}
