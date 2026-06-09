import type { User } from "@supabase/supabase-js";

export type AccountRole = "candidate" | "company";

export const ACCOUNT_ROLE_PARAM = "account_role";
export const DEFAULT_ACCOUNT_ROLE: AccountRole = "candidate";

const companyAliases = new Set([
  "company",
  "employer",
  "hiring-team",
  "hiring-teams",
  "team",
]);

const candidateAliases = new Set(["candidate", "talent", "applicant"]);

export function normalizeAccountRole(value: unknown): AccountRole | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");

  if (companyAliases.has(normalized)) return "company";
  if (candidateAliases.has(normalized)) return "candidate";

  return null;
}

export function getProfilePathForRole(role: AccountRole) {
  return role === "company" ? "/company/profile" : "/profile";
}

export function getSettingsPathForRole(role: AccountRole) {
  return role === "company" ? "/company/profile/settings" : "/profile/settings";
}

export function getAccountRoleFromProfilePath(path: string | null | undefined) {
  if (!path) return null;

  if (path === "/company/profile" || path.startsWith("/company/profile/")) {
    return "company";
  }

  if (path === "/profile" || path.startsWith("/profile/")) {
    return "candidate";
  }

  return null;
}

export function getSafeProfileNextPath(
  value: string | null | undefined,
  fallbackPath = getProfilePathForRole(DEFAULT_ACCOUNT_ROLE),
) {
  if (!value) return fallbackPath;

  const nextPath = value.trim();
  if (!nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.includes("\\")) {
    return fallbackPath;
  }

  const pathname = nextPath.split("?")[0]?.split("#")[0] ?? "";
  return getAccountRoleFromProfilePath(pathname) ? pathname : fallbackPath;
}

export function getAccountRoleMetadata(role: AccountRole) {
  return {
    role,
    account_role: role,
  };
}

export function getUserAccountRole(user: Pick<User, "user_metadata">): AccountRole {
  const metadata = user.user_metadata;

  return (
    normalizeAccountRole(metadata?.account_role) ??
    normalizeAccountRole(metadata?.role) ??
    DEFAULT_ACCOUNT_ROLE
  );
}
