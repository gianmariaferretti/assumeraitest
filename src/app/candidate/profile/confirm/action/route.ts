import { NextResponse, type NextRequest } from "next/server";

import {
  buildMinimalProfileReviewFormValues,
  validateMinimalProfileReviewRequiredFields
} from "@/components/candidate/minimal-profile-review-fields";
import {
  buildCandidateProfileCorrectionsFromFormValues,
  candidateResumeProfilePipeline
} from "@/features/candidate-flow";
import {
  isCandidateContextError,
  resolveCandidateRouteContext,
  type CandidateContextError
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  persistCandidateProfileConfirmation,
  readResumePipelineSession
} from "@/features/candidate-persistence/supabase-candidate-store";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const resumeDocumentId = getRequiredFormString(formData, "resumeDocumentId");
  const formCandidateId = getRequiredFormString(formData, "candidateId");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const candidateContext = await resolveCandidateRouteContext({
    fallbackCandidateId: formCandidateId
  });

  if (isCandidateContextError(candidateContext)) {
    return candidateContextErrorResponse(candidateContext, request, wantsJson, resumeDocumentId);
  }

  const candidateId = candidateContext.candidateId;

  if (!resumeDocumentId || !candidateId) {
    if (!wantsJson) {
      return redirectToProfileError(
        request,
        resumeDocumentId,
        "Profile confirmation could not be completed."
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "missing_profile_confirmation",
          message: "Profile confirmation could not be completed.",
          status: 400
        }
      },
      { status: 400 }
    );
  }

  let review = candidateResumeProfilePipeline.getProfileReview(resumeDocumentId);
  if (!review) {
    const restoredSession = await readResumePipelineSession(
      candidateContext,
      resumeDocumentId
    );

    if (restoredSession) {
      candidateResumeProfilePipeline.restore(restoredSession);
      review = candidateResumeProfilePipeline.getProfileReview(resumeDocumentId);
    }
  }

  if (!review) {
    if (!wantsJson) {
      return redirectToProfileError(
        request,
        resumeDocumentId,
        "No parsed profile draft was found for this resume document."
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "profile_not_found",
          message: "No parsed profile draft was found for this resume document.",
          status: 404
        }
      },
      { status: 404 }
    );
  }

  // Ownership: resumeDocumentId comes from the request body, so the parsed
  // draft it resolves to (possibly from the shared in-process pipeline store)
  // must belong to the authenticated candidate before it can be confirmed.
  if (review.profile.candidate_id !== candidateId) {
    if (!wantsJson) {
      return redirectToProfileError(
        request,
        undefined,
        "This resume document does not belong to your account."
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "profile_ownership_required",
          message: "This resume document does not belong to your account.",
          status: 403
        }
      },
      { status: 403 }
    );
  }

  const submittedValues = buildMinimalProfileReviewFormValues(formData, review.reviewFields);
  const requiredFieldValidation = validateMinimalProfileReviewRequiredFields(
    submittedValues,
    review.reviewFields
  );

  if (!requiredFieldValidation.ok) {
    if (!wantsJson) {
      return redirectToProfileError(
        request,
        resumeDocumentId,
        requiredFieldValidation.message
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "required_profile_fields_missing",
          message: requiredFieldValidation.message,
          missing_fields: requiredFieldValidation.missingFields,
          status: 400
        }
      },
      { status: 400 }
    );
  }

  const result = candidateResumeProfilePipeline.confirm({
    resumeDocumentId,
    candidateId,
    confirmedBy: `candidate:${candidateId}`,
    auditEventId: createProfileConfirmationAuditId(resumeDocumentId),
    corrections: buildCandidateProfileCorrectionsFromFormValues(review.profile, submittedValues)
  });

  if (!result.ok) {
    if (!wantsJson) {
      return redirectToProfileError(request, resumeDocumentId, result.error.message);
    }

    return NextResponse.json({ error: result.error }, { status: result.error.status });
  }

  await persistCandidateProfileConfirmation(candidateContext, result.session);

  if (wantsJson) {
    const response = NextResponse.json(
      {
        confirmation: result.session.confirmation,
        score_readiness: result.session.scoreReadiness,
        next_step: result.session.nextStep.href
      },
      { status: 200 }
    );
    setCandidateProfileHandoffCookies(response, resumeDocumentId);
    return response;
  }

  const response = NextResponse.redirect(new URL(result.session.nextStep.href, request.url), 303);
  setCandidateProfileHandoffCookies(response, resumeDocumentId);

  return response;
}

function setCandidateProfileHandoffCookies(
  response: NextResponse,
  resumeDocumentId: string
): void {
  response.cookies.set("assumerai_profile_confirmed", "true", {
    httpOnly: true,
    path: "/candidate",
    sameSite: "lax"
  });
  response.cookies.set("assumerai_resume_document_id", resumeDocumentId, {
    httpOnly: true,
    path: "/candidate",
    sameSite: "lax"
  });
}

function candidateContextErrorResponse(
  context: CandidateContextError,
  request: NextRequest,
  wantsJson: boolean,
  resumeDocumentId: string | undefined
): NextResponse {
  if (!wantsJson) {
    if (context.status === 401) {
      return NextResponse.redirect(new URL("/login?next=/candidate/profile/confirm", request.url), 303);
    }

    return redirectToProfileError(request, resumeDocumentId, context.message);
  }

  return NextResponse.json(
    {
      error: {
        code: context.code,
        message: context.message,
        status: context.status
      }
    },
    { status: context.status }
  );
}

function redirectToProfileError(
  request: NextRequest,
  resumeDocumentId: string | undefined,
  message: string
): NextResponse {
  const url = new URL("/candidate/profile/confirm", request.url);
  if (resumeDocumentId) {
    url.searchParams.set("resumeDocumentId", resumeDocumentId);
  }
  url.searchParams.set("profileError", message);

  return NextResponse.redirect(url, 303);
}

function getRequiredFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim();
}

function createProfileConfirmationAuditId(resumeDocumentId: string): string {
  const safeId = resumeDocumentId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `audit_profile_confirmation_${safeId}_${Date.now()}`;
}
