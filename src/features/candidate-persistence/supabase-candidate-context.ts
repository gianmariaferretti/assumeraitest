import type { User } from "@supabase/supabase-js";

import { getUserAccountRole } from "@/lib/auth/account-role";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AuthenticatedCandidateContext = {
  readonly mode: "authenticated";
  readonly user: User;
  readonly supabase: SupabaseServerClient;
  readonly candidateId: string;
  readonly actorId: string;
};

export type LocalCandidateContext = {
  readonly mode: "local_fallback";
  readonly user: null;
  readonly supabase: null;
  readonly candidateId: string;
  readonly actorId: string;
  readonly reason: "unauthenticated" | "supabase_unavailable";
};

export type CandidateContextError = {
  readonly mode: "unauthenticated" | "forbidden";
  readonly user: User | null;
  readonly supabase: SupabaseServerClient | null;
  readonly status: 401 | 403;
  readonly code: "candidate_auth_required" | "candidate_role_required";
  readonly message: string;
};

export type CandidateRouteContext =
  | AuthenticatedCandidateContext
  | LocalCandidateContext
  | CandidateContextError;

export type ResolveCandidateRouteContextOptions = {
  readonly fallbackCandidateId?: string | null;
  readonly allowLocalFallback?: boolean;
};

export async function resolveCandidateRouteContext(
  options: ResolveCandidateRouteContextOptions = {}
): Promise<CandidateRouteContext> {
  const allowLocalFallback = options.allowLocalFallback ?? true;
  const fallbackCandidateId = normalizeCandidateId(options.fallbackCandidateId);

  let supabase: SupabaseServerClient;
  try {
    supabase = await createClient();
  } catch {
    if (allowLocalFallback && shouldAllowLocalCandidateFallback()) {
      return createLocalCandidateContext(fallbackCandidateId, "supabase_unavailable");
    }

    return {
      mode: "unauthenticated",
      user: null,
      supabase: null,
      status: 401,
      code: "candidate_auth_required",
      message: "Sign in as a candidate before continuing."
    };
  }

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;

  if (!user) {
    if (allowLocalFallback && shouldAllowLocalCandidateFallback()) {
      return createLocalCandidateContext(fallbackCandidateId, "unauthenticated");
    }

    return {
      mode: "unauthenticated",
      user: null,
      supabase,
      status: 401,
      code: "candidate_auth_required",
      message: "Sign in as a candidate before continuing."
    };
  }

  if (getUserAccountRole(user) !== "candidate") {
    return {
      mode: "forbidden",
      user,
      supabase,
      status: 403,
      code: "candidate_role_required",
      message: "Use a candidate account for the candidate interview workspace."
    };
  }

  return {
    mode: "authenticated",
    user,
    supabase,
    candidateId: user.id,
    actorId: user.id
  };
}

export function isAuthenticatedCandidateContext(
  context: CandidateRouteContext
): context is AuthenticatedCandidateContext {
  return context.mode === "authenticated";
}

export function isCandidateContextError(
  context: CandidateRouteContext
): context is CandidateContextError {
  return context.mode === "unauthenticated" || context.mode === "forbidden";
}

export function shouldAllowLocalCandidateFallback(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ASSUMERAI_ALLOW_LOCAL_CANDIDATE_FALLBACK === "true"
  );
}

function createLocalCandidateContext(
  fallbackCandidateId: string,
  reason: LocalCandidateContext["reason"]
): LocalCandidateContext {
  return {
    mode: "local_fallback",
    user: null,
    supabase: null,
    candidateId: fallbackCandidateId,
    actorId: fallbackCandidateId,
    reason
  };
}

function normalizeCandidateId(value: string | null | undefined): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : "local_candidate";
}
