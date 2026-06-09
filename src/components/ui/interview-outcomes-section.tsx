"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n";

const OUTCOME_POINT_STYLES = [
  {
    number: "01",
    rail: "from-sky-400 to-cyan-300",
    textTone: "text-sky-700",
  },
  {
    number: "02",
    rail: "from-emerald-400 to-teal-300",
    textTone: "text-emerald-700",
  },
  {
    number: "03",
    rail: "from-violet-400 to-indigo-300",
    textTone: "text-violet-700",
  },
  {
    number: "04",
    rail: "from-amber-400 to-orange-300",
    textTone: "text-amber-700",
  },
] as const;

export default function InterviewOutcomesSection() {
  const { t } = useI18n();

  return (
    <section
      className="bg-white px-6 py-16 text-[#0b2146] sm:py-20 lg:py-24"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:gap-14">
        <div className="max-w-2xl">
          <h2 className="max-w-[12ch] text-[clamp(2.25rem,4.2vw,3.75rem)] font-black leading-[0.98] tracking-[-0.045em]">
            {t.outcomes.headingLine1}
            <span className="block font-light tracking-[-0.035em]">
              {t.outcomes.headingLine2}
            </span>
          </h2>

          <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-500 sm:text-lg">
            {t.outcomes.body}
          </p>

          <div className="mt-8 grid gap-5">
            {t.outcomes.points.map((point, index) => {
              const pointStyle = OUTCOME_POINT_STYLES[index];

              return (
              <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4" key={pointStyle.number}>
                <div className="flex flex-col items-center pt-0.5">
                  <span className={`text-[0.68rem] font-black leading-none tracking-[-0.02em] ${pointStyle.textTone}`}>
                    {pointStyle.number}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-2 h-full min-h-12 w-px rounded-full bg-gradient-to-b ${pointStyle.rail}`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-5 text-[#0b2146]">
                    {point.title}
                  </h3>
                  <p className="mt-1 max-w-xl text-[0.84rem] leading-5 text-slate-500">
                    {point.body}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <Image
            alt={t.outcomes.imageAlt}
            className="h-auto w-full max-w-[340px] object-contain lg:max-w-[360px]"
            height={1536}
            sizes="(min-width: 1024px) 360px, min(82vw, 340px)"
            src="/landing/interview-outcomes.png"
            width={1024}
          />
        </div>
      </div>
    </section>
  );
}
