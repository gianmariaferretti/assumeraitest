export const productSlugs = [
  "candidates",
  "hiring-teams",
  "pricing",
] as const;

export type ProductSlug = (typeof productSlugs)[number];

export type ProductPageKey = "candidates" | "hiringTeams" | "pricing";

export const productPageKeyBySlug: Record<ProductSlug, ProductPageKey> = {
  candidates: "candidates",
  "hiring-teams": "hiringTeams",
  pricing: "pricing",
};

export const productPageHrefs: Record<ProductSlug, string> = {
  candidates: "/product/candidates",
  "hiring-teams": "/product/hiring-teams",
  pricing: "/product/pricing",
};

export const productVisuals: Record<
  ProductSlug,
  {
    accent: string;
    darkAccent: string;
    height: number;
    visualAlt: string;
    visualPosition: string;
    visualSrc: string;
    width: number;
  }
> = {
  candidates: {
    accent: "#b86fc4",
    darkAccent: "#6d4ccf",
    height: 1536,
    visualAlt: "Candidate product view with match and interview panels",
    visualPosition: "object-center",
    visualSrc: "/landing/interview-outcomes.png",
    width: 1024,
  },
  "hiring-teams": {
    accent: "#789add",
    darkAccent: "#0b4fb3",
    height: 847,
    visualAlt: "Recruiter dashboard product view",
    visualPosition: "object-left-top",
    visualSrc: "/dashboard/dashboard_view.png",
    width: 1866,
  },
  pricing: {
    accent: "#a8c5f1",
    darkAccent: "#2563eb",
    height: 852,
    visualAlt: "Pricing and hiring performance product view",
    visualPosition: "object-left-top",
    visualSrc: "/dashboard/dashboard_analytics.png",
    width: 1867,
  },
};

export function isProductSlug(value: string): value is ProductSlug {
  return productSlugs.includes(value as ProductSlug);
}
