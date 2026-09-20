import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";

export function reportServerError(operation: string, error: unknown): string {
  const id = randomUUID();
  const name = error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)
    ? error.name : "Error";
  const safeOperation = /^[a-z0-9_.-]{1,80}$/.test(operation) ? operation : "server.request";
  // Raw error messages, causes and request context can contain SQL, tokens or user input.
  const sanitized = new Error(`${safeOperation} failed`);
  sanitized.name = name;
  Sentry.withScope((scope) => {
    scope.clear();
    scope.setTag("operation", safeOperation);
    scope.setTag("error_id", id);
    scope.addEventProcessor((event) => ({
      ...event, request: undefined, user: undefined, breadcrumbs: undefined,
      extra: undefined, contexts: undefined,
    }));
    Sentry.captureException(sanitized);
  });
  console.error(JSON.stringify({ event: "server_error", operation: safeOperation, error: name, id }));
  return id;
}
