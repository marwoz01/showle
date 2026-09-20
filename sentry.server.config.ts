import * as Sentry from "@sentry/nextjs";
import { sanitizeBreadcrumb, sanitizeSentryEvent } from "@/lib/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  beforeBreadcrumb: sanitizeBreadcrumb,
  beforeSend: sanitizeSentryEvent,
  beforeSendTransaction: sanitizeSentryEvent,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
