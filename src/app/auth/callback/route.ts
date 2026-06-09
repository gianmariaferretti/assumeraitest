import { createClient } from "@/lib/supabase/server";
import {
  ACCOUNT_ROLE_PARAM,
  getAccountRoleFromProfilePath,
  getProfilePathForRole,
  getSafeProfileNextPath,
  normalizeAccountRole,
  type AccountRole,
} from "@/lib/auth/account-role";
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
  const code = searchParams.get("code");
  const requestedRole = normalizeAccountRole(searchParams.get(ACCOUNT_ROLE_PARAM));
  const next = getSafeProfileNextPath(
    searchParams.get("next"),
    getProfilePathForRole(requestedRole ?? "candidate"),
  );
  const accountRole = requestedRole ?? getAccountRoleFromProfilePath(next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const roleError = await syncAccountRole(supabase, accountRole);

      if (roleError) {
        return NextResponse.redirect(new URL("/login?auth_error=role", request.url));
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?auth_error=callback", request.url));
}
