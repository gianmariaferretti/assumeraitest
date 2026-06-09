"use client";

import { motion } from "motion/react";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { useI18n } from "@/lib/i18n";

export default function TestimonialsSection() {
  const { t } = useI18n();
  const firstColumn = t.testimonials.items.slice(0, 3);
  const secondColumn = [
    t.testimonials.items[3],
    t.testimonials.items[4],
    t.testimonials.items[0],
  ];
  const thirdColumn = [
    t.testimonials.items[1],
    t.testimonials.items[2],
    t.testimonials.items[3],
  ];

  return (
    <section
      className="scroll-mt-24 bg-white px-5 py-16 text-[#0b2146] sm:px-6 sm:py-20 lg:py-24"
      id="testimonials"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2
            className="mb-5 max-w-[12ch] font-light leading-[0.98] text-slate-950"
            style={{
              fontSize: "clamp(2.2rem, 4.8vw, 4.5rem)",
              letterSpacing: "-0.05em",
            }}
          >
            {t.testimonials.heading}
          </h2>
          <p className="max-w-[23rem] text-base font-medium leading-7 text-slate-600 sm:text-lg">
            {t.testimonials.body}
          </p>
        </motion.div>

        <div className="mt-10 flex max-h-[640px] justify-center gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)] sm:gap-5 lg:max-h-[720px]">
          <TestimonialsColumn
            className="w-full max-w-xs"
            duration={22}
            testimonials={firstColumn}
          />
          <TestimonialsColumn
            className="hidden w-full max-w-xs md:block"
            duration={27}
            testimonials={secondColumn}
          />
          <TestimonialsColumn
            className="hidden w-full max-w-xs lg:block"
            duration={24}
            testimonials={thirdColumn}
          />
        </div>
      </div>
    </section>
  );
}
