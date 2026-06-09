import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";

const brandGradient =
  "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)";

const heading = "Blogs worth reading";

const posts = [
  "One interview, many signals",
  "Why shortlists feel noisy",
  "The scorecard candidates deserve",
];

export default function BlogWeekPage() {
  return (
    <div
      className="w-full overflow-x-hidden bg-white px-4 pb-12 pt-24 text-slate-950 sm:px-6 sm:pb-16 sm:pt-28"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <section
        aria-labelledby="blog-week-heading"
        className="mx-auto w-full max-w-[1240px] bg-white"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1
            id="blog-week-heading"
            aria-label={heading}
            className="max-w-[13ch] text-[clamp(2.75rem,7vw,5.2rem)] font-extrabold leading-[0.92] tracking-[-0.055em] text-black sm:max-w-none"
          >
            Blogs{" "}
            <span className="italic tracking-[-0.055em]">worth reading</span>
          </h1>
          <Link
            href="/blog"
            className="inline-flex w-fit items-center gap-1.5 pb-1 text-sm font-black tracking-[-0.04em] text-black underline-offset-4 transition-opacity hover:opacity-65"
          >
            See all posts
            <ArrowRight className="size-3.5" aria-hidden="true" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.68fr)] lg:items-stretch">
          <article className="group relative aspect-[1.32/1] min-h-[430px] w-full min-w-0 overflow-hidden rounded-[18px] bg-slate-200 sm:aspect-[1.55/1] lg:min-h-[560px]">
            <Image
              alt="Candidate using a laptop in a calm pastel workspace for the Assumerai blog"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.025]"
              fill
              priority
              sizes="(min-width: 1024px) 780px, 100vw"
              src="/blog/candidate-workspace.png"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(15,23,42,0.08)_55%,rgba(15,23,42,0.18))]"
            />

            <div className="absolute left-4 top-4 grid gap-3 sm:left-7 sm:top-7">
              <span className="inline-flex min-h-9 w-fit items-center rounded-full bg-white px-4 text-sm font-black tracking-[-0.04em] text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
                May 12, 2026
              </span>
              <span className="inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full border border-white/90 bg-white/20 px-4 text-sm font-bold tracking-[-0.03em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur">
                <span className="size-1 rounded-full bg-white" aria-hidden="true" />
                Hiring signal
              </span>
            </div>

            <div className="absolute left-4 right-4 top-[30%] max-w-[25rem] sm:left-[48%] sm:right-6 sm:top-10 sm:-translate-x-[8%] lg:left-[45%] lg:top-12">
              <div className="inline">
                {["One profile", "for every", "company"].map((line) => (
                  <span
                    className="mb-1.5 block w-fit rounded-[8px] bg-white px-3 py-1.5 text-[clamp(1.65rem,3.3vw,2.85rem)] font-black leading-[1.04] tracking-[-0.07em] text-black shadow-[0_16px_40px_rgba(15,23,42,0.10)] sm:px-4"
                    key={line}
                  >
                    {line}
                  </span>
                ))}
              </div>
            </div>

            <Link
              aria-label="Read One profile for every company"
              href="/blog"
              className="absolute bottom-5 right-5 inline-flex size-12 items-center justify-center rounded-full bg-white text-black shadow-[0_18px_42px_rgba(15,23,42,0.18)] transition-transform group-hover:scale-105 sm:bottom-7 sm:right-7"
            >
              <ArrowUpRight className="size-6" aria-hidden="true" strokeWidth={2.3} />
            </Link>
          </article>

          <aside className="grid w-full min-w-0 gap-5 lg:sticky top-24 lg:self-start">
            <section className="relative w-full min-w-0 min-h-[245px] overflow-hidden rounded-[24px] p-6 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] sm:min-h-[270px] lg:min-h-[286px]">
              <div
                className="absolute inset-0"
                style={{ backgroundImage: brandGradient }}
                aria-hidden="true"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.50),transparent_30%),radial-gradient(circle_at_88%_92%,rgba(255,255,255,0.32),transparent_36%)]"
              />

              <div className="relative z-10 flex h-full min-h-[225px] flex-col">
                <div className="flex items-start justify-between gap-5">
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-black/75 bg-white/12 px-4 text-sm font-black tracking-[-0.03em]">
                    <span className="size-1.5 rounded-full bg-black" aria-hidden="true" />
                    ADS
                  </span>
                  <button
                    aria-label="Open Assumerai member ad"
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-[0_14px_34px_rgba(15,23,42,0.12)] transition-transform hover:scale-105"
                    type="button"
                  >
                    <Plus className="size-5" aria-hidden="true" strokeWidth={2.4} />
                  </button>
                </div>

                <p className="mt-6 max-w-[12rem] text-[15px] font-black leading-[1.08] tracking-[-0.045em]">
                  Become an
                  <br />
                  Assumerai member
                </p>
                <h2 className="mt-5 max-w-[16rem] text-[clamp(1.7rem,3vw,2.2rem)] font-black leading-[1.02] tracking-[-0.075em]">
                  Real talk in a corporate world
                </h2>
                <Link
                  href="/contact"
                  className="mt-auto w-fit self-end text-sm font-black tracking-[-0.04em] underline decoration-black/60 underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Learn more
                </Link>
              </div>
            </section>

            <article className="group relative w-full min-w-0 aspect-[0.94/1] min-h-[360px] overflow-hidden rounded-[24px] bg-slate-200 sm:min-h-[420px] lg:min-h-[360px]">
              <Image
                alt="Assumerai editorial portrait for the weekly blog picks"
                className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                fill
                sizes="(min-width: 1024px) 340px, 100vw"
                src="/blog/founder-portrait.png"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.12))]" />
              <span className="absolute right-5 top-5 inline-flex size-10 items-center justify-center rounded-full border border-white/80 bg-white/10 text-xs font-black text-white backdrop-blur">
                24
              </span>
            </article>
          </aside>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:hidden">
          {posts.map((post) => (
            <Link
              className="rounded-[8px] border border-slate-200 px-4 py-3 text-sm font-black tracking-[-0.04em] text-slate-700 transition-colors hover:border-slate-400 hover:text-black"
              href="/blog"
              key={post}
            >
              {post}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
