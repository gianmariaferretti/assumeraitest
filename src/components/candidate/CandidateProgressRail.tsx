import Link from "next/link";
import React from "react";

import {
  resolveCandidateFlowCopy,
  type CandidateProgressStepId
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

export type { CandidateProgressStepId };

export type CandidateProgressStepState = "complete" | "current" | "upcoming";

const candidateProgressSteps: ReadonlyArray<{
  readonly id: CandidateProgressStepId;
  readonly href: `/candidate${string}`;
}> = [
  { id: "privacy", href: "/candidate" },
  { id: "resume", href: "/candidate/resume" },
  { id: "profile", href: "/candidate/profile/confirm" },
  { id: "interview", href: "/candidate/interview/prepare" },
  { id: "results", href: "/candidate/results" },
  { id: "data", href: "/candidate/data" }
];

export interface CandidateProgressRailItem {
  readonly id: CandidateProgressStepId;
  readonly label: string;
  readonly state: CandidateProgressStepState;
  readonly href?: `/candidate${string}`;
}

export function getCandidateProgressRailItems(
  current: CandidateProgressStepId,
  language?: CandidateInterviewLanguageCode
): CandidateProgressRailItem[] {
  const copy = resolveCandidateFlowCopy(language);
  const currentIndex = candidateProgressSteps.findIndex((step) => step.id === current);

  return candidateProgressSteps.map((step, index) => {
    const state =
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "current"
          : "upcoming";

    return {
      id: step.id,
      label: copy.progress.steps[step.id],
      state,
      ...(state === "complete" ? { href: step.href } : {})
    };
  });
}

export function CandidateProgressRail({
  current,
  language
}: {
  readonly current: CandidateProgressStepId;
  readonly language?: CandidateInterviewLanguageCode;
}) {
  const copy = resolveCandidateFlowCopy(language);
  const items = getCandidateProgressRailItems(current, language);
  const currentItem = items.find((item) => item.state === "current") ?? items[0];
  const currentStepNumber = Math.max(
    1,
    items.findIndex((item) => item.id === currentItem.id) + 1
  );

  return (
    <nav className="candidate-progress-rail" aria-label={copy.progress.ariaLabel}>
      <CandidateProgressRailStyles />
      <div className="candidate-progress-mobile-status" aria-hidden="true">
        <span>
          {copy.progress.stepStatusPrefix} {currentStepNumber}{" "}
          {copy.progress.stepStatusConnector} {items.length}
        </span>
        <strong>{currentItem.label}</strong>
      </div>
      <ol>
        {items.map((step, index) => {
          const content = (
            <>
              <span className="candidate-progress-step-number">{index + 1}</span>
              <strong>{step.label}</strong>
            </>
          );

          return (
            <li
              aria-current={step.state === "current" ? "step" : undefined}
              data-state={step.state}
              key={step.id}
            >
              {step.href ? (
                <Link
                  href={step.href}
                  aria-label={`${copy.progress.goBackPrefix} ${step.label}`}
                >
                  {content}
                </Link>
              ) : (
                <span className="candidate-progress-step-content">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CandidateProgressRailStyles() {
  return (
    <style>{`
      .candidate-progress-rail {
        margin: 0 auto;
        max-width: calc(100vw - 32px);
        width: fit-content;
      }

      .candidate-progress-mobile-status {
        display: none;
      }

      .candidate-progress-rail ol {
        align-items: center;
        display: flex;
        gap: 6px;
        justify-content: center;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .candidate-progress-rail li {
        align-items: center;
        background: #fffdf8;
        border: 1px solid rgba(21, 31, 28, 0.08);
        border-radius: 999px;
        color: #4f5c57;
        display: flex;
        flex: 0 0 32px;
        min-height: 26px;
        min-width: 0;
        overflow: hidden;
        transition:
          background 180ms ease,
          border-color 180ms ease,
          color 180ms ease,
          flex-basis 260ms ease;
        width: 32px;
      }

      .candidate-progress-rail li[data-state="current"] {
        background: #111c19;
        border-color: #111c19;
        color: #ffffff;
      }

      .candidate-progress-rail li[data-state="complete"] {
        background: #f8fbf1;
        border-color: rgba(21, 31, 28, 0.1);
        color: #111c19;
      }

      .candidate-progress-rail a,
      .candidate-progress-step-content {
        align-items: center;
        color: inherit;
        display: flex;
        gap: 0;
        justify-content: center;
        min-height: 26px;
        min-width: 0;
        padding: 4px 7px;
        text-decoration: none;
        width: 100%;
        transition:
          gap 220ms ease,
          justify-content 220ms ease,
          padding 220ms ease;
      }

      .candidate-progress-rail a {
        transition:
          background 180ms ease,
          gap 220ms ease,
          justify-content 220ms ease,
          padding 220ms ease,
          transform 180ms ease;
      }

      .candidate-progress-rail a:hover {
        background: rgba(17, 28, 25, 0.06);
      }

      .candidate-progress-rail a:focus-visible {
        outline: 2px solid #111c19;
        outline-offset: -2px;
      }

      .candidate-progress-step-number {
        align-items: center;
        background: #eef0ed;
        border-radius: 999px;
        display: inline-flex;
        flex: 0 0 auto;
        font-size: 0.62rem;
        font-weight: 900;
        height: 15px;
        justify-content: center;
        width: 15px;
      }

      .candidate-progress-rail li[data-state="current"] .candidate-progress-step-number {
        background: #f5f7f2;
        color: #111c19;
      }

      .candidate-progress-rail strong {
        font-size: 0.58rem;
        font-weight: 900;
        max-width: 0;
        opacity: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        transform: translateX(-4px);
        transition:
          max-width 260ms ease,
          opacity 180ms ease,
          transform 260ms ease;
        white-space: nowrap;
      }

      .candidate-progress-rail:is(:hover, :focus-within) {
        width: min(770px, calc(100vw - 32px));
      }

      .candidate-progress-rail:is(:hover, :focus-within) li {
        flex-basis: 124px;
        width: 124px;
      }

      .candidate-progress-rail:is(:hover, :focus-within) a,
      .candidate-progress-rail:is(:hover, :focus-within) .candidate-progress-step-content {
        gap: 7px;
        justify-content: flex-start;
        padding: 4px 9px;
      }

      .candidate-progress-rail:is(:hover, :focus-within) strong {
        max-width: 84px;
        opacity: 1;
        transform: translateX(0);
      }

      @media (max-width: 740px) {
        .candidate-progress-rail {
          background: rgba(245, 247, 242, 0.82);
          border: 1px solid rgba(17, 28, 25, 0.1);
          border-radius: 18px;
          display: grid;
          gap: 9px;
          padding: 9px;
          width: min(100%, 360px);
        }

        .candidate-progress-mobile-status {
          align-items: center;
          display: flex;
          gap: 10px;
          justify-content: space-between;
          min-width: 0;
        }

        .candidate-progress-mobile-status span {
          color: #5d6965;
          font-size: 0.68rem;
          font-weight: 850;
          text-transform: uppercase;
        }

        .candidate-progress-mobile-status strong {
          color: #111c19;
          font-size: 0.82rem;
          font-weight: 900;
          max-width: none;
          opacity: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          transform: none;
          white-space: nowrap;
        }

        .candidate-progress-rail ol {
          display: grid;
          gap: 6px;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          min-width: 0;
        }

        .candidate-progress-rail li,
        .candidate-progress-rail:is(:hover, :focus-within) li {
          flex-basis: auto;
          min-height: 30px;
          width: auto;
        }

        .candidate-progress-rail a,
        .candidate-progress-step-content,
        .candidate-progress-rail:is(:hover, :focus-within) a,
        .candidate-progress-rail:is(:hover, :focus-within) .candidate-progress-step-content {
          gap: 0;
          justify-content: center;
          min-height: 30px;
          padding: 5px 4px;
        }

        .candidate-progress-rail ol strong {
          max-width: 0;
          opacity: 0;
        }

        .candidate-progress-step-number {
          height: 18px;
          width: 18px;
        }
      }
    `}</style>
  );
}
