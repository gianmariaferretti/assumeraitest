"use client";

import { type FC, type ReactNode, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

const REVEAL_START_AT = 0.12;
const REVEAL_COMPLETE_AT = 0.56;
const REVEAL_HANDOFF_START_AT = 0.78;
const REVEAL_HANDOFF_COMPLETE_AT = 0.9;

type TextRevealByWordProps = {
  className?: string;
  highlightPhrase?: string;
  text: string;
};

export const TextRevealByWord: FC<TextRevealByWordProps> = ({
  className,
  highlightPhrase,
  text,
}) => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const scrollYProgress = useMotionValue(0);
  const handoffOpacity = useTransform(
    scrollYProgress,
    [REVEAL_HANDOFF_START_AT, REVEAL_HANDOFF_COMPLETE_AT],
    [1, 0],
  );
  const handoffY = useTransform(
    scrollYProgress,
    [REVEAL_HANDOFF_START_AT, REVEAL_HANDOFF_COMPLETE_AT],
    [0, -36],
  );
  const words = text.split(" ");
  const highlightedIndexes = getHighlightedIndexes(words, highlightPhrase);
  const visibleCharacterCount = words.reduce(
    (count, word) => count + word.length,
    0,
  );
  const revealWords = words.reduce<{
    items: {
      index: number;
      startIndex: number;
      word: string;
    }[];
    visibleCharacterIndex: number;
  }>(
    (state, word, index) => ({
      items: [
        ...state.items,
        {
          index,
          startIndex: state.visibleCharacterIndex,
          word,
        },
      ],
      visibleCharacterIndex: state.visibleCharacterIndex + word.length,
    }),
    { items: [], visibleCharacterIndex: 0 },
  ).items;

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        const section = targetRef.current;

        if (!section) {
          frame = 0;
          return;
        }

        const rect = section.getBoundingClientRect();
        const scrollDistance = Math.max(
          1,
          section.offsetHeight - window.innerHeight,
        );
        const nextProgress = clamp(-rect.top / scrollDistance, 0, 1);
        scrollYProgress.set(nextProgress);
        frame = 0;
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [scrollYProgress]);

  return (
    <section
      className={cn("relative z-0 bg-white", className)}
      ref={targetRef}
      style={{ height: "460vh" }}
    >
      <motion.div
        className="sticky top-0 z-10 flex h-screen min-h-svh items-center bg-white px-5 py-20 sm:px-8 lg:px-12"
        style={{ opacity: handoffOpacity, y: handoffY }}
      >
        <p className="mx-auto flex max-w-5xl flex-wrap text-4xl font-light leading-[1.04] text-black/20 sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="sr-only">{text}</span>
          {revealWords.map(({ index, startIndex, word }) => (
            <Word
              characterCount={visibleCharacterCount}
              key={`${word}-${index}`}
              progress={scrollYProgress}
              shouldHighlight={highlightedIndexes.has(index)}
              startIndex={startIndex}
              word={word}
            />
          ))}
        </p>
      </motion.div>
    </section>
  );
};

type WordProps = {
  characterCount: number;
  progress: MotionValue<number>;
  shouldHighlight: boolean;
  startIndex: number;
  word: string;
};

function Word({
  characterCount,
  progress,
  shouldHighlight,
  startIndex,
  word,
}: WordProps) {
  const revealDuration = REVEAL_COMPLETE_AT - REVEAL_START_AT;
  const safeCharacterCount = Math.max(1, characterCount);
  const wordStart =
    REVEAL_START_AT + (startIndex / safeCharacterCount) * revealDuration;
  const wordEnd =
    REVEAL_START_AT +
    ((startIndex + word.length) / safeCharacterCount) * revealDuration;
  const backgroundOpacity = useTransform(progress, [wordStart, wordEnd], [0.3, 0]);

  return (
    <span
      aria-hidden="true"
      className="relative mx-1.5 inline-block md:mx-2.5"
    >
      <motion.span
        className={cn(
          "absolute left-0 top-0 hidden sm:inline",
          shouldHighlight ? "text-[#ff2d2d]" : "text-black",
        )}
        style={{ opacity: backgroundOpacity }}
      >
        {word}
      </motion.span>
      <span aria-hidden="true">
        {Array.from(word).map((letter, letterIndex) => {
          const currentIndex = startIndex + letterIndex;
          const start =
            REVEAL_START_AT +
            (currentIndex / safeCharacterCount) * revealDuration;
          const end =
            REVEAL_START_AT +
            ((currentIndex + 1) / safeCharacterCount) * revealDuration;

          return (
            <Letter
              key={`${letter}-${letterIndex}`}
              progress={progress}
              range={[start, end]}
              shouldHighlight={shouldHighlight}
            >
              {letter}
            </Letter>
          );
        })}
      </span>
    </span>
  );
}

type LetterProps = {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
  shouldHighlight: boolean;
};

function Letter({ children, progress, range, shouldHighlight }: LetterProps) {
  const opacity = useTransform(progress, range, [0, 1]);

  return (
    <motion.span
      className={shouldHighlight ? "text-[#ff2d2d]" : "text-black"}
      style={{ opacity }}
    >
      {children}
    </motion.span>
  );
}

function getHighlightedIndexes(words: string[], highlightPhrase?: string) {
  const highlightedIndexes = new Set<number>();

  if (!highlightPhrase) {
    return highlightedIndexes;
  }

  const normalizedWords = words.map(normalizeWord);
  const phraseWords = highlightPhrase.split(" ").map(normalizeWord);

  for (let index = 0; index <= normalizedWords.length - phraseWords.length; index += 1) {
    const isMatch = phraseWords.every(
      (phraseWord, phraseIndex) => normalizedWords[index + phraseIndex] === phraseWord,
    );

    if (isMatch) {
      phraseWords.forEach((_, phraseIndex) => {
        highlightedIndexes.add(index + phraseIndex);
      });
      break;
    }
  }

  return highlightedIndexes;
}

function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
