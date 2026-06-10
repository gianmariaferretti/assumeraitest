import "server-only";

import type { AuthenticatedCandidateContext, CandidateRouteContext } from "@/features/candidate-persistence/supabase-candidate-context";
import { isAuthenticatedCandidateContext } from "@/features/candidate-persistence/supabase-candidate-context";
import {
  DEFAULT_MATCH_SHARING_CATEGORIES,
  EXCLUDED_MATCH_SHARING_CATEGORIES
} from "@/features/matching/candidate-match-consent";
import {
  createCompanyMatch,
  type CandidateProfile,
  type CompanyProfile,
  type RoleProfile
} from "@/features/matching/matching-engine";
import { findProtectedRequirementSignals } from "@/features/roles/protected-attributes";
import { computeVerdictDueAt } from "@/features/matching/match-sla";
import {
  candidateMatchNotificationEmail,
  candidateVerdictNotificationEmail,
  resolveEmailProvider,
  resolveEmailTemplateLanguage,
  type MatchVerdict
} from "@/lib/email";
import { logWarn } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

import type { AuthenticatedCompanyRouteContext } from "./company-route-context";

type SupabaseWriteClient = AuthenticatedCandidateContext["supabase"];

export type CompanyMatchStatus =
  | "candidate_visible"
  | "candidate_accepted"
  | "candidate_declined"
  | "company_advanced"
  | "company_hold"
  | "company_declined"
  | "closed";

export type CompanyMatchDecisionAction = "advance" | "hold" | "decline";
export type CompanyRoleLifecycleAction = "edit" | "pause" | "close" | "activate";

export type CompanyOnboardingIntake = {
  readonly company_name?: string;
  readonly website?: string;
  readonly domain?: string;
  readonly hiring_locations?: readonly string[];
  readonly team_size?: string;
  readonly primary_contact_name?: string;
  readonly primary_contact_email?: string;
};

export type CompanyRoleIntake = {
  readonly title?: string;
  readonly location_constraints?: readonly string[];
  readonly work_modes?: readonly string[];
  readonly requirements?: {
    readonly required_skills?: readonly string[];
    readonly nice_to_have_skills?: readonly string[];
    readonly hard_gates?: readonly CompanyRoleHardGate[];
  };
  readonly daily_work_reality?: {
    readonly client_facing_percentage?: number;
    readonly meeting_load?: "low" | "medium" | "high";
    readonly travel_required?: "none" | "occasional" | "frequent";
    readonly solo_vs_team_work?: "mostly_solo" | "mixed" | "mostly_team";
    readonly ambiguity_level?: "low" | "medium" | "high";
    readonly delivery_pace?: "steady" | "fast" | "variable";
  };
  readonly calibration?: {
    readonly score_bars?: Record<string, number>;
    readonly required_evidence?: readonly string[];
    readonly interview_modules?: readonly string[];
  };
};

type CompanyRoleHardGate = {
  readonly gate_type?: string;
  readonly description?: string;
  readonly lawful_basis_note?: string;
  readonly role_essential?: boolean;
};

export type CompanyWorkspaceIssue = {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
};

export type CompanyRoleValidationResult =
  | {
      readonly ok: true;
      readonly value: Required<CompanyRoleIntake>;
    }
  | {
      readonly ok: false;
      readonly issues: readonly CompanyWorkspaceIssue[];
    };

export type CompanyDashboardRole = {
  readonly roleId: string;
  readonly title: string;
  readonly status: string;
  readonly locationConstraints: readonly string[];
  readonly workModes: readonly string[];
  readonly openMatchCount: number;
  readonly overdueMatchCount: number;
  readonly dailyWorkReality: Record<string, unknown>;
};

export type CompanyDashboardMatch = {
  readonly matchId: string;
  readonly roleId: string;
  readonly roleTitle: string;
  readonly companyId: string;
  readonly companyName: string;
  readonly candidateUserId: string;
  readonly candidateName: string;
  readonly candidateHeadline: string;
  readonly status: CompanyMatchStatus;
  readonly matchScore: number;
  readonly matchConfidence: number;
  readonly reviewDueAt: string | null;
  readonly isOverdue: boolean;
  readonly contactVisibility: "hidden_until_advance" | "visible_after_advance";
  readonly scorecard: Record<string, unknown>;
  readonly matchExplanation: Record<string, unknown>;
  readonly transcriptExcerpt: string;
  readonly transcriptText: string;
  readonly companyDecisionReason: string | null;
  readonly companyNextStep: string | null;
  readonly companyFollowUpAt: string | null;
  readonly raw_cv_included: false;
  readonly raw_interview_media_included: false;
};

export type CompanyDashboardData = {
  readonly companyId: string;
  readonly companyName: string;
  readonly roles: readonly CompanyDashboardRole[];
  readonly matches: readonly CompanyDashboardMatch[];
  readonly metrics: {
    readonly activeRoles: number;
    readonly acceptedCandidates: number;
    readonly overdueReviews: number;
    readonly unresolvedHolds: number;
  };
};

export type CompanyWorkspaceProfile = {
  readonly companyId: string;
  readonly companyName: string;
  readonly website: string | null;
  readonly domain: string | null;
  readonly hiringLocations: readonly string[];
  readonly teamSize: string | null;
  readonly primaryContactName: string | null;
  readonly primaryContactEmail: string | null;
  readonly onboardingCompleted: boolean;
  readonly onboardingCompletedAt: string | null;
  readonly profilePayload: Record<string, unknown>;
};

export type CandidateMatchFeedback = {
  readonly matchId: string;
  readonly status: "company_advanced" | "company_hold" | "company_declined";
  readonly reason: string;
  readonly nextStep?: string;
  readonly followUpAt?: string;
  readonly decidedAt?: string;
  readonly companyName?: string;
  readonly roleTitle?: string;
};

type PersistCandidateMatchAcceptanceInput = {
  readonly matchId: string;
  readonly companyId: string;
  readonly roleId: string;
  readonly roleTitle?: string;
  readonly companyName?: string;
  readonly decision: "accepted" | "declined";
  readonly decidedAt: string;
  readonly consentRecordId: string | null;
  readonly sharingSnapshotId: string | null;
  readonly auditEventId: string;
  readonly matchScore?: number;
  readonly confidence?: number;
  readonly reasons?: readonly string[];
  readonly evidence?: readonly string[];
  readonly gaps?: readonly string[];
  readonly transcriptExcerpt?: string;
  readonly transcriptText?: string;
  readonly raw_cv_included?: false;
  readonly raw_interview_media_included?: false;
};

type CompanyMatchDecisionInput = {
  readonly action: CompanyMatchDecisionAction;
  readonly matchId: string;
  readonly companyId: string;
  readonly roleId: string;
  readonly reviewerUserId: string;
  readonly decidedAt?: string;
  readonly reason?: string;
  readonly nextStep?: string;
  readonly followUpAt?: string;
  readonly currentStatus?: CompanyMatchStatus;
  readonly reviewDueAt?: string | null;
};

type CompanyWorkspaceProfileUpdateInput = CompanyOnboardingIntake & {
  readonly completedAt?: string;
  readonly profilePayload?: Record<string, unknown>;
};

type CompanyRoleLifecycleInput = {
  readonly roleId: string;
  readonly action: CompanyRoleLifecycleAction;
  readonly reason?: string;
  readonly now?: string;
  readonly currentStatus?: string;
  readonly intake?: CompanyRoleIntake;
};

export function validateCompanyOnboardingIntake(input: unknown):
  | {
      readonly ok: true;
      readonly value: Required<CompanyOnboardingIntake>;
    }
  | {
      readonly ok: false;
      readonly issues: readonly CompanyWorkspaceIssue[];
    } {
  const issues: CompanyWorkspaceIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          code: "company_onboarding.invalid_payload",
          message: "Company onboarding must be a structured object."
        }
      ]
    };
  }

  const companyName = readString(input.company_name);
  const website = normalizeWebsite(input.website);
  const domain = normalizeDomain(input.domain ?? website);
  const hiringLocations = readStringArray(input.hiring_locations);
  const teamSize = readString(input.team_size);
  const primaryContactName = readString(input.primary_contact_name);
  const primaryContactEmail = readString(input.primary_contact_email);

  if (!companyName) {
    issues.push({
      code: "company_onboarding.company_name_required",
      field: "company_name",
      message: "Add the legal or operating company name."
    });
  }

  if (!website || !domain) {
    issues.push({
      code: "company_onboarding.website_required",
      field: "website",
      message: "Add a valid company website or domain."
    });
  }

  if (hiringLocations.length === 0) {
    issues.push({
      code: "company_onboarding.hiring_locations_required",
      field: "hiring_locations",
      message: "Add at least one hiring location or time-zone."
    });
  }

  if (!teamSize) {
    issues.push({
      code: "company_onboarding.team_size_required",
      field: "team_size",
      message: "Choose the company team size."
    });
  }

  if (!primaryContactName || !primaryContactEmail) {
    issues.push({
      code: "company_onboarding.primary_contact_required",
      field: "primary_contact",
      message: "Add the primary hiring contact."
    });
  }

  if (primaryContactEmail && !isEmail(primaryContactEmail)) {
    issues.push({
      code: "company_onboarding.invalid_contact_email",
      field: "primary_contact_email",
      message: "Use a valid primary hiring contact email."
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      company_name: companyName ?? "",
      website: website ?? "",
      domain: domain ?? "",
      hiring_locations: hiringLocations,
      team_size: teamSize ?? "",
      primary_contact_name: primaryContactName ?? "",
      primary_contact_email: primaryContactEmail ?? ""
    }
  };
}

export function validateCompanyRoleIntake(
  input: unknown
): CompanyRoleValidationResult {
  const issues: CompanyWorkspaceIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          code: "company_role.invalid_payload",
          message: "Role intake must be a structured object."
        }
      ]
    };
  }

  const role = input as CompanyRoleIntake;
  const title = readString(role.title);
  const locationConstraints = readStringArray(role.location_constraints);
  const workModes = readStringArray(role.work_modes);
  const requirements = isRecord(role.requirements) ? role.requirements : {};
  const daily_work_reality = isRecord(role.daily_work_reality)
    ? role.daily_work_reality
    : {};
  const calibration = isRecord(role.calibration) ? role.calibration : {};
  const client_facing_percentage = readNumber(
    daily_work_reality.client_facing_percentage
  );
  const meeting_load = readEnum(daily_work_reality.meeting_load, [
    "low",
    "medium",
    "high"
  ]);
  const delivery_pace = readEnum(daily_work_reality.delivery_pace, [
    "steady",
    "fast",
    "variable"
  ]);

  if (!title) {
    issues.push({
      code: "company_role.title_required",
      field: "title",
      message: "Add the role title."
    });
  }

  if (locationConstraints.length === 0) {
    issues.push({
      code: "company_role.location_required",
      field: "location_constraints",
      message: "Add at least one location or time-zone constraint."
    });
  }

  if (workModes.length === 0) {
    issues.push({
      code: "company_role.work_mode_required",
      field: "work_modes",
      message: "Add at least one work mode."
    });
  }

  if (readStringArray(requirements.required_skills).length === 0) {
    issues.push({
      code: "company_role.required_skills_required",
      field: "requirements.required_skills",
      message: "Add at least one role-essential skill."
    });
  }

  if (typeof client_facing_percentage !== "number") {
    issues.push({
      code: "company_role.daily_work_reality_required",
      field: "daily_work_reality.client_facing_percentage",
      message: "Add the expected client-facing percentage."
    });
  }

  if (!meeting_load) {
    issues.push({
      code: "company_role.daily_work_reality_required",
      field: "daily_work_reality.meeting_load",
      message: "Choose the normal meeting load."
    });
  }

  if (!delivery_pace) {
    issues.push({
      code: "company_role.daily_work_reality_required",
      field: "daily_work_reality.delivery_pace",
      message: "Choose the delivery pace."
    });
  }

  for (const signal of findProtectedRequirementSignals(
    collectRoleTextForPolicyScan(role).join("\n")
  )) {
    issues.push({
      code: "company_role.protected_attribute",
      message: `Remove protected or proxy requirement signal: ${signal.signal}.`
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      title: title ?? "",
      location_constraints: locationConstraints,
      work_modes: workModes,
      requirements: {
        required_skills: readStringArray(requirements.required_skills),
        nice_to_have_skills: readStringArray(requirements.nice_to_have_skills),
        hard_gates: readHardGates(requirements.hard_gates)
      },
      daily_work_reality: {
        client_facing_percentage: client_facing_percentage ?? 0,
        meeting_load: meeting_load ?? "medium",
        travel_required:
          readEnum(daily_work_reality.travel_required, [
            "none",
            "occasional",
            "frequent"
          ]) ?? "none",
        solo_vs_team_work:
          readEnum(daily_work_reality.solo_vs_team_work, [
            "mostly_solo",
            "mixed",
            "mostly_team"
          ]) ?? "mixed",
        ambiguity_level:
          readEnum(daily_work_reality.ambiguity_level, [
            "low",
            "medium",
            "high"
          ]) ?? "medium",
        delivery_pace: delivery_pace ?? "steady"
      },
      calibration: {
        score_bars: isRecord(calibration.score_bars)
          ? normalizeScoreBars(calibration.score_bars)
          : {},
        required_evidence: readStringArray(calibration.required_evidence),
        interview_modules: readStringArray(calibration.interview_modules)
      }
    }
  };
}

export function recordCompanyMatchDecision(input: CompanyMatchDecisionInput):
  | {
      readonly ok: true;
      readonly value: {
        readonly status:
          | "company_advanced"
          | "company_hold"
          | "company_declined";
        readonly decision: CompanyMatchDecisionAction;
        readonly reason: string;
        readonly nextStep: string | null;
        readonly followUpAt: string | null;
        readonly decidedAt: string;
        readonly contactVisibility:
          | "hidden_until_advance"
          | "visible_after_advance";
        readonly auditEvent: Record<string, unknown>;
        readonly decisionRecord: Record<string, unknown>;
      };
    }
  | {
      readonly ok: false;
      readonly issues: readonly CompanyWorkspaceIssue[];
    } {
  const issues: CompanyWorkspaceIssue[] = [];
  const decidedAt = input.decidedAt ?? new Date().toISOString();
  const reason = readString(input.reason);
  const nextStep = readString(input.nextStep);
  const followUpAt = readString(input.followUpAt);

  if (input.currentStatus === "closed") {
    issues.push({
      code: "company_decision.closed_match",
      message: "Closed matches cannot receive new company decisions."
    });
  }

  if (input.action === "advance" && !nextStep) {
    issues.push({
      code: "company_decision.next_step_required",
      field: "nextStep",
      message: "Advancing a candidate requires a next step."
    });
  }

  if (input.action === "hold") {
    if (!reason) {
      issues.push({
        code: "company_decision.reason_required",
        field: "reason",
        message: "Holding a candidate requires a reason."
      });
    }

    if (!followUpAt) {
      issues.push({
        code: "company_decision.follow_up_required",
        field: "followUpAt",
        message: "Holding a candidate requires a follow-up date."
      });
    }
  }

  if (input.action === "decline" && !reason) {
    issues.push({
      code: "company_decision.reason_required",
      field: "reason",
      message: "Declining a candidate requires a candidate-visible reason."
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const statusByAction = {
    advance: "company_advanced",
    hold: "company_hold",
    decline: "company_declined"
  } as const;
  const visibilityByAction = {
    advance: { contactVisibility: "visible_after_advance" },
    hold: { contactVisibility: "hidden_until_advance" },
    decline: { contactVisibility: "hidden_until_advance" }
  } as const;
  const status = statusByAction[input.action];
  const auditEventId = `audit_company_decision_${sanitizeId(input.matchId)}_${sanitizeId(decidedAt)}`;
  const resolvedReason =
    reason ??
    (input.action === "advance"
      ? "Candidate advanced to the next human review step."
      : "");
  const contactVisibility =
    visibilityByAction[input.action].contactVisibility;
  const auditEvent = {
    audit_event_id: auditEventId,
    event_type: "company_match.decision_recorded",
    actor_type: "company_member",
    actor_user_id: input.reviewerUserId,
    occurred_at: decidedAt,
    target_type: "company_candidate_match",
    target_id: input.matchId,
    company_id: input.companyId,
    role_id: input.roleId,
    decision: input.action,
    decision_status: status,
    reason: resolvedReason,
    nextStep: nextStep ?? null,
    followUpAt: followUpAt ?? null,
    reviewDueAt: input.reviewDueAt ?? null,
    recommendation_only: true,
    requires_meaningful_human_review: true
  };
  const decisionRecord = {
    match_id: input.matchId,
    company_id: input.companyId,
    role_id: input.roleId,
    reviewer_user_id: input.reviewerUserId,
    decision: input.action,
    reason: resolvedReason,
    next_step: nextStep ?? null,
    follow_up_at: followUpAt ?? null,
    audit_event_id: auditEventId
  };

  return {
    ok: true,
    value: {
      status,
      decision: input.action,
      reason: resolvedReason,
      nextStep: nextStep ?? null,
      followUpAt: followUpAt ?? null,
      decidedAt,
      contactVisibility,
      auditEvent,
      decisionRecord
    }
  };
}

export async function updateCompanyWorkspaceProfile(
  context: AuthenticatedCompanyRouteContext,
  input: CompanyWorkspaceProfileUpdateInput
) {
  const validation = validateCompanyOnboardingIntake(input);
  if (!validation.ok) {
    return validation;
  }

  const now = input.completedAt ?? new Date().toISOString();
  const auditEventId = `audit_company_profile_${sanitizeId(context.companyId)}_${sanitizeId(now)}`;
  const profilePayload = toJson({
    ...(input.profilePayload ?? {}),
    onboarding_source: "company_workspace_profile",
    recommendation_only: true
  });
  const updatePayload = {
    name: validation.value.company_name,
    website: validation.value.website,
    domain: validation.value.domain,
    hiring_locations: validation.value.hiring_locations,
    team_size: validation.value.team_size,
    primary_contact_name: validation.value.primary_contact_name,
    primary_contact_email: validation.value.primary_contact_email,
    onboarding_completed_at: now,
    profile_payload: profilePayload,
    updated_at: now
  };
  const auditEvent = {
    company_id: context.companyId,
    actor_user_id: context.actorId,
    audit_event_id: auditEventId,
    event_type: "company_workspace.profile_updated",
    target_type: "company_workspace",
    target_id: context.companyId,
    payload: toJson({
      changed_fields: Object.keys(updatePayload).filter(
        (field) => field !== "updated_at"
      ),
      onboarding_completed_at: now,
      recommendation_only: true
    })
  };

  return runSupabaseWrite(async () => {
    await requireWrite(
      context.supabase
        .from("company_workspaces")
        .update(updatePayload)
        .eq("company_id", context.companyId)
    );
    await requireWrite(context.supabase.from("company_audit_events").insert(auditEvent));
  });
}

export async function readCompanyWorkspaceProfile(
  context: AuthenticatedCompanyRouteContext
): Promise<CompanyWorkspaceProfile | null> {
  const result = await context.supabase
    .from("company_workspaces")
    .select(
      "company_id,name,website,domain,hiring_locations,team_size,primary_contact_name,primary_contact_email,onboarding_completed_at,profile_payload"
    )
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (result.error || !result.data) {
    return null;
  }

  const row = result.data as Record<string, unknown>;
  const onboardingCompletedAt = readString(row.onboarding_completed_at) ?? null;

  return {
    companyId: readString(row.company_id) ?? context.companyId,
    companyName: readString(row.name) ?? "Company workspace",
    website: readString(row.website) ?? null,
    domain: readString(row.domain) ?? null,
    hiringLocations: readStringArray(row.hiring_locations),
    teamSize: readString(row.team_size) ?? null,
    primaryContactName: readString(row.primary_contact_name) ?? null,
    primaryContactEmail: readString(row.primary_contact_email) ?? null,
    onboardingCompleted: Boolean(onboardingCompletedAt),
    onboardingCompletedAt,
    profilePayload: isRecord(row.profile_payload) ? row.profile_payload : {}
  };
}

export async function updateCompanyRoleIntake(
  context: AuthenticatedCompanyRouteContext,
  roleId: string,
  intake: CompanyRoleIntake,
  now = new Date().toISOString()
) {
  const validation = validateCompanyRoleIntake(intake);
  if (!validation.ok) {
    return validation;
  }

  const auditEventId = `audit_company_role_intake_${sanitizeId(roleId)}_${sanitizeId(now)}`;
  const auditEvent = {
    company_id: context.companyId,
    actor_user_id: context.actorId,
    audit_event_id: auditEventId,
    event_type: "company_role.intake_updated",
    target_type: "company_role",
    target_id: roleId,
    payload: toJson({
      role_id: roleId,
      recommendation_only: true,
      requires_meaningful_human_review: true
    })
  };

  return runSupabaseWrite(async () => {
    await requireWrite(
      context.supabase
        .from("company_roles")
        .update({
          title: validation.value.title,
          location_constraints: validation.value.location_constraints,
          work_modes: validation.value.work_modes,
          requirements: toJson(validation.value.requirements),
          daily_work_reality: toJson(validation.value.daily_work_reality),
          calibration: toJson(validation.value.calibration),
          updated_at: now
        })
        .eq("company_id", context.companyId)
        .eq("role_id", roleId)
    );
    await requireWrite(context.supabase.from("company_audit_events").insert(auditEvent));
  });
}

export async function updateCompanyRoleLifecycle(
  context: AuthenticatedCompanyRouteContext,
  input: CompanyRoleLifecycleInput
) {
  const issues: CompanyWorkspaceIssue[] = [];
  const now = input.now ?? new Date().toISOString();

  if (input.action === "edit") {
    if (input.currentStatus === "closed") {
      return {
        ok: false,
        issues: [
          {
            code: "company_role_lifecycle.closed_role_edit_denied",
            field: "status",
            message: "Closed roles must be reopened before editing."
          }
        ]
      };
    }

    if (!input.intake) {
      return {
        ok: false,
        issues: [
          {
            code: "company_role_lifecycle.intake_required",
            field: "intake",
            message: "Editing a role requires role intake."
          }
        ]
      };
    }

    return updateCompanyRoleIntake(context, input.roleId, input.intake, now);
  }

  if (input.action === "close" && !readString(input.reason)) {
    issues.push({
      code: "company_role_lifecycle.close_reason_required",
      field: "reason",
      message: "Closing a role requires a company-visible reason."
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const lifecyclePatch = buildRoleLifecyclePatch(input.action, input.reason, now);
  const auditEventId = `audit_company_role_lifecycle_${sanitizeId(input.roleId)}_${sanitizeId(now)}`;
  const auditEvent = {
    company_id: context.companyId,
    actor_user_id: context.actorId,
    audit_event_id: auditEventId,
    event_type: "company_role.lifecycle_updated",
    target_type: "company_role",
    target_id: input.roleId,
    payload: toJson({
      role_id: input.roleId,
      action: input.action,
      reason: readString(input.reason) ?? null,
      recommendation_only: true,
      no_hidden_automated_rejection: true
    })
  };

  return runSupabaseWrite(async () => {
    await requireWrite(
      context.supabase
        .from("company_roles")
        .update(lifecyclePatch)
        .eq("company_id", context.companyId)
        .eq("role_id", input.roleId)
    );
    await requireWrite(context.supabase.from("company_audit_events").insert(auditEvent));
  });
}

export async function materializeCandidateMatchesForCandidate(
  context: CandidateRouteContext
): Promise<readonly CompanyDashboardMatch[]> {
  if (!isAuthenticatedCandidateContext(context)) {
    return [];
  }

  const [profileResult, progressResult, existing] = await Promise.all([
    context.supabase
      .from("candidate_profiles")
      .select("profile_json,profile_status,confirmed_at")
      .eq("user_id", context.user.id)
      .maybeSingle(),
    context.supabase
      .from("candidate_interview_progress")
      .select("interview_completed_at")
      .eq("user_id", context.user.id)
      .maybeSingle(),
    context.supabase
    .from("company_candidate_matches")
    .select("*")
    .eq("candidate_user_id", context.user.id)
      .order("updated_at", { ascending: false })
  ]);

  if (existing.error) {
    return [];
  }

  const existingRows = asRows(existing.data);
  const existingByMatchId = new Map(
    existingRows.map((row) => [readString(row.match_id) ?? "", row])
  );
  const candidateProfileRow = profileResult.error
    ? null
    : (profileResult.data as Record<string, unknown> | null);
  const candidateProfileJson = isRecord(candidateProfileRow?.profile_json)
    ? candidateProfileRow.profile_json
    : {};
  const profileConfirmed =
    Boolean(candidateProfileRow?.confirmed_at) ||
    readString(candidateProfileRow?.profile_status) === "confirmed";
  const progressRow = progressResult.error
    ? null
    : (progressResult.data as Record<string, unknown> | null);
  const interviewComplete = Boolean(progressRow?.interview_completed_at);

  if (profileConfirmed && interviewComplete) {
    let adminClient: SupabaseWriteClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return existingRows
        .filter((row) =>
          [
            "candidate_visible",
            "candidate_accepted",
            "company_advanced",
            "company_hold",
            "company_declined"
          ].includes(readString(row.status) ?? "")
        )
        .map(mapCompanyMatchRow);
    }

    const [rolesResult, workspacesResult] = await Promise.all([
      adminClient
        .from("company_roles")
        .select("*")
        .eq("status", "active"),
      adminClient
        .from("company_workspaces")
        .select("company_id,name,domain,hiring_locations,team_size,profile_payload")
    ]);

    if (!rolesResult.error) {
      const workspaceByCompanyId = new Map(
        asRows(workspacesResult.error ? [] : workspacesResult.data).map((row) => [
          readString(row.company_id) ?? "",
          row
        ])
      );
      const candidate = buildMatchingCandidateProfile(context.user.id, candidateProfileJson);
      const upserts = asRows(rolesResult.data)
        .map((roleRow) =>
          buildCandidateVisibleMatchUpsert({
            candidate,
            roleRow,
            workspaceRow:
              workspaceByCompanyId.get(readString(roleRow.company_id) ?? "") ?? {},
            existingRow: existingByMatchId.get(
              `match_${sanitizeId(context.user.id)}_${sanitizeId(readString(roleRow.role_id) ?? "")}`
            )
          })
        )
        .filter((row): row is Record<string, unknown> => Boolean(row));

      if (upserts.length > 0) {
        await adminClient
          .from("company_candidate_matches")
          .upsert(upserts, { onConflict: "match_id" });
      }
    }
  }

  const refreshed = await context.supabase
    .from("company_candidate_matches")
    .select("*")
    .eq("candidate_user_id", context.user.id)
    .order("updated_at", { ascending: false });
  const rows = asRows(refreshed.error ? existingRows : refreshed.data).filter((row) =>
    ["candidate_visible", "candidate_accepted", "company_advanced", "company_hold", "company_declined"].includes(
      readString(row.status) ?? ""
    )
  );

  return rows.map(mapCompanyMatchRow);
}

export async function persistCandidateMatchAcceptance(
  context: CandidateRouteContext,
  input: PersistCandidateMatchAcceptanceInput
) {
  if (!isAuthenticatedCandidateContext(context)) {
    return {
      status:
        context.mode === "local_fallback" ? "local_fallback" : "supabase_unavailable"
    };
  }

  let adminClient: SupabaseWriteClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return {
      status: "supabase_unavailable" as const,
      detail:
        error instanceof Error
          ? error.message
          : "Supabase service role credentials are not configured."
    };
  }

  const existingMatch = await adminClient
    .from("company_candidate_matches")
    .select("match_id,status")
    .eq("candidate_user_id", context.user.id)
    .eq("match_id", input.matchId)
    .eq("company_id", input.companyId)
    .eq("role_id", input.roleId)
    .maybeSingle();

  if (existingMatch.error) {
    return {
      status: "supabase_unavailable" as const,
      detail: existingMatch.error.message
    };
  }

  const existingStatus = readString(
    (existingMatch.data as Record<string, unknown> | null)?.status
  );
  if (existingStatus !== "candidate_visible") {
    return {
      status: "candidate_match_not_visible" as const,
      detail:
        "Candidate match decisions require a server-materialized candidate-visible match."
    };
  }

  return runSupabaseWrite(async () => {
    if (input.decision === "accepted") {
      await persistActiveSharingSnapshot(adminClient, context, input);
    }

    const reviewDueAt =
      input.decision === "accepted"
        ? addDays(input.decidedAt, 14).toISOString()
        : null;
    const status: CompanyMatchStatus =
      input.decision === "accepted" ? "candidate_accepted" : "candidate_declined";
    const profilePayload = await readCandidateSharedProfile(context, input);
    const scorecardPayload = buildScorecardPayload(input);
    const evidencePayload = buildEvidencePayload(input);
    const transcriptPayload = buildTranscriptPayload(input);

    await requireWrite(
      adminClient
        .from("company_candidate_matches")
        .update({
          status,
          candidate_decision: input.decision,
          candidate_decided_at: input.decidedAt,
          consent_record_id: input.consentRecordId,
          sharing_snapshot_id: input.sharingSnapshotId,
          match_score: input.matchScore ?? 0,
          match_confidence: input.confidence ?? 0,
          human_review_required: true,
          recommendation_only: true,
          review_due_at: reviewDueAt,
          contact_visibility: "hidden_until_advance",
          shared_profile_payload: toJson(profilePayload),
          scorecard_payload: toJson(scorecardPayload),
          evidence_payload: toJson(evidencePayload),
          transcript_payload: toJson(transcriptPayload),
          audit_payload: toJson({
            audit_event_id: input.auditEventId,
            active_candidate_consent: input.decision === "accepted",
            candidate_sharing_snapshots: input.sharingSnapshotId,
            company_candidate_matches: input.matchId,
            raw_cv_included: false,
            raw_interview_media_included: false
          }),
          updated_at: input.decidedAt
        })
        .eq("candidate_user_id", context.user.id)
        .eq("match_id", input.matchId)
        .eq("company_id", input.companyId)
        .eq("role_id", input.roleId)
        .eq("status", "candidate_visible")
    );

    // Acceptance starts the employer-review clock: open the 14-day verdict
    // SLA and tell the candidate when a verdict is due.
    if (input.decision === "accepted" && reviewDueAt) {
      await requireWrite(
        adminClient.from("match_sla").upsert(
          {
            match_id: input.matchId,
            company_id: input.companyId,
            role_id: input.roleId,
            candidate_user_id: context.user.id,
            entered_review_at: input.decidedAt,
            verdict_due_at: computeVerdictDueAt(input.decidedAt),
            updated_at: input.decidedAt
          },
          { onConflict: "match_id", ignoreDuplicates: true }
        )
      );

      await sendCandidateMatchNotification(context, {
        companyName: input.companyName ?? input.companyId,
        roleTitle: input.roleTitle ?? input.roleId,
        verdictDueAt: reviewDueAt
      });
    }
  });
}

/** Non-fatal: a notification failure never blocks the candidate's decision. */
async function sendCandidateMatchNotification(
  context: AuthenticatedCandidateContext,
  input: {
    readonly companyName: string;
    readonly roleTitle: string;
    readonly verdictDueAt: string;
  }
): Promise<void> {
  try {
    const candidateEmail = context.user.email;
    if (!candidateEmail) {
      return;
    }

    const progressResult = await context.supabase
      .from("candidate_interview_progress")
      .select("interview_language")
      .eq("user_id", context.user.id)
      .maybeSingle();
    const language = resolveEmailTemplateLanguage(
      (progressResult.data as Record<string, unknown> | null)?.interview_language
    );

    const rendered = candidateMatchNotificationEmail({
      language,
      companyName: input.companyName,
      roleTitle: input.roleTitle,
      verdictDueAt: input.verdictDueAt
    });
    const sent = await resolveEmailProvider().send({
      to: candidateEmail,
      subject: rendered.subject,
      text: rendered.text
    });
    if (!sent.ok) {
      logWarn("candidate_match_notification_failed", { detail: sent.error });
    }
  } catch (error) {
    logWarn("candidate_match_notification_failed", {
      detail: error instanceof Error ? error.message : "unknown_error"
    });
  }
}

/**
 * Stamp the SLA verdict and notify the candidate after a company decision.
 * Called by the company review decision route; every failure is non-fatal and
 * logged, so a notification problem never blocks the recorded verdict.
 */
export async function recordMatchVerdictAndNotify(input: {
  readonly matchId: string;
  readonly action: CompanyMatchDecisionAction;
  readonly decidedAt: string;
}): Promise<void> {
  let adminClient: SupabaseWriteClient;
  try {
    adminClient = createAdminClient();
  } catch {
    logWarn("match_verdict_sla_skipped", {
      matchId: input.matchId,
      detail: "Service role is not configured."
    });
    return;
  }

  try {
    await adminClient
      .from("match_sla")
      .update({ verdict_at: input.decidedAt, updated_at: input.decidedAt })
      .eq("match_id", input.matchId);

    const matchResult = await adminClient
      .from("company_candidate_matches")
      .select("candidate_user_id,shared_profile_payload")
      .eq("match_id", input.matchId)
      .maybeSingle();
    const matchRow = matchResult.error
      ? null
      : (matchResult.data as Record<string, unknown> | null);
    const candidateUserId = readString(matchRow?.candidate_user_id);
    if (!candidateUserId) {
      return;
    }

    const profilePayload = isRecord(matchRow?.shared_profile_payload)
      ? matchRow.shared_profile_payload
      : {};
    const [userResult, progressResult] = await Promise.all([
      adminClient.auth.admin.getUserById(candidateUserId),
      adminClient
        .from("candidate_interview_progress")
        .select("interview_language")
        .eq("user_id", candidateUserId)
        .maybeSingle()
    ]);
    const candidateEmail = userResult.error ? null : userResult.data.user?.email;
    if (!candidateEmail) {
      return;
    }

    const verdictByAction: Record<CompanyMatchDecisionAction, MatchVerdict> = {
      advance: "advanced",
      hold: "hold",
      decline: "declined"
    };
    const rendered = candidateVerdictNotificationEmail({
      language: resolveEmailTemplateLanguage(
        (progressResult.data as Record<string, unknown> | null)?.interview_language
      ),
      verdict: verdictByAction[input.action],
      companyName: readString(profilePayload.companyName) ?? "the company",
      roleTitle: readString(profilePayload.roleTitle) ?? "the role"
    });
    const sent = await resolveEmailProvider().send({
      to: candidateEmail,
      subject: rendered.subject,
      text: rendered.text
    });
    if (!sent.ok) {
      logWarn("candidate_verdict_notification_failed", {
        matchId: input.matchId,
        detail: sent.error
      });
    }
  } catch (error) {
    logWarn("match_verdict_sla_failed", {
      matchId: input.matchId,
      detail: error instanceof Error ? error.message : "unknown_error"
    });
  }
}

export async function readCompanyDashboard(
  context: AuthenticatedCompanyRouteContext
): Promise<CompanyDashboardData> {
  const [workspaceResult, rolesResult, matchesResult] = await Promise.all([
    context.supabase
      .from("company_workspaces")
      .select("company_id,name")
      .eq("company_id", context.companyId)
      .maybeSingle(),
    context.supabase
      .from("company_roles")
      .select("*")
      .eq("company_id", context.companyId)
      .order("updated_at", { ascending: false }),
    context.supabase
      .from("company_candidate_matches")
      .select("*")
      .eq("company_id", context.companyId)
      .in("status", [
        "candidate_accepted",
        "company_advanced",
        "company_hold",
        "company_declined"
      ])
      .order("review_due_at", { ascending: true })
  ]);

  const roleRows = rolesResult.error ? [] : asRows(rolesResult.data);
  const matchRows = matchesResult.error ? [] : asRows(matchesResult.data);
  const matches = matchRows.map(mapCompanyMatchRow);
  const roleTitleById = new Map(
    roleRows.map((row) => [readString(row.role_id) ?? "", readString(row.title) ?? "Role"])
  );
  const matchesWithTitles = matches.map((match) => ({
    ...match,
    roleTitle: roleTitleById.get(match.roleId) ?? match.roleTitle
  }));
  const roles = roleRows.map((row) => mapCompanyRoleRow(row, matchesWithTitles));
  const overdueReviews = matchesWithTitles.filter((match) => match.isOverdue).length;
  const unresolvedHolds = matchesWithTitles.filter(
    (match) => match.status === "company_hold"
  ).length;
  const workspace = workspaceResult.error
    ? null
    : (workspaceResult.data as Record<string, unknown> | null);

  return {
    companyId: context.companyId,
    companyName: readString(workspace?.name) ?? "Company workspace",
    roles,
    matches: matchesWithTitles,
    metrics: {
      activeRoles: roles.filter((role) => role.status === "active").length,
      acceptedCandidates: matchesWithTitles.length,
      overdueReviews,
      unresolvedHolds
    }
  };
}

export async function readCompanyMatchForReview(
  context: AuthenticatedCompanyRouteContext,
  matchId: string
): Promise<CompanyDashboardMatch | null> {
  const result = await context.supabase
    .from("company_candidate_matches")
    .select("*")
    .eq("company_id", context.companyId)
    .eq("match_id", matchId)
    .in("status", [
      "candidate_accepted",
      "company_advanced",
      "company_hold",
      "company_declined"
    ])
    .maybeSingle();

  if (result.error || !result.data) {
    return null;
  }

  return mapCompanyMatchRow(result.data as Record<string, unknown>);
}

export async function readCandidateMatchFeedback(
  context: CandidateRouteContext
): Promise<readonly CandidateMatchFeedback[]> {
  if (!isAuthenticatedCandidateContext(context)) {
    return [];
  }

  const result = await context.supabase
    .from("company_candidate_matches")
    .select(
      "match_id,status,company_decision_reason,company_next_step,company_follow_up_at,company_decision_at,shared_profile_payload"
    )
    .eq("candidate_user_id", context.user.id)
    .in("status", ["company_advanced", "company_hold", "company_declined"])
    .order("company_decision_at", { ascending: false });

  if (result.error) {
    return [];
  }

  const feedback: CandidateMatchFeedback[] = [];

  for (const row of asRows(result.data)) {
    const status = readString(row.status);
    if (
      status !== "company_advanced" &&
      status !== "company_hold" &&
      status !== "company_declined"
    ) {
      continue;
    }

    const profile = isRecord(row.shared_profile_payload)
      ? row.shared_profile_payload
      : {};
    const matchId = readString(row.match_id);
    if (!matchId) {
      continue;
    }

    feedback.push({
      matchId,
      status,
      reason:
        readString(row.company_decision_reason) ??
        "The company recorded a review decision.",
      nextStep: readString(row.company_next_step),
      followUpAt: readString(row.company_follow_up_at),
      decidedAt: readString(row.company_decision_at),
      companyName: readString(profile.companyName),
      roleTitle: readString(profile.roleTitle)
    });
  }

  return feedback;
}

async function persistActiveSharingSnapshot(
  supabase: SupabaseWriteClient,
  context: AuthenticatedCandidateContext,
  input: PersistCandidateMatchAcceptanceInput
) {
  await supabase
    .from("candidate_sharing_snapshots")
    .update({
      status: "revoked",
      expires_at: input.decidedAt
    })
    .eq("user_id", context.user.id)
    .eq("company_id", input.companyId)
    .eq("role_id", input.roleId)
    .eq("status", "active");

  await requireWrite(
    supabase.from("candidate_sharing_snapshots").insert({
      user_id: context.user.id,
      company_id: input.companyId,
      role_id: input.roleId,
      consent_record_id: input.consentRecordId,
      status: "active",
      shared_sections: [
        "profile",
        "scorecard",
        "match_explanation",
        "interview_transcript"
      ],
      snapshot_payload: toJson({
        snapshotId: input.sharingSnapshotId,
        matchId: input.matchId,
        roleTitle: input.roleTitle,
        companyName: input.companyName,
        dataCategories: DEFAULT_MATCH_SHARING_CATEGORIES,
        excludedCategories: EXCLUDED_MATCH_SHARING_CATEGORIES,
        raw_cv_included: false,
        raw_interview_media_included: false,
        redaction_policy_version: "candidate-sharing-redaction-v1"
      }),
      audit_event_id: `audit_candidate_sharing_snapshot_${sanitizeId(input.matchId)}`
    })
  );
}

async function readCandidateSharedProfile(
  context: AuthenticatedCandidateContext,
  input: PersistCandidateMatchAcceptanceInput
) {
  const profileResult = await context.supabase
    .from("candidate_profiles")
    .select("profile_json,profile_status")
    .eq("user_id", context.user.id)
    .maybeSingle();
  const profileRow = profileResult.error
    ? null
    : (profileResult.data as Record<string, unknown> | null);
  const profileJson = isRecord(profileRow?.profile_json)
    ? profileRow.profile_json
    : {};
  const contact = isRecord(profileJson.contact) ? profileJson.contact : {};

  return {
    candidateUserId: context.user.id,
    candidateName:
      readString(contact.full_name) ??
      readString(profileJson.name) ??
      "Candidate",
    candidateHeadline:
      readString(profileJson.headline) ??
      readString(profileJson.current_title) ??
      "Candidate-owned profile",
    companyName: input.companyName ?? input.companyId,
    roleTitle: input.roleTitle ?? input.roleId,
    profileStatus: readString(profileRow?.profile_status) ?? "confirmed",
    contact_hidden_until: "company_advance",
    contact_email_included: false,
    raw_cv_included: false,
    raw_interview_media_included: false
  };
}

function buildScorecardPayload(input: PersistCandidateMatchAcceptanceInput) {
  return {
    matchScore: input.matchScore ?? 0,
    confidence: input.confidence ?? 0,
    reasons: [...(input.reasons ?? [])],
    gaps: [...(input.gaps ?? [])],
    scorecardVersion: "company-dashboard-v1",
    recommendation_only: true,
    raw_cv_included: false,
    raw_interview_media_included: false
  };
}

function buildEvidencePayload(input: PersistCandidateMatchAcceptanceInput) {
  return {
    matchExplanation: {
      supporting_evidence: [...(input.evidence ?? [])],
      missing_evidence: [...(input.gaps ?? [])],
      reasons: [...(input.reasons ?? [])]
    },
    raw_cv_included: false,
    raw_interview_media_included: false
  };
}

function buildTranscriptPayload(input: PersistCandidateMatchAcceptanceInput) {
  const transcriptExcerpt =
    input.transcriptExcerpt ??
    [...(input.evidence ?? []), ...(input.reasons ?? [])]
      .find((item) => item.toLowerCase().includes("interview")) ??
    "Transcript excerpt is pending supported interview review.";

  return {
    transcriptExcerpt,
    transcriptText: input.transcriptText ?? transcriptExcerpt,
    raw_cv_included: false,
    raw_interview_media_included: false
  };
}

function mapCompanyRoleRow(
  row: Record<string, unknown>,
  matches: readonly CompanyDashboardMatch[]
): CompanyDashboardRole {
  const roleId = readString(row.role_id) ?? "";
  const roleMatches = matches.filter((match) => match.roleId === roleId);

  return {
    roleId,
    title: readString(row.title) ?? "Untitled role",
    status: readString(row.status) ?? "draft",
    locationConstraints: readStringArray(row.location_constraints),
    workModes: readStringArray(row.work_modes),
    openMatchCount: roleMatches.filter(
      (match) =>
        match.status === "candidate_accepted" || match.status === "company_hold"
    ).length,
    overdueMatchCount: roleMatches.filter((match) => match.isOverdue).length,
    dailyWorkReality: isRecord(row.daily_work_reality)
      ? row.daily_work_reality
      : {}
  };
}

function mapCompanyMatchRow(row: Record<string, unknown>): CompanyDashboardMatch {
  const profile = isRecord(row.shared_profile_payload)
    ? row.shared_profile_payload
    : {};
  const scorecard = isRecord(row.scorecard_payload) ? row.scorecard_payload : {};
  const evidencePayload = isRecord(row.evidence_payload) ? row.evidence_payload : {};
  const transcript = isRecord(row.transcript_payload) ? row.transcript_payload : {};
  const reviewDueAt = readString(row.review_due_at) ?? null;

  return {
    matchId: readString(row.match_id) ?? "",
    roleId: readString(row.role_id) ?? "",
    roleTitle: readString(profile.roleTitle) ?? "Role",
    companyId: readString(row.company_id) ?? "",
    companyName: readString(profile.companyName) ?? readString(row.company_id) ?? "Company",
    candidateUserId: readString(row.candidate_user_id) ?? "",
    candidateName: readString(profile.candidateName) ?? "Candidate",
    candidateHeadline:
      readString(profile.candidateHeadline) ?? "Candidate-owned profile",
    status: normalizeCompanyMatchStatus(row.status),
    matchScore: readNumber(row.match_score) ?? 0,
    matchConfidence: readNumber(row.match_confidence) ?? 0,
    reviewDueAt,
    isOverdue:
      Boolean(reviewDueAt) &&
      new Date(reviewDueAt ?? 0).getTime() < Date.now() &&
      row.status !== "company_advanced" &&
      row.status !== "company_declined",
    contactVisibility:
      row.contact_visibility === "visible_after_advance"
        ? "visible_after_advance"
        : "hidden_until_advance",
    scorecard,
    matchExplanation: evidencePayload,
    transcriptExcerpt:
      readString(transcript.transcriptExcerpt) ??
      "Transcript excerpt is pending supported interview review.",
    transcriptText:
      readString(transcript.transcriptText) ??
      readString(transcript.transcriptExcerpt) ??
      "",
    companyDecisionReason: readString(row.company_decision_reason) ?? null,
    companyNextStep: readString(row.company_next_step) ?? null,
    companyFollowUpAt: readString(row.company_follow_up_at) ?? null,
    raw_cv_included: false,
    raw_interview_media_included: false
  };
}

function buildRoleLifecyclePatch(
  action: Exclude<CompanyRoleLifecycleAction, "edit">,
  reason: string | undefined,
  now: string
) {
  if (action === "pause") {
    return {
      status: "paused",
      paused_at: now,
      updated_at: now
    };
  }

  if (action === "close") {
    return {
      status: "closed",
      closed_at: now,
      closed_reason: readString(reason) ?? "Role closed by company.",
      updated_at: now
    };
  }

  return {
    status: "active",
    activated_at: now,
    paused_at: null,
    closed_at: null,
    closed_reason: null,
    updated_at: now
  };
}

function buildCandidateVisibleMatchUpsert({
  candidate,
  roleRow,
  workspaceRow,
  existingRow
}: {
  readonly candidate: CandidateProfile;
  readonly roleRow: Record<string, unknown>;
  readonly workspaceRow: Record<string, unknown>;
  readonly existingRow: Record<string, unknown> | undefined;
}): Record<string, unknown> | null {
  const existingStatus = readString(existingRow?.status);
  if (
    existingStatus &&
    existingStatus !== "candidate_visible"
  ) {
    return null;
  }

  const role = buildMatchingRoleProfile(roleRow);
  const company = buildMatchingCompanyProfile(workspaceRow, role.company_id);
  const matchId = `match_${sanitizeId(candidate.candidate_id)}_${sanitizeId(role.role_id)}`;
  const match = createCompanyMatch({
    candidate,
    role,
    company,
    matchId,
    inputHash: `candidate-visible:${candidate.candidate_id}:${role.role_id}`
  });

  return {
    match_id: match.match_id,
    company_id: match.company_id,
    role_id: match.role_id,
    candidate_user_id: candidate.candidate_id,
    status: "candidate_visible",
    candidate_decision: null,
    candidate_decided_at: null,
    consent_record_id: null,
    sharing_snapshot_id: null,
    match_score: match.match_score,
    match_confidence: match.match_confidence,
    human_review_required: true,
    recommendation_only: true,
    review_due_at: null,
    contact_visibility: "hidden_until_advance",
    shared_profile_payload: toJson({
      candidateUserId: candidate.candidate_id,
      candidateName: candidate.contact?.full_name ?? "Candidate",
      candidateHeadline: candidate.preferences.target_roles[0] ?? "Candidate-owned profile",
      companyName: company.name ?? company.company_id,
      roleTitle: role.title,
      contact_hidden_until: "candidate_accepts_match",
      contact_email_included: false,
      raw_cv_included: false,
      raw_interview_media_included: false
    }),
    scorecard_payload: toJson({
      matchScore: match.match_score,
      confidence: match.match_confidence,
      reasons: match.explanations.candidate_facing.supporting_evidence,
      gaps: match.explanations.candidate_facing.missing_evidence,
      scorecardVersion: match.scoring_version,
      recommendation_only: true,
      raw_cv_included: false,
      raw_interview_media_included: false
    }),
    evidence_payload: toJson({
      matchExplanation: match.explanations.candidate_facing,
      employer_readable: false,
      hidden_until_candidate_consent: true,
      raw_cv_included: false,
      raw_interview_media_included: false
    }),
    transcript_payload: toJson({
      transcriptExcerpt:
        match.explanations.candidate_facing.supporting_evidence.find((item) =>
          item.toLowerCase().includes("interview")
        ) ?? "Interview-complete candidate evidence is available for candidate review.",
      transcriptText: "",
      employer_readable: false,
      hidden_until_candidate_consent: true,
      raw_cv_included: false,
      raw_interview_media_included: false
    }),
    audit_payload: toJson({
      audit_event_id: match.audit_event_id,
      materialized_from: "lazy_candidate_match_materialization",
      employer_visibility: "hidden_pending_candidate_consent",
      raw_cv_included: false,
      raw_interview_media_included: false
    }),
    updated_at: match.generated_at
  };
}

function buildMatchingCandidateProfile(
  candidateId: string,
  profileJson: Record<string, unknown>
): CandidateProfile {
  const contact = isRecord(profileJson.contact) ? profileJson.contact : {};

  return {
    candidate_id: candidateId,
    confirmed_by_candidate: true,
    contact: {
      full_name:
        readString(contact.full_name) ??
        readString(profileJson.name) ??
        readString(profileJson.full_name) ??
        "Candidate",
      location: readString(contact.location) ?? readString(profileJson.location)
    },
    education: readObjectArray(profileJson.education),
    experience: readObjectArray(profileJson.experience),
    skills: readSkills(profileJson.skills),
    languages: readLanguages(profileJson.languages),
    certifications: readStringArray(profileJson.certifications),
    portfolio: readStringArray(profileJson.portfolio),
    preferences: {
      target_roles: readStringArray(
        profileJson.target_roles ?? profileJson.preferred_roles
      ),
      locations: readStringArray(profileJson.locations),
      work_modes: readStringArray(profileJson.work_modes),
      industries: readStringArray(profileJson.industries),
      work_style: readStringArray(profileJson.work_style)
    }
  };
}

function buildMatchingRoleProfile(row: Record<string, unknown>): RoleProfile {
  const requirements = isRecord(row.requirements) ? row.requirements : {};
  const calibration = isRecord(row.calibration) ? row.calibration : {};

  return {
    role_id: readString(row.role_id) ?? "",
    company_id: readString(row.company_id) ?? "",
    title: readString(row.title) ?? "Open role",
    status: "active",
    location_constraints: readStringArray(row.location_constraints),
    work_modes: readStringArray(row.work_modes),
    requirements: {
      required_skills: readStringArray(requirements.required_skills),
      nice_to_have_skills: readStringArray(requirements.nice_to_have_skills),
      hard_gates: [...readHardGates(requirements.hard_gates)]
    },
    calibration: {
      version: readString(calibration.version) ?? "company-dashboard-v2",
      score_bars: isRecord(calibration.score_bars)
        ? normalizeScoreBars(calibration.score_bars)
        : {},
      required_evidence: readStringArray(calibration.required_evidence),
      interview_modules: readStringArray(calibration.interview_modules)
    }
  };
}

function buildMatchingCompanyProfile(
  row: Record<string, unknown>,
  companyId: string
): CompanyProfile {
  return {
    company_id: readString(row.company_id) ?? companyId,
    name: readString(row.name),
    size: readString(row.team_size),
    locations: readStringArray(row.hiring_locations),
    data_visibility_policy: "candidate_consent_required"
  };
}

function normalizeCompanyMatchStatus(value: unknown): CompanyMatchStatus {
  if (
    value === "candidate_visible" ||
    value === "candidate_accepted" ||
    value === "candidate_declined" ||
    value === "company_advanced" ||
    value === "company_hold" ||
    value === "company_declined" ||
    value === "closed"
  ) {
    return value;
  }

  return "candidate_visible";
}

async function runSupabaseWrite(write: () => Promise<void>) {
  try {
    await write();
    return { status: "supabase_persisted" as const };
  } catch (error) {
    return {
      status: "supabase_unavailable" as const,
      detail: error instanceof Error ? error.message : "Supabase write failed."
    };
  }
}

async function requireWrite(
  promise: PromiseLike<{ readonly error: { readonly message?: string } | null }>
) {
  const { error } = await promise;
  if (error) {
    throw new Error(error.message ?? "Supabase write failed.");
  }
}

function collectRoleTextForPolicyScan(role: CompanyRoleIntake): string[] {
  return [
    role.title,
    ...(role.location_constraints ?? []),
    ...(role.work_modes ?? []),
    ...(role.requirements?.required_skills ?? []),
    ...(role.requirements?.nice_to_have_skills ?? []),
    ...(role.requirements?.hard_gates ?? []).flatMap((gate) => [
      gate.gate_type,
      gate.description,
      gate.lawful_basis_note
    ]),
    ...(role.calibration?.required_evidence ?? []),
    ...(role.calibration?.interview_modules ?? [])
  ].filter((value): value is string => typeof value === "string");
}

function readHardGates(value: unknown): readonly Required<CompanyRoleHardGate>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((gate) => ({
    gate_type: readString(gate.gate_type) ?? "role_essential",
    description: readString(gate.description) ?? "Role-essential requirement",
    lawful_basis_note:
      readString(gate.lawful_basis_note) ??
      "Role-essential and reviewed by the company.",
    role_essential: gate.role_essential !== false
  }));
}

function normalizeScoreBars(value: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, readNumber(item)] as const)
      .filter((entry): entry is readonly [string, number] => typeof entry[1] === "number")
  );
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function readObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readSkills(value: unknown): CandidateProfile["skills"] {
  if (!Array.isArray(value)) {
    return [];
  }

  const skills: CandidateProfile["skills"] = [];

  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      skills.push({ name: item.trim() });
      continue;
    }

    if (isRecord(item)) {
      const name = readString(item.name);
      if (name) {
        skills.push({
          name,
          category: readString(item.category),
          evidence_count: readNumber(item.evidence_count),
          evidence: readStringArray(item.evidence)
        });
      }
    }
  }

  return skills;
}

function readLanguages(value: unknown): CandidateProfile["languages"] {
  if (!Array.isArray(value)) {
    return [];
  }

  const languages: CandidateProfile["languages"] = [];

  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      languages.push({ language: item.trim() });
      continue;
    }

    if (isRecord(item)) {
      const language = readString(item.language);
      if (language) {
        languages.push({
          language,
          declared_level: readString(item.declared_level),
          assessed_level: readString(item.assessed_level),
          evidence: readStringArray(item.evidence)
        });
      }
    }
  }

  return languages;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toJson(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeWebsite(value: unknown): string | undefined {
  const raw = readString(value);
  if (!raw) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    return url.hostname.includes(".") ? url.toString().replace(/\/$/, "") : undefined;
  } catch {
    return undefined;
  }
}

function normalizeDomain(value: unknown): string | undefined {
  const raw = readString(value);
  if (!raw) {
    return undefined;
  }

  const withoutProtocol = raw.replace(/^https?:\/\//i, "").split("/")[0];
  const domain = withoutProtocol.replace(/^www\./i, "").toLowerCase();

  return domain.includes(".") ? domain : undefined;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function addDays(value: string, days: number): Date {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
