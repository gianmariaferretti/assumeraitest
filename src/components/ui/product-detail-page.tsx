"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import {
  CandidateClaritySection,
  type CandidateClarityCopy,
} from "@/components/ui/candidate-clarity-section";
import {
  CandidateCommitmentsSection,
  type CandidateCommitmentsCopy,
} from "@/components/ui/candidate-commitments-section";
import {
  CandidateExpandingCardsSection,
  type CandidatePrivacyCopy,
} from "@/components/ui/candidate-expanding-cards-section";
import {
  CandidateHorizontalCards,
  type CandidateHorizontalCardCopy,
} from "@/components/ui/candidate-horizontal-cards";
import { ContainerScroll } from "@/components/ui/container-scroll";
import {
  HiringTeamsComparisonSection,
  type HiringTeamsComparisonCopy,
} from "@/components/ui/hiring-teams-comparison-section";
import {
  NotForEveryoneSection,
  type NotForEveryoneCopy,
} from "@/components/ui/not-for-everyone-section";
import { Heading, Paragraph, Price, PricingWrapper } from "@/components/ui/aniamted-pricing-cards";
import { TextRevealByWord } from "@/components/ui/text-reveal-by-word";
import { useI18n } from "@/lib/i18n";
import {
  productPageHrefs,
  productPageKeyBySlug,
  productSlugs,
  productVisuals,
  type ProductSlug,
} from "@/lib/product-pages";

const BRAND_GRADIENT =
  "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)";
const CANDIDATE_HERO_WORD_GRADIENT =
  "linear-gradient(90deg, #e8a9dc 0%, #e8a9dc 32%, #c9adeb 58%, #9fbbf2 100%)";
const HIRING_REASON_CARD_BACKGROUNDS = [
  "linear-gradient(145deg, var(--page-surface-strong) 0%, var(--page-warm-surface) 44%, var(--page-blue-surface) 100%)",
  "linear-gradient(145deg, var(--page-surface-strong) 0%, var(--page-lilac-surface) 46%, var(--page-violet-surface) 100%)",
  "linear-gradient(145deg, var(--page-surface-strong) 0%, var(--page-blue-surface) 48%, var(--page-warm-surface) 100%)",
  "linear-gradient(145deg, var(--page-surface-strong) 0%, var(--page-violet-surface) 48%, var(--page-lilac-surface) 100%)",
  "linear-gradient(145deg, var(--page-surface-strong) 0%, var(--page-warm-surface) 40%, var(--page-violet-surface) 100%)",
] as const;
const HIRING_REASON_CARD_GLOWS = [
  "var(--page-warm-surface)",
  "var(--page-lilac-surface)",
  "var(--page-blue-surface)",
  "var(--page-violet-surface)",
  "var(--page-accent-soft)",
] as const;
const HIRING_REASON_CARD_TEXT = "var(--page-text)";
const HIRING_REASON_CARD_MUTED = "var(--page-text-muted)";

const HIRING_TEAMS_LINE_METRIC_LAYOUTS = [
  {
    revealRange: [0.2, 0.28] as const,
    className: "left-4 top-[58vh] sm:left-8 lg:left-auto lg:right-[31rem] lg:top-[52vh]",
  },
  {
    revealRange: [0.48, 0.56] as const,
    className: "right-4 top-[92vh] sm:right-8 lg:right-[13rem] lg:top-[88vh]",
  },
  {
    revealRange: [0.78, 0.88] as const,
    className: "left-4 top-[132vh] sm:left-8 lg:left-auto lg:right-[22rem] lg:top-[132vh]",
  },
] as const;

const HIRING_TEAMS_REASON_VISUALS = [
  {
    background: HIRING_REASON_CARD_BACKGROUNDS[0],
    glow: HIRING_REASON_CARD_GLOWS[0],
    mutedColor: HIRING_REASON_CARD_MUTED,
    textColor: HIRING_REASON_CARD_TEXT,
    visualBlendMode: "normal",
    visualSrc: "/images/hiring-teams/reasons/reason-screening.png",
  },
  {
    background: HIRING_REASON_CARD_BACKGROUNDS[1],
    glow: HIRING_REASON_CARD_GLOWS[1],
    mutedColor: HIRING_REASON_CARD_MUTED,
    textColor: HIRING_REASON_CARD_TEXT,
    visualBlendMode: "normal",
    visualSrc: "/images/hiring-teams/reasons/reason-outcome-data.png",
  },
  {
    background: HIRING_REASON_CARD_BACKGROUNDS[2],
    glow: HIRING_REASON_CARD_GLOWS[2],
    mutedColor: HIRING_REASON_CARD_MUTED,
    textColor: HIRING_REASON_CARD_TEXT,
    visualBlendMode: "normal",
    visualSrc: "/images/hiring-teams/reasons/reason-offer.png",
  },
  {
    background: HIRING_REASON_CARD_BACKGROUNDS[3],
    glow: HIRING_REASON_CARD_GLOWS[3],
    mutedColor: HIRING_REASON_CARD_MUTED,
    textColor: HIRING_REASON_CARD_TEXT,
    visualBlendMode: "normal",
    visualSrc: "/images/hiring-teams/reasons/reason-compliance.png",
  },
  {
    background: HIRING_REASON_CARD_BACKGROUNDS[4],
    glow: HIRING_REASON_CARD_GLOWS[4],
    mutedColor: HIRING_REASON_CARD_MUTED,
    textColor: HIRING_REASON_CARD_TEXT,
    visualBlendMode: "normal",
    visualSrc: "/images/hiring-teams/reasons/reason-launch.png",
  },
] as const;

const VENN_SCROLL_PATH =
  "M570 90A240 240 0 1 1 570 570A240 240 0 1 1 570 90" +
  "M880 538A240 240 0 1 1 923 506C1012 642 1010 789 956 930C902 1071 804 1158 780 1302C747 1502 915 1645 861 1846C830 1978 894 2082 1032 2160";

const MOBILE_VENN_SCROLL_PATH =
  "M168 118A95 95 0 1 1 168 308A95 95 0 1 1 168 118" +
  "M290 300A95 95 0 1 1 307 287C342 345 344 462 315 600C286 738 246 858 276 998C310 1158 350 1278 322 1450C300 1586 276 1742 324 1904C350 1994 350 2086 326 2160";

type ProductDetailPageProps = {
  slug: ProductSlug;
};

type FloatingNode = {
  label: string;
  value: string;
};

type ProductPanel = {
  body: string;
  meta: string;
  title: string;
};

type PricingPlanCopy = {
  body: string;
  cadence: string;
  eyebrow: string;
  name: string;
  price: string;
};

type CandidateExperienceCopy = {
  clarity: CandidateClarityCopy;
  commitments: CandidateCommitmentsCopy;
  heroAccent: string;
  heroTitle: string;
  horizontalCards: {
    cards: CandidateHorizontalCardCopy[];
    dontDoLabel: string;
  };
  privacy: CandidatePrivacyCopy;
  revealHighlight: string;
  revealText: string;
};

type HiringTeamsHeroCopy = {
  body: string;
  metrics: FloatingNode[];
  title: string;
};

type HiringTeamsReasonCopy = {
  body: string;
  label: string;
  metric: string;
  number: string;
  title: string;
};

type HiringTeamsReasonsCopy = {
  ariaLabel: string;
  heading: string;
  items: HiringTeamsReasonCopy[];
  listAriaLabel: string;
  proofPointLabel: string;
  reasonLabel: string;
};

type HiringTeamsExperienceCopy = {
  antiFit: NotForEveryoneCopy;
  comparison: HiringTeamsComparisonCopy;
  hero: HiringTeamsHeroCopy;
  reasons: HiringTeamsReasonsCopy;
};

type ProductPageCopy = {
  accent: string;
  body: string;
  capabilities: ProductPanel[];
  candidateExperience?: CandidateExperienceCopy;
  chapters: ProductPanel[];
  eyebrow: string;
  finalBody: string;
  finalCta: string;
  finalHeading: string;
  heroNodes: FloatingNode[];
  hiringTeamsExperience?: HiringTeamsExperienceCopy;
  metrics: FloatingNode[];
  primaryCta: string;
  productNavLabel: string;
  secondaryCta: string;
  stageKicker: string;
  stageTitle: string;
  title: string;
};

export default function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const { t } = useI18n();
  const productKey = productPageKeyBySlug[slug];
  const page = t.productPages.pages[productKey] as ProductPageCopy;
  const visual = productVisuals[slug];
  const isCandidatesPage = slug === "candidates";
  const isHiringTeamsPage = slug === "hiring-teams";
  const isPricingPage = slug === "pricing";
  const candidateExperience = page.candidateExperience;
  const hiringTeamsExperience = page.hiringTeamsExperience;
  const copyBySlug = {
    candidates: t.productPages.pages.candidates,
    "hiring-teams": t.productPages.pages.hiringTeams,
    pricing: t.productPages.pages.pricing,
  };

  const {
    activeChapter,
    artRef,
    chapterRefs,
    heroRef,
    nodeRefs,
    stageRef,
  } = useProductScrollScene();

  if (isCandidatesPage && !candidateExperience) {
    throw new Error("Candidate product page copy is missing.");
  }

  assertHiringTeamsExperience(isHiringTeamsPage, hiringTeamsExperience);

  return (
    <article
      className={
        isCandidatesPage
          ? "overflow-x-clip bg-white text-[#040817]"
          : isHiringTeamsPage ? "overflow-x-clip bg-[var(--page-bg)] text-[color:var(--page-text)]"
          : "overflow-x-clip bg-white text-slate-950"
      }
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      {isCandidatesPage && candidateExperience ? (
        <>
          <ContainerScroll
            titleComponent={
              <h1 className="mx-auto max-w-[12ch] text-balance text-5xl font-light leading-[0.98] text-[#040817] sm:text-7xl lg:text-8xl xl:text-[6.75rem]">
                {candidateExperience.heroTitle}{" "}
                <span
                  className="block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: CANDIDATE_HERO_WORD_GRADIENT,
                  }}
                >
                  {candidateExperience.heroAccent}
                </span>
              </h1>
            }
          />
          <TextRevealByWord
            highlightPhrase={candidateExperience.revealHighlight}
            text={candidateExperience.revealText}
          />
          <CandidateHorizontalCards
            cards={candidateExperience.horizontalCards.cards}
            dontDoLabel={candidateExperience.horizontalCards.dontDoLabel}
          />
          <CandidateClaritySection copy={candidateExperience.clarity} />
        </>
      ) : isHiringTeamsPage ? (
        <>
          <HiringTeamsScrollHero copy={hiringTeamsExperience.hero} />
          <HiringTeamsReasonsSection copy={hiringTeamsExperience.reasons} />
        </>
      ) : isPricingPage ? (
        <PricingProductTiersSection
          body={page.body}
          finalCta={t.productPages.pages.pricing.finalCta}
          headingLine1={t.pricing.headingLine1}
          headingLine2={t.pricing.headingLine2}
          plans={t.pricing.plans}
        />
      ) : (
        <section
          className="relative isolate overflow-hidden bg-slate-950 px-5 pb-16 pt-32 text-white sm:px-8 sm:pt-36 lg:px-12"
          ref={heroRef}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,6,23,0.98)_0%,rgba(15,23,42,0.94)_45%,rgba(33,39,71,0.82)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,1)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-full w-full opacity-50 [background-image:linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:72px_72px]"
          />

          <div className="relative z-10 mx-auto grid min-h-[calc(92svh-5rem)] max-w-[1200px] items-end gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)]">
            <div className="max-w-[760px] pb-4">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-bold uppercase text-white/78 backdrop-blur">
                <Sparkles aria-hidden="true" className="size-3.5" />
                {page.eyebrow}
              </p>

              <h1 className="max-w-[760px] text-5xl font-semibold leading-[0.96] text-white sm:text-6xl lg:text-7xl xl:text-8xl">
                {page.title}
                <span
                  className="block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: BRAND_GRADIENT,
                    fontFamily: "var(--font-instrument-serif), serif",
                  }}
                >
                  {page.accent}
                </span>
              </h1>

              <p className="mt-6 max-w-[660px] text-base font-medium leading-7 text-white/80 sm:text-lg sm:leading-8">
                {page.body}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 shadow-[0_22px_70px_rgba(2,6,23,0.25)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  href="/#begin"
                >
                  {page.primaryCta}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/58 bg-white/12 px-6 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                  href="/#companies"
                >
                  {page.secondaryCta}
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {page.metrics.map((metric) => (
                  <div
                    className="rounded-[8px] border border-white/14 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
                    key={metric.label}
                  >
                    <p className="text-2xl font-semibold leading-none text-white">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-xs font-medium leading-5 text-white/62">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[520px] pb-12 lg:min-h-[640px]">
              <div
                className="absolute inset-x-0 bottom-0 mx-auto h-[68%] max-w-[560px] rounded-[8px] border border-white/16 bg-white/[0.03] shadow-[0_28px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl"
                ref={artRef}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1.5 rounded-t-[8px]"
                  style={{ backgroundImage: BRAND_GRADIENT }}
                />
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-rose-300" />
                    <span className="size-2.5 rounded-full bg-amber-300" />
                    <span className="size-2.5 rounded-full bg-emerald-300" />
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[0.7rem] font-bold uppercase text-white/58">
                    {page.stageKicker}
                  </span>
                </div>

                <div className="grid gap-5 p-4 sm:p-5">
                  <div className="overflow-hidden rounded-[8px] bg-white shadow-[0_24px_70px_rgba(2,6,23,0.28)] ring-1 ring-white/12">
                    <Image
                      alt={visual.visualAlt}
                      className={`aspect-[16/10] w-full object-cover ${visual.visualPosition}`}
                      height={visual.height}
                      priority
                      sizes="(min-width: 1024px) 520px, 92vw"
                      src={visual.visualSrc}
                      width={visual.width}
                    />
                  </div>

                  <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-xs font-bold uppercase text-white/52">
                      {page.stageKicker}
                    </p>
                    <h2 className="mt-2 max-w-[18rem] text-2xl font-semibold leading-7 text-white">
                      {page.stageTitle}
                    </h2>
                    <div className="mt-4 grid gap-2">
                      {page.heroNodes.slice(0, 3).map((node) => (
                        <div
                          className="flex items-center justify-between rounded-[8px] bg-white/10 px-3 py-2 text-sm"
                          key={node.label}
                        >
                          <span className="font-medium text-white/72">
                            {node.label}
                          </span>
                          <span className="font-bold text-white">
                            {node.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {page.heroNodes.map((node, index) => (
                <div
                  className="absolute rounded-[8px] border border-white/18 bg-white/12 px-4 py-3 text-white shadow-[0_20px_54px_rgba(2,6,23,0.32)] backdrop-blur-md"
                  key={`${node.label}-float`}
                  ref={(element) => {
                    nodeRefs.current[index] = element;
                  }}
                  style={{
                    left: index % 2 === 0 ? `${6 + index * 5}%` : "auto",
                    right: index % 2 === 1 ? `${4 + index * 3}%` : "auto",
                    top: `${8 + index * 17}%`,
                  }}
                >
                  <p className="text-[0.66rem] font-bold uppercase text-white/48">
                    {node.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold leading-none">
                    {node.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!isCandidatesPage && !isHiringTeamsPage && !isPricingPage && (
        <nav
          aria-label={page.productNavLabel}
          className="border-b border-slate-200/70 bg-white px-5 py-4 sm:px-8"
        >
          <div className="mx-auto flex max-w-[1200px] gap-2 overflow-x-auto">
            {productSlugs.map((productSlug) => {
              const productCopy = copyBySlug[productSlug];
              const isActive = productSlug === slug;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                  }`}
                  href={productPageHrefs[productSlug]}
                  key={productSlug}
                >
                  {productCopy.title}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {!isCandidatesPage && !isHiringTeamsPage && !isPricingPage && (
        <section className="bg-white px-5 py-16 text-[#0b2146] sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1fr)] lg:gap-14">
            <div className="lg:sticky lg:top-28 lg:h-fit">
              <p className="text-xs font-black uppercase text-slate-400">
                {page.stageKicker}
              </p>
              <h2 className="mt-4 max-w-[11ch] text-4xl font-light leading-none text-slate-950 sm:text-5xl lg:text-6xl">
                {page.stageTitle}
              </h2>
              <p className="mt-5 max-w-md text-base font-medium leading-7 text-slate-500 sm:text-lg">
                {page.body}
              </p>
            </div>

            <div className="grid gap-5" ref={stageRef}>
              {page.chapters.map((chapter, index) => (
                <article
                  className={`relative overflow-hidden rounded-[8px] border p-6 shadow-[0_18px_56px_rgba(15,23,42,0.08)] transition-all duration-500 sm:p-8 ${
                    activeChapter === index
                      ? "border-slate-300 bg-white"
                      : "border-slate-200 bg-slate-50/80"
                  }`}
                  key={chapter.title}
                  ref={(element) => {
                    chapterRefs.current[index] = element;
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundImage: BRAND_GRADIENT }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <p
                      className="rounded-full px-3 py-2 text-xs font-black uppercase"
                      style={{
                        backgroundColor: `${visual.accent}1f`,
                        color: visual.darkAccent,
                      }}
                    >
                      {chapter.meta}
                    </p>
                    <span className="text-4xl font-light text-slate-200">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-8 max-w-xl text-3xl font-semibold leading-none text-[#0b2146] sm:text-4xl">
                    {chapter.title}
                  </h3>
                  <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-500">
                    {chapter.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {isCandidatesPage && candidateExperience ? (
        <>
          <CandidateExpandingCardsSection copy={candidateExperience.privacy} />
          <CandidateCommitmentsSection copy={candidateExperience.commitments} />
        </>
      ) : !isHiringTeamsPage && !isPricingPage ? (
        <section className="bg-slate-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-[1200px]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.capabilities.map((capability) => (
                <article
                  className="relative min-h-[280px] overflow-hidden rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_rgba(15,23,42,0.08)]"
                  key={capability.title}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundImage: BRAND_GRADIENT }}
                  />
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-7"
                    color={visual.darkAccent}
                    strokeWidth={2.2}
                  />
                  <p className="mt-8 text-xs font-black uppercase text-slate-400">
                    {capability.meta}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold leading-none text-[#0b2146]">
                    {capability.title}
                  </h3>
                  <p className="mt-5 text-[0.95rem] font-medium leading-6 text-slate-500">
                    {capability.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!isHiringTeamsPage && !isPricingPage && (
        <section className="bg-white px-5 pb-20 pt-8 sm:px-8 lg:px-12">
          <div className="mx-auto overflow-hidden rounded-[8px] bg-slate-950 p-6 text-white shadow-[0_24px_90px_rgba(15,23,42,0.18)] sm:p-8 lg:max-w-[1200px] lg:p-10">
            <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h2 className="max-w-3xl text-4xl font-semibold leading-none sm:text-5xl lg:text-6xl">
                  {page.finalHeading}
                </h2>
                <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 sm:text-lg">
                  {page.finalBody}
                </p>
              </div>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-slate-950 shadow-[0_18px_42px_rgba(168,197,241,0.24)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                href="/#begin"
                style={{ backgroundImage: BRAND_GRADIENT }}
              >
                {page.finalCta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {isHiringTeamsPage && (
        <>
          <NotForEveryoneSection copy={hiringTeamsExperience.antiFit} />
          <HiringTeamsComparisonSection copy={hiringTeamsExperience.comparison} />
        </>
      )}

    </article>
  );
}

function assertHiringTeamsExperience(
  active: boolean,
  copy: HiringTeamsExperienceCopy | undefined,
): asserts copy is HiringTeamsExperienceCopy {
  if (active && !copy) {
    throw new Error("Hiring teams product page copy is missing.");
  }
}

function PricingProductTiersSection({
  body,
  finalCta,
  headingLine1,
  headingLine2,
  plans,
}: {
  body: string;
  finalCta: string;
  headingLine1: string;
  headingLine2: string;
  plans: readonly PricingPlanCopy[];
}) {
  const cardVariants = [
    {
      className:
        "bg-[linear-gradient(145deg,var(--page-dark)_0%,var(--page-dark-violet)_55%,#263478_100%)]",
      type: "waves" as const,
    },
    {
      className:
        "bg-[linear-gradient(145deg,#4d52c6_0%,var(--page-accent-strong)_48%,#7da8ef_100%)]",
      type: "crosses" as const,
    },
    {
      className:
        "bg-[linear-gradient(145deg,#9b4fbc_0%,#c35f9b_48%,var(--page-accent-pink)_100%)]",
      type: "waves" as const,
    },
  ];

  return (
    <section
      className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden bg-white px-5 pb-16 pt-32 text-[color:var(--page-text)] sm:px-8 sm:pt-36 lg:px-12"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="relative z-10 mx-auto max-w-[1220px]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.58fr)_minmax(0,1fr)] lg:items-start">
          <div className="max-w-2xl">
            <h1 className="max-w-[11ch] text-[2.6rem] font-light leading-[1.04] tracking-normal text-[color:var(--page-text)] sm:text-[3.5rem] lg:text-[4.1rem]">
              {headingLine1}
              <span className="block">
                {headingLine2}
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-normal leading-[1.55] text-[color:var(--page-text-muted)] sm:text-lg">
              {body}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan, index) => (
              <PricingWrapper
                key={plan.name}
                contactHref="/contact"
                actionLabel={finalCta}
                className={cardVariants[index % cardVariants.length].className}
                type={cardVariants[index % cardVariants.length].type}
              >
                <p className="rounded-full bg-white/14 px-3 py-2 text-xs font-bold uppercase text-white/72">
                  {String(index + 1).padStart(2, "0")} / {plan.eyebrow}
                </p>
                <Heading>{plan.name}</Heading>
                <Price>
                  {plan.price}
                  {plan.cadence ? (
                    <span className="mt-2 block text-base font-bold leading-none text-white/68">
                      {plan.cadence}
                    </span>
                  ) : null}
                </Price>
                {plan.body ? <Paragraph>{plan.body}</Paragraph> : null}
              </PricingWrapper>
            ))}
          </div>
        </div>
        <SavingsRoiCalculator />
      </div>
    </section>
  );
}

function SavingsRoiCalculator() {
  const [hiresPerYear, setHiresPerYear] = useState(12);
  const [recruiterFee, setRecruiterFee] = useState(4000);
  const [screeningHours, setScreeningHours] = useState(23);

  const hourlyCost = 55;
  const platformAnnual = 400 * 12;
  const successFees = hiresPerYear * 200;
  const assumeraiCost = platformAnnual + successFees;
  const baselineCost = (hiresPerYear * recruiterFee) + (hiresPerYear * screeningHours * hourlyCost);
  const annualSavings = baselineCost - assumeraiCost;
  const roiPercent = Math.round((annualSavings / assumeraiCost) * 100);
  const hoursReturned = Math.round(hiresPerYear * screeningHours * 0.9);

  const formatEuro = (value: number) =>
    new Intl.NumberFormat("en", {
      currency: "EUR",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(value);

  return (
    <section
      aria-labelledby="pricing-roi-title"
      className="mx-auto mt-10 max-w-[980px] rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-[#040817] shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:mt-12 sm:p-5 lg:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(270px,0.58fr)] lg:items-start">
        <div>
          <h2
            className="text-2xl font-light leading-[1.04] tracking-normal text-[#040817] sm:text-3xl"
            id="pricing-roi-title"
          >
            Savings & ROI calculator
          </h2>
          <p className="mt-3 max-w-[38rem] text-sm font-normal leading-6 text-[color:var(--page-text-muted)]">
            Compare recruiter fees and screening time against the {"\u20ac400"} platform fee and {"\u20ac200"} per-hire fee. Performance: let&apos;s speak.
          </p>

          <div className="mt-5 grid gap-3">
            <RoiSlider
              ariaLabel="Annual hires"
              label="Annual hires"
              max={80}
              maxLabel="80"
              min={3}
              minLabel="3"
              onChange={setHiresPerYear}
              step={1}
              value={hiresPerYear}
              valueLabel={String(hiresPerYear)}
            />

            <RoiSlider
              ariaLabel="Recruiter fee per hire"
              label="Recruiter fee per hire"
              max={12000}
              maxLabel={formatEuro(12000)}
              min={1000}
              minLabel={formatEuro(1000)}
              onChange={setRecruiterFee}
              step={250}
              value={recruiterFee}
              valueLabel={formatEuro(recruiterFee)}
            />

            <RoiSlider
              ariaLabel="Screening hours per role"
              label="Screening hours per role"
              max={60}
              maxLabel="60h"
              min={5}
              minLabel="5h"
              onChange={setScreeningHours}
              step={1}
              value={screeningHours}
              valueLabel={`${screeningHours}h`}
            />
          </div>
        </div>

        <div className="grid gap-2.5">
          <div className="rounded-[8px] bg-[#040817] p-4 text-white">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/54">
              Annual savings
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none">
              {formatEuro(annualSavings)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[8px] border border-slate-200 bg-white p-3">
              <p className="text-[0.68rem] font-bold uppercase text-slate-400">
                ROI
              </p>
              <p className="mt-1.5 text-lg font-semibold text-[#040817]">
                {roiPercent}%
              </p>
            </div>
            <div className="rounded-[8px] border border-slate-200 bg-white p-3">
              <p className="text-[0.68rem] font-bold uppercase text-slate-400">
                Hours back
              </p>
              <p className="mt-1.5 text-lg font-semibold text-[#040817]">
                {hoursReturned}h
              </p>
            </div>
          </div>
          <div className="rounded-[8px] border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-500">Current cost</span>
              <span className="font-bold text-[#040817]">{formatEuro(baselineCost)}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-500">AssumerAI cost</span>
              <span className="font-bold text-[#040817]">{formatEuro(assumeraiCost)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoiSlider({
  ariaLabel,
  label,
  max,
  maxLabel,
  min,
  minLabel,
  onChange,
  step,
  value,
  valueLabel,
}: {
  ariaLabel: string;
  label: string;
  max: number;
  maxLabel: string;
  min: number;
  minLabel: string;
  onChange: (value: number) => void;
  step: number;
  value: number;
  valueLabel: string;
}) {
  const sliderProgress = ((value - min) / (max - min)) * 100;

  return (
    <label
      className="group/slider block rounded-[8px] border border-slate-200 bg-white px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors focus-within:border-[var(--page-accent-strong)]"
      style={{
        "--slider-progress": `${sliderProgress}%`,
      } as CSSProperties}
    >
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-[#040817] sm:text-sm">
        {label}
        <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-sm font-semibold text-[#040817] ring-1 ring-slate-200">
          {valueLabel}
        </span>
      </span>

      <span className="mt-3 block">
        <span className="relative block h-7">
          <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-slate-100" />
          <span className="absolute left-0 top-1/2 h-[2px] w-[var(--slider-progress)] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--page-accent-pink)_0%,var(--page-accent-strong)_55%,var(--page-accent-blue)_100%)] shadow-[0_6px_18px_var(--page-accent-soft)]" />
          <span className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                aria-hidden="true"
                className="size-1 rounded-full bg-slate-300 ring-[3px] ring-white"
                key={index}
              />
            ))}
          </span>
          <span className="pointer-events-none absolute left-[var(--slider-progress)] top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-[0_8px_22px_rgba(4,8,23,0.16)] ring-[3px] ring-[var(--page-accent-soft)] transition-transform group-focus-within/slider:scale-110" />
          <input
            aria-label={ariaLabel}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            max={max}
            min={min}
            onChange={(event) => onChange(Number(event.target.value))}
            step={step}
            type="range"
            value={value}
          />
        </span>
        <span className="mt-0.5 flex justify-between text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </span>
      </span>
    </label>
  );
}

function HiringTeamsScrollHero({ copy }: { copy: HiringTeamsHeroCopy }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end center"],
  });

  return (
    <section
      ref={ref}
      className="relative mx-auto flex h-[180vh] w-full flex-col items-center overflow-hidden bg-white px-4 text-[color:var(--page-text)]"
    >
      <MobileLinePath
        className="absolute right-3 top-8 z-0 h-[176vh] w-auto max-w-[calc(100vw-1.5rem)] opacity-85 sm:right-6 lg:hidden"
        scrollYProgress={scrollYProgress}
      />

      {copy.metrics.map((metric, index) => {
        const layout = HIRING_TEAMS_LINE_METRIC_LAYOUTS[index];

        if (!layout) return null;

        return (
          <HiringTeamsLineMetricCallout
            key={`${metric.value}-${metric.label}`}
            metric={{ ...metric, ...layout }}
            scrollYProgress={scrollYProgress}
          />
        );
      })}

      <div className="relative mt-36 flex w-fit max-w-[960px] flex-col items-center justify-center gap-4 text-center sm:mt-[10.5rem]">
        <h1 className="relative z-10 max-w-[18ch] bg-[linear-gradient(110deg,var(--page-text)_0%,var(--page-text)_48%,var(--page-accent-strong)_74%,var(--page-accent-blue)_100%)] bg-clip-text text-balance [font-family:var(--font-geist-sans),sans-serif] font-bold text-[clamp(2rem,4vw,4.5rem)] leading-[0.98] tracking-tighter text-transparent">
          {copy.title}
        </h1>
        <p className="relative z-10 max-w-2xl text-sm font-medium leading-6 text-[color:var(--page-text-muted)] sm:text-base sm:leading-7">
          {copy.body}
        </p>

        <LinePath
          className="absolute -left-[8rem] top-8 z-0 hidden h-[160vh] w-auto max-w-none opacity-80 sm:-left-[5rem] lg:-right-[18rem] lg:left-auto lg:top-0 lg:block lg:opacity-100"
          scrollYProgress={scrollYProgress}
        />
      </div>
    </section>
  );
}

function HiringTeamsLineMetricCallout({
  metric,
  scrollYProgress,
}: {
  metric: FloatingNode & (typeof HIRING_TEAMS_LINE_METRIC_LAYOUTS)[number];
  scrollYProgress: MotionValue<number>;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [metric.revealRange[0] - 0.04, metric.revealRange[0], 1],
    [0, 1, 1],
  );
  const y = useTransform(
    scrollYProgress,
    [metric.revealRange[0] - 0.04, metric.revealRange[0]],
    [18, 0],
  );
  const x = useTransform(
    scrollYProgress,
    [metric.revealRange[0] - 0.04, metric.revealRange[0]],
    [12, 0],
  );
  const filter = useTransform(
    scrollYProgress,
    [metric.revealRange[0] - 0.04, metric.revealRange[0]],
    ["blur(8px)", "blur(0px)"],
  );

  return (
    <motion.article
      aria-label={`${metric.value} ${metric.label}`}
      className={`pointer-events-none absolute z-10 w-[min(13rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-[color:var(--page-border)] bg-[linear-gradient(135deg,var(--page-surface-strong)_0%,var(--page-lilac-surface)_54%,var(--page-blue-surface)_100%)] px-4 py-3.5 text-left shadow-[0_20px_58px_var(--page-shadow),0_0_42px_var(--page-accent-soft),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl sm:w-[13rem] ${metric.className}`}
      style={{
        opacity,
        x,
        y,
        filter,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,var(--page-warm-surface),transparent_40%),radial-gradient(circle_at_12%_92%,var(--page-violet-surface),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3 size-2 rounded-full bg-[var(--page-accent-strong)] shadow-[0_0_18px_var(--page-accent-soft)]"
      />
      <span
        aria-hidden="true"
        className="relative mb-3 block h-1 w-12 rounded-full bg-[linear-gradient(90deg,var(--page-accent-pink)_0%,var(--page-accent-lilac)_35%,var(--page-accent-violet)_68%,var(--page-accent-blue)_100%)]"
      />

      <p className="relative text-[clamp(2.15rem,9vw,3.35rem)] font-semibold leading-[0.84] tracking-tight text-[color:var(--page-text)] lg:text-[clamp(2.15rem,3vw,3.35rem)]">
        {metric.value}
      </p>
      <p className="relative mt-3 text-[0.66rem] font-black uppercase leading-none tracking-[0.16em] text-[color:var(--page-text-muted)] sm:text-[0.7rem]">
        {metric.label}
      </p>
    </motion.article>
  );
}

function HiringTeamsReasonsSection({ copy }: { copy: HiringTeamsReasonsCopy }) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const showReasons = isVisible || prefersReducedMotion;
  const baseTransition = "760ms cubic-bezier(0.22, 1, 0.36, 1)";
  const headingMotion = prefersReducedMotion
    ? {
        opacity: 1,
        transform: "none",
        transition: "none",
      }
    : {
        opacity: showReasons ? 1 : 0,
        transform: showReasons ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
        transition: `opacity 520ms ease, transform 620ms cubic-bezier(0.22, 1, 0.36, 1)`,
      };

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const section = sectionRef.current;

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -24% 0px", threshold: 0.16 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <section
      aria-label={copy.ariaLabel}
      className="relative isolate overflow-hidden bg-[var(--page-bg-soft)] pb-10 pt-14 text-[color:var(--page-text)] sm:pb-14 sm:pt-16 lg:pb-20 lg:pt-20"
      ref={sectionRef}
      style={{
        background:
          "radial-gradient(circle at 10% 24%, var(--page-warm-surface), transparent 26rem), radial-gradient(circle at 88% 16%, var(--page-blue-surface), transparent 28rem), linear-gradient(180deg, var(--page-bg-soft) 0%, var(--page-bg) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,var(--page-bg)_0%,transparent_100%)]"
      />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <h2
          className="max-w-[16ch] px-5 text-balance text-[clamp(1.85rem,8vw,2.65rem)] font-semibold leading-[0.98] tracking-normal text-[color:var(--page-text)] sm:px-8 lg:max-w-[760px] lg:px-12 lg:text-[clamp(2rem,3vw,3.5rem)]"
          style={headingMotion}
        >
          {copy.heading}
        </h2>

        <div className="mt-7 lg:mx-[clamp(12px,2vw,32px)] lg:mt-10 lg:overflow-hidden lg:rounded-[clamp(20px,2vw,32px)]">
          <ol
            aria-label={copy.listAriaLabel}
            className="flex list-none items-stretch gap-3 overflow-x-auto px-5 pb-7 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 sm:px-8 lg:grid lg:grid-cols-5 lg:items-stretch lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {copy.items.map((reason, index) => {
              const reasonVisual = HIRING_TEAMS_REASON_VISUALS[index];

              if (!reasonVisual) return null;

              const panelDelay = prefersReducedMotion
                ? "0ms"
                : `${120 + index * 80}ms`;
              const metricDelay = prefersReducedMotion
                ? "0ms"
                : `${220 + index * 80}ms`;
              const textDelay = prefersReducedMotion
                ? "0ms"
                : `${300 + index * 80}ms`;
              const imageDelay = prefersReducedMotion
                ? "0ms"
                : `${380 + index * 80}ms`;
            const reasonStyle = {
              background: reasonVisual.background,
              color: reasonVisual.textColor,
              "--panel-muted": reasonVisual.mutedColor,
              "--panel-text-delay": textDelay,
            } as CSSProperties;
            const panelMotion = prefersReducedMotion
              ? {
                  clipPath: "inset(0 0 0 0)",
                  opacity: 1,
                  transform: "none",
                  transition: "none",
                }
              : {
                  clipPath: showReasons
                    ? "inset(0 0 0 0)"
                    : "inset(0 0 100% 0)",
                  opacity: showReasons ? 1 : 0,
                  transform: showReasons
                    ? "translate3d(0, 0, 0)"
                    : "translate3d(0, 18px, 0)",
                  transition: `clip-path ${baseTransition}, opacity 620ms ease, transform ${baseTransition}`,
                  transitionDelay: panelDelay,
                };
            const metricMotion = prefersReducedMotion
              ? {
                  opacity: 1,
                  transform: "none",
                  transition: "none",
                }
              : {
                  opacity: showReasons ? 1 : 0,
                  transform: showReasons
                    ? "translate3d(0, 0, 0) scale(1)"
                    : "translate3d(0, 12px, 0) scale(0.97)",
                  transition: `opacity 600ms ease, transform 700ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  transitionDelay: metricDelay,
                };
            const textMotion = prefersReducedMotion
              ? {
                  opacity: 1,
                  transform: "none",
                  transition: "none",
                }
              : {
                  opacity: showReasons ? 1 : 0,
                  transform: showReasons
                    ? "translate3d(0, 0, 0)"
                    : "translate3d(0, 8px, 0)",
                  transition: `opacity 540ms ease, transform 620ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  transitionDelay: textDelay,
                };
            const imageMotion = prefersReducedMotion
              ? {
                  opacity: 0.22,
                  transform: "none",
                  transition: "none",
                }
              : {
                  opacity: showReasons ? 0.22 : 0,
                  transform: showReasons ? "scale(1)" : "scale(0.97)",
                  transition: `opacity 700ms ease, transform 820ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  transitionDelay: imageDelay,
                };

            return (
              <li
                className="flex flex-[0_0_min(82vw,330px)] shrink-0 snap-center lg:h-[clamp(480px,58vh,620px)] lg:min-w-0 lg:flex-auto"
                key={`${reason.number}-${reason.title}`}
              >
                <article
                  className="relative flex h-full min-h-[clamp(420px,54svh,520px)] w-full items-start overflow-hidden rounded-[22px] px-[22px] py-[22px] shadow-[0_24px_72px_var(--page-shadow)] ring-1 ring-[color:var(--page-border)] lg:min-h-0 lg:rounded-none lg:p-[clamp(20px,1.8vw,32px)]"
                  style={{
                    ...reasonStyle,
                    ...panelMotion,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-[-6%] top-[10%] text-[clamp(7rem,9vw,11rem)] font-semibold leading-[0.8] opacity-[0.045]"
                  >
                    {reason.number}
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 mix-blend-screen"
                    style={{
                      background: `radial-gradient(circle at 74% 12%, ${reasonVisual.glow} 0%, transparent 42%)`,
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--page-border)]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_28px_rgba(255,255,255,0.34),inset_0_-48px_90px_var(--page-shadow)]"
                  />
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-[-2%] right-[-6%] z-[1] w-[62%] max-w-[260px] select-none object-contain lg:bottom-[-1%] lg:right-[-3%] lg:w-[52%]"
                    height={512}
                    src={reasonVisual.visualSrc}
                    style={{
                      ...imageMotion,
                      mixBlendMode: reasonVisual.visualBlendMode,
                    } as CSSProperties}
                    width={512}
                  />

                  <div className="relative z-10 flex h-full w-full max-w-[31rem] flex-col items-start [overflow-wrap:normal] lg:max-w-none">
                    <div className="reasonEyebrow inline-flex rounded-full border border-[color:var(--page-border)] bg-white/20 px-2.5 py-1.5 text-[0.62rem] font-[720] uppercase leading-none tracking-[0.08em] opacity-75 shadow-[inset_0_1px_0_rgba(255,255,255,0.34)] lg:text-[0.64rem]">
                      <p className="whitespace-nowrap">
                        {copy.reasonLabel} {reason.number}
                      </p>
                    </div>

                    <div className="mt-[clamp(34px,7vh,64px)] lg:mt-[clamp(42px,5vh,60px)]" style={metricMotion}>
                      <p className="text-[clamp(2.35rem,11vw,3.35rem)] font-[650] leading-[0.9] tracking-normal lg:text-[clamp(2.35rem,3.5vw,4.15rem)]">
                        {reason.metric}
                      </p>
                      <p className="mt-2 max-w-[12rem] text-[0.68rem] font-[760] uppercase leading-[1.15] tracking-[0.04em] opacity-75 lg:text-[0.7rem]">
                        {reason.label}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="reasonDivider mt-5 h-px w-12 rounded-full bg-[var(--panel-muted)] opacity-35"
                    />

                    <div className="mt-5 lg:mt-6" style={textMotion}>
                      <h3 className="max-w-[17rem] text-[clamp(1.08rem,4.6vw,1.42rem)] font-[650] leading-[1.12] tracking-normal [text-wrap:balance] lg:text-[clamp(1.05rem,1.22vw,1.45rem)]">
                        {reason.title}
                      </h3>
                      <p
                        className="mt-3 max-w-[20rem] text-[0.84rem] font-[430] leading-[1.55] tracking-normal lg:text-[clamp(0.78rem,0.82vw,0.92rem)]"
                        style={{ color: "var(--panel-muted)" }}
                      >
                        {reason.body}
                      </p>
                    </div>
                  </div>
                </article>
              </li>
            );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function MobileLinePath({
  className,
  scrollYProgress,
}: {
  className: string;
  scrollYProgress: MotionValue<number>;
}) {
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <svg
      aria-hidden="true"
      width="390"
      height="2200"
      viewBox="0 0 390 2200"
      fill="none"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <motion.path
        d={MOBILE_VENN_SCROLL_PATH}
        stroke="var(--page-accent)"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          pathLength,
        }}
      />
    </svg>
  );
}

function LinePath({
  className,
  scrollYProgress,
}: {
  className: string;
  scrollYProgress: MotionValue<number>;
}) {
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <svg
      aria-hidden="true"
      width="1278"
      height="2200"
      viewBox="0 0 1278 2200"
      fill="none"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <motion.path
        d={VENN_SCROLL_PATH}
        stroke="var(--page-accent)"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          pathLength,
        }}
      />
    </svg>
  );
}

function useProductScrollScene() {
  const heroRef = useRef<HTMLElement | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const applyScroll = () => {
      const hero = heroRef.current;

      if (!hero || prefersReducedMotion.matches) {
        frame = 0;
        return;
      }

      const rect = hero.getBoundingClientRect();
      const viewportHeight = Math.max(1, window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / viewportHeight));
      const art = artRef.current;

      if (art) {
        art.style.transform = `translate3d(0, ${progress * -28}px, 0) scale(${1 - progress * 0.025})`;
        art.style.opacity = `${1 - progress * 0.22}`;
      }

      nodeRefs.current.forEach((node, index) => {
        if (!node) return;

        const direction = index % 2 === 0 ? -1 : 1;
        const offset = progress * (28 + index * 9) * direction;
        node.style.transform = `translate3d(${offset}px, ${progress * -42}px, 0)`;
        node.style.opacity = `${Math.max(0.42, 1 - progress * 0.54)}`;
      });

      frame = 0;
    };

    const scheduleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(applyScroll);
    };

    scheduleScroll();
    window.addEventListener("scroll", scheduleScroll, { passive: true });
    window.addEventListener("resize", scheduleScroll);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", scheduleScroll);
      window.removeEventListener("resize", scheduleScroll);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleEntry) return;

        const nextIndex = chapterRefs.current.findIndex(
          (chapter) => chapter === visibleEntry.target,
        );

        if (nextIndex >= 0) {
          setActiveChapter(nextIndex);
        }
      },
      { rootMargin: "-30% 0px -35% 0px", threshold: [0.22, 0.42, 0.62] },
    );

    chapterRefs.current.forEach((chapter) => {
      if (chapter) {
        observer.observe(chapter);
      }
    });

    return () => observer.disconnect();
  }, []);

  return {
    activeChapter,
    artRef,
    chapterRefs,
    heroRef,
    nodeRefs,
    stageRef,
  };
}
