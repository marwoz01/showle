import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { getGemWallet } from "@/lib/gems";
import { deleteProfileData, exportProfileData } from "@/lib/user-profile-data";

vi.mock("@/lib/daily", () => ({ getDailyMovieId: () => 42 }));
vi.mock("@/lib/movie-snapshot", () => ({ getMovieSnapshot: async (_dateKey: string, id: number) => ({ id, title: "Test film", year: 2000, posterPath: "/poster.jpg" }) }));
import { applyDailyAction } from "@/lib/daily-game";

export function gemsPostgresCases(client: () => PrismaClient) {
  const seed = async () => {
    await client().savedMovie.createMany({ data: Array.from({ length: 100 }, (_, index) => ({ userId: "viewer", tmdbId: index + 1, title: `Film ${index}`, year: 2000, posterPath: "", genres: [], category: "watched", rating: 8 })) });
    await client().userStats.create({ data: { userId: "viewer", gamesWon: 1, maxStreak: 7 } });
    await client().higherLowerRecord.create({ data: { userId: "viewer", bestScore: 50 } });
  };
  describe("gem credits on real PostgreSQL", () => {
    it("reconciles eight concurrent reads once and preserves legacy balance/ledger rows", async () => {
      await seed();
      await client().userWallet.create({ data: { userId: "viewer", balance: 40 } });
      await client().coinTransaction.createMany({ data: [1, 2].map(() => ({ userId: "viewer", amount: 20, reason: "win_reward" })) });
      const wallets = await Promise.all(Array.from({ length: 8 }, () => getGemWallet("viewer")));
      expect(wallets.every((wallet) => wallet.balance === 850)).toBe(true);
      expect(wallets.every((wallet) => wallet.earnedRewardKeys.length === 10)).toBe(true);
      const ledger = await client().coinTransaction.findMany({ where: { userId: "viewer" } });
      expect(ledger).toHaveLength(12);
      expect(ledger.reduce((sum, entry) => sum + entry.amount, 0)).toBe(850);
      expect((await getGemWallet("other")).balance).toBe(0);
      await expect(client().coinTransaction.create({ data: { userId: "viewer", amount: 25, reason: "badge_reward", rewardKey: "badge:first-film" } })).rejects.toThrow();
      expect((await exportProfileData("viewer")).transactions).toHaveLength(12);
    });
    it("does not repay milestones after collection removal and re-addition", async () => {
      await seed();
      expect((await getGemWallet("viewer")).balance).toBe(810);
      await client().savedMovie.deleteMany({ where: { userId: "viewer" } });
      expect((await getGemWallet("viewer")).balance).toBe(810);
      await client().savedMovie.create({ data: { userId: "viewer", tmdbId: 1, title: "Film", year: 2000, posterPath: "", genres: [], category: "watched", rating: 7 } });
      expect((await getGemWallet("viewer")).balance).toBe(810);
      expect(await client().coinTransaction.count({ where: { userId: "viewer" } })).toBe(10);
    });
    it("serializes daily wins with reconciliation and credits each day only once", async () => {
      await Promise.all([
        ...Array.from({ length: 4 }, () => applyDailyAction("viewer", "2026-09-23", { type: "guess", movieId: 42 }, true)),
        ...Array.from({ length: 4 }, () => getGemWallet("viewer")),
      ]);
      const wallet = await getGemWallet("viewer");
      expect(wallet.balance).toBe(75);
      expect(await client().coinTransaction.count({ where: { userId: "viewer", rewardKey: "daily:2026-09-23" } })).toBe(1);
      expect(await client().userStats.findUnique({ where: { userId: "viewer" } })).toMatchObject({ gamesPlayed: 1, gamesWon: 1 });
      await applyDailyAction("viewer", "2026-09-24", { type: "guess", movieId: 1 }, true);
      await Promise.all(Array.from({ length: 4 }, () => applyDailyAction("viewer", "2026-09-24", { type: "give-up" }, true)));
      expect((await getGemWallet("viewer")).balance).toBe(80);
    });
    it("does not leave stale credits when profile reset races wallet reconciliation", async () => {
      await seed();
      await Promise.all([getGemWallet("viewer"), deleteProfileData("viewer")]);
      const wallet = await client().userWallet.findUnique({ where: { userId: "viewer" } });
      expect(wallet?.balance ?? 0).toBe(0);
      expect(await client().coinTransaction.count({ where: { userId: "viewer" } })).toBe(0);
      expect((await getGemWallet("viewer")).balance).toBe(0);
    });
  });
}
