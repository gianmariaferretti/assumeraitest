import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/ui/legal-document-page";

export const metadata: Metadata = {
  title: "Privacy policy | Assumerai",
  description:
    "How Assumerai handles candidate, employer, interview, and product data.",
};

const sections = [
  {
    title: "What this policy covers",
    body: [
      "This privacy policy explains how Assumerai handles personal data when candidates create a profile, complete an interview, review a scorecard, or choose to be seen by hiring teams. It also covers employer users, website visitors, and people who contact us directly.",
      "Assumerai is built for hiring signal, not surveillance. We keep the data model narrow, explain the outputs we show, and design the product so candidates can understand what is being used before a company sees it.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "We collect account details such as name, email address, authentication data, role, company, and workspace settings. Candidates may add CVs, work history, skills, preferences, interview answers, transcripts, scorecards, availability, and match decisions.",
      "If integrity features are enabled, we may process limited technical signals such as session timing, device and browser information, or media-permission events. We use these signals to protect interview quality, not to infer personality, emotion, health, or protected characteristics.",
    ],
    bullets: [
      "Candidate data from profiles, CVs, interviews, answers, and match choices.",
      "Employer data from workspaces, roles, evaluations, notes, and team activity.",
      "Product data such as logs, diagnostics, usage events, support requests, and cookies.",
      "Billing and administrative records when a paid workspace or contract exists.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use data to run the product, parse CVs, schedule interviews, generate candidate scorecards, help employers review role fit, maintain security, troubleshoot bugs, answer support requests, and improve reliability.",
      "We do not use candidate data for model improvement, public benchmarks, or training another company's hiring system unless the candidate has clearly opted into that use. We do not sell candidate or employer data.",
    ],
  },
  {
    title: "AI, scorecards, and human review",
    body: [
      "Assumerai uses AI to structure interview answers, summarize work evidence, and surface job-relevant signals. These outputs are intended to support human review. They are not a final employment decision, and they should not replace the judgment of a hiring team.",
      "Where a workflow marks a candidate below a threshold, Assumerai expects a human review layer before the result is used in a hiring process. The product is designed to show the reasons behind a signal so candidates and employers can challenge or correct inaccurate data.",
    ],
  },
  {
    title: "Sharing and visibility",
    body: [
      "Candidates control whether their profile is visible to matched companies. Employers see candidate information only through the workspace and role workflow they are allowed to access. We may share data with service providers that help us host, secure, support, analyze, or deliver the service.",
      "We may disclose information if required by law, to protect the product, to prevent abuse, or as part of a merger, acquisition, financing, or similar corporate event. Any successor should continue to protect personal data under this policy or give users notice of material changes.",
    ],
  },
  {
    title: "Retention, deletion, and exports",
    body: [
      "We keep personal data for as long as needed to provide the service, maintain records, resolve disputes, meet legal obligations, and protect the platform. Candidates can request deletion or export of their profile and interview data.",
      "Deletion requests may take a short period to process across backups, logs, and service providers. We may retain limited records where required for security, billing, legal compliance, or abuse prevention.",
    ],
  },
  {
    title: "Security and transfers",
    body: [
      "We use administrative, technical, and organizational safeguards such as access controls, encryption in transit, audit trails, vendor review, and least-privilege permissions. No system is perfect, but we treat hiring data as sensitive by default.",
      "Assumerai is built around European hiring workflows and may process data in the EU, the UK, the United States, or other locations where trusted providers operate. When data crosses borders, we use appropriate contractual and operational safeguards.",
    ],
  },
  {
    title: "Your choices and rights",
    body: [
      "Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or receive a copy of your personal data. You can also ask questions about automated processing and how a scorecard was produced.",
      "To make a privacy request, email hello@assumer.ai with enough detail for us to find your account. We may need to verify your identity before acting on the request.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      eyebrow="Privacy policy"
      title="Privacy policy"
      description="Clear rules for how Assumerai handles candidate data, employer workspaces, AI-assisted scorecards, and product operations."
      updated="May 19, 2026"
      sections={sections}
    />
  );
}
