import type { Breadcrumb, Event } from "@sentry/nextjs";

function publicUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = ""; url.password = ""; url.search = ""; url.hash = "";
    return url.toString();
  } catch { return value.split(/[?#]/, 1)[0]; }
}

export function sanitizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const data: Record<string, string | number> = {};
  for (const key of ["url", "from", "to"]) {
    if (typeof breadcrumb.data?.[key] === "string") data[key] = publicUrl(breadcrumb.data[key]);
  }
  if (typeof breadcrumb.data?.status_code === "number") data.status_code = breadcrumb.data.status_code;
  return { timestamp: breadcrumb.timestamp, type: breadcrumb.type, category: breadcrumb.category, level: breadcrumb.level, data };
}

export function sanitizeSentryEvent<T extends Event>(event: T): T {
  const tags: Record<string, string> = {};
  for (const key of ["operation", "error_id"]) {
    const value = event.tags?.[key];
    if (typeof value === "string" && /^[a-z0-9_.-]{1,80}$/.test(value)) tags[key] = value;
  }
  return {
    ...event,
    user: undefined, extra: undefined, message: undefined, logentry: undefined,
    tags,
    transaction: event.transaction ? publicUrl(event.transaction) : undefined,
    contexts: {
      trace: event.contexts?.trace ? { ...event.contexts.trace, data: undefined } : undefined,
      runtime: event.contexts?.runtime, browser: event.contexts?.browser, os: event.contexts?.os,
    },
    request: event.request ? { method: event.request.method, url: event.request.url ? publicUrl(event.request.url) : undefined } : undefined,
    breadcrumbs: event.breadcrumbs?.map(sanitizeBreadcrumb),
    exception: event.exception ? { ...event.exception, values: event.exception.values?.map((value) => ({
      ...value,
      type: /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(value.type ?? "") ? value.type : "Error",
      mechanism: value.mechanism ? { ...value.mechanism, data: undefined } : undefined,
      value: /^[a-z0-9_.-]{1,80} failed$/.test(value.value ?? "") ? value.value : "Application error; see stack trace",
      stacktrace: value.stacktrace ? { ...value.stacktrace, frames: value.stacktrace.frames?.map((frame) => ({
        ...frame, vars: undefined,
        filename: frame.filename ? publicUrl(frame.filename) : undefined,
        abs_path: frame.abs_path ? publicUrl(frame.abs_path) : undefined,
      })) } : undefined,
    })) } : undefined,
    spans: event.spans?.map((span) => ({ ...span, description: span.op, data: undefined })),
  };
}
