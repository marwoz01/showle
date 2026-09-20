import * as Sentry from "@sentry/nextjs";
import { sanitizeBreadcrumb, sanitizeSentryEvent } from "@/lib/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Replay stays disabled until a separate explicit-consent flow exists.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeBreadcrumb: sanitizeBreadcrumb,
  beforeSend: sanitizeSentryEvent,
  beforeSendTransaction: sanitizeSentryEvent,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
