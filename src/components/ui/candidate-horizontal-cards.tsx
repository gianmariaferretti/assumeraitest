"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";

const CARD_SCROLL_START = 0.12;
const CARD_SCROLL_END = 0.82;
const DEFAULT_SECTION_HEIGHT = 5200;
const DEFAULT_VIEWPORT_HEIGHT = 720;
const MATCH_LABEL_GRADIENT =
  "linear-gradient(90deg, #e8a9dc 0%, #e8a9dc 32%, #c9adeb 58%, #9fbbf2 100%)";

export type CandidateHorizontalCardCopy = {
  body: string;
  dontDo?: string;
  eyebrow?: string;
  matchLabel?: string;
  meta?: string;
  title: string;
  visualAlt?: string;
  visualSrc?: string;
};

type CandidateHorizontalCardsProps = {
  cards: CandidateHorizontalCardCopy[];
  dontDoLabel: string;
};

export function CandidateHorizontalCards({
  cards,
  dontDoLabel,
}: CandidateHorizontalCardsProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const metricsRef = useRef({
    maxTranslate: 0,
    viewportHeight: DEFAULT_VIEWPORT_HEIGHT,
  });
  const matchProgress = useMotionValue(0);
  const x = useMotionValue(0);
  const [sectionHeight, setSectionHeight] = useState(DEFAULT_SECTION_HEIGHT);

  useEffect(() => {
    let frame = 0;

    const updatePosition = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        const section = sectionRef.current;

        if (!section) {
          frame = 0;
          return;
        }

        const rect = section.getBoundingClientRect();
        const scrollDistance = Math.max(
          1,
          section.offsetHeight - metricsRef.current.viewportHeight,
        );
        const rawProgress = clamp(-rect.top / scrollDistance, 0, 1);
        const cardProgress = clamp(
          (rawProgress - CARD_SCROLL_START) /
            (CARD_SCROLL_END - CARD_SCROLL_START),
          0,
          1,
        );

        x.set(-metricsRef.current.maxTranslate * cardProgress);
        matchProgress.set(rawProgress);
        frame = 0;
      });
    };

    const updateMeasurements = () => {
      if (!trackRef.current || !viewportRef.current) return;

      const trackWidth = trackRef.current.scrollWidth;
      const styles = window.getComputedStyle(viewportRef.current);
      const leftPadding = parseFloat(styles.paddingLeft) || 0;
      const rightPadding = parseFloat(styles.paddingRight) || 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = getStableViewportHeight(viewportRef.current);
      const maxTranslate = Math.max(
        0,
        trackWidth - viewportWidth + leftPadding + rightPadding,
      );
      const readableScrollDistance = Math.max(
        viewportHeight * (cards.length + 5),
        maxTranslate * 1.8,
      );
      const nextSectionHeight = Math.ceil(
        readableScrollDistance + viewportHeight,
      );

      metricsRef.current = { maxTranslate, viewportHeight };
      setSectionHeight((currentHeight) =>
        currentHeight === nextSectionHeight ? currentHeight : nextSectionHeight,
      );
      updatePosition();
    };

    updateMeasurements();

    const resizeObserver = new ResizeObserver(updateMeasurements);

    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updateMeasurements);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      resizeObserver.disconnect();
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updateMeasurements);
    };
  }, [cards.length, matchProgress, x]);

  return (
    <section
      className="relative -mt-[38vh] bg-white"
      ref={sectionRef}
      style={{ height: sectionHeight }}
    >
      <div
        className="sticky top-0 flex h-svh items-center overflow-hidden bg-white px-5 pb-12 pt-24 sm:px-8 lg:px-12"
        ref={viewportRef}
      >
        <motion.div
          className="flex w-max gap-6 will-change-transform md:gap-8"
          ref={trackRef}
          style={{ x }}
        >
          {cards.map((card, index) => (
            <CandidateHorizontalCard
              card={card}
              dontDoLabel={dontDoLabel}
              index={index}
              key={card.title}
              matchProgress={matchProgress}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CandidateHorizontalCard({
  card,
  dontDoLabel,
  index,
  matchProgress,
}: {
  card: CandidateHorizontalCardCopy;
  dontDoLabel: string;
  index: number;
  matchProgress: MotionValue<number>;
}) {
  const matchOverlayOpacity = useTransform(
    matchProgress,
    [0.78, 0.82, 0.96, 0.995],
    [0, 1, 1, 0],
  );
  const matchOverlayScale = useTransform(
    matchProgress,
    [0.78, 0.82, 0.96, 0.995],
    [0.82, 1.04, 1.04, 1.1],
  );
  const matchOverlayRotate = useTransform(
    matchProgress,
    [0.78, 0.82, 0.96, 0.995],
    [-5, 0, 0, 2],
  );
  const matchTextOpacity = useTransform(matchProgress, [0.965, 1], [0, 1]);
  const matchTextY = useTransform(matchProgress, [0.965, 1], [16, 0]);
  const matchTextStyle = card.matchLabel
    ? { opacity: matchTextOpacity, y: matchTextY }
    : undefined;

  return (
    <article className="w-[min(82vw,36rem)] shrink-0 overflow-hidden text-[#040817]">
      <div className="relative h-[30vh] min-h-[14rem] max-h-[20rem] overflow-hidden rounded-[8px] border border-slate-200 bg-[#f8fbff] shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
        <motion.div
          className="absolute inset-0 z-10 flex items-end p-6 md:p-8"
          style={matchTextStyle}
        >
          <span className="absolute right-6 top-5 text-6xl font-light leading-none text-slate-300 md:right-8 md:top-7 md:text-7xl">
            {String(index + 1).padStart(2, "0")}
          </span>
          {card.visualSrc && (
            <div className="absolute right-8 top-1/2 h-[58%] w-[38%] -translate-y-1/2 md:h-[74%] md:w-[24%]">
              <Image
                alt={card.visualAlt ?? ""}
                className="object-contain"
                fill
                sizes="(min-width: 768px) 140px, 132px"
                src={card.visualSrc}
              />
            </div>
          )}
          <div className="grid gap-3">
            <h3 className="max-w-[11ch] text-3xl font-light leading-none md:text-5xl">
              {card.title}
            </h3>
          </div>
        </motion.div>
        {card.matchLabel && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[8px] bg-[#fbfdff]"
            style={{ opacity: matchOverlayOpacity }}
          >
            <motion.p
              className="bg-clip-text text-transparent px-5 text-center text-[clamp(2.7rem,10vw,5.8rem)] font-black leading-none"
              style={{
                backgroundImage: MATCH_LABEL_GRADIENT,
                backgroundClip: "text",
                rotate: matchOverlayRotate,
                scale: matchOverlayScale,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {card.matchLabel}
            </motion.p>
          </motion.div>
        )}
      </div>
      <motion.div
        className="mt-4 grid max-w-[30rem] gap-2 md:mt-5"
        style={matchTextStyle}
      >
        <h4 className="text-lg font-medium leading-tight tracking-normal md:text-xl">
          {card.eyebrow ?? card.title}
        </h4>
        {card.meta && (
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
            {card.meta}
          </p>
        )}
        <p className="text-sm font-normal leading-6 text-slate-500 md:text-[0.95rem]">
          {card.body}
        </p>
        {card.dontDo && (
          <p className="mt-1 text-[0.82rem] font-normal leading-5 text-slate-400 md:text-sm">
            <span className="font-medium text-slate-600">
              {dontDoLabel}
            </span>{" "}
            {card.dontDo}
          </p>
        )}
      </motion.div>
    </article>
  );
}

function getStableViewportHeight(element: HTMLElement) {
  const elementHeight = element.getBoundingClientRect().height;

  if (elementHeight > 0) {
    return elementHeight;
  }

  const documentHeight = document.documentElement.clientHeight;

  if (documentHeight > 0) {
    return documentHeight;
  }

  return window.innerHeight;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
