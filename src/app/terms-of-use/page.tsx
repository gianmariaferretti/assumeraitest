import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/ui/legal-document-page";

export const metadata: Metadata = {
  title: "Terms of use | Assumerai",
  description:
    "The rules for using Assumerai as a candidate, employer, visitor, or workspace member.",
};

const sections = [
  {
    title: "Using Assumerai",
    body: [
      "These terms govern access to Assumerai websites, candidate flows, employer workspaces, interviews, scorecards, matching tools, and related services. By using the service, you agree to use it lawfully and in line with these terms.",
      "If you use Assumerai for a company, you confirm that you have authority to accept these terms for that company. If you do not agree, do not use the service.",
    ],
  },
  {
    title: "Accounts and accuracy",
    body: [
      "You are responsible for keeping account details accurate, protecting login credentials, and telling us quickly if you believe an account has been accessed without permission.",
      "Candidates should provide truthful professional information. Employers should keep role requirements, evaluation criteria, and hiring-team access accurate and current.",
    ],
  },
  {
    title: "Candidate and employer responsibilities",
    body: [
      "Candidates may use Assumerai to create a profile, complete an interview, review a scorecard, and decide which companies can see their profile. Employers may use Assumerai to structure hiring work, review role-relevant evidence, and coordinate human review.",
      "Employers remain responsible for their own hiring decisions, legal compliance, notices, candidate communications, accommodations, and final employment actions. Assumerai is a tool for organizing signal, not a substitute for a fair hiring process.",
    ],
  },
  {
    title: "AI outputs and human review",
    body: [
      "Assumerai may generate summaries, scores, explanations, recommendations, transcripts, and other AI-assisted outputs. These outputs can be incomplete, inaccurate, or missing context, so they must be reviewed before they are used in a decision.",
      "You agree not to treat AI outputs as the sole basis for hiring, rejection, compensation, or other employment decisions. Human review is required for meaningful decisions, especially where a result may negatively affect a candidate.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "You may not misuse Assumerai, interfere with the service, attempt to bypass access controls, scrape data, reverse engineer protected systems, upload unlawful material, or use the product to discriminate, harass, deceive, or make decisions based on protected characteristics.",
      "You may not submit data that you do not have the right to process. Employers must not use Assumerai to create hidden candidate profiles, monitor employees without proper notice, or pressure candidates into sharing data beyond the workflow.",
    ],
    bullets: [
      "Do not upload malware, stolen data, fake identities, or confidential data without permission.",
      "Do not use outputs to profile protected traits, emotions, health, politics, religion, or private life.",
      "Do not sell, resell, or expose Assumerai data outside authorized workflows.",
      "Do not attempt to overload, probe, or disrupt the service.",
    ],
  },
  {
    title: "Content and ownership",
    body: [
      "You keep ownership of the content you provide to Assumerai. You grant us the rights needed to host, process, display, secure, and operate that content for the service.",
      "Assumerai owns the product, software, design, workflows, documentation, brand, and underlying technology. These terms do not transfer ownership of Assumerai intellectual property to you.",
    ],
  },
  {
    title: "Plans, payments, and changes",
    body: [
      "Some employer features may require a paid plan, order form, or separate agreement. Fees, renewal terms, taxes, usage limits, and cancellation rights will be described in the relevant checkout flow or contract.",
      "We may change, suspend, or discontinue parts of the service as the product evolves. If a change materially affects active paid customers, we will try to give reasonable notice where practical.",
    ],
  },
  {
    title: "Privacy and confidentiality",
    body: [
      "Our privacy policy explains how we handle personal data. Employers and workspace members are responsible for treating candidate information as confidential and limiting access to people with a legitimate hiring need.",
      "If you receive information through Assumerai by mistake, or if you believe data has been exposed incorrectly, contact hello@assumer.ai so we can investigate quickly.",
    ],
  },
  {
    title: "Disclaimers and liability",
    body: [
      "Assumerai is provided as a professional hiring product, but we do not promise that every output will be error-free or that the service will always be uninterrupted. You are responsible for reviewing outputs and deciding whether they are appropriate for your use case.",
      "To the maximum extent allowed by law, Assumerai is not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, or business opportunities.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about these terms can be sent to hello@assumer.ai. We may update these terms from time to time, and the updated version will be posted on this page with a new date.",
    ],
  },
];

export default function TermsOfUsePage() {
  return (
    <LegalDocumentPage
      eyebrow="Terms of use"
      title="Terms of use"
      description="The plain rules for using Assumerai responsibly, with candidate control, employer accountability, and human review where hiring decisions matter."
      updated="May 19, 2026"
      sections={sections}
    />
  );
}
