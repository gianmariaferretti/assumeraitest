import { getUserDisplayName, requireUser } from "@/lib/auth/session";
import { getUserAccountRole } from "@/lib/auth/account-role";
import { ProfileSettingsContent } from "@/app/profile/settings/profile-settings-content";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Account settings | Assumerai",
  description: "Manage your Assumerai account identity, privacy, and sign-out state.",
};

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const accountRole = getUserAccountRole(user);

  if (accountRole === "company") {
    redirect("/company/profile/settings");
  }

  return (
    <ProfileSettingsContent
      accountRole="candidate"
      displayName={getUserDisplayName(user)}
      email={user.email ?? null}
    />
  );
}
