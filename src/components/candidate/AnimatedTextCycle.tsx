"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./AnimatedTextCycle.module.css";

interface AnimatedTextCycleProps {
  readonly words: readonly string[];
  readonly interval?: number;
  readonly className?: string;
}

export function AnimatedTextCycle({
  words,
  interval = 3600,
  className = ""
}: AnimatedTextCycleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cycleWidth, setCycleWidth] = useState<number | undefined>();
  const measureRef = useRef<HTMLDivElement>(null);
  const safeWords = useMemo(
    () => (words.length > 0 ? words : ["You are ready."]),
    [words]
  );
  const currentWord = safeWords[currentIndex % safeWords.length];

  useEffect(() => {
    const measureElement = measureRef.current;
    if (!measureElement) {
      return;
    }

    const nextWidth = Array.from(measureElement.children).reduce(
      (widest, child) => Math.max(widest, child.getBoundingClientRect().width),
      0
    );
    setCycleWidth(nextWidth);
  }, [safeWords]);

  useEffect(() => {
    if (safeWords.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % safeWords.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [interval, safeWords.length]);

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={cycleWidth ? { minWidth: `${Math.ceil(cycleWidth)}px` } : undefined}
    >
      <span ref={measureRef} aria-hidden="true" className={styles.measure}>
        {safeWords.map((word) => (
          <span key={word}>{word}</span>
        ))}
      </span>
      <span key={currentWord} className={styles.word}>
        {currentWord}
      </span>
    </span>
  );
}
