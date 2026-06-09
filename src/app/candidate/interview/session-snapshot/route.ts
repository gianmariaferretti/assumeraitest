import { NextResponse, type NextRequest } from "next/server";

import {
  isCandidateContextError,
  resolveCandidateRouteContext
} from "@/features/candidate-persistence/supabase-candidate-context";
import {
  loadServerInterviewState,
  resolveServerInterviewStore
} from "@/features/candidate-persistence/server-interview-store";
import { persistInterviewSessionSnapshot } from "@/features/candidate-persistence/supabase-candidate-store";

export const runtime = "nodejs";

/**
 * Persist the aggregate interview snapshot under the server trust model.
 *
 * The interview session itself is loaded from server-authoritative state
 * (candidate_module_sessions) — a client-supplied session object is rejected.
 * The client may only contribute the presentation-layer provider session
 * (mock avatar/transcript shell), which is never used for scoring.
 */
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

  const payload = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(payload)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_interview_snapshot",
          message: "Interview snapshot request requires a JSON object.",
          status: 400
        }
      },
      { status: 400 }
    );
  }
  if ("session" in payload || "questionPlan" in payload) {
    return NextResponse.json(
      {
        error: {
          code: "client_state_rejected",
          message:
            "Interview session state is derived server-side; the snapshot request only carries providerSession.",
          status: 400
        }
      },
      { status: 400 }
    );
  }

  const store = resolveServerInterviewStore(candidateContext);
  const state = await loadServerInterviewState(store, candidateContext.candidateId);
  if (!state) {
    return NextResponse.json(
      {
        error: {
          code: "interview_session_not_found",
          message: "No server interview session exists for this candidate.",
          status: 404
        }
      },
      { status: 404 }
    );
  }

  const persistence = await persistInterviewSessionSnapshot(candidateContext, {
    session: state.session as unknown as Record<string, unknown>,
    providerSession: isRecord(payload.providerSession) ? payload.providerSession : undefined,
    questionPlan: {
      source: "server_authoritative_state",
      questions: state.session.questions
    }
  });

  return NextResponse.json(
    { persistence: persistence.status },
    { status: persistence.status === "supabase_unavailable" ? 202 : 200 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
