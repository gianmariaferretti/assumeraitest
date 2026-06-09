"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  resolveCandidateFlowCopy
} from "@/features/interview-flow/candidate-flow-copy";
import type { CandidateInterviewLanguageCode } from "@/features/interview-flow";

interface ResumeProcessingClientProps {
  readonly language?: CandidateInterviewLanguageCode;
  readonly nextHref: string;
}

export function ResumeProcessingClient({
  language,
  nextHref
}: ResumeProcessingClientProps) {
  const router = useRouter();
  const copy = resolveCandidateFlowCopy(language).resumeProcessing;
  const resumeProcessingFrames = copy.frames;
  const [frameIndex, setFrameIndex] = useState(0);
  const activeFrame = resumeProcessingFrames[frameIndex] ?? resumeProcessingFrames[0];

  useEffect(() => {
    const frameTimer = window.setInterval(() => {
      setFrameIndex((currentFrame) =>
        Math.min(currentFrame + 1, resumeProcessingFrames.length - 1)
      );
    }, 720);
    const routeTimer = window.setTimeout(() => {
      router.replace(nextHref);
    }, 2550);

    return () => {
      window.clearInterval(frameTimer);
      window.clearTimeout(routeTimer);
    };
  }, [nextHref, resumeProcessingFrames.length, router]);

  return (
    <main className="processing-shell">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.processing-shell {
  align-items: center;
  background: #ffffff;
  color: #111c19;
  display: grid;
  min-height: 100dvh;
  padding: 24px;
}

.processing-card {
  align-content: start;
  border: 1px solid rgba(23, 33, 31, 0.14);
  border-radius: 8px;
  display: grid;
  gap: 22px;
  grid-template-rows: 72px minmax(clamp(11rem, 18vw, 13rem), auto) minmax(92px, auto) minmax(48px, auto);
  margin: 0 auto;
  max-width: 620px;
  min-height: clamp(560px, 72svh, 700px);
  overflow: hidden;
  padding: clamp(24px, 5vw, 42px);
  position: relative;
  width: min(100%, 620px);
}

.processing-card::before {
  animation: sweep 1.9s ease-in-out infinite;
  background: #f5f7f2;
  content: "";
  height: 5px;
  left: 0;
  position: absolute;
  top: 0;
  width: 40%;
}

.processing-pulse {
  align-items: center;
  background: #111c19;
  border-radius: 999px;
  color: #f5f7f2;
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 900;
  height: 72px;
  justify-content: center;
  text-transform: uppercase;
  width: 72px;
  animation: pulseDocument 1.7s ease-in-out infinite;
}

.processing-card p {
  color: #5d6965;
  font-size: 1.05rem;
  line-height: 1.55;
  margin: 0;
  min-height: 3.4em;
}

.processing-card h1 {
  font-size: clamp(2.3rem, 7vw, 5rem);
  line-height: 0.95;
  margin: 0;
}

.processing-card a {
  align-items: center;
  background: #111c19;
  border-radius: 8px;
  color: #ffffff;
  display: inline-flex;
  font-weight: 800;
  justify-content: center;
  min-height: 48px;
  padding: 12px 14px;
  text-align: center;
  text-decoration: none;
  width: fit-content;
}

.processing-copy-slot {
  align-content: start;
  display: grid;
  gap: 20px;
  min-height: clamp(11rem, 18vw, 13rem);
}

.processing-steps {
  display: grid;
  gap: 8px;
  min-height: 92px;
}

.processing-step {
  align-items: center;
  color: #5d6965;
  display: grid;
  gap: 10px;
  grid-template-columns: 14px 1fr;
  line-height: 1.35;
}

.processing-step::before {
  background: rgba(23, 33, 31, 0.18);
  border-radius: 999px;
  content: "";
  height: 9px;
  width: 9px;
}

.processing-step-active {
  color: #111c19;
  font-weight: 800;
}

.processing-step-active::before {
  background: #111c19;
}

@keyframes sweep {
  0% { transform: translateX(-100%); }
  55% { transform: translateX(95%); }
  100% { transform: translateX(180%); }
}

@keyframes pulseDocument {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-5px) scale(1.04); }
}
`
        }}
      />
      <section className="processing-card" aria-live="polite">
        <span className="processing-pulse">CV</span>
        <div className="processing-copy-slot">
          <h1>{activeFrame.title}</h1>
          <p>{activeFrame.detail}</p>
        </div>
        <div className="processing-steps" aria-label={copy.progressAria}>
          {resumeProcessingFrames.map((frame, index) => (
            <span
              className={
                index === frameIndex
                  ? "processing-step processing-step-active"
                  : "processing-step"
              }
              key={frame.id}
            >
              {frame.title}
            </span>
          ))}
        </div>
        <Link href={nextHref}>{copy.reviewParsedProfile}</Link>
      </section>
    </main>
  );
}
