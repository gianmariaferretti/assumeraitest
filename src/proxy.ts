import { updateSession } from "@/lib/supabase/proxy";
import {
  SITE_LOCK_PATH,
  SITE_PASSWORD_COOKIE,
  hasSiteAccess,
  redirectToSiteLock,
} from "@/lib/site-password";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === SITE_LOCK_PATH || pathname.startsWith(`${SITE_LOCK_PATH}/`)) {
    return;
  }

  if (!(await hasSiteAccess(request.cookies.get(SITE_PASSWORD_COOKIE)?.value))) {
    return redirectToSiteLock(request);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

