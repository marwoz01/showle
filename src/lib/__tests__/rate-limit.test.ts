import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe("bounded weighted rate limiter", () => {
  it("allows requests under the limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    expect(rateLimit("test-a", { limit: 5, windowMs: 60000 })).toEqual({ success: true, remaining: 4 });
  });
  it("tracks remaining count correctly", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 3; i++) rateLimit("test-b", { limit: 5, windowMs: 60000 });
    expect(rateLimit("test-b", { limit: 5, windowMs: 60000 })).toEqual({ success: true, remaining: 1 });
  });
  it("blocks requests over the limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 5; i++) rateLimit("test-c", { limit: 5, windowMs: 60000 });
    expect(rateLimit("test-c", { limit: 5, windowMs: 60000 })).toEqual({ success: false, remaining: 0 });
  });
  it("resets after the window expires", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 5; i++) rateLimit("test-d", { limit: 5, windowMs: 1000 });
    expect(rateLimit("test-d", { limit: 5, windowMs: 1000 }).success).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("test-d", { limit: 5, windowMs: 1000 })).toEqual({ success: true, remaining: 4 });
  });
  it("isolates different keys", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 5; i++) rateLimit("user-1", { limit: 5, windowMs: 60000 });
    expect(rateLimit("user-1", { limit: 5, windowMs: 60000 }).success).toBe(false);
    expect(rateLimit("user-2", { limit: 5, windowMs: 60000 }).success).toBe(true);
  });
  it("charges by operation count, then resets at expiration", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const options = { limit: 1000, windowMs: 60000, cost: 500 };
    expect(rateLimit("budget", options)).toEqual({ success: true, remaining: 500 });
    expect(rateLimit("budget", options).success).toBe(true);
    expect(rateLimit("budget", { ...options, cost: 1 }).success).toBe(false);
    vi.advanceTimersByTime(60001);
    expect(rateLimit("budget", options).success).toBe(true);
  });
  it("fails closed at the key cap without evicting live budgets", async () => {
    const { rateLimit, MAX_RATE_LIMIT_KEYS } = await import("@/lib/rate-limit");
    const options = { limit: 1, windowMs: 1000 };
    for (let i = 0; i < MAX_RATE_LIMIT_KEYS; i++) expect(rateLimit(`key-${i}`, options).success).toBe(true);
    expect(rateLimit("extra", options).success).toBe(false);
    expect(rateLimit("key-0", options).success).toBe(false);
    vi.advanceTimersByTime(60001);
    expect(rateLimit("extra", options).success).toBe(true);
  });
  it("rejects malformed costs and oversized keys", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (const cost of [0, -1, 1.5, NaN, 11]) expect(rateLimit("key", { limit: 10, windowMs: 60000, cost }).success).toBe(false);
    expect(rateLimit("x".repeat(513), { limit: 10, windowMs: 60000 }).success).toBe(false);
  });
});
