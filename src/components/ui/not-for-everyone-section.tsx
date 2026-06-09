"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CSSProperties } from "react";

type AntiFitCardVisual = {
  accent: string;
  accentRgb: string;
  href: string;
  image: string;
  imageHeight: number;
  imageShift: string;
  imageSize: string;
  imageWidth: number;
  number: string;
  underlineRotate: string;
  underlineWidth: string;
  underlineY: string;
};

export type AntiFitCardCopy = {
  alt: string;
  body: string;
  cta: string;
  title: string;
};

export type NotForEveryoneCopy = {
  bottomNoteBody: string;
  bottomNoteTitle: string;
  cards: AntiFitCardCopy[];
  headingEmphasis: string;
  headingLine1: string;
  headingLine2: string;
  subtitle: string;
};

const antiFitCardVisuals: AntiFitCardVisual[] = [
  {
    accent: "var(--page-accent-pink)",
    accentRgb: "242, 167, 199",
    href: "/contact",
    image: "/images/hiring-teams/not-for-everyone/repeat-hiring-calendar.png",
    imageHeight: 1254,
    imageShift: "-4deg",
    imageSize: "clamp(170px, 14vw, 220px)",
    imageWidth: 1254,
    number: "01",
    underlineRotate: "-1.6deg",
    underlineWidth: "145px",
    underlineY: "0px",
  },
  {
    accent: "var(--page-accent-lilac)",
    accentRgb: "210, 140, 235",
    href: "/contact",
    image: "/images/hiring-teams/not-for-everyone/executive-search-king.png",
    imageHeight: 1254,
    imageShift: "3deg",
    imageSize: "clamp(190px, 16vw, 245px)",
    imageWidth: 1254,
    number: "02",
    underlineRotate: "-0.8deg",
    underlineWidth: "185px",
    underlineY: "1px",
  },
  {
    accent: "var(--page-accent-violet)",
    accentRgb: "143, 141, 230",
    href: "/contact",
    image: "/images/hiring-teams/not-for-everyone/decision-timer-clock.png",
    imageHeight: 1254,
    imageShift: "-2deg",
    imageSize: "clamp(205px, 17vw, 260px)",
    imageWidth: 1254,
    number: "03",
    underlineRotate: "-1.2deg",
    underlineWidth: "150px",
    underlineY: "0px",
  },
  {
    accent: "var(--page-accent-blue)",
    accentRgb: "120, 168, 240",
    href: "/contact",
    image: "/images/hiring-teams/not-for-everyone/outreach-megaphone.png",
    imageHeight: 1122,
    imageShift: "4deg",
    imageSize: "clamp(210px, 17vw, 270px)",
    imageWidth: 1402,
    number: "04",
    underlineRotate: "-0.9deg",
    underlineWidth: "150px",
    underlineY: "1px",
  },
];

const easeOut = [0.22, 1, 0.36, 1] as const;

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
    },
  },
};

const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 42,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.74,
      ease: easeOut,
    },
  },
};

const headingUnderlineVariants: Variants = {
  hidden: {
    scaleX: 0,
  },
  visible: {
    scaleX: 1,
    transition: {
      delay: 0.22,
      duration: 0.8,
      ease: easeOut,
    },
  },
};

export function NotForEveryoneSection({ copy }: { copy: NotForEveryoneCopy }) {
  const prefersReducedMotion = useReducedMotion();
  const revealInitial = prefersReducedMotion ? false : "hidden";
  const connectorInitial = prefersReducedMotion
    ? { opacity: 0.42, pathLength: 1 }
    : { opacity: 0, pathLength: 0 };

  return (
    <section
      aria-labelledby="not-for-everyone-title"
      className="notForEveryoneSection relative isolate overflow-x-clip overflow-y-visible bg-white px-5 pb-[clamp(84px,8vw,120px)] pt-[clamp(84px,8vw,120px)] text-[color:var(--page-text)] [font-family:var(--font-geist-sans),sans-serif] sm:px-8 lg:px-12"
    >
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <motion.header
          initial={revealInitial}
          viewport={{ amount: 0.48, once: true }}
          whileInView="visible"
          className="sectionHeader mb-[clamp(56px,6vw,86px)] grid gap-7 lg:grid-cols-[minmax(0,880px)_auto] lg:items-end lg:gap-[clamp(28px,5vw,76px)]"
        >
          <div>
            <motion.h2
              id="not-for-everyone-title"
              variants={cardVariants}
              className="sectionTitle max-w-[880px] text-balance text-[clamp(34px,9vw,44px)] font-[750] leading-[1.04] tracking-[-0.034em] text-[color:var(--page-text)] sm:text-[clamp(40px,6vw,52px)] lg:text-[clamp(44px,4vw,58px)]"
            >
              <span className="block">{copy.headingLine1}</span>
              <span className="block">
                <span className="relative inline-block bg-[linear-gradient(105deg,var(--page-text)_0%,color-mix(in_srgb,var(--page-text)_72%,var(--page-accent-strong))_26%,var(--page-accent-violet)_66%,var(--page-accent-strong)_100%)] bg-clip-text text-transparent">
                  {copy.headingEmphasis}
                  <motion.span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-[7px] w-full origin-left rounded-full bg-[linear-gradient(90deg,var(--page-accent-soft),var(--page-accent-surface),transparent)] motion-reduce:transition-none"
                    variants={headingUnderlineVariants}
                  />
                </span>{" "}
                {copy.headingLine2}
              </span>
            </motion.h2>

            <motion.p
              variants={cardVariants}
              className="sectionSubtitle mt-5 max-w-[480px] text-base font-[450] leading-[1.65] text-[color:var(--page-text-muted)]"
            >
              {copy.subtitle}
            </motion.p>
          </div>

        </motion.header>

        <motion.div
          initial={revealInitial}
          variants={sectionVariants}
          viewport={{ amount: 0.2, once: true }}
          whileInView="visible"
          className="relative"
        >
          <svg
            aria-hidden="true"
            className="connectorPath pointer-events-none absolute left-1/2 top-[6.4rem] z-0 hidden h-[9.5rem] w-[calc(100%-7rem)] -translate-x-1/2 overflow-visible lg:block"
            fill="none"
            viewBox="0 0 1040 160"
          >
            <motion.path
              d="M8 104 C 132 28 218 26 318 94 S 516 172 604 86 S 802 -8 1032 76"
              initial={connectorInitial}
              stroke="var(--page-border)"
              strokeDasharray="4 8"
              strokeLinecap="round"
              strokeWidth="1"
              transition={{ duration: 1.5, ease: easeOut }}
              viewport={{ amount: 0.4, once: true }}
              whileInView={{ opacity: 1, pathLength: 1 }}
            />
          </svg>

          <div className="cardsGrid relative z-[2] grid items-stretch gap-x-[clamp(18px,2vw,28px)] gap-y-[34px] sm:auto-rows-fr sm:grid-cols-2 sm:gap-y-14 xl:grid-cols-4">
            {copy.cards.map((card, index) => {
              const visual = antiFitCardVisuals[index];

              if (!visual) return null;

              const cardStyle = {
                "--card-accent": visual.accent,
                "--card-accent-rgb": visual.accentRgb,
                "--card-hover-rotate": visual.imageShift,
                "--image-width": visual.imageSize,
                "--underline-rotate": visual.underlineRotate,
                "--underline-width": visual.underlineWidth,
                "--underline-y": visual.underlineY,
                "--card-number": `color-mix(in srgb, ${visual.accent} 44%, var(--page-text))`,
              } as CSSProperties;

              return (
                <motion.div
                  className="reasonItem group relative flex h-full min-w-0 flex-col pt-[clamp(145px,13vw,205px)]"
                  key={visual.number}
                  style={cardStyle}
                  variants={cardVariants}
                >
                  <span
                    aria-hidden="true"
                    className="reasonVisualBlob absolute left-1/2 top-[clamp(72px,8vw,105px)] z-[1] aspect-square w-[min(82%,260px)] -translate-x-1/2 rounded-full opacity-95"
                    style={{
                      background: "radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--card-accent) 14%, transparent) 0%, color-mix(in srgb, var(--card-accent) 8%, transparent) 48%, transparent 72%)",
                    }}
                  />

                  <div
                    className="imageWrap pointer-events-none absolute left-1/2 top-0 z-[3] w-[var(--image-width)] max-w-full -translate-x-1/2 border-0 bg-transparent shadow-none transition-transform duration-700 ease-out group-hover:-translate-y-3 group-hover:rotate-[var(--card-hover-rotate)] motion-reduce:transform-none motion-reduce:transition-none"
                    style={{
                      background: "transparent",
                      border: 0,
                      boxShadow: "none",
                    }}
                  >
                    <Image
                      alt={card.alt}
                      className="block h-auto w-full bg-transparent object-contain [filter:drop-shadow(0_22px_34px_var(--page-shadow))]"
                      height={visual.imageHeight}
                      loading="lazy"
                      sizes="(min-width: 1280px) 270px, (min-width: 640px) 34vw, 62vw"
                      src={visual.image}
                      width={visual.imageWidth}
                    />
                  </div>

                  <article
                    className="reasonCard relative z-[2] flex h-full min-h-[390px] flex-1 flex-col rounded-[24px] border px-6 pb-6 pt-8 shadow-[0_24px_80px_var(--page-shadow),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[0_32px_90px_var(--page-shadow),0_0_0_1px_rgba(var(--card-accent-rgb),0.16)] motion-reduce:transform-none motion-reduce:transition-none"
                    style={{
                      background:
                        "linear-gradient(180deg, var(--page-surface-strong) 0%, color-mix(in srgb, var(--card-accent) 14%, var(--page-surface)) 100%)",
                      borderColor: `rgba(${visual.accentRgb}, 0.36)`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[24px] border opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
                      style={{ borderColor: `rgba(${visual.accentRgb}, 0.55)` }}
                    />

                    <div className="relative z-[4] flex h-full flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <span
                          aria-hidden="true"
                          className="text-[clamp(56px,6vw,88px)] font-light leading-[0.9] tracking-[-0.06em]"
                          style={{ color: "var(--card-number)" }}
                        >
                          {visual.number}
                        </span>
                        <span
                          aria-hidden="true"
                          className="mt-2.5 size-2.5 rounded-full"
                          style={{
                            backgroundColor: visual.accent,
                            boxShadow: `0 0 26px rgba(${visual.accentRgb}, 0.34)`,
                          }}
                        />
                      </div>

                      <h3 className="cardTitle mt-6 text-[clamp(20px,1.55vw,24px)] font-[750] leading-[1.05] tracking-[-0.035em] text-[color:var(--page-text)]">
                        {card.title}
                      </h3>
                      <p className="cardBody mt-[22px] flex-1 text-[14px] font-[450] leading-[1.65] text-[color:var(--page-text-muted)]">
                        {card.body}
                      </p>

                      <Link
                        className="cardCta group/cardCta relative mt-auto inline-flex w-fit max-w-full items-center gap-2 whitespace-nowrap pb-3 pt-7 text-[14px] font-[650] leading-[1.2] text-[color:var(--page-accent-strong)] no-underline outline-none transition-colors focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-white motion-reduce:transition-none"
                        href={visual.href}
                      >
                        <span className="cardCtaLabel relative z-[1]">{card.cta}</span>
                        <span
                          aria-hidden="true"
                          className="cardCtaArrow arrow relative z-[1] inline-block transition-transform duration-200 group-hover:translate-x-1 group-hover/cardCta:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                          {"\u2192"}
                        </span>
                        <span
                          aria-hidden="true"
                          className="cardCtaUnderline pointer-events-none absolute bottom-px left-0 h-3 w-[min(100%,var(--underline-width,150px))] origin-left translate-y-[var(--underline-y,0px)] rotate-[var(--underline-rotate,-1deg)]"
                        >
                          <svg
                            className="block h-full w-full overflow-visible"
                            preserveAspectRatio="none"
                            viewBox="0 0 160 12"
                          >
                            <path
                              className="cardCtaUnderlineMain fill-none stroke-current opacity-[0.34] transition-[opacity,stroke-dashoffset] duration-200 group-hover/cardCta:opacity-[0.62] group-hover/cardCta:[stroke-dashoffset:-8] motion-reduce:transition-none"
                              d="M2 8 C 34 10, 74 5, 118 6 C 136 6.5, 148 7.5, 158 6"
                              strokeDasharray="165"
                              strokeDashoffset="0"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.35"
                              vectorEffect="non-scaling-stroke"
                            />
                            <path
                              className="cardCtaUnderlineGhost fill-none stroke-current opacity-[0.1]"
                              d="M10 10 C 42 8, 82 9, 136 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        </span>
                      </Link>
                    </div>
                  </article>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="bottomNote mx-auto mt-[clamp(28px,4vw,44px)] grid w-fit max-w-[min(100%,460px)] grid-cols-[34px_auto] items-center gap-3.5 rounded-2xl border border-[color:var(--page-border)] bg-[var(--page-surface)] px-[22px] py-3.5 shadow-[0_18px_55px_var(--page-shadow),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[10px]">
          <span
            aria-hidden="true"
            className="bottomNoteIcon grid size-[34px] place-items-center text-2xl leading-none text-[color:var(--page-accent-strong)]"
          >
            {"\u2733"}
          </span>
          <span className="bottomNoteCopy grid gap-[3px] text-left">
            <strong className="text-[14px] font-[750] leading-[1.2] text-[color:var(--page-text)]">
              {copy.bottomNoteTitle}
            </strong>
            <span className="text-[13px] leading-[1.25] text-[color:var(--page-text-muted)]">
              {copy.bottomNoteBody}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
