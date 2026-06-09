import "server-only";

import type { User } from "@supabase/supabase-js";

import { getUserAccountRole } from "@/lib/auth/account-role";
import { getUserDisplayName } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseTableClient = Pick<SupabaseServerClient, "from">;

export type CompanyMembershipRole = "owner" | "admin" | "recruiter" | "reviewer";

export type AuthenticatedCompanyRouteContext = {
  readonly mode: "authenticated";
  readonly user: User;
  readonly supabase: SupabaseServerClient;
  readonly companyId: string;
  readonly membershipRole: CompanyMembershipRole;
  readonly actorId: string;
  readonly nextPath: string;
};

export type CompanyRouteContextError = {
  readonly mode: "unauthenticated" | "forbidden" | "unavailable";
  readonly user: User | null;
  readonly supabase: SupabaseServerClient | null;
  readonly status: 401 | 403 | 503;
  readonly code:
    | "company_auth_required"
    | "company_role_required"
    | "company_workspace_unavailable";
  readonly message: string;
  readonly nextPath: string;
};

export type CompanyRouteContext =
  | AuthenticatedCompanyRouteContext
  | CompanyRouteContextError;

type CompanyMembershipRow = {
  readonly company_id?: string | null;
  readonly role?: string | null;
  readonly status?: string | null;
};

export async function resolveCompanyRouteContext(
  nextPath = "/company/dashboard"
): Promise<CompanyRouteContext> {
  let supabase: SupabaseServerClient;
  try {
    supabase = await createClient();
  } catch {
    return {
      mode: "unauthenticated",
      user: null,
      supabase: null,
      status: 401,
      code: "company_auth_required",
      message: "Sign in as a company user before continuing.",
      nextPath
    };
  }

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;

  if (!user) {
    return {
      mode: "unauthenticated",
      user: null,
      supabase,
      status: 401,
      code: "company_auth_required",
      message: "Sign in as a company user before continuing.",
      nextPath
    };
  }

  if (getUserAccountRole(user) !== "company") {
    return {
      mode: "forbidden",
      user,
      supabase,
      status: 403,
      code: "company_role_required",
      message: "Use a company account for the company dashboard.",
      nextPath
    };
  }

  const membershipResult = await supabase
    .from("company_memberships")
    .select("company_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membershipResult.error && membershipResult.data) {
    const membership = membershipResult.data as CompanyMembershipRow;
    const companyId = normalizeId(membership.company_id);
    const role = normalizeMembershipRole(membership.role);

    if (companyId && role) {
      return {
        mode: "authenticated",
        user,
        supabase,
        companyId,
        membershipRole: role,
        actorId: user.id,
        nextPath
      };
    }
  }

  const bootstrapped = await bootstrapCompanyWorkspace(supabase, user, nextPath);
  if (bootstrapped) {
    return bootstrapped;
  }

  return {
    mode: "unavailable",
    user,
    supabase,
    status: 503,
    code: "company_workspace_unavailable",
    message: "Finish company setup before continuing.",
    nextPath
  };
}

export function isCompanyContextError(
  context: CompanyRouteContext
): context is CompanyRouteContextError {
  return context.mode !== "authenticated";
}

async function bootstrapCompanyWorkspace(
  supabase: SupabaseServerClient,
  user: User,
  nextPath: string
): Promise<AuthenticatedCompanyRouteContext | null> {
  const userScopedBootstrap = await writeCompanyWorkspaceBootstrap(
    supabase,
    supabase,
    user,
    nextPath
  );
  if (userScopedBootstrap) {
    return userScopedBootstrap;
  }

  try {
    const adminClient = createAdminClient() as unknown as SupabaseTableClient;
    return await writeCompanyWorkspaceBootstrap(adminClient, supabase, user, nextPath);
  } catch {
    return null;
  }
}

async function writeCompanyWorkspaceBootstrap(
  writeClient: SupabaseTableClient,
  contextClient: SupabaseServerClient,
  user: User,
  nextPath: string
): Promise<AuthenticatedCompanyRouteContext | null> {
  const companyId = `company_${sanitizeId(user.id)}`;
  const now = new Date().toISOString();

  const workspaceResult = await writeClient.from("company_workspaces").upsert(
    {
      company_id: companyId,
      owner_user_id: user.id,
      name: `${getUserDisplayName(user)} workspace`,
      profile_payload: {
        source: "company_route_context_bootstrap",
        created_from: nextPath
      },
      updated_at: now
    },
    { onConflict: "company_id" }
  );

  if (workspaceResult.error) {
    return null;
  }

  const membershipResult = await writeClient.from("company_memberships").upsert(
    {
      company_id: companyId,
      user_id: user.id,
      role: "owner",
      status: "active",
      updated_at: now
    },
    { onConflict: "company_id,user_id" }
  );

  if (membershipResult.error) {
    return null;
  }

  return {
    mode: "authenticated",
    user,
    supabase: contextClient,
    companyId,
    membershipRole: "owner",
    actorId: user.id,
    nextPath
  };
}

function normalizeId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeMembershipRole(value: unknown): CompanyMembershipRole | null {
  if (
    value === "owner" ||
    value === "admin" ||
    value === "recruiter" ||
    value === "reviewer"
  ) {
    return value;
  }

  return null;
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
