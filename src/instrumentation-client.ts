import * as Sentry from "@sentry/nextjs";

/**
 * Browser Sentry bootstrap (Next.js client instrumentation hook).
 * A complete no-op unless NEXT_PUBLIC_SENTRY_DSN is configured.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "production",
    tracesSampleRate: 0
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
