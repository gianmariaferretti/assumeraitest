import { NextResponse, type NextRequest } from "next/server";

import {
  isCompanyContextError,
  resolveCompanyRouteContext
} from "@/features/company-workspace";

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ readonly roleId: string }> }
) {
  const { roleId } = await params;
  const companyContext = await resolveCompanyRouteContext(`/company/roles/${roleId}`);
  if (isCompanyContextError(companyContext)) {
    return NextResponse.redirect(
      new URL(
        companyContext.status === 401
          ? `/login?next=/company/roles/${roleId}`
          : "/profile?error=company_account_required",
        request.url
      ),
      303
    );
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const status = readLifecycleStatus(action);
  if (!status) {
    return NextResponse.redirect(
      new URL(`/company/roles/${roleId}?error=invalid_role_action`, request.url),
      303
    );
  }

  const result = await companyContext.supabase
    .from("company_roles")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("company_id", companyContext.companyId)
    .eq("role_id", roleId);

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/company/roles/${roleId}?error=role_status_update_failed`, request.url),
      303
    );
  }

  return NextResponse.redirect(new URL(`/company/roles/${roleId}`, request.url), 303);
}

function readLifecycleStatus(value: FormDataEntryValue | null): "active" | "paused" | "closed" | null {
  if (value === "pause") return "paused";
  if (value === "close") return "closed";
  if (value === "activate" || value === "reopen") return "active";
  return null;
}
