import { createClient } from "@/lib/supabase/server";
import {
  ACCOUNT_ROLE_PARAM,
  getAccountRoleFromProfilePath,
  getProfilePathForRole,
  getSafeProfileNextPath,
  normalizeAccountRole,
  type AccountRole,
} from "@/lib/auth/account-role";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

async function syncAccountRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountRole: AccountRole | null,
) {
  if (!accountRole) return null;

  const { error } = await supabase.auth.updateUser({
    data: {
      role: accountRole,
      account_role: accountRole,
    },
  });

  return error;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedRole = normalizeAccountRole(searchParams.get(ACCOUNT_ROLE_PARAM));
  const next = getSafeProfileNextPath(
    searchParams.get("next"),
    getProfilePathForRole(requestedRole ?? "candidate"),
  );
  const accountRole = requestedRole ?? getAccountRoleFromProfilePath(next);
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");
  redirectTo.searchParams.delete(ACCOUNT_ROLE_PARAM);

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error) {
      const roleError = await syncAccountRole(supabase, accountRole);

      if (roleError) {
        redirectTo.pathname = "/login";
        redirectTo.searchParams.set("auth_error", "role");
        return NextResponse.redirect(redirectTo);
      }

      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("auth_error", "confirm");
  return NextResponse.redirect(redirectTo);
}
