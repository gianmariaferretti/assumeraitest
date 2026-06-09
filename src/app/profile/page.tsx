import { getUserDisplayName, requireUser } from "@/lib/auth/session";
import { getUserAccountRole } from "@/lib/auth/account-role";
import { ProfileContent } from "@/app/profile/profile-content";
import {
  isCandidateContextError,
  resolveCandidateRouteContext,
} from "@/features/candidate-persistence/supabase-candidate-context";
import { readCandidateProgress } from "@/features/candidate-persistence/supabase-candidate-store";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Profile | Assumerai",
  description: "Your Assumerai candidate profile, interview record, and visibility controls.",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const accountRole = getUserAccountRole(user);

  if (accountRole === "company") {
    redirect("/company/profile");
  }

  const candidateContext = await resolveCandidateRouteContext({
    allowLocalFallback: false,
  });
  const candidateProcessProgress = isCandidateContextError(candidateContext)
    ? undefined
    : await readCandidateProgress(candidateContext);

  return (
    <ProfileContent
      accountRole="candidate"
      accountCreatedAt={user.created_at ?? null}
      candidateProcessProgress={candidateProcessProgress}
      displayName={getUserDisplayName(user)}
      email={user.email ?? null}
    />
  );
}
