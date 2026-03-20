import { describe, it, expect } from "vitest";

const POOL_SIZE = 4941;

function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getDailyIndex(dateStr: string): number {
  const recentIndices = new Set<number>();
  const date = new Date(dateStr + "T00:00:00");

  for (let d = 1; d <= 90; d++) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - d);
    const prevStr = prev.toISOString().slice(0, 10);
    const prevHash = hashDate(prevStr);
    recentIndices.add(prevHash % POOL_SIZE);
  }

  const baseHash = hashDate(dateStr);
  let index = baseHash % POOL_SIZE;

  let attempt = 0;
  while (recentIndices.has(index) && attempt < POOL_SIZE) {
    attempt++;
    index = (baseHash + attempt) % POOL_SIZE;
  }

  return index;
}

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
    const date = new Date(dateStr + "T00:00:00");

    for (let d = 1; d <= 90; d++) {
      const prev = new Date(date);
      prev.setDate(prev.getDate() - d);
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

    // 365 days should produce at least 350 unique indices from a pool of 4941
    expect(indices.size).toBeGreaterThan(350);
  });
});
