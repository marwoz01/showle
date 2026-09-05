import { describe, expect, it } from "vitest";
import { buildDailyPerformanceSummary } from "@/lib/daily-summary";
import { MAX_ATTEMPTS } from "@/constants";

describe("buildDailyPerformanceSummary", () => {
  it("orders wins by attempt count and places losses last", () => {
    const results = [
      { status: "won", attemptCount: 1 },
      { status: "won", attemptCount: 2 },
      { status: "won", attemptCount: 4 },
      { status: "lost", attemptCount: 6 },
    ];

    expect(
      buildDailyPerformanceSummary(results, results[1]).betterThan,
    ).toBe(63);
  });

  it("builds one bucket per attempt plus a loss bucket", () => {
    const summary = buildDailyPerformanceSummary(
      [
        { status: "won", attemptCount: 2 },
        { status: "won", attemptCount: 2 },
        { status: "lost", attemptCount: 3 },
      ],
      { status: "won", attemptCount: 2 },
    );

    expect(summary.distribution).toHaveLength(MAX_ATTEMPTS + 1);
    expect(summary.distribution[1]).toMatchObject({ count: 2, attempt: 2 });
    expect(summary.distribution.at(-1)).toMatchObject({ count: 1, attempt: null });
  });

  it("uses the current result when no aggregate sample exists", () => {
    const summary = buildDailyPerformanceSummary([], {
      status: "won",
      attemptCount: 3,
    });

    expect(summary.playerCount).toBe(1);
    expect(summary.betterThan).toBe(50);
    expect(summary.distribution[2].count).toBe(1);
  });
});
