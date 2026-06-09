"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

const heroColumnStyles = [
  {
    mobileClassName: "left-[2.1rem] top-0",
    mobileTitleClassName: "text-[3.55rem]",
    mobileWordClassName: "text-[2.2rem]",
    desktopClassName: "",
    desktopTitleClassName: "text-[clamp(1.9rem,6.6vw,4.8rem)]",
  },
  {
    mobileClassName: "right-[1.15rem] top-[5.45rem]",
    mobileTitleClassName: "text-[3.55rem]",
    mobileWordClassName: "text-[2.2rem]",
    desktopClassName: "",
    desktopTitleClassName: "text-[clamp(1.9rem,6.6vw,4.8rem)]",
  },
  {
    mobileClassName: "right-[0.55rem] top-[18.75rem]",
    mobileTitleClassName: "text-[4.05rem]",
    mobileWordClassName: "text-[2.5rem]",
    desktopClassName: "sm:-translate-x-[clamp(0.75rem,2.35vw,2.85rem)]",
    desktopTitleClassName: "text-[clamp(1.85rem,5.85vw,4.35rem)]",
  },
];

function splitButtonLabel(label: string) {
  const words = label.split(" ");

  if (words.length < 2) {
    return [label, ""];
  }

  return [words.slice(0, -1).join(" "), words.at(-1) ?? ""];
}

export default function VideoHeroSection() {
  const { t } = useI18n();
  const primaryCta = splitButtonLabel(t.videoHero.primaryCta);
  const secondaryCta = splitButtonLabel(t.videoHero.secondaryCta);
  const heroColumns = t.videoHero.columns.map((column, index) => ({
    ...column,
    ...heroColumnStyles[index],
  }));

  return (
    <section className="relative z-[1] isolate min-h-[100svh] overflow-x-clip overflow-y-visible bg-white text-black">
      <Image
        src="/hero_image/pointerhigh1.png"
        alt=""
        width={1254}
        height={1254}
        preload
        unoptimized
        aria-hidden="true"
        className="pointer-events-none absolute left-[max(-44vw,-180px)] right-auto top-[13.6rem] z-[1] h-[clamp(420px,110vw,500px)] w-auto max-w-none scale-x-100 select-none object-contain sm:left-auto sm:right-[max(-24vw,-320px)] sm:top-[clamp(4.2rem,9vh,5.8rem)] sm:h-[clamp(360px,80vw,820px)] sm:-scale-x-100"
        sizes="(max-width: 639px) 110vw, 820px"
      />

      <div
        className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col items-center justify-start px-5 pb-8 pt-[9rem] sm:max-w-[1160px] sm:justify-center sm:pb-6 sm:pt-[clamp(5.4rem,12vh,7.25rem)]"
        style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
      >
        <div className="relative z-10 block h-[34.25rem] w-full max-w-[390px] sm:hidden">
          {heroColumns.map((item) => (
            <div
              key={`mobile-${item.title}-${item.word}`}
              className={`absolute min-w-0 ${item.mobileClassName}`}
            >
              <p className={`${item.mobileTitleClassName} font-medium leading-[0.74] tracking-[-0.085em] text-black`}>
                {item.title}
              </p>
              <p className={`whitespace-nowrap ${item.mobileWordClassName} font-light leading-[0.9] tracking-[-0.07em] text-black`}>
                {item.word}
              </p>
              <p className="mt-1 min-h-[1em] whitespace-nowrap text-[0.52rem] font-medium leading-none text-[#b5b5b5]">
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="hidden w-full max-w-[720px] grid-cols-3 items-end gap-[clamp(0.85rem,4.4vw,4.85rem)] sm:grid">
          {heroColumns.map((item) => (
            <div key={`${item.title}-${item.word}`} className={`min-w-0 ${item.desktopClassName}`}>
              <p className={`${item.desktopTitleClassName} font-medium leading-[0.74] tracking-[-0.085em] text-black`}>
                {item.title}
              </p>
              <p className="whitespace-nowrap text-[clamp(1.28rem,3.75vw,2.82rem)] font-light leading-[0.9] tracking-[-0.07em] text-black">
                {item.word}
              </p>
              <p className="mt-3 min-h-[1em] truncate text-[clamp(0.52rem,1.15vw,0.8rem)] font-medium leading-none text-[#b5b5b5]">
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-0 flex items-center justify-center sm:mt-[clamp(5.4rem,15vh,8.3rem)]">
          <svg
            className="pointer-events-none absolute left-0 top-1/2 h-[4.3rem] w-[3.55rem] -translate-x-[58%] -translate-y-1/2 overflow-visible sm:h-[clamp(3.7rem,6.2vw,5.2rem)] sm:w-[clamp(3rem,5.2vw,4.5rem)]"
            viewBox="0 0 84 116"
            aria-hidden="true"
          >
            <defs>
              <path
                id="always-free-arc"
                d="M68 104C14 80 14 36 68 12"
              />
            </defs>
            <text className="fill-black text-[22px] font-normal tracking-[-0.08em]">
              <textPath
                href="#always-free-arc"
                startOffset="50%"
                textAnchor="middle"
              >
                {t.videoHero.alwaysFree}
              </textPath>
            </text>
          </svg>

          <Link
            href="/candidate"
            prefetch={false}
            className="relative z-10 flex h-[3rem] w-[10.55rem] items-center justify-center rounded-full bg-[#1800ad] px-[clamp(1rem,2.2vw,2rem)] text-white sm:h-[clamp(2.45rem,4.45vw,3.35rem)] sm:w-[clamp(8.9rem,15.4vw,11.6rem)]"
          >
            <span className="text-center text-[1.14rem] font-normal leading-[0.82] tracking-[-0.085em] sm:text-[clamp(0.95rem,2.25vw,1.8rem)]">
              {primaryCta[0]}
              <br />
              {primaryCta[1]}
            </span>
          </Link>

          <Link
            href="/product/companies"
            prefetch={false}
            className="-ml-[clamp(0.7rem,1.5vw,1.2rem)] flex h-[3rem] w-[9.85rem] items-center justify-center rounded-full bg-[#d8d8d8] px-[clamp(1rem,2.2vw,2rem)] text-black sm:h-[clamp(2.45rem,4.45vw,3.35rem)] sm:w-[clamp(8.7rem,16.5vw,12.4rem)]"
          >
            <span className="text-center text-[1.14rem] font-normal leading-[0.82] tracking-[-0.085em] sm:text-[clamp(0.95rem,2.25vw,1.8rem)]">
              {secondaryCta[0]}
              <br />
              {secondaryCta[1]}
            </span>
          </Link>
        </div>

        <p className="mt-4 max-w-[380px] text-center text-[0.55rem] font-normal leading-snug text-black sm:mt-7 sm:max-w-[780px] sm:text-[clamp(0.72rem,1.12vw,0.93rem)]">
          {t.videoHero.body}
        </p>
      </div>
    </section>
  );
}
