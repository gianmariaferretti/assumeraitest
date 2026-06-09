import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const Wave = () => (
  <svg
    aria-hidden="true"
    className="h-[1387px] w-[129px]"
    fill="none"
    focusable="false"
    viewBox="0 0 129 1387"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.2131 11L106.283 106.07M106.283 106.07L117.279 117.066M106.283 106.07L22.2962 190.003M106.283 106.07L116.688 95.6708M11.2962 200.997L22.2962 190.003M22.2962 190.003L11.2529 178.96M22.2962 190.003L106.323 274.03M106.323 274.03L117.319 285.026M106.323 274.03L22.4537 357.846M106.323 274.03L116.728 263.631M11.3361 368.957L22.4537 357.846M22.4537 357.846L11.5493 346.901M22.4537 357.846L106.44 442.149M106.44 442.149L117.416 453.166M106.44 442.149L22.2962 525.925M106.44 442.149L116.865 431.769M11.2756 536.897L22.2962 525.925M22.2962 525.925L11.2737 514.861M22.2962 525.925L106.165 610.109M106.165 610.109L117.14 621.126M106.165 610.109L11 704.857M106.165 610.109L116.59 599.729M11.2131 683L106.283 778.07M106.283 778.07L117.279 789.066M106.283 778.07L22.2962 862.003M106.283 778.07L116.688 767.671M11.2962 872.997L22.2962 862.003M22.2962 862.003L11.2529 850.96M22.2962 862.003L106.323 946.03M106.323 946.03L117.319 957.026M106.323 946.03L22.4537 1029.85M106.323 946.03L116.728 935.631M11.3361 1040.96L22.4537 1029.85M22.4537 1029.85L11.5493 1018.9M22.4537 1029.85L106.44 1114.15M106.44 1114.15L117.416 1125.17M106.44 1114.15L22.2962 1197.92M106.44 1114.15L116.865 1103.77M11.2756 1208.9L22.2962 1197.92M22.2962 1197.92L11.2737 1186.86M22.2962 1197.92L106.165 1282.11M106.165 1282.11L117.14 1293.13M106.165 1282.11L11 1376.86M106.165 1282.11L116.59 1271.73"
      stroke="currentColor"
      strokeWidth="31"
    />
  </svg>
);

const Cross = () => (
  <svg
    aria-hidden="true"
    className="size-[130px] scale-125"
    fill="none"
    focusable="false"
    viewBox="0 0 130 130"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11 11L118.899 119M11.101 119L119 11"
      stroke="currentColor"
      strokeWidth="31"
    />
  </svg>
);

export const PricingWrapper: React.FC<{
  actionLabel?: string;
  children: ReactNode;
  className?: string;
  contactHref: string;
  type?: "waves" | "crosses";
}> = ({
  actionLabel = "Contact",
  children,
  className,
  contactHref,
  type = "waves",
}) => (
  <article
    className={cn(
      "relative h-full min-h-[430px] w-full overflow-hidden rounded-[8px] border border-white/16 bg-[var(--page-dark)] p-5 text-white shadow-[0_26px_80px_rgba(4,8,23,0.2)]",
      className,
    )}
    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
  >
    <div className="relative z-[2] flex h-full min-h-[390px] flex-col items-start gap-7">
      {children}
      <div className="mt-auto w-full">
        <Link
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-white px-5 text-sm font-bold text-[#040817] shadow-[0_16px_44px_rgba(4,8,23,0.18)] transition-transform hover:scale-[1.015] active:scale-[0.985]"
          href={contactHref}
        >
          {actionLabel}
        </Link>
      </div>
    </div>

    {type === "waves" && (
      <>
        <div className="pricing-card-pattern absolute -top-[106px] -left-2 z-0 text-white/12 motion-safe:animate-[waves_7s_linear_infinite] motion-reduce:animate-none sm:left-4">
          <Wave />
        </div>
        <div className="pricing-card-pattern absolute -top-[106px] -right-2 z-0 text-white/12 motion-safe:animate-[waves_7s_linear_infinite] motion-reduce:animate-none sm:right-4">
          <Wave />
        </div>
      </>
    )}

    {type === "crosses" && (
      <>
        <div className="absolute -left-10 top-0 z-0 text-white/12 motion-safe:animate-[spin_8s_linear_infinite] motion-reduce:animate-none">
          <Cross />
        </div>
        <div className="absolute -right-12 top-1/2 z-0 text-white/12 motion-safe:animate-[spin_8s_linear_infinite] motion-reduce:animate-none">
          <Cross />
        </div>
        <div className="absolute -left-5 top-[85%] z-0 text-white/12 motion-safe:animate-[spin_8s_linear_infinite] motion-reduce:animate-none">
          <Cross />
        </div>
      </>
    )}
  </article>
);

export const Heading: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h3 className={cn("text-3xl font-semibold leading-none text-white sm:text-4xl", className)}>
    {children}
  </h3>
);

export const Price: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("text-4xl font-semibold leading-none text-white sm:text-5xl", className)}>
    {children}
  </div>
);

export const Paragraph: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <p className={cn("text-base font-medium leading-7 text-white/76", className)}>
    {children}
  </p>
);
