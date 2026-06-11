import { NextResponse, type NextRequest } from "next/server";

import {
  isCompanyContextError,
  resolveCompanyRouteContext,
  validateCompanyRoleIntake
} from "@/features/company-workspace";
import { readDriverContextFromFormData } from "@/features/scoring/job-drivers/form";
import { readWorkStyleKeyFromFormData } from "@/features/scoring/work-style/form";

export async function POST(request: NextRequest) {
  const companyContext = await resolveCompanyRouteContext("/company/roles/new");
  if (isCompanyContextError(companyContext)) {
    return NextResponse.redirect(
      new URL(
        companyContext.status === 401
          ? "/login?next=/company/roles/new"
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
      meeting_load: readFormText(formData, "daily_work_reality.meeting_load"),
      delivery_pace: readFormText(formData, "daily_work_reality.delivery_pace"),
      travel_required: readFormText(formData, "daily_work_reality.travel_required"),
      solo_vs_team_work: readFormText(formData, "daily_work_reality.solo_vs_team_work"),
      ambiguity_level: readFormText(formData, "daily_work_reality.ambiguity_level")
    },
    calibration: {
      score_bars: {},
      required_evidence: readFormList(formData, "calibration.required_evidence"),
      interview_modules: readFormList(formData, "calibration.interview_modules")
    }
  };
  const validation = validateCompanyRoleIntake(intake);
  if (!validation.ok) {
    return respondToRoleCreateRequest(request, {
      status: 400,
      code: "company_role_invalid",
      message: validation.issues.map((issue) => issue.message).join(" ")
    });
  }

  // Phase 13: company-declared work-style expectations, stored versioned
  // on the role calibration (judged at match time, never in the interview).
  const workStyleKey = readWorkStyleKeyFromFormData(formData);
  // Phase 14: company-declared work-context reality (flag-only at match time).
  const driverContext = readDriverContextFromFormData(formData);
  const now = new Date().toISOString();
  const roleId = `role_${sanitizeId(validation.value.title)}_${sanitizeId(now)}`;
  const result = await companyContext.supabase.from("company_roles").insert({
    role_id: roleId,
    company_id: companyContext.companyId,
    created_by: companyContext.user.id,
    title: validation.value.title,
    status: "active",
    location_constraints: validation.value.location_constraints,
    work_modes: validation.value.work_modes,
    requirements: validation.value.requirements,
    daily_work_reality: validation.value.daily_work_reality,
    calibration: {
      ...validation.value.calibration,
      ...(workStyleKey ? { work_style_key: workStyleKey } : {}),
      ...(driverContext ? { driver_context: driverContext } : {})
    },
    role_payload: validation.value,
    updated_at: now
  });

  if (result.error) {
    return respondToRoleCreateRequest(request, {
      status: 503,
      code: "company_role_create_failed",
      message: result.error.message
    });
  }

  return NextResponse.redirect(new URL(`/company/roles/${roleId}`, request.url), 303);
}

function readFormText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readFormList(formData: FormData, key: string): string[] {
  const value = readFormText(formData, key);
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readFormNumber(formData: FormData, key: string): number | undefined {
  const value = readFormText(formData, key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function respondToRoleCreateRequest(
  request: NextRequest,
  input: {
    readonly status: number;
    readonly code: string;
    readonly message: string;
  }
) {
  const acceptsJson = request.headers.get("accept")?.includes("application/json");
  if (!acceptsJson) {
    const errorUrl = new URL("/company/roles/new?error=company_role_invalid", request.url);
    errorUrl.searchParams.set("message", input.message);
    return NextResponse.redirect(errorUrl, 303);
  }

  return NextResponse.json(
    {
      error: {
        code: input.code,
        message: input.message,
        status: input.status
      }
    },
    { status: input.status }
  );
}
