"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardItem {
  id: string | number;
  title: string;
  description: string;
  imgSrc: string;
  icon: React.ReactNode;
  linkHref: string;
}

interface ExpandingCardsProps extends React.HTMLAttributes<HTMLUListElement> {
  items: CardItem[];
  defaultActiveIndex?: number;
}

export const ExpandingCards = React.forwardRef<
  HTMLUListElement,
  ExpandingCardsProps
>(({ className, items, defaultActiveIndex = 0, ...props }, ref) => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(
    defaultActiveIndex,
  );
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const gridStyle = React.useMemo(() => {
    if (activeIndex === null) return {};

    if (isDesktop) {
      const columns = items
        .map((_, index) => (index === activeIndex ? "5fr" : "1fr"))
        .join(" ");

      return { gridTemplateColumns: columns };
    }

    const rows = items
      .map((_, index) => (index === activeIndex ? "5fr" : "1fr"))
      .join(" ");

    return { gridTemplateRows: rows };
  }, [activeIndex, items, isDesktop]);

  const handleInteraction = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <ul
      className={cn(
        "grid h-[600px] w-full max-w-6xl gap-2",
        "transition-[grid-template-columns,grid-template-rows] duration-500 ease-out",
        className,
      )}
      ref={ref}
      style={{
        ...gridStyle,
        ...(isDesktop
          ? { gridTemplateRows: "1fr" }
          : { gridTemplateColumns: "1fr" }),
      }}
      {...props}
    >
      {items.map((item, index) => (
        <li
          className={cn(
            "group relative min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
            "md:min-w-[80px]",
          )}
          data-active={activeIndex === index}
          key={item.id}
          onClick={() => handleInteraction(index)}
          onFocus={() => handleInteraction(index)}
          onMouseEnter={() => handleInteraction(index)}
          tabIndex={0}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={item.title}
            className="absolute inset-0 h-full w-full scale-110 object-cover grayscale transition-all duration-300 ease-out group-data-[active=true]:scale-100 group-data-[active=true]:grayscale-0"
            src={item.imgSrc}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <article className="absolute inset-0 flex flex-col justify-end gap-2 p-4">
            <h3 className="hidden origin-left rotate-90 text-sm font-light uppercase tracking-wider text-white/80 opacity-100 transition-all duration-300 ease-out group-data-[active=true]:opacity-0 md:block">
              {item.title}
            </h3>

            <div className="text-white/90 opacity-0 transition-all delay-75 duration-300 ease-out group-data-[active=true]:opacity-100">
              {item.icon}
            </div>

            <h3 className="text-xl font-bold text-white opacity-0 transition-all delay-150 duration-300 ease-out group-data-[active=true]:opacity-100">
              {item.title}
            </h3>

            <p className="w-full max-w-xs text-sm text-white/80 opacity-0 transition-all delay-[225ms] duration-300 ease-out group-data-[active=true]:opacity-100">
              {item.description}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
});

ExpandingCards.displayName = "ExpandingCards";
