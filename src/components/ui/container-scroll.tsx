"use client";

import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

type ContainerScrollProps = {
  titleComponent: ReactNode;
};

export function ContainerScroll({ titleComponent }: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const titleOpacity = useTransform(
    scrollYProgress,
    [0, 0.28, 0.76, 1],
    [1, 1, 0.46, 0],
  );
  const titleScale = useTransform(scrollYProgress, [0, 0.42, 0.72, 1], [1, 1.08, 0.84, 0.62]);
  const titleY = useTransform(scrollYProgress, [0, 0.36, 0.72, 1], [0, -96, -420, -760]);
  const titleRotate = useTransform(scrollYProgress, [0, 0.28, 0.64, 1], [0, -2, -8, -14]);
  const titleBlur = useTransform(scrollYProgress, [0, 0.62, 1], ["0px", "28px", "80px"]);

  return (
    <section className="relative h-[260svh] bg-white" ref={containerRef}>
      <motion.div
        className="sticky top-0 mx-auto flex min-h-svh w-full max-w-6xl origin-center items-center justify-center px-5 py-20 text-center will-change-transform sm:px-8 lg:px-12"
        style={{
          filter: titleBlur,
          opacity: titleOpacity,
          rotate: titleRotate,
          scale: titleScale,
          y: titleY,
        }}
      >
        {titleComponent}
      </motion.div>
    </section>
  );
}
