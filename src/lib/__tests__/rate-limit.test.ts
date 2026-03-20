import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests under the limit", () => {
    const result = rateLimit("test-a", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks remaining count correctly", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("test-b", { limit: 5, windowMs: 60_000 });
    }
    const result = rateLimit("test-b", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test-c", { limit: 5, windowMs: 60_000 });
    }
    const result = rateLimit("test-c", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test-d", { limit: 5, windowMs: 1_000 });
    }
    expect(rateLimit("test-d", { limit: 5, windowMs: 1_000 }).success).toBe(false);

    vi.advanceTimersByTime(1_001);

    const result = rateLimit("test-d", { limit: 5, windowMs: 1_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("isolates different keys", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("user-1", { limit: 5, windowMs: 60_000 });
    }
    expect(rateLimit("user-1", { limit: 5, windowMs: 60_000 }).success).toBe(false);
    expect(rateLimit("user-2", { limit: 5, windowMs: 60_000 }).success).toBe(true);
  });
});
