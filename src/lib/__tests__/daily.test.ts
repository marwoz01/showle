import { describe, it, expect } from "vitest";
import { hashDate, getDailyIndex } from "@/lib/daily";
import { getTodayKey, getTimeUntilReset } from "@/lib/game-date";
import pool from "@/data/eligible-movies.json";
const POOL_SIZE = pool.length;

describe("hashDate", () => {
  it("returns a non-negative number", () => {
    expect(hashDate("2026-03-20")).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic", () => {
    expect(hashDate("2026-01-15")).toBe(hashDate("2026-01-15"));
  });

  it("produces different hashes for different dates", () => {
    expect(hashDate("2026-01-01")).not.toBe(hashDate("2026-01-02"));
  });
});

describe("getDailyIndex", () => {
  it("returns an index within the pool range", () => {
    const index = getDailyIndex("2026-03-20");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(POOL_SIZE);
  });

  it("is deterministic", () => {
    expect(getDailyIndex("2026-06-15")).toBe(getDailyIndex("2026-06-15"));
  });

  it("produces different indices for consecutive dates", () => {
    expect(getDailyIndex("2026-03-01")).not.toBe(getDailyIndex("2026-03-02"));
  });

  it("avoids collision with raw modulo of previous 90 days", () => {
    // For any given date, its index should not match the raw modulo
    // of any of the previous 90 days
    const dateStr = "2026-06-01";
    const index = getDailyIndex(dateStr);
    const date = new Date(dateStr + "T12:00:00Z");

    for (let d = 1; d <= 90; d++) {
      const prev = new Date(date);
      prev.setUTCDate(prev.getUTCDate() - d);
      const prevStr = prev.toISOString().slice(0, 10);
      const rawIndex = hashDate(prevStr) % POOL_SIZE;
      expect(index).not.toBe(rawIndex);
    }
  });

  it("covers a good spread of the pool over a year", () => {
    const indices = new Set<number>();
    const startDate = new Date("2026-01-01");

    for (let d = 0; d < 365; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      indices.add(getDailyIndex(dateStr));
    }

    // Use the real pool (not the old hard-coded 4,941-entry test copy).
    // Coverage should be at least 90% of uniform sampling's expected unique count.
    const expectedUnique = POOL_SIZE * (1 - (1 - 1 / POOL_SIZE) ** 365);
    expect(indices.size).toBeGreaterThan(expectedUnique * 0.9);
  });
});

describe("Warsaw day boundary", () => {
  it("uses Warsaw dates irrespective of the caller's timezone", () => {
    expect(getTodayKey(new Date("2026-09-06T22:30:00Z"))).toBe("2026-09-07");
  });
  it("counts down to midnight across the spring DST change", () => {
    expect(getTimeUntilReset(new Date("2026-03-28T23:00:00Z"))).toBe(
      23 * 3600000,
    );
  });
  it("counts down to midnight across the autumn DST change", () => {
    expect(getTimeUntilReset(new Date("2026-10-24T22:00:00Z"))).toBe(
      25 * 3600000,
    );
  });
});
