"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n";

const PRICES = [
  {
    eyebrow: "BASE",
    name: "Platform",
    price: "\u20ac400",
    cadence: "platform",
    body: "Unlimited AI interviews, ATS sync, scorecards. Predictable SaaS revenue from day one.",
    icon: "/pricing/platform-icon.png",
    iconAlt: "HR platform dashboard icon",
  },
  {
    eyebrow: "CORE",
    name: "Per hire",
    price: "\u20ac200",
    cadence: "per hire",
    body: "Triggered when a matched candidate is hired. Replaces external recruiters at 1/4 the cost.",
    icon: "/pricing/per-hire-icon.png",
    iconAlt: "Successful hiring handshake icon",
  },
  {
    eyebrow: "ALIGNED",
    name: "Performance",
    price: "lets speak",
    cadence: "",
    body: "",
    icon: "/pricing/performance-icon.png",
    iconAlt: "Employee performance retention icon",
  },
] as const;

export default function PricingSection() {
  const { t } = useI18n();
  const plans = PRICES.map((plan, index) => ({
    ...plan,
    ...t.pricing.plans[index],
  }));

  return (
    <section
      className="scroll-mt-24 bg-white px-6 py-16 text-[#0b2146] sm:py-20 lg:py-24"
      id="pricing"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <div className="mx-auto max-w-6xl">
        <h2
          className="mb-5 max-w-[12ch] font-light leading-[0.98] text-slate-950"
          style={{
            fontSize: "clamp(2.2rem, 4.8vw, 4.5rem)",
            letterSpacing: "-0.05em",
          }}
        >
          {t.pricing.headingLine1}
          <span className="block">
            {t.pricing.headingLine2}
          </span>
        </h2>

        <div className="mt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <article
                className="relative min-h-[320px] overflow-hidden rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_18px_56px_rgba(15,23,42,0.08)] sm:min-h-[360px]"
                key={plan.name}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-[#d9d2ff]"
                />

                <Image
                  alt={plan.iconAlt}
                  className="absolute right-5 top-5 size-16 rounded-[8px] object-cover shadow-[0_12px_32px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/5"
                  height={1280}
                  sizes="64px"
                  src={plan.icon}
                  width={1280}
                />

                <div className="pr-20">
                  <p className="text-xs font-black uppercase leading-none tracking-normal text-sky-700">
                    {plan.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-black uppercase leading-none tracking-[-0.03em] text-[#0b2146]">
                    {plan.name}
                  </h3>
                </div>

                <div className="mt-12 sm:mt-16">
                  <p className="text-[clamp(2rem,5vw,2.75rem)] font-light leading-none tracking-[-0.045em] text-[#0b2146]">
                    {plan.price}
                  </p>
                  {plan.cadence ? (
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      {plan.cadence}
                    </p>
                  ) : null}
                </div>

                {plan.body ? (
                  <p className="mt-6 max-w-[17rem] text-[0.95rem] font-medium leading-6 text-slate-600 sm:mt-8">
                    {plan.body}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
