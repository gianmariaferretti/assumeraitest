import { NextResponse, type NextRequest } from "next/server";

export const SITE_LOCK_PATH = "/site-lock";
export const SITE_PASSWORD_COOKIE = "assumerai_site_access";
export const SITE_PASSWORD_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const TOKEN_NAMESPACE = "assumerai-site-lock:v1";

function getConfiguredPassword() {
  const password = process.env.SITE_PASSWORD?.trim();

  return password && password.length > 0 ? password : null;
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (!left || !right) return false;

  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    mismatch |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

export async function getSiteAccessToken() {
  const password = getConfiguredPassword();

  if (!password) return null;

  return sha256(`${TOKEN_NAMESPACE}:${password}`);
}

export async function verifySitePassword(password: string) {
  const candidate = password.trim();
  const accessToken = await getSiteAccessToken();

  if (!candidate || !accessToken) return false;

  const candidateToken = await sha256(`${TOKEN_NAMESPACE}:${candidate}`);

  return constantTimeEqual(candidateToken, accessToken);
}

export async function hasSiteAccess(cookieValue?: string) {
  const accessToken = await getSiteAccessToken();

  if (!cookieValue) return false;
  if (!accessToken) return false;

  return constantTimeEqual(cookieValue, accessToken);
}

export function normalizeSiteLockNext(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") return "/";

  const nextPath = value.trim();

  if (
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//") ||
    nextPath === SITE_LOCK_PATH ||
    nextPath.startsWith(`${SITE_LOCK_PATH}/`)
  ) {
    return "/";
  }

  return nextPath;
}

export function redirectToSiteLock(request: NextRequest) {
  const lockUrl = request.nextUrl.clone();
  const nextPath = normalizeSiteLockNext(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  lockUrl.pathname = SITE_LOCK_PATH;
  lockUrl.search = "";
  lockUrl.searchParams.set("next", nextPath);

  return NextResponse.redirect(lockUrl);
}
