import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error reporting helper. No-op when SENTRY_DSN is unset, so local
 * dev and tests never talk to Sentry. The correlationId travels as a tag so an
 * error report can be joined with the structured JSON logs for the request.
 */

export interface ServerErrorContext {
  readonly correlationId?: string;
  readonly route?: string;
  readonly candidateId?: string;
  readonly workspaceId?: string;
}

export function captureServerError(error: unknown, context: ServerErrorContext = {}): void {
  if (!process.env.SENTRY_DSN?.trim()) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context.correlationId) {
      scope.setTag("correlationId", context.correlationId);
    }
    if (context.route) {
      scope.setTag("route", context.route);
    }
    if (context.candidateId) {
      scope.setTag("candidateId", context.candidateId);
    }
    if (context.workspaceId) {
      scope.setTag("workspaceId", context.workspaceId);
    }
    Sentry.captureException(error);
  });
}
