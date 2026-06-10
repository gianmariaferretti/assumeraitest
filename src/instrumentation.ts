import * as Sentry from "@sentry/nextjs";

/**
 * Server/edge Sentry bootstrap (Next.js instrumentation hook).
 * A complete no-op unless SENTRY_DSN is configured.
 */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: readSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE)
  });
}

/** Report uncaught request errors from App Router handlers to Sentry. */
export const onRequestError = Sentry.captureRequestError;

function readSampleRate(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}
