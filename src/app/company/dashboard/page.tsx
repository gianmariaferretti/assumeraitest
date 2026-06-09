import { redirect } from "next/navigation";

import {
  CompanyDashboard,
  CompanyDashboardSetupFallback
} from "@/components/company/CompanyDashboard";
import {
  isCompanyContextError,
  readCompanyDashboard,
  resolveCompanyRouteContext
} from "@/features/company-workspace";

export const metadata = {
  title: "Company Dashboard | AssumerAI",
  description:
    "Company role queues, accepted candidate matches, review SLA state, and auditable decisions."
};

export default async function CompanyDashboardPage() {
  const companyContext = await resolveCompanyRouteContext("/company/dashboard");
  if (isCompanyContextError(companyContext)) {
    if (companyContext.status === 401) {
      redirect("/login?next=/company/dashboard");
    }

    if (companyContext.code === "company_workspace_unavailable") {
      return <CompanyDashboardSetupFallback />;
    }

    redirect("/profile?error=company_account_required");
  }

  const dashboard = await readCompanyDashboard(companyContext);
  const workspaceResult = await companyContext.supabase
    .from("company_workspaces")
    .select("profile_payload")
    .eq("company_id", companyContext.companyId)
    .maybeSingle();
  const workspace = workspaceResult.error
    ? null
    : (workspaceResult.data as Record<string, unknown> | null);

  return (
    <CompanyDashboard
      dashboard={dashboard}
      onboardingIncomplete={!hasCompletedOnboarding(workspace?.profile_payload)}
    />
  );
}

function hasCompletedOnboarding(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return typeof profile.onboarding_completed_at === "string";
}
