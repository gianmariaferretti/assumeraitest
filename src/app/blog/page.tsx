import type { Metadata } from "next";
import BlogWeekPage from "@/components/ui/blog-week-page";

export const metadata: Metadata = {
  title: "Blog | Assumerai",
  description: "Weekly Assumerai writing on calmer hiring, candidate signal, and better interviews.",
};

export default function BlogPage() {
  return <BlogWeekPage />;
}
