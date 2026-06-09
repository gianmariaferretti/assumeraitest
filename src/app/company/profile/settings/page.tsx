import { getUserDisplayName, requireUser } from "@/lib/auth/session";
import { getUserAccountRole } from "@/lib/auth/account-role";
import { ProfileSettingsContent } from "@/app/profile/settings/profile-settings-content";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Company settings | Assumerai",
  description: "Manage your Assumerai company identity, team access, and sign-out state.",
};

export default async function CompanyProfileSettingsPage() {
  const user = await requireUser("/company/profile/settings");
  const accountRole = getUserAccountRole(user);

  if (accountRole !== "company") {
    redirect("/profile/settings");
  }

  return (
    <ProfileSettingsContent
      accountRole="company"
      displayName={getUserDisplayName(user)}
      email={user.email ?? null}
    />
  );
}
