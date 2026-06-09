"use client";

import { useI18n } from "@/lib/i18n";

export default function FinalCtaSection() {
  const { t } = useI18n();

  return (
    <section
      className="bg-white px-5 py-12 text-slate-950 sm:px-6 sm:py-16 lg:px-8"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="mx-auto max-w-[900px] border-t border-slate-200 pt-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div className="max-w-[34rem]">
            <h2 className="text-[clamp(1.75rem,3vw,2.65rem)] font-medium leading-[1.03] tracking-[-0.055em] text-slate-950">
              {t.finalCta.headingLine1}{" "}
              {t.finalCta.headingLine2Prefix} {t.finalCta.headingEmphasis}{" "}
              {t.finalCta.headingLine2Suffix}
            </h2>
            <p className="mt-4 max-w-[30rem] text-sm font-medium leading-6 text-slate-500 sm:text-base">
              {t.finalCta.body}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <a
              className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              href="#begin"
            >
              {t.finalCta.takeInterview}
            </a>
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              href="#companies"
            >
              {t.finalCta.hiringTeam}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
