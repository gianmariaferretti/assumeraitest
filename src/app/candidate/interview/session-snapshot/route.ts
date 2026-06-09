import { NextResponse, type NextRequest } from "next/server";

import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import { persistInterviewSessionSnapshot } from "@/features/candidate-persistence/supabase-candidate-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const candidateContext = await resolveCandidateRouteContext();
  if (isCandidateContextError(candidateContext)) {
    return NextResponse.json(
      {
        error: {
          code: candidateContext.code,
          message: candidateContext.message,
          status: candidateContext.status
        }
      },
      { status: candidateContext.status }
    );
  }

  const payload = await readSnapshotPayload(request);
  if (!payload.ok) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_interview_snapshot",
          message: payload.message,
          status: 400
        }
      },
      { status: 400 }
    );
  }

  const persistence = await persistInterviewSessionSnapshot(candidateContext, payload.value);

  return NextResponse.json(
    {
      persistence: persistence.status
    },
    { status: persistence.status === "supabase_unavailable" ? 202 : 200 }
  );
}

async function readSnapshotPayload(request: Request): Promise<
  | {
      readonly ok: true;
      readonly value: {
        readonly session: Record<string, unknown>;
        readonly providerSession?: Record<string, unknown>;
        readonly questionPlan?: Record<string, unknown>;
      };
    }
  | { readonly ok: false; readonly message: string }
> {
  const payload = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(payload)) {
    return {
      ok: false,
      message: "Interview snapshot request requires a JSON object."
    };
  }

  if (!isRecord(payload.session)) {
    return {
      ok: false,
      message: "Interview snapshot request requires a session object."
    };
  }

  return {
    ok: true,
    value: {
      session: payload.session,
      providerSession: isRecord(payload.providerSession) ? payload.providerSession : undefined,
      questionPlan: isRecord(payload.questionPlan) ? payload.questionPlan : undefined
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
