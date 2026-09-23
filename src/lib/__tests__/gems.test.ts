import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { eligibleGemRewards } from "@/lib/gems";
import { BADGE_GEM_REWARDS, GEM_REWARD_KEYS } from "@/constants/gems";

const empty = { gamesWon: 0, maxStreak: 0, higherLowerBest: 0 };
describe("server gem eligibility", () => {
  it("earns nothing before doing an activity", () => {
    expect(eligibleGemRewards(empty)).toEqual([]);
  });
  it("ignores manually supplied collection counts and has no collection reward keys", () => {
    const collectionOnly = { ...empty, watched: 100_000, rated: 100_000 };
    expect(eligibleGemRewards(collectionOnly)).toEqual([]);
    expect(BADGE_GEM_REWARDS["first-film"]).toBe(0);
    expect(BADGE_GEM_REWARDS["film-collector"]).toBe(0);
    expect(GEM_REWARD_KEYS).toHaveLength(5);
    expect(GEM_REWARD_KEYS.some((key) => key.startsWith("rated:") || key === "badge:first-film" || key === "badge:film-collector")).toBe(false);
  });
  it.each([
    ["gamesWon", 1, "badge:daily-first-win", 25],
    ["maxStreak", 7, "badge:daily-streak-7", 100],
    ["higherLowerBest", 10, "badge:year-expert", 100],
    ["higherLowerBest", 25, "higher-lower:25", 75],
    ["higherLowerBest", 50, "higher-lower:50", 150],
  ] as const)("rewards %s at %i only when the milestone is reached", (field, target, rewardKey, amount) => {
    expect(eligibleGemRewards({ ...empty, [field]: target - 1 }).some((reward) => reward.rewardKey === rewardKey)).toBe(false);
    expect(eligibleGemRewards({ ...empty, [field]: target })).toContainEqual(expect.objectContaining({ rewardKey, amount }));
  });
});
