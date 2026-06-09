"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const MOBILE_QUERY = "(max-width: 767px)";
const HeroLaptopCanvas = dynamic(
  () => import("@/components/ui/hero-laptop-canvas"),
  { loading: () => null, ssr: false },
);

const HERO_LINE_TIMINGS = [
  {
    key: "line1",
    start: -0.18,
    end: 0,
  },
  {
    key: "line2",
    start: 0.26,
    end: 0.46,
  },
  {
    key: "line3",
    start: 0.54,
    end: 0.82,
  },
] as const;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const HERO_PROGRESS_SMOOTHING = 7;
const HERO_PROGRESS_EPSILON = 0.0008;

type CanvasInvalidate = () => void;

function damp(current: number, target: number, smoothing: number, delta: number) {
  return target + (current - target) * Math.exp(-smoothing * delta);
}

function getRangeProgress(progress: number, start: number, end: number) {
  return clamp01((progress - start) / (end - start));
}

type HeroIsolationTestSectionProps = {
  mode?: "test" | "home";
};

export default function HeroIsolationTestSection({
  mode = "test",
}: HeroIsolationTestSectionProps) {
  const { t } = useI18n();
  const isHomeMode = mode === "home";
  const sectionRef = useRef<HTMLDivElement>(null);
  const laptopLayerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const actionsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const displayedProgressRef = useRef(0);
  const isMobileRef = useRef(false);
  const viewportHeightRef = useRef(0);
  const canvasInvalidateRef = useRef<CanvasInvalidate | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [areActionsRevealed, setAreActionsRevealed] = useState(false);
  const actionsRevealedRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const check = () => {
      isMobileRef.current = mediaQuery.matches;
      setIsMobile(mediaQuery.matches);
      canvasInvalidateRef.current?.();
    };

    check();
    mediaQuery.addEventListener("change", check);

    return () => {
      mediaQuery.removeEventListener("change", check);
    };
  }, []);

  useEffect(() => {
    let measureFrame = 0;
    let animationFrame = 0;
    let lastAnimationTime = 0;

    const applyHeroProgress = (progress: number) => {
      const scrollReveal = clamp01(progress / 0.04);
      const laptopLayer = laptopLayerRef.current;

      if (laptopLayer) {
        laptopLayer.style.opacity = `${scrollReveal}`;
        laptopLayer.style.transform = `translate3d(0, ${(1 - scrollReveal) * (isMobileRef.current ? 10 : 18)}px, 0)`;
      }

      HERO_LINE_TIMINGS.forEach(({ start, end }, index) => {
        const line = lineRefs.current[index];
        if (!line) return;

        const lineProgress = getRangeProgress(progress, start, end);
        line.style.opacity = `${lineProgress}`;
        line.style.transform = `translate3d(0, ${(1 - lineProgress) * 36}px, 0)`;
      });

      const actionsReveal = clamp01((progress - 0.86) / 0.1);
      const actions = actionsRef.current;
      const nextActionsRevealed = actionsReveal > 0.01;

      if (actions) {
        actions.style.opacity = `${actionsReveal}`;
        actions.style.transform = `translate3d(0, ${(1 - actionsReveal) * 18}px, 0)`;
        actions.style.pointerEvents = nextActionsRevealed ? "auto" : "none";
      }

      if (actionsRevealedRef.current !== nextActionsRevealed) {
        actionsRevealedRef.current = nextActionsRevealed;
        setAreActionsRevealed(nextActionsRevealed);
      }
    };

    const animateHeroProgress = (timestamp: number) => {
      const deltaSeconds = lastAnimationTime
        ? Math.min((timestamp - lastAnimationTime) / 1000, 0.05)
        : 1 / 60;
      lastAnimationTime = timestamp;

      const targetProgress = targetProgressRef.current;
      const currentProgress = displayedProgressRef.current;
      const nextDisplayedProgress = Math.abs(targetProgress - currentProgress) <= HERO_PROGRESS_EPSILON
        ? targetProgress
        : damp(
          currentProgress,
          targetProgress,
          HERO_PROGRESS_SMOOTHING,
          deltaSeconds,
        );

      const progressChanged = Math.abs(nextDisplayedProgress - progressRef.current) > 0.0001;
      displayedProgressRef.current = nextDisplayedProgress;
      progressRef.current = nextDisplayedProgress;
      applyHeroProgress(nextDisplayedProgress);

      if (progressChanged) {
        canvasInvalidateRef.current?.();
      }

      if (nextDisplayedProgress === targetProgress) {
        animationFrame = 0;
        lastAnimationTime = 0;
        return;
      }

      animationFrame = window.requestAnimationFrame(animateHeroProgress);
    };

    const scheduleHeroAnimation = () => {
      if (animationFrame) return;
      lastAnimationTime = 0;
      animationFrame = window.requestAnimationFrame(animateHeroProgress);
    };

    const updateProgress = () => {
      const section = sectionRef.current;
      if (!section) return;

      const viewportHeight = Math.round(
        window.visualViewport?.height ?? window.innerHeight,
      );

      if (
        !viewportHeightRef.current ||
        Math.abs(viewportHeight - viewportHeightRef.current) > 24
      ) {
        viewportHeightRef.current = viewportHeight;
      }

      const rect = section.getBoundingClientRect();
      const sectionHeight = Math.max(1, section.offsetHeight - viewportHeightRef.current);
      const scrolled = -rect.top;
      const nextProgress = clamp01(scrolled / sectionHeight);
      const progressChanged = Math.abs(nextProgress - targetProgressRef.current) > 0.0005;
      targetProgressRef.current = nextProgress;

      if (progressChanged) {
        scheduleHeroAnimation();
      }
    };

    const runProgressFrame = () => {
      updateProgress();
      measureFrame = 0;
    };

    const scheduleProgressUpdate = () => {
      if (measureFrame) return;
      measureFrame = window.requestAnimationFrame(runProgressFrame);
    };

    updateProgress();
    applyHeroProgress(displayedProgressRef.current);
    scheduleProgressUpdate();
    window.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
    window.addEventListener("resize", scheduleProgressUpdate);
    window.visualViewport?.addEventListener("resize", scheduleProgressUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleProgressUpdate);

    return () => {
      if (measureFrame) {
        window.cancelAnimationFrame(measureFrame);
      }

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", scheduleProgressUpdate);
      window.removeEventListener("resize", scheduleProgressUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleProgressUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleProgressUpdate);
    };
  }, []);

  const hasMeasuredViewport = isMobile !== null;
  const isMobileViewport = isMobile === true;
  const heroLines = [
    {
      ...HERO_LINE_TIMINGS[0],
      content: <span className="whitespace-nowrap">{t.hero.line1}</span>,
    },
    {
      ...HERO_LINE_TIMINGS[1],
      content: <span className="whitespace-nowrap">{t.hero.line2}</span>,
    },
    {
      ...HERO_LINE_TIMINGS[2],
      content: (
        <span
          className="bg-clip-text text-transparent whitespace-nowrap"
          style={{
            backgroundImage:
              "linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)",
          }}
        >
          {t.hero.line3}
        </span>
      ),
    },
  ];

  return (
    <div className="overflow-x-clip bg-white text-slate-900">
      <section
        ref={sectionRef}
        className={isHomeMode ? "relative h-[400vh] bg-white" : "relative h-[320vh] bg-white"}
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <div
            ref={laptopLayerRef}
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: 0,
              transform: "translate3d(0, 10px, 0)",
              willChange: "opacity, transform",
            }}
          >
            {hasMeasuredViewport && (
              <HeroLaptopCanvas
                progressRef={progressRef}
                isMobile={isMobileViewport}
                onInvalidateReady={(invalidate) => {
                  canvasInvalidateRef.current = invalidate;
                }}
              />
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-[14%] z-20 flex justify-center px-6 md:top-[16%]">
            <h1
              className="text-center text-[clamp(1.5rem,5vw,4.5rem)] font-bold leading-[1.0] tracking-tighter text-slate-900"
              style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
            >
              {heroLines.map(({ key, start, end, content }, index) => {
                const initialProgress = getRangeProgress(0, start, end);

                return (
                  <span
                    key={key}
                    ref={(element) => {
                      lineRefs.current[index] = element;
                    }}
                    className="block"
                    style={{
                      opacity: initialProgress,
                      transform: `translate3d(0, ${(1 - initialProgress) * 36}px, 0)`,
                      transition: "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                      willChange: "opacity, transform",
                    }}
                  >
                    {content}
                  </span>
                );
              })}
            </h1>
          </div>

          {!isHomeMode && (
            <div
              ref={actionsRef}
              className="absolute bottom-7 left-0 right-0 z-20 flex flex-col items-center gap-4 px-5 text-center"
              aria-hidden={!areActionsRevealed}
              style={{
                opacity: 0,
                transform: "translate3d(0, 18px, 0)",
                willChange: "opacity, transform",
                pointerEvents: areActionsRevealed ? "auto" : "none",
              }}
            >
              <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 backdrop-blur">
                {t.hero.testRoute}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
