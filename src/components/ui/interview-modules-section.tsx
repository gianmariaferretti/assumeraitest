"use client";

import { CardSticky, ContainerScroll } from "@/components/ui/cards-stack";
import { useI18n } from "@/lib/i18n";

const BRAND_GRADIENT =
  "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)";

const INTERVIEW_MODULES = [
  {
    id: "module-1",
    eyebrow: "Currently asking",
    prompt: "\"What kind of customer do you most want to spend your time with?\"",
    meta: "Video · 4 questions",
    title: "Imagine the role",
    description:
      "\"What's the room you walk into Monday at 9am?\" We start by listening to the work you actually want.",
    theme: {
      accent: "#b86fc4",
      border: "rgba(184, 111, 196, 0.22)",
      number: "rgba(184, 111, 196, 0.22)",
      panel:
        "linear-gradient(135deg, rgba(247, 200, 217, 0.18), rgba(224, 184, 230, 0.16), rgba(168, 197, 241, 0.14))",
      rail: BRAND_GRADIENT,
      surface:
        "linear-gradient(135deg, rgba(247, 200, 217, 0.28) 0%, rgba(255, 255, 255, 0.98) 45%, rgba(168, 197, 241, 0.25) 100%)",
      tint: "rgba(224, 184, 230, 0.2)",
    },
  },
  {
    id: "module-2",
    meta: "Video · 2 questions",
    title: "English fluency",
    description:
      "A pitch and a difficult-customer story, in English. We grade thinking, not accent.",
    theme: {
      accent: "#8f8de6",
      border: "rgba(143, 141, 230, 0.24)",
      number: "rgba(143, 141, 230, 0.22)",
      panel:
        "linear-gradient(135deg, rgba(224, 184, 230, 0.16), rgba(185, 184, 238, 0.18), rgba(168, 197, 241, 0.14))",
      rail: BRAND_GRADIENT,
      surface:
        "linear-gradient(135deg, rgba(224, 184, 230, 0.24) 0%, rgba(255, 255, 255, 0.98) 45%, rgba(185, 184, 238, 0.22) 100%)",
      tint: "rgba(185, 184, 238, 0.2)",
    },
  },
  {
    id: "module-3",
    meta: "Text · 3 questions",
    title: "AI knowledge",
    description:
      "Plain-language fundamentals — hallucination, RAG vs fine-tune. We're checking judgement, not jargon.",
    theme: {
      accent: "#789add",
      border: "rgba(120, 154, 221, 0.24)",
      number: "rgba(120, 154, 221, 0.22)",
      panel:
        "linear-gradient(135deg, rgba(185, 184, 238, 0.16), rgba(168, 197, 241, 0.2), rgba(247, 200, 217, 0.12))",
      rail: BRAND_GRADIENT,
      surface:
        "linear-gradient(135deg, rgba(168, 197, 241, 0.28) 0%, rgba(255, 255, 255, 0.98) 45%, rgba(224, 184, 230, 0.2) 100%)",
      tint: "rgba(168, 197, 241, 0.22)",
    },
  },
  {
    id: "module-4",
    meta: "Code · 1 task",
    title: "Python · live coding",
    description:
      "A small, real task — moving averages over a dict of sales — with tests you can run.",
    theme: {
      accent: "#c17acb",
      border: "rgba(193, 122, 203, 0.24)",
      number: "rgba(193, 122, 203, 0.22)",
      panel:
        "linear-gradient(135deg, rgba(247, 200, 217, 0.16), rgba(224, 184, 230, 0.2), rgba(185, 184, 238, 0.14))",
      rail: BRAND_GRADIENT,
      surface:
        "linear-gradient(135deg, rgba(247, 200, 217, 0.25) 0%, rgba(255, 255, 255, 0.98) 45%, rgba(185, 184, 238, 0.22) 100%)",
      tint: "rgba(224, 184, 230, 0.22)",
    },
  },
  {
    id: "module-5",
    meta: "Video · 3 questions",
    title: "Case study · client scenario",
    description:
      "A short brief, eight minutes of you out loud. We watch how you frame ambiguity, not whether you \"solve\" it.",
    theme: {
      accent: "#7f9fe4",
      border: "rgba(127, 159, 228, 0.24)",
      number: "rgba(127, 159, 228, 0.22)",
      panel:
        "linear-gradient(135deg, rgba(168, 197, 241, 0.2), rgba(185, 184, 238, 0.16), rgba(247, 200, 217, 0.14))",
      rail: BRAND_GRADIENT,
      surface:
        "linear-gradient(135deg, rgba(168, 197, 241, 0.27) 0%, rgba(255, 255, 255, 0.98) 45%, rgba(247, 200, 217, 0.23) 100%)",
      tint: "rgba(168, 197, 241, 0.22)",
    },
  },
];

export default function InterviewModulesSection() {
  const { t } = useI18n();
  const localizedModules = INTERVIEW_MODULES.map((module, index) => ({
    ...module,
    ...t.interview.modules[index],
  }));

  return (
    <section
      className="scroll-mt-24 bg-white px-6 text-[#0b2146]"
      id="interview"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="sticky top-0 z-30 -mx-6 bg-white px-6 pb-6 pt-24 shadow-[0_18px_42px_rgba(255,255,255,0.96)] lg:order-2 lg:mx-0 lg:h-svh lg:bg-transparent lg:px-0 lg:py-24 lg:shadow-none">
          <h2
            className="mb-5 max-w-[12ch] font-light leading-[0.98] text-slate-950"
            style={{
              fontSize: "clamp(2.2rem, 4.8vw, 4.5rem)",
              letterSpacing: "-0.05em",
            }}
          >
            {t.interview.headingLine1}
            <span className="block">{t.interview.headingLine2}</span>
          </h2>
          <p className="max-w-[23rem] text-base font-medium leading-7 text-slate-600 sm:text-lg">
            {t.interview.body}
          </p>
        </div>

        <div className="space-y-6 pb-16 pt-4 lg:hidden">
          {localizedModules.map((module, index) => (
            <div
              className="relative overflow-hidden rounded-[8px] border border-slate-200 p-6 shadow-[0_18px_52px_rgba(15,23,42,0.10)]"
              key={module.id}
              style={{ background: module.theme.surface }}
            >
              <InterviewModuleCard module={module} number={index + 1} />
            </div>
          ))}
        </div>

        <ContainerScroll className="hidden min-h-[400vh] space-y-8 py-24 lg:order-1 lg:block">
          {localizedModules.map((module, index) => (
            <CardSticky
              className="overflow-hidden rounded-[8px] border border-slate-200 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-md sm:p-8"
              incrementY={16}
              incrementZ={0}
              index={index + 6}
              key={module.id}
              style={{ background: module.theme.surface }}
            >
              <InterviewModuleCard module={module} number={index + 1} />
            </CardSticky>
          ))}
        </ContainerScroll>
      </div>
    </section>
  );
}

function InterviewModuleCard({
  module,
  number,
}: {
  module: (typeof INTERVIEW_MODULES)[number];
  number: number;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-y-6 left-0 w-1 rounded-r-full"
        style={{ background: module.theme.rail }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: module.theme.rail }}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          {module.eyebrow && (
            <p
              className="mb-3 text-xs font-bold uppercase leading-none tracking-normal"
              style={{ color: module.theme.accent }}
            >
              {module.eyebrow}
            </p>
          )}
          {module.prompt && (
            <p
              className="max-w-xl rounded-[8px] px-4 py-3 text-lg font-bold leading-7 tracking-tight text-slate-950 sm:text-xl"
              style={{ background: module.theme.tint }}
            >
              {module.prompt}
            </p>
          )}
        </div>
        <p
          className="shrink-0 text-2xl font-black tracking-[-0.04em]"
          style={{ color: module.theme.number }}
        >
          {String(number).padStart(2, "0")}
        </p>
      </div>

      <div
        className={`${module.prompt ? "mt-8" : ""} rounded-[8px] border p-4 sm:p-5`}
        style={{
          background: module.theme.panel,
          borderColor: module.theme.border,
        }}
      >
        <p
          className="inline-flex rounded-full px-3 py-2 text-xs font-bold uppercase leading-none tracking-normal"
          style={{ background: module.theme.tint, color: module.theme.accent }}
        >
          {module.meta}
        </p>
        <h3 className="my-5 text-[clamp(1.75rem,3vw,2.5rem)] font-black leading-none tracking-[-0.045em] text-[#0b2146]">
          {module.title}
        </h3>
        <p className="max-w-xl text-[0.95rem] font-medium leading-6 text-slate-500 sm:text-base sm:leading-7">
          {module.description}
        </p>
      </div>
    </>
  );
}
