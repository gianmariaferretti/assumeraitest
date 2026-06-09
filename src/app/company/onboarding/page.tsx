import { redirect } from "next/navigation";

import {
  CompanyOnboarding,
  type CompanyOnboardingProfile
} from "@/components/company/CompanyOnboarding";
import {
  isCompanyContextError,
  readCompanyWorkspaceProfile,
  resolveCompanyRouteContext
} from "@/features/company-workspace";
import type { CompanyWorkspaceProfile } from "@/features/company-workspace";

export const metadata = {
  title: "Company Onboarding | AssumerAI",
  description: "Complete the company workspace profile before reviewing candidates."
};

export default async function CompanyOnboardingPage({
  searchParams
}: {
  readonly searchParams: Promise<{ readonly error?: string }>;
}) {
  const companyContext = await resolveCompanyRouteContext("/company/onboarding");
  if (isCompanyContextError(companyContext)) {
    if (companyContext.status === 401) {
      redirect("/login?next=/company/onboarding");
    }

    redirect("/profile?error=company_account_required");
  }

  const { error } = await searchParams;
  const workspace = await readCompanyWorkspaceProfile(companyContext);
  const profile = readOnboardingProfile(workspace);

  return <CompanyOnboarding errorCode={error} profile={profile} />;
}

function readOnboardingProfile(
  workspace: CompanyWorkspaceProfile | null
): CompanyOnboardingProfile {
  const payload = workspace?.profilePayload ?? {};
  const primaryContact = isRecord(payload.primary_contact)
    ? payload.primary_contact
    : {};

  return {
    companyName: workspace?.companyName ?? readString(payload.company_name) ?? "",
    website: workspace?.website ?? readString(payload.website) ?? "",
    domain: workspace?.domain ?? readString(payload.domain) ?? "",
    hiringLocations:
      workspace?.hiringLocations.join(", ") ??
      readStringArray(payload.hiring_locations).join(", "),
    teamSize: workspace?.teamSize ?? readString(payload.team_size) ?? "",
    primaryContactName:
      workspace?.primaryContactName ?? readString(primaryContact.name) ?? "",
    primaryContactEmail:
      workspace?.primaryContactEmail ?? readString(primaryContact.email) ?? ""
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
