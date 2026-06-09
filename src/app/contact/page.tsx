import type { Metadata } from "next";
import ContactTeamPage from "@/components/ui/contact-team-page";

export const metadata: Metadata = {
  title: "Contact us | Assumerai",
  description: "Contact Assumerai and meet the team building calmer hiring.",
};

export default function ContactPage() {
  return <ContactTeamPage />;
}
