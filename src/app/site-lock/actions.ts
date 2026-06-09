"use server";

import {
  SITE_PASSWORD_COOKIE,
  SITE_PASSWORD_COOKIE_MAX_AGE,
  getSiteAccessToken,
  normalizeSiteLockNext,
  verifySitePassword,
} from "@/lib/site-password";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type UnlockSiteState = {
  error?: string;
};

export async function unlockSite(
  _state: UnlockSiteState,
  formData: FormData,
): Promise<UnlockSiteState> {
  const password = formData.get("password");
  const nextPath = normalizeSiteLockNext(formData.get("next"));

  if (typeof password !== "string" || !(await verifySitePassword(password))) {
    return {
      error: "That password is not correct.",
    };
  }

  const cookieStore = await cookies();
  const accessToken = await getSiteAccessToken();

  if (!accessToken) {
    return {
      error: "Site access is not configured yet.",
    };
  }

  cookieStore.set(SITE_PASSWORD_COOKIE, accessToken, {
    httpOnly: true,
    maxAge: SITE_PASSWORD_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(nextPath);
}
