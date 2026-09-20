import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ query: vi.fn(), report: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: db.query } }));
vi.mock("@/lib/server-error", () => ({ reportServerError: db.report }));
import { checkRateLimit } from "@/lib/rate-limit";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NODE_ENV", "production"); });
afterEach(() => vi.unstubAllEnvs());

describe("deployment-wide rate limit", () => {
  it("uses the shared atomic count and never stores the raw identity", async () => {
    db.query.mockResolvedValueOnce([{ count: 3 }]).mockResolvedValueOnce([{ count: 6 }]);
    expect(await checkRateLimit("private-user:203.0.113.5", { limit: 5, windowMs: 60000, cost: 3 })).toEqual({ success: true, remaining: 2 });
    expect(await checkRateLimit("private-user:203.0.113.5", { limit: 5, windowMs: 60000, cost: 3 })).toEqual({ success: false, remaining: 0 });
    const [parts, hash] = db.query.mock.calls[0];
    expect(parts.join("")).toContain('ON CONFLICT ("key") DO UPDATE');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(db.query.mock.calls)).not.toContain("private-user");
    expect(db.query.mock.calls[1][1]).toBe(hash);
  });
  it("fails closed on storage errors even if local memory was explicitly requested", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "memory");
    const error = new Error("secret connection data");
    db.query.mockRejectedValue(error);
    expect(await checkRateLimit("key", { limit: 5, windowMs: 60000 })).toEqual({ success: false, remaining: 0, unavailable: true });
    expect(db.report).toHaveBeenCalledWith("rate_limit.storage", error);
  });
  it("rejects malformed budgets before touching persistent storage", async () => {
    for (const limit of [0, -1, NaN, 1.5, 10000001]) {
      expect((await checkRateLimit("key", { limit, windowMs: 60000 })).success).toBe(false);
    }
    expect((await checkRateLimit("key", { limit: 5, windowMs: 0 })).success).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });
});
