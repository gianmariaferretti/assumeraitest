"use client";

import Image from "next/image";
import React from "react";

export type TestimonialColumnItem = {
  initials: string;
  name: string;
  role: string;
  text: string;
};

const testimonialAvatarByInitials: Partial<Record<string, string>> = {
  AC: "/images/testimonials/aissatou-conti.webp",
  AP: "/images/testimonials/anna-pellegrini.webp",
  LP: "/images/testimonials/lukas-pernigotti.webp",
  MB: "/images/testimonials/marco-belluzzi.webp",
  TR: "/images/testimonials/tobias-reiner.webp",
};

export function TestimonialsColumn({
  className,
  duration = 18,
  testimonials,
}: {
  className?: string;
  duration?: number;
  testimonials: ReadonlyArray<TestimonialColumnItem>;
}) {
  return (
    <div className={className}>
      <div
        className="flex transform-gpu flex-col gap-4 bg-white pb-4 motion-safe:animate-[testimonials-marquee_var(--testimonial-marquee-duration)_linear_infinite] motion-safe:will-change-transform motion-reduce:animate-none motion-reduce:transform-none"
        style={
          {
            "--testimonial-marquee-duration": `${duration}s`,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: 2 }).map((_, loopIndex) => (
          <React.Fragment key={`testimonial-loop-${loopIndex}`}>
            {testimonials.map((testimonial) => {
              const avatarSrc =
                testimonialAvatarByInitials[testimonial.initials];

              return (
                <article
                  className="w-full max-w-xs rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_rgba(15,23,42,0.08)]"
                  key={`${loopIndex}-${testimonial.name}`}
                >
                  <p className="text-[0.98rem] font-medium leading-7 tracking-[-0.015em] text-slate-950">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    {avatarSrc ? (
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white shadow-[0_0_0_1px_rgba(15,23,42,0.1),0_8px_20px_rgba(15,23,42,0.14)]">
                        <Image
                          alt={`${testimonial.name} testimonial portrait`}
                          className="size-full object-cover"
                          height={80}
                          src={avatarSrc}
                          width={80}
                        />
                      </span>
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-200 via-violet-200 to-sky-200 text-xs font-black text-[#0b2146]">
                        {testimonial.initials}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="text-[0.92rem] font-bold leading-5 tracking-[-0.02em] text-slate-950">
                        {testimonial.name}
                      </div>
                      <div className="text-[0.8rem] font-medium leading-5 text-slate-500">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
