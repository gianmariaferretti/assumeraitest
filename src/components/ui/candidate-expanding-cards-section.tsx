"use client";

import {
  DatabaseZap,
  EyeOff,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import {
  ExpandingCards,
  type CardItem,
} from "@/components/ui/expanding-cards";

const candidatePrivacyItems = [
  {
    id: "employer-privacy",
    imgSrc:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    icon: <EyeOff size={24} />,
    linkHref: "#employer-privacy",
  },
  {
    id: "delete-everything",
    imgSrc:
      "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=1200&q=80",
    icon: <DatabaseZap size={24} />,
    linkHref: "#delete-everything",
  },
  {
    id: "answers-not-training-data",
    imgSrc:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    icon: <LockKeyhole size={24} />,
    linkHref: "#answers-not-training-data",
  },
  {
    id: "eu-gdpr-ai-act",
    imgSrc:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80",
    icon: <ServerCog size={24} />,
    linkHref: "#eu-gdpr-ai-act",
  },
  {
    id: "never-sell-data",
    imgSrc:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    icon: <ShieldCheck size={24} />,
    linkHref: "#never-sell-data",
  },
] satisfies Omit<CardItem, "description" | "title">[];

export type CandidatePrivacyCopy = {
  body: string;
  eyebrow: string;
  heading: string;
  items: Array<{
    description: string;
    title: string;
  }>;
};

export function CandidateExpandingCardsSection({
  copy,
}: {
  copy: CandidatePrivacyCopy;
}) {
  const items = copy.items.map((item, index) => ({
    ...candidatePrivacyItems[index],
    ...item,
  })) satisfies CardItem[];

  return (
    <section className="bg-[#f5f5f7] px-5 py-16 text-[#1d1d1f] sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto grid max-w-[1200px] gap-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6e6e73]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-4 text-balance text-4xl font-light leading-[1.02] tracking-normal sm:text-5xl lg:text-6xl">
            {copy.heading}
          </h2>
          <p className="mt-5 max-w-2xl text-base font-normal leading-7 text-[#6e6e73] sm:text-lg">
            {copy.body}
          </p>
        </div>

        <ExpandingCards
          className="mx-auto h-[680px] md:h-[520px]"
          defaultActiveIndex={0}
          items={items}
        />
      </div>
    </section>
  );
}
