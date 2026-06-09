import type { Metadata } from "next";
import CandidateShowcaseApp from "./candidate-showcase-app";

export const metadata: Metadata = {
  title: "Candidate OS | Assumerai",
  description:
    "A UI-only candidate workspace preview for profile readiness, matches, applications, scorecards, and interview preparation.",
};

export default function CandidatesAppPage() {
  return <CandidateShowcaseApp />;
}
