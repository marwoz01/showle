import { afterEach, describe, expect, it, vi } from "vitest";
const sentry = vi.hoisted(() => ({ capture: vi.fn(), clear: vi.fn(), tag: vi.fn(), processor: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({
  captureException: sentry.capture,
  withScope: (callback: (scope: unknown) => void) => callback({ clear: sentry.clear, setTag: sentry.tag, addEventProcessor: sentry.processor }),
}));
import { reportServerError } from "@/lib/server-error";
afterEach(() => vi.restoreAllMocks());

describe("safe server error reporting", () => {
  it("keeps a correlation ID while excluding raw error and ambient request data", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = reportServerError("collection.write", new Error("postgresql://user:secret@host data user@example.com"));
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const error = sentry.capture.mock.calls[0][0] as Error;
    expect(error.message).toBe("collection.write failed");
    expect(error.stack).not.toContain("secret");
    const sanitize = sentry.processor.mock.calls[0][0];
    expect(sanitize({ request: { headers: { authorization: "secret" } }, user: { email: "user@example.com" }, breadcrumbs: ["private"], extra: { sql: "private" } }))
      .toMatchObject({ request: undefined, user: undefined, breadcrumbs: undefined, extra: undefined });
    expect(sentry.clear).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    expect(JSON.stringify(log.mock.calls)).toContain(id);
  });
});
