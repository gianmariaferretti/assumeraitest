import { NextResponse, type NextRequest } from "next/server";

import {
  isCompanyContextError,
  resolveCompanyRouteContext,
  updateCompanyWorkspaceProfile
} from "@/features/company-workspace";

export async function POST(request: NextRequest) {
  const companyContext = await resolveCompanyRouteContext("/company/onboarding");
  if (isCompanyContextError(companyContext)) {
    return NextResponse.redirect(
      new URL(
        companyContext.status === 401
          ? "/login?next=/company/onboarding"
          : "/profile?error=company_account_required",
        request.url
      ),
      303
    );
  }

  const formData = await request.formData();
  const now = new Date().toISOString();
  const result = await updateCompanyWorkspaceProfile(companyContext, {
    company_name: readFormText(formData, "company_name"),
    website: readFormText(formData, "website"),
    domain: readFormText(formData, "domain"),
    hiring_locations: readFormList(formData, "hiring_locations"),
    team_size: readFormText(formData, "team_size"),
    primary_contact_name: readFormText(formData, "primary_contact.name"),
    primary_contact_email: readFormText(formData, "primary_contact.email"),
    completedAt: now,
    profilePayload: {
      onboarding_completed_at: now,
      profile_version: "company-onboarding-v2"
    }
  });

  if ("ok" in result && !result.ok) {
    const code = result.issues[0]?.code ?? "missing_required_fields";
    return NextResponse.redirect(
      new URL(`/company/onboarding?error=${encodeURIComponent(code)}`, request.url),
      303
    );
  }

  if ("status" in result && result.status === "supabase_unavailable") {
    return NextResponse.redirect(new URL("/company/onboarding?error=save_failed", request.url), 303);
  }

  return NextResponse.redirect(new URL("/company/dashboard", request.url), 303);
}

function readFormText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readFormList(formData: FormData, key: string): string[] {
  const value = readFormText(formData, key);
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
