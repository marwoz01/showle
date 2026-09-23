import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { eligibleGemRewards } from "@/lib/gems";

const empty = { watched: 0, rated: 0, gamesWon: 0, maxStreak: 0, higherLowerBest: 0 };
describe("server gem eligibility", () => {
  it("earns nothing before doing an activity", () => {
    expect(eligibleGemRewards(empty)).toEqual([]);
  });
  it.each([
    ["watched", 1, "badge:first-film", 25],
    ["watched", 50, "badge:film-collector", 100],
    ["gamesWon", 1, "badge:daily-first-win", 25],
    ["maxStreak", 7, "badge:daily-streak-7", 100],
    ["higherLowerBest", 10, "badge:year-expert", 100],
    ["rated", 10, "rated:10", 25],
    ["rated", 25, "rated:25", 60],
    ["rated", 100, "rated:100", 150],
    ["higherLowerBest", 25, "higher-lower:25", 75],
    ["higherLowerBest", 50, "higher-lower:50", 150],
  ] as const)("rewards %s at %i only when the milestone is reached", (field, target, rewardKey, amount) => {
    expect(eligibleGemRewards({ ...empty, [field]: target - 1 }).some((reward) => reward.rewardKey === rewardKey)).toBe(false);
    expect(eligibleGemRewards({ ...empty, [field]: target })).toContainEqual(expect.objectContaining({ rewardKey, amount }));
  });
});
