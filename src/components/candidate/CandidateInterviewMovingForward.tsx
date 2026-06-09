"use client";

import React, { useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { CandidateProgressRail } from "@/components/candidate/CandidateProgressRail";
import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

const MOVING_FORWARD_NEXT_HREF = "/candidate/interview/prepare";
const SCRAPBOOK_WORD_ANIMATION_MS = 760;
const SCRAPBOOK_WORD_STAGGER_MS = 72;
const AUTO_ADVANCE_AFTER_ANIMATION_MS = 1000;

export function CandidateInterviewMovingForward({
  language
}: {
  readonly language?: CandidateInterviewLanguageCode;
}) {
  const copy = resolveCandidateFlowCopy(language).movingForward;
  const decisionWords = copy.decision.split(" ");
  const movingForwardAutoAdvanceMs =
    SCRAPBOOK_WORD_ANIMATION_MS +
    Math.max(0, decisionWords.length - 1) * SCRAPBOOK_WORD_STAGGER_MS +
    AUTO_ADVANCE_AFTER_ANIMATION_MS;
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const autoAdvanceTimer = window.setTimeout(() => {
      router.replace(MOVING_FORWARD_NEXT_HREF);
    }, movingForwardAutoAdvanceMs);

    return () => window.clearTimeout(autoAdvanceTimer);
  }, [movingForwardAutoAdvanceMs, router]);

  return (
    <main
      className="candidate-result-shell"
      data-auto-advance-ms={movingForwardAutoAdvanceMs}
    >
      <CandidateInterviewMovingForwardStyles />

      <div className="candidate-result-top">
        <CandidateProgressRail current="interview" language={language} />
      </div>

      <section className="result-decision-stage" aria-label={copy.ariaLabel}>
        <div className="result-decision-copy">
          <h1
            aria-label={copy.decision}
            className="scrapbook-line"
          >
            {decisionWords.map((word, index) => (
              <span
                aria-hidden="true"
                className="scrapbook-word"
                key={`${word}-${index}`}
                style={scrapbookWordStyle(index)}
              >
                {word}
              </span>
            ))}
          </h1>
          <span className="result-auto-handoff" aria-live="polite">
            {copy.handoff}
          </span>
        </div>
      </section>
    </main>
  );
}

function scrapbookWordStyle(index: number): CSSProperties {
  return {
    "--word-index": index,
    "--word-tilt": `${(index % 5) - 2}deg`
  } as CSSProperties;
}

function CandidateInterviewMovingForwardStyles() {
  return (
    <style>{`
      .candidate-result-shell {
        background: #ffffff;
        color: #111c19;
        min-height: 100dvh;
      }

      .candidate-result-top {
        left: 50%;
        max-width: min(770px, calc(100vw - 32px));
        position: fixed;
        top: 52px;
        transform: translateX(-50%);
        width: 100%;
        z-index: 5;
      }

      .result-decision-stage {
        align-items: center;
        display: grid;
        justify-items: center;
        min-height: 100dvh;
        padding: 120px 24px 70px;
      }

      .result-decision-copy {
        display: grid;
        gap: 34px;
        justify-items: center;
      }

      .scrapbook-line {
        align-items: baseline;
        color: #111c19;
        display: flex;
        flex-wrap: wrap;
        font-family: "Arial Narrow", "Franklin Gothic Condensed", "Roboto Condensed", Arial, sans-serif;
        font-size: clamp(2.2rem, 3vw, 3.55rem);
        font-stretch: condensed;
        font-weight: 500;
        gap: 0.18em;
        justify-content: center;
        letter-spacing: 0;
        line-height: 1.05;
        margin: 0;
        max-width: 1120px;
        text-align: center;
      }

      .scrapbook-word {
        animation: scrapbookLand 760ms cubic-bezier(0.16, 1, 0.3, 1) both;
        animation-delay: calc(var(--word-index) * 72ms);
        display: inline-block;
        transform-origin: 50% 72%;
        will-change: transform, opacity;
      }

      .result-auto-handoff {
        clip: rect(0 0 0 0);
        border: 0;
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }

      @keyframes scrapbookLand {
        0% {
          opacity: 0;
          transform: translate3d(0, 34px, 0) rotate(calc(var(--word-tilt) - 8deg)) scale(0.94);
        }
        54% {
          opacity: 1;
          transform: translate3d(0, -6px, 0) rotate(calc(var(--word-tilt) + 2deg)) scale(1.018);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) rotate(var(--word-tilt)) scale(1);
        }
      }

      @media (max-width: 780px) {
        .candidate-result-top {
          top: 20px;
        }

        .result-decision-stage {
          padding: 118px 20px 56px;
        }

        .scrapbook-line {
          font-size: clamp(2.1rem, 9vw, 3.4rem);
          max-width: 620px;
        }
      }
    `}</style>
  );
}
