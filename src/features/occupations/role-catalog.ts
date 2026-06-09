import type { CandidateProfile } from "../resume-parsing";

export interface TargetRoleCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly keywords: readonly string[];
}

export interface TargetRoleRecommendation extends TargetRoleCatalogEntry {
  readonly score: number;
  readonly evidence: readonly string[];
}

export interface TargetRolePreferenceOptions {
  readonly recommended: readonly TargetRoleRecommendation[];
  readonly catalog: readonly TargetRoleCatalogEntry[];
}

export interface WorkSetupOption {
  readonly value: "remote" | "hybrid" | "onsite";
  readonly label: string;
}

export const workSetupOptions: readonly WorkSetupOption[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" }
];

export const targetRoleCatalog: readonly TargetRoleCatalogEntry[] = [
  role("ai-analyst", "AI Analyst", "AI, data, and risk", [
    "ai",
    "machine learning",
    "evaluation",
    "rag",
    "risk"
  ]),
  role("data-analyst", "Data Analyst", "AI, data, and risk", [
    "data",
    "analytics",
    "sql",
    "dashboard",
    "excel"
  ]),
  role("python-developer", "Python Developer", "AI, data, and risk", [
    "python",
    "api",
    "backend",
    "software",
    "automation"
  ]),
  role("risk-analyst", "Risk Analyst", "AI, data, and risk", [
    "risk",
    "controls",
    "audit",
    "compliance",
    "policy"
  ]),
  role("cybersecurity-analyst", "Cybersecurity Analyst", "AI, data, and risk", [
    "security",
    "incident",
    "cyber",
    "threat",
    "compliance"
  ]),
  role("product-manager", "Product Manager", "Product and operations", [
    "product",
    "roadmap",
    "stakeholder",
    "requirements",
    "launch"
  ]),
  role("project-manager", "Project Manager", "Product and operations", [
    "project",
    "timeline",
    "delivery",
    "scope",
    "stakeholder"
  ]),
  role("operations-coordinator", "Operations Coordinator", "Product and operations", [
    "operations",
    "process",
    "coordination",
    "scheduling",
    "records"
  ]),
  role("process-improvement-analyst", "Process Improvement Analyst", "Product and operations", [
    "process",
    "improvement",
    "workflow",
    "efficiency",
    "operations"
  ]),
  role("customer-success-manager", "Customer Success Manager", "Sales and customer", [
    "customer",
    "client",
    "account",
    "relationship",
    "retention"
  ]),
  role("sales-development-representative", "Sales Development Representative", "Sales and customer", [
    "sales",
    "outbound",
    "crm",
    "pipeline",
    "prospecting"
  ]),
  role("account-executive", "Account Executive", "Sales and customer", [
    "sales",
    "revenue",
    "negotiation",
    "pipeline",
    "quota"
  ]),
  role("client-services-coordinator", "Client Services Coordinator", "Sales and customer", [
    "client",
    "service",
    "records",
    "database",
    "coordination"
  ]),
  role("community-services-coordinator", "Community Services Coordinator", "Care, education, and social services", [
    "community",
    "families",
    "health care",
    "financial assistance",
    "coordination"
  ]),
  role("case-manager", "Case Manager", "Care, education, and social services", [
    "case",
    "client",
    "care",
    "healthcare",
    "special needs"
  ]),
  role("special-needs-care-coordinator", "Special Needs Care Coordinator", "Care, education, and social services", [
    "special needs",
    "adult care",
    "child care",
    "care",
    "client"
  ]),
  role("childcare-program-coordinator", "Childcare Program Coordinator", "Care, education, and social services", [
    "childcare",
    "early childhood",
    "activity planning",
    "families",
    "counselor"
  ]),
  role("early-childhood-educator", "Early Childhood Educator", "Care, education, and social services", [
    "early childhood",
    "elementary education",
    "teacher",
    "classroom",
    "student"
  ]),
  role("school-support-specialist", "School Support Specialist", "Care, education, and social services", [
    "school",
    "teacher",
    "classroom",
    "student",
    "activity"
  ]),
  role("counseling-program-supervisor", "Counseling Program Supervisor", "Care, education, and social services", [
    "counseling supervisor",
    "counselor",
    "supervisor",
    "service assignments",
    "clients"
  ]),
  role("volunteer-coordinator", "Volunteer Coordinator", "Care, education, and social services", [
    "volunteer",
    "managed volunteers",
    "coordination",
    "community",
    "service"
  ]),
  role("healthcare-coordinator", "Healthcare Coordinator", "Care, education, and social services", [
    "healthcare",
    "health care",
    "medical",
    "care professionals",
    "client"
  ]),
  role("hr-coordinator", "HR Coordinator", "People and administration", [
    "hr",
    "recruiting",
    "people",
    "onboarding",
    "records"
  ]),
  role("office-administrator", "Office Administrator", "People and administration", [
    "administration",
    "records",
    "database",
    "coordination",
    "office"
  ]),
  role("executive-assistant", "Executive Assistant", "People and administration", [
    "calendar",
    "scheduling",
    "coordination",
    "executive",
    "administration"
  ]),
  role("marketing-coordinator", "Marketing Coordinator", "Marketing and content", [
    "marketing",
    "campaign",
    "content",
    "social",
    "brand"
  ]),
  role("content-writer", "Content Writer", "Marketing and content", [
    "writing",
    "content",
    "copy",
    "editing",
    "communication"
  ]),
  role("financial-analyst", "Financial Analyst", "Finance", [
    "finance",
    "financial",
    "budget",
    "modeling",
    "forecast"
  ]),
  role("accounting-associate", "Accounting Associate", "Finance", [
    "accounting",
    "invoice",
    "reconciliation",
    "ledger",
    "finance"
  ]),
  role("consultant", "Consultant", "Consulting", [
    "consulting",
    "client",
    "analysis",
    "recommendations",
    "presentation"
  ])
];

export function buildTargetRolePreferenceOptions(
  profile: CandidateProfile
): TargetRolePreferenceOptions {
  return {
    recommended: recommendTargetRoles(profile),
    catalog: targetRoleCatalog
  };
}

export function recommendTargetRoles(
  profile: CandidateProfile,
  limit = 8
): TargetRoleRecommendation[] {
  const evidenceItems = collectProfileEvidence(profile);
  const evidenceText = evidenceItems.join("\n").toLowerCase();

  return targetRoleCatalog
    .map((entry) => {
      const matchedKeywords = entry.keywords.filter((keyword) =>
        evidenceText.includes(keyword.toLowerCase())
      );
      const preferredRoleBoost = profile.preferences.target_roles.some((targetRole) =>
        normalizeText(targetRole).includes(normalizeText(entry.label))
      )
        ? 20
        : 0;
      const score = Math.min(100, matchedKeywords.length * 16 + preferredRoleBoost);

      return {
        ...entry,
        score,
        evidence: matchedKeywords.slice(0, 4)
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function collectProfileEvidence(profile: CandidateProfile): string[] {
  return [
    ...(profile.preferences.target_roles ?? []),
    ...(profile.preferences.industries ?? []),
    ...(profile.preferences.work_style ?? []),
    ...profile.education.flatMap((education) => [
      education.institution,
      education.degree,
      education.field,
      education.grades ?? "",
      ...(education.honors ?? []),
      ...(education.projects ?? [])
    ]),
    ...profile.experience.flatMap((experience) => [
      experience.title,
      experience.company,
      experience.industry ?? "",
      experience.function ?? "",
      experience.leadership_scope ?? "",
      ...(experience.responsibilities ?? []),
      ...(experience.measurable_impact ?? []),
      ...(experience.tools ?? [])
    ]),
    ...profile.skills.flatMap((skill) => [skill.name, ...(skill.evidence ?? [])]),
    ...(profile.certifications ?? []),
    ...(profile.portfolio ?? [])
  ].filter((item) => item.trim().length > 0);
}

function role(
  id: string,
  label: string,
  group: string,
  keywords: readonly string[]
): TargetRoleCatalogEntry {
  return { id, label, group, keywords };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
