"use client";

import dynamic from "next/dynamic";
import DeferredMobileMount from "@/components/ui/deferred-mobile-mount";
import FinalCtaSection from "@/components/ui/final-cta-section";

const FeaturedGlobeSection = dynamic(
  () => import("@/components/ui/globe"),
  { loading: () => <div className="h-[520px] bg-white" />, ssr: false },
);
const PhoneProcessSection = dynamic(
  () => import("@/components/ui/phone-process"),
  { loading: () => <div className="h-[160vh] bg-white" />, ssr: false },
);
const InterviewOutcomesSection = dynamic(
  () => import("@/components/ui/interview-outcomes-section"),
  { loading: () => <div className="h-[80vh] bg-white" />, ssr: false },
);
const InterviewModulesSection = dynamic(
  () => import("@/components/ui/interview-modules-section"),
  { loading: () => <div className="h-[80vh] bg-white" />, ssr: false },
);
const DashboardShowcaseSection = dynamic(
  () => import("@/components/ui/dashboard-showcase-section"),
  { loading: () => <div className="h-[80vh] bg-white" />, ssr: false },
);
const TestimonialsSection = dynamic(
  () => import("@/components/ui/testimonials-section"),
  { loading: () => <div className="h-[80vh] bg-white" />, ssr: false },
);
const PricingSection = dynamic(
  () => import("@/components/ui/pricing-section"),
  { loading: () => <div className="h-[80vh] bg-white" />, ssr: false },
);

export default function HomeBelowFoldSections() {
  return (
    <DeferredMobileMount>
      <div className="bg-white pb-20">
        <FeaturedGlobeSection />
      </div>
      <PhoneProcessSection />
      <InterviewOutcomesSection />
      <InterviewModulesSection />
      <DashboardShowcaseSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCtaSection />
    </DeferredMobileMount>
  );
}
