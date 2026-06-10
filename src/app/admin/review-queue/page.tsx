import { redirect } from "next/navigation";

import {
  isCompanyContextError,
  resolveCompanyRouteContext
} from "@/features/company-workspace";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Human Review Queue | AssumerAI",
  description:
    "Internal queue of candidate-initiated human review requests with the relevant evaluator runs."
};

type QueueEntry = {
  readonly requestId: string;
  readonly userId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly summary: string;
  readonly evidenceNotes: string | null;
  readonly requestedAt: string;
  readonly evaluatorRuns: readonly EvaluatorRunSummary[];
};

type EvaluatorRunSummary = {
  readonly questionId: string;
  readonly competencyId: string;
  readonly moduleId: string;
  readonly barsScore: number;
  readonly barsLevel: string;
  readonly confidence: number;
  readonly source: string;
  readonly humanReviewRequired: boolean;
};

/**
 * Internal admin queue (company-context-gated like /admin/adverse-impact).
 * Lists open candidate review requests with the relevant evaluator runs; the
 * reviewer records uphold | adjust (with reason). The original evaluator runs
 * are displayed read-only and are never modified.
 */
export default async function AdminReviewQueuePage({
  searchParams
}: {
  readonly searchParams?: Promise<{ readonly error?: string; readonly resolved?: string }>;
}) {
  const companyContext = await resolveCompanyRouteContext("/admin/review-queue");
  if (isCompanyContextError(companyContext)) {
    redirect(
      companyContext.status === 401
        ? "/login?next=/admin/review-queue"
        : "/profile?error=company_account_required"
    );
  }

  const params = (await searchParams) ?? {};
  const entries = await readOpenReviewQueue();

  return (
    <main className="company-panel" style={{ margin: "48px auto", maxWidth: 960, padding: 24 }}>
      <h1>Human review queue</h1>
      <p>
        Candidate-initiated review requests. Outcomes are recorded as new audit
        records; the original evaluator runs stay immutable.
      </p>
      {params.error ? <p role="alert">Error: {params.error}</p> : null}
      {params.resolved ? <p role="status">Request {params.resolved} resolved.</p> : null}

      {entries.length === 0 ? (
        <p>No open review requests.</p>
      ) : (
        <ul style={{ display: "grid", gap: 24, listStyle: "none", padding: 0 }}>
          {entries.map((entry) => (
            <li key={entry.requestId} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
              <h2 style={{ fontSize: 16 }}>
                {entry.targetType} — {entry.targetId}
              </h2>
              <p>
                <strong>Requested:</strong> {entry.requestedAt}
              </p>
              <p>{entry.summary}</p>
              {entry.evidenceNotes ? <p>{entry.evidenceNotes}</p> : null}

              <h3 style={{ fontSize: 14 }}>Relevant evaluator runs (read-only)</h3>
              {entry.evaluatorRuns.length === 0 ? (
                <p>No evaluator runs recorded for this candidate.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Competency</th>
                      <th>BARS</th>
                      <th>Level</th>
                      <th>Confidence</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.evaluatorRuns.map((run, index) => (
                      <tr key={`${entry.requestId}_${run.questionId}_${index}`}>
                        <td>{run.moduleId}</td>
                        <td>{run.competencyId}</td>
                        <td>{run.barsScore}</td>
                        <td>{run.barsLevel}</td>
                        <td>{run.confidence}</td>
                        <td>{run.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <form
                action={`/admin/review-queue/${encodeURIComponent(entry.requestId)}/decision`}
                method="post"
                style={{ display: "grid", gap: 8, marginTop: 12 }}
              >
                <input name="userId" type="hidden" value={entry.userId} />
                <label>
                  Outcome
                  <select defaultValue="uphold" name="action">
                    <option value="uphold">Uphold original evaluation</option>
                    <option value="adjust">Adjust (reason required)</option>
                  </select>
                </label>
                <label>
                  Reason / note
                  <textarea name="reason" rows={2} />
                </label>
                <button type="submit">Record outcome</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

async function readOpenReviewQueue(): Promise<readonly QueueEntry[]> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return [];
  }

  const requestsResult = await admin
    .from("human_review_requests")
    .select("request_id,user_id,target_type,target_id,summary,evidence_notes,requested_at")
    .eq("status", "open")
    .order("requested_at", { ascending: true })
    .limit(50);
  if (requestsResult.error || !requestsResult.data) {
    return [];
  }

  const rows = requestsResult.data as Record<string, unknown>[];
  const entries: QueueEntry[] = [];
  for (const row of rows) {
    const userId = String(row.user_id ?? "");
    const runsResult = await admin
      .from("interview_evaluator_runs")
      .select("question_id,competency_id,module_id,bars_score,bars_level,confidence,source,human_review_required")
      .eq("candidate_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    const runs = runsResult.error ? [] : ((runsResult.data ?? []) as Record<string, unknown>[]);

    entries.push({
      requestId: String(row.request_id ?? ""),
      userId,
      targetType: String(row.target_type ?? ""),
      targetId: String(row.target_id ?? ""),
      summary: String(row.summary ?? ""),
      evidenceNotes: typeof row.evidence_notes === "string" ? row.evidence_notes : null,
      requestedAt: String(row.requested_at ?? ""),
      evaluatorRuns: runs.map((run) => ({
        questionId: String(run.question_id ?? ""),
        competencyId: String(run.competency_id ?? ""),
        moduleId: String(run.module_id ?? ""),
        barsScore: Number(run.bars_score ?? 0),
        barsLevel: String(run.bars_level ?? ""),
        confidence: Number(run.confidence ?? 0),
        source: String(run.source ?? ""),
        humanReviewRequired: Boolean(run.human_review_required)
      }))
    });
  }

  return entries;
}
