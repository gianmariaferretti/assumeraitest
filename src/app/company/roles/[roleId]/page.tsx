import { notFound, redirect } from "next/navigation";

import { CompanyDashboard } from "@/components/company/CompanyDashboard";
import {
  isCompanyContextError,
  readCompanyDashboard,
  resolveCompanyRouteContext
} from "@/features/company-workspace";

export const metadata = {
  title: "Company Role Queue | AssumerAI",
  description: "Role-specific accepted candidate queue and review state."
};

export default async function CompanyRoleDetailPage({
  params
}: {
  readonly params: Promise<{ readonly roleId: string }>;
}) {
  const { roleId } = await params;
  const companyContext = await resolveCompanyRouteContext(`/company/roles/${roleId}`);
  if (isCompanyContextError(companyContext)) {
    if (companyContext.status === 401) {
      redirect(`/login?next=/company/roles/${roleId}`);
    }

    redirect("/profile?error=company_account_required");
  }

  const dashboard = await readCompanyDashboard(companyContext);
  if (!dashboard.roles.some((role) => role.roleId === roleId)) {
    notFound();
  }

  return <CompanyDashboard dashboard={dashboard} focusRoleId={roleId} />;
}
