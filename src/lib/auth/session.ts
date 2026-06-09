import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

export const requireUser = cache(async (nextPath = "/profile"): Promise<User> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    if (nextPath === "/profile") {
      redirect("/login?next=/profile");
    }

    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return data.user;
});

export function getUserDisplayName(user: User) {
  const metadata = user.user_metadata;
  const metadataName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : "";

  if (metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] ?? "Assumerai user";
}
