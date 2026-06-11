import { NextResponse, type NextRequest } from "next/server";

import {
  isCompanyContextError,
  resolveCompanyRouteContext,
  validateCompanyRoleIntake
} from "@/features/company-workspace";
import { readWorkStyleKeyFromFormData } from "@/features/scoring/work-style/form";

export async function POST(
  request: NextRequest,
  { params }: { readonly params: Promise<{ readonly roleId: string }> }
) {
  const { roleId } = await params;
  const companyContext = await resolveCompanyRouteContext(`/company/roles/${roleId}`);
  if (isCompanyContextError(companyContext)) {
    return NextResponse.redirect(
      new URL(
        companyContext.status === 401
          ? `/login?next=/company/roles/${roleId}`
          : "/profile?error=company_account_required",
        request.url
      ),
      303
    );
  }

  const formData = await request.formData();
  const intake = {
    title: readFormText(formData, "title"),
    location_constraints: readFormList(formData, "location_constraints"),
    work_modes: readFormList(formData, "work_modes"),
    requirements: {
      required_skills: readFormList(formData, "requirements.required_skills"),
      nice_to_have_skills: readFormList(formData, "requirements.nice_to_have_skills"),
      hard_gates: readFormList(formData, "requirements.hard_gates").map((gate) => {
        const [gateType, description] = gate.split("|").map((part) => part.trim());
        return {
          gate_type: gateType || "role_essential",
          description: description || gate,
          lawful_basis_note: description || gate,
          role_essential: true
        };
      })
    },
    daily_work_reality: {
      client_facing_percentage: readFormNumber(
        formData,
        "daily_work_reality.client_facing_percentage"
      ),
      meeting_load: readEnum(formData, "daily_work_reality.meeting_load", ["low", "medium", "high"]),
      delivery_pace: "steady",
      travel_required: "none",
      solo_vs_team_work: "mixed",
      ambiguity_level: "medium"
    },
    calibration: {
      score_bars: {},
      required_evidence: readFormList(formData, "calibration.required_evidence"),
      interview_modules: readFormList(formData, "calibration.interview_modules")
    }
  };

  const validation = validateCompanyRoleIntake(intake);
  if (!validation.ok) {
    return NextResponse.redirect(
      new URL(`/company/roles/${roleId}?error=company_role_invalid`, request.url),
      303
    );
  }

  // Phase 13: company-declared work-style expectations, stored versioned
  // on the role calibration (judged at match time, never in the interview).
  const workStyleKey = readWorkStyleKeyFromFormData(formData);
  const now = new Date().toISOString();
  const result = await companyContext.supabase
    .from("company_roles")
    .update({
      title: validation.value.title,
      location_constraints: validation.value.location_constraints,
      work_modes: validation.value.work_modes,
      requirements: validation.value.requirements,
      daily_work_reality: validation.value.daily_work_reality,
      calibration: {
      ...validation.value.calibration,
      ...(workStyleKey ? { work_style_key: workStyleKey } : {})
    },
      role_payload: validation.value,
      updated_at: now
    })
    .eq("company_id", companyContext.companyId)
    .eq("role_id", roleId);

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/company/roles/${roleId}?error=role_update_failed`, request.url),
      303
    );
  }

  return NextResponse.redirect(new URL(`/company/roles/${roleId}`, request.url), 303);
}

function readFormText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readFormList(formData: FormData, key: string): string[] {
  const value = readFormText(formData, key);
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readFormNumber(formData: FormData, key: string): number | undefined {
  const value = readFormText(formData, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  values: readonly T[]
): T | undefined {
  const value = readFormText(formData, key);
  return values.includes(value as T) ? (value as T) : undefined;
}
