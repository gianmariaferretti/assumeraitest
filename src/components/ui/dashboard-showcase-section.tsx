"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const DASHBOARD_SHOTS = [
  {
    labelKey: "analytics",
    src: "/dashboard/dashboard_analytics.png",
    width: 1867,
    height: 852,
    position: "object-left-top",
  },
  {
    labelKey: "calendar",
    src: "/dashboard/dashboard_calendar.png",
    width: 1875,
    height: 787,
    position: "object-left-top",
  },
  {
    labelKey: "review",
    src: "/dashboard/dashboard_when_i_click_review.png",
    width: 1858,
    height: 897,
    position: "object-right-top",
  },
] as const;

const MOBILE_DASHBOARD_SHOTS = [
  {
    labelKey: "overview",
    src: "/dashboard/dashboard_view.png",
    width: 1866,
    height: 847,
    position: "object-left-top",
  },
  {
    labelKey: "review",
    src: "/dashboard/dashboard_when_i_click_review.png",
    width: 1858,
    height: 897,
    position: "object-right-top",
  },
  {
    labelKey: "calendar",
    src: "/dashboard/dashboard_calendar.png",
    width: 1875,
    height: 787,
    position: "object-left-top",
  },
  {
    labelKey: "analytics",
    src: "/dashboard/dashboard_analytics.png",
    width: 1867,
    height: 852,
    position: "object-left-top",
  },
] as const;

export default function DashboardShowcaseSection() {
  const { t } = useI18n();
  const dashboardShots = DASHBOARD_SHOTS.map((shot) => ({
    ...shot,
    label: t.dashboard.shots[shot.labelKey],
  }));

  return (
    <section
      className="scroll-mt-24 bg-white px-6 py-16 text-slate-950 sm:py-20 lg:py-24"
      id="companies"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="mx-auto grid min-w-0 max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:gap-14">
        <div className="max-w-2xl">
          <h2 className="max-w-[10ch] text-[clamp(2.25rem,4.2vw,3.75rem)] font-black leading-[0.98] tracking-[-0.045em] text-[#0b2146]">
            {t.dashboard.headingLine1}
            <span className="block font-light tracking-[-0.035em] text-slate-500">
              {t.dashboard.headingLine2}
            </span>
          </h2>

          <p className="mt-5 max-w-[20.5rem] break-words text-base font-medium leading-7 text-slate-600 sm:max-w-xl sm:text-lg">
            {t.dashboard.body}
          </p>

          <div className="mt-8 grid gap-5">
            {t.dashboard.features.map((feature, index) => (
              <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4" key={feature.title}>
                <div className="flex size-9 items-center justify-center rounded-[8px] bg-white text-sm font-black text-sky-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-5 text-[#0b2146]">
                    {feature.title}
                  </h3>
                  <p className="mt-1 max-w-[18rem] break-words text-[0.86rem] leading-5 text-slate-500 sm:max-w-xl">
                    {feature.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_18px_42px_rgba(15,23,42,0.22)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            type="button"
          >
            {t.dashboard.cta}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.4} />
          </button>
        </div>

        <div className="hidden min-w-0 sm:flex sm:flex-col sm:items-center lg:items-end">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[8px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.13)] ring-1 ring-slate-900/10">
            <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50 px-4 py-3">
              <span className="size-2.5 rounded-full bg-rose-300" aria-hidden="true" />
              <span className="size-2.5 rounded-full bg-amber-300" aria-hidden="true" />
              <span className="size-2.5 rounded-full bg-emerald-300" aria-hidden="true" />
              <span className="ml-3 h-6 flex-1 rounded-full bg-white ring-1 ring-slate-900/5" aria-hidden="true" />
            </div>
            <Image
              alt={t.dashboard.dashboardAlt}
              className="h-auto w-full"
              height={847}
              priority={false}
              sizes="(min-width: 1024px) 560px, 92vw"
              src="/dashboard/dashboard_view.png"
              width={1866}
            />
          </div>

          <div className="mt-4 grid w-full max-w-[560px] gap-4 sm:grid-cols-3">
            {dashboardShots.map((shot) => (
              <figure
                className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/10"
                key={shot.label}
              >
                <Image
                  alt={`${t.dashboard.dashboardViewAlt}: ${shot.label}`}
                  className={`aspect-[16/9] w-full object-cover ${shot.position}`}
                  height={shot.height}
                  sizes="(min-width: 1024px) 18vw, (min-width: 640px) 29vw, 92vw"
                  src={shot.src}
                  width={shot.width}
                />
                <figcaption className="border-t border-slate-200/75 px-3 py-2 text-xs font-bold text-slate-600">
                  {shot.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

      <DashboardMobileSlider />
      </div>
    </section>
  );
}

function DashboardMobileSlider() {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const mobileDashboardShots = MOBILE_DASHBOARD_SHOTS.map((shot) => ({
    ...shot,
    label: t.dashboard.shots[shot.labelKey],
  }));
  const activeShot = mobileDashboardShots[activeIndex];

  const showSlide = (index: number) => {
    const slideCount = mobileDashboardShots.length;
    setActiveIndex((index + slideCount) % slideCount);
  };

  const handlePointerEnd = (clientX: number) => {
    if (pointerStartX.current === null) {
      return;
    }

    const deltaX = clientX - pointerStartX.current;
    pointerStartX.current = null;

    if (Math.abs(deltaX) < 42) {
      return;
    }

    showSlide(activeIndex + (deltaX < 0 ? 1 : -1));
  };

  return (
    <div className="sm:hidden">
      <figure
        className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10"
        onPointerCancel={() => {
          pointerStartX.current = null;
        }}
        onPointerDown={(event) => {
          pointerStartX.current = event.clientX;
        }}
        onPointerLeave={(event) => {
          if (pointerStartX.current !== null) {
            handlePointerEnd(event.clientX);
          }
        }}
        onPointerUp={(event) => {
          handlePointerEnd(event.clientX);
        }}
      >
        <Image
          alt={`${t.dashboard.dashboardViewAlt}: ${activeShot.label}`}
          className={`aspect-[16/10] w-full select-none object-cover ${activeShot.position}`}
          draggable={false}
          height={activeShot.height}
          sizes="calc(100vw - 3rem)"
          src={activeShot.src}
          width={activeShot.width}
        />
        <figcaption className="flex items-center justify-between border-t border-slate-200/75 px-3 py-2 text-xs font-bold text-slate-600">
          <span>{activeShot.label}</span>
          <span className="font-semibold text-slate-400">
            {t.dashboard.slide} {activeIndex + 1} {t.dashboard.ofLabel} {mobileDashboardShots.length}
          </span>
        </figcaption>
      </figure>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          aria-label={t.dashboard.previousScreenshot}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-900/10 transition-colors hover:text-slate-950"
          onClick={() => showSlide(activeIndex - 1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>

        <div className="grid grid-cols-4 items-center justify-center gap-1.5">
          {mobileDashboardShots.map((shot, index) => (
            <button
              aria-label={`${t.dashboard.showScreenshot}: ${shot.label}`}
              aria-pressed={index === activeIndex}
              className="flex h-4 w-7 items-center justify-center rounded-full"
              key={`${shot.label}-indicator`}
              onClick={() => showSlide(index)}
              type="button"
            >
              <span
                className={`h-1.5 w-full rounded-full transition-colors duration-200 ${
                  index === activeIndex ? "bg-slate-900" : "bg-slate-200"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          aria-label={t.dashboard.nextScreenshot}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-900/10 transition-colors hover:text-slate-950"
          onClick={() => showSlide(activeIndex + 1)}
          type="button"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
