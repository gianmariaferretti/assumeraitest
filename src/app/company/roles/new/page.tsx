import { redirect } from "next/navigation";

import { CompanyRoleWizard } from "@/components/company/CompanyRoleWizard";
import {
  isCompanyContextError,
  resolveCompanyRouteContext
} from "@/features/company-workspace";

export const metadata = {
  title: "New Company Role | AssumerAI",
  description: "Structured company role intake for consent-led candidate matching."
};

export default async function CompanyRoleNewPage({
  searchParams
}: {
  readonly searchParams: Promise<{ readonly error?: string; readonly message?: string }>;
}) {
  const companyContext = await resolveCompanyRouteContext("/company/roles/new");
  if (isCompanyContextError(companyContext)) {
    if (companyContext.status === 401) {
      redirect("/login?next=/company/roles/new");
    }

    redirect("/profile?error=company_account_required");
  }

  const params = await searchParams;

  return <CompanyRoleWizard errorCode={formatRoleError(params)} />;
}

function formatRoleError(params: {
  readonly error?: string;
  readonly message?: string;
}): string | undefined {
  if (!params.error) return undefined;
  return params.error;
}
