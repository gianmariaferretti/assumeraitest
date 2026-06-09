import { getUserDisplayName, requireUser } from "@/lib/auth/session";
import { getUserAccountRole } from "@/lib/auth/account-role";
import { ProfileContent } from "@/app/profile/profile-content";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Company profile | Assumerai",
  description: "Manage your Assumerai company workspace, hiring access, and team settings.",
};

export default async function CompanyProfilePage() {
  const user = await requireUser("/company/profile");
  const accountRole = getUserAccountRole(user);

  if (accountRole !== "company") {
    redirect("/profile");
  }

  return (
    <ProfileContent
      accountRole="company"
      accountCreatedAt={user.created_at ?? null}
      displayName={getUserDisplayName(user)}
      email={user.email ?? null}
    />
  );
}
