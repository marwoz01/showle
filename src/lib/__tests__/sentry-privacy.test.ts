import { describe, expect, it } from "vitest";
import type { Event } from "@sentry/nextjs";
import { sanitizeSentryEvent } from "@/lib/sentry-privacy";

describe("error telemetry privacy", () => {
  it("keeps stack locations while removing requests, identities, query tokens and recorded locals", () => {
    const event: Event = {
      user: { email: "private@example.com" }, tags: { userId: "private-user" }, extra: { body: "private-input" },
      request: { method: "POST", url: "https://user:secret@showle.test/api/movies?token=private#fragment", headers: { authorization: "Bearer private" }, data: "private-input", query_string: "token=private" },
      contexts: { trace: { trace_id: "trace-id", span_id: "span-id", data: { sql: "private-input" } }, private: { name: "private-user" } },
      breadcrumbs: [{ category: "fetch", message: "private-input", data: { url: "https://showle.test/api?token=private", body: "private-input" } }],
      exception: { values: [{ type: "TypeError", value: "private-input", stacktrace: { frames: [{ filename: "https://showle.test/app.js?token=private", function: "saveMovie", lineno: 42, vars: { input: "private-input" } }] } }] },
    };
    const safe = sanitizeSentryEvent(event);
    expect(JSON.stringify(safe)).not.toContain("private");
    expect(JSON.stringify(safe)).not.toContain("secret");
    expect(safe.exception?.values?.[0].stacktrace?.frames?.[0]).toMatchObject({ filename: "https://showle.test/app.js", function: "saveMovie", lineno: 42 });
    expect(safe.request).toEqual({ method: "POST", url: "https://showle.test/api/movies" });
  });
});
