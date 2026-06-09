export type ResumeUploadClientPhase =
  | "idle"
  | "uploading"
  | "parsing"
  | "handoff"
  | "error";

export interface ResumeProcessingFrame {
  readonly id: "received" | "extracting" | "building";
  readonly title: string;
  readonly detail: string;
}

export interface ResumeUploadRouteResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly payload: unknown;
}

export type ResumeUploadTransition =
  | {
      readonly phase: "handoff";
      readonly processingHref: string;
      readonly message: string;
    }
  | {
      readonly phase: "error";
      readonly message: string;
      readonly recoveryAction: string;
      readonly correlationId?: string;
    };

export const resumeProcessingFrames = [
  {
    id: "received",
    title: "Resume received.",
    detail: "Your raw CV is stored under the retention policy while the profile draft stays yours."
  },
  {
    id: "extracting",
    title: "Extracting profile evidence.",
    detail: "AssumerAI is reading role history, education, skills, and missing data for your review."
  },
  {
    id: "building",
    title: "Building your interview.",
    detail: "The next step is a profile check before any scoring or matching can use this data."
  }
] as const satisfies readonly ResumeProcessingFrame[];

const genericFailureMessage = "Resume upload could not be completed. Try again later.";
const recoveryAction =
  "Try again with a clearer PDF, text export, or pasted resume text.";

export function buildResumeUploadTransition(
  response: ResumeUploadRouteResponse
): ResumeUploadTransition {
  if (response.ok) {
    const processingHref = readStringProperty(response.payload, "processing_step");

    if (processingHref?.startsWith("/candidate/resume/processing")) {
      return {
        phase: "handoff",
        processingHref,
        message: "Resume received. Opening the guided processing step."
      };
    }
  }

  return {
    phase: "error",
    message: readErrorMessage(response.payload) ?? genericFailureMessage,
    recoveryAction: readErrorRecoveryAction(response.payload) ?? recoveryAction,
    ...readOptionalCorrelationId(response.payload)
  };
}

function readErrorMessage(payload: unknown): string | undefined {
  const error = readObjectProperty(payload, "error");
  return readStringProperty(error, "message");
}

function readErrorRecoveryAction(payload: unknown): string | undefined {
  const error = readObjectProperty(payload, "error");
  const requirements = readObjectProperty(error, "missing_requirements");

  if (!Array.isArray(requirements)) {
    return undefined;
  }

  const safeRequirements = requirements
    .filter((requirement): requirement is string => typeof requirement === "string")
    .map((requirement) => requirement.trim())
    .filter(Boolean);

  return safeRequirements.length > 0 ? safeRequirements.join(" ") : undefined;
}

function readOptionalCorrelationId(
  payload: unknown
): { readonly correlationId: string } | Record<string, never> {
  const error = readObjectProperty(payload, "error");
  const correlationId = readStringProperty(error, "correlationId");

  return correlationId ? { correlationId } : {};
}

function readStringProperty(payload: unknown, key: string): string | undefined {
  const object = asRecord(payload);
  const value = object?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readObjectProperty(payload: unknown, key: string): unknown {
  return asRecord(payload)?.[key];
}

function asRecord(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  return payload as Record<string, unknown>;
}
