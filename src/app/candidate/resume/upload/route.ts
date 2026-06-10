import { NextResponse, type NextRequest } from "next/server";

import {
  buildPreResumeConsentGate,
  candidateResumeProfilePipeline,
  readPreResumeConsentGateFromFormData,
  readResumeParserModeFromFormData
} from "@/features/candidate-flow";
import {
  hasAnthropicResumeParserKey,
  shouldForceLocalResumeParserForCandidateUpload
} from "@/features/candidate-flow/resume-parser-provider-config";
import { checkLlmBudget, secondsUntilUtcMidnight } from "@/lib/llm-budget";
import {
  clientIpFromHeaders,
  enforceRateLimit,
  readRateLimitFromEnv,
  resolveRateLimitStore
} from "@/lib/rate-limit";
import { logError } from "@/lib/log";
import { captureServerError } from "@/lib/sentry";
import {
  createResumeUploadConfig,
  createSafeResumeUploadError
} from "@/features/resume-ingestion";
import {
  isCandidateContextError,
  resolveCandidateRouteContext,
  type CandidateContextError
} from "@/features/candidate-persistence/supabase-candidate-context";
import { persistResumePipelineSession } from "@/features/candidate-persistence/supabase-candidate-store";

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get("x-correlation-id") ?? createRequestId();
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  try {
    const formData = await request.formData();
    const preResumeConsentGate = buildPreResumeConsentGate(
      readPreResumeConsentGateFromFormData(formData)
    );

    if (!preResumeConsentGate.canProvideResume) {
      return NextResponse.json(
        {
          error: {
            code: "pre_resume_consent_required",
            message:
              "Read the Privacy Policy and Terms of Service to the end, then accept both before uploading a resume.",
            status: 400,
            correlationId,
            missing_requirements: preResumeConsentGate.missingRequirements
          }
        },
        { status: 400 }
      );
    }

    const uploadedFile = formData.get("resume");
    const hasUploadedFile = isNonEmptyUploadedFile(uploadedFile);
    const parserMode = readResumeParserModeFromFormData(formData);
    const rawTextOverride = getFormString(formData.get("resume_text"));

    if (!hasUploadedFile && !rawTextOverride) {
      const error = createSafeResumeUploadError("unsupported_file_type", correlationId);
      return NextResponse.json({ error }, { status: error.status });
    }

    const formCandidateId = getFormString(formData.get("candidate_id"));
    const candidateContext = await resolveCandidateRouteContext({
      fallbackCandidateId: formCandidateId
    });
    if (isCandidateContextError(candidateContext)) {
      return candidateContextErrorResponse(candidateContext, request, wantsJson);
    }

    const rate = await enforceRateLimit({
      store: resolveRateLimitStore(),
      rule: {
        bucket: "resume_upload",
        limit: readRateLimitFromEnv(process.env.RATE_LIMIT_RESUME_UPLOAD_PER_HOUR, 5),
        windowSeconds: 3600
      },
      subjects: [
        `user:${candidateContext.candidateId}`,
        `ip:${clientIpFromHeaders(request.headers)}`
      ]
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many resume uploads. Wait before uploading again.",
            status: 429,
            correlationId
          }
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    // LLM budget guard: only gates uploads that would hit the Anthropic parser;
    // the local deterministic parser keeps working when the budget is spent.
    const wouldUseAnthropicParser =
      parserMode !== "local" &&
      !shouldForceLocalResumeParserForCandidateUpload(process.env) &&
      hasAnthropicResumeParserKey(process.env);
    if (wouldUseAnthropicParser) {
      const budget = await checkLlmBudget();
      if (!budget.allowed) {
        return NextResponse.json(
          {
            error: {
              code: "llm_budget_exhausted",
              message:
                "Resume parsing is temporarily unavailable. Please try again later.",
              status: 503,
              correlationId
            }
          },
          { status: 503, headers: { "Retry-After": String(secondsUntilUtcMidnight()) } }
        );
      }
    }

    const candidateId = candidateContext.candidateId;
    const file = hasUploadedFile
      ? {
          name: uploadedFile.name,
          mimeType: uploadedFile.type,
          sizeBytes: uploadedFile.size,
          bytes: new Uint8Array(await uploadedFile.arrayBuffer())
        }
      : createPastedResumeTextFile(rawTextOverride ?? "");

    const result = await candidateResumeProfilePipeline.start(
      {
        actor: { type: "candidate", id: candidateContext.actorId },
        candidateId,
        file,
        config: createResumeUploadConfig(),
        correlationId,
        parserMode,
        rawTextOverride
      }
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error.status });
    }

    const processingStep = createProcessingStepUrl(result.session.nextStep.href, request.url);
    await persistResumePipelineSession(candidateContext, result.session);

    if (!wantsJson) {
      const response = NextResponse.redirect(processingStep, 303);
      setCandidateResumeDocumentCookie(response, result.session.resumeDocument.id);
      return response;
    }

    const response = NextResponse.json(
      {
        resume_document: result.session.resumeDocument,
        upload_audit_event: result.session.uploadAuditEvent,
        parse_draft: result.session.parseDraft,
        score_readiness: result.session.scoreReadiness,
        next_step: result.session.nextStep.href,
        processing_step: `${processingStep.pathname}${processingStep.search}`
      },
      { status: 201 }
    );
    setCandidateResumeDocumentCookie(response, result.session.resumeDocument.id);
    return response;
  } catch (caught) {
    // The candidate sees a safe error; the real failure goes to logs + Sentry.
    logError("resume_upload_failed", {
      route: "/candidate/resume/upload",
      correlationId,
      detail: caught instanceof Error ? caught.message : "unknown_error"
    });
    captureServerError(caught, { route: "/candidate/resume/upload", correlationId });
    const error = createSafeResumeUploadError("storage_failed", correlationId);
    return NextResponse.json({ error }, { status: error.status });
  }
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    "type" in value
  );
}

function isNonEmptyUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    isUploadedFile(value) &&
    value.size > 0 &&
    value.name.trim().length > 0
  );
}

function getFormString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `corr_${Date.now()}`;
}

function createProcessingStepUrl(nextStepHref: string, requestUrl: string): URL {
  const nextStep = new URL(nextStepHref, requestUrl);
  const processingStep = new URL("/candidate/resume/processing", requestUrl);

  processingStep.searchParams.set("next", `${nextStep.pathname}${nextStep.search}`);

  return processingStep;
}

function setCandidateResumeDocumentCookie(response: NextResponse, resumeDocumentId: string): void {
  response.cookies.set("assumerai_resume_document_id", resumeDocumentId, {
    httpOnly: true,
    path: "/candidate",
    sameSite: "lax"
  });
}

function candidateContextErrorResponse(
  context: CandidateContextError,
  request: NextRequest,
  wantsJson: boolean
): NextResponse {
  if (!wantsJson) {
    const redirectUrl =
      context.status === 401
        ? new URL("/login?next=/candidate", request.url)
        : new URL("/candidate?error=candidate_account_required", request.url);

    return NextResponse.redirect(redirectUrl, 303);
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

function createPastedResumeTextFile(rawText: string) {
  const bytes = new TextEncoder().encode(rawText);

  return {
    name: "pasted-resume.txt",
    mimeType: "text/plain",
    sizeBytes: bytes.byteLength,
    bytes
  };
}
