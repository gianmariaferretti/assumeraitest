"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

type ViewportKind = "unknown" | "mobile" | "desktop";

export default function DeferredMobileMount({
  children,
}: {
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<ViewportKind>("unknown");
  const [isMountedOnMobile, setIsMountedOnMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const updateViewport = () => {
      if (mediaQuery.matches) {
        setViewport("mobile");
        return;
      }

      setViewport("desktop");
      setIsMountedOnMobile(true);
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (viewport !== "mobile" || isMountedOnMobile) {
      return;
    }

    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsMountedOnMobile(true);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0,
      },
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [viewport, isMountedOnMobile]);

  return (
    <>
      <div ref={triggerRef} aria-hidden className="h-px w-full" />
      {(viewport === "desktop" || isMountedOnMobile) && children}
    </>
  );
}
