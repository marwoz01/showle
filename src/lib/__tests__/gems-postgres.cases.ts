import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { getGemWallet } from "@/lib/gems";
import { deleteProfileData, exportProfileData } from "@/lib/user-profile-data";

vi.mock("@/lib/daily", () => ({ getDailyMovieId: () => 42 }));
vi.mock("@/lib/movie-snapshot", () => ({ getMovieSnapshot: async (_dateKey: string, id: number) => ({ id, title: "Test film", year: 2000, posterPath: "/poster.jpg" }) }));
import { applyDailyAction } from "@/lib/daily-game";

export function gemsPostgresCases(client: () => PrismaClient) {
  const seedCollection = () => client().savedMovie.createMany({ data: Array.from({ length: 1000 }, (_, index) => ({ userId: "viewer", tmdbId: index + 1, title: `Film ${index}`, year: 2000, posterPath: "", genres: [], category: "watched", rating: 8 })) });
  const seed = async () => {
    await seedCollection();
    await client().userStats.create({ data: { userId: "viewer", gamesWon: 1, maxStreak: 7 } });
    await client().higherLowerRecord.create({ data: { userId: "viewer", bestScore: 50 } });
  };
  describe("gem credits on real PostgreSQL", () => {
    it("reconciles eight concurrent reads once and preserves legacy balance/ledger rows", async () => {
      await seed();
      await client().userWallet.create({ data: { userId: "viewer", balance: 90 } });
      await client().coinTransaction.createMany({ data: [
        ...[1, 2].map(() => ({ userId: "viewer", amount: 20, reason: "win_reward" })),
        { userId: "viewer", amount: 25, reason: "badge_reward", rewardKey: "badge:first-film" },
        { userId: "viewer", amount: 25, reason: "rated_collection_reward", rewardKey: "rated:10" },
      ] });
      const wallets = await Promise.all(Array.from({ length: 8 }, () => getGemWallet("viewer")));
      expect(wallets.every((wallet) => wallet.balance === 540)).toBe(true);
      expect(wallets.every((wallet) => wallet.earnedRewardKeys.length === 5)).toBe(true);
      const ledger = await client().coinTransaction.findMany({ where: { userId: "viewer" } });
      expect(ledger).toHaveLength(9);
      expect(ledger.reduce((sum, entry) => sum + entry.amount, 0)).toBe(540);
      expect(wallets[0].transactions).toContainEqual(expect.objectContaining({ rewardKey: "rated:10", amount: 25 }));
      expect(wallets[0].transactions).toContainEqual(expect.objectContaining({ rewardKey: "badge:first-film", amount: 25 }));
      expect((await getGemWallet("other")).balance).toBe(0);
      await expect(client().coinTransaction.create({ data: { userId: "viewer", amount: 25, reason: "badge_reward", rewardKey: "badge:daily-first-win" } })).rejects.toThrow();
      expect((await exportProfileData("viewer")).transactions).toHaveLength(9);
    });
    it("never rewards adding or rating films, including collection removal and re-addition", async () => {
      await seedCollection();
      expect((await getGemWallet("viewer")).balance).toBe(0);
      await client().savedMovie.deleteMany({ where: { userId: "viewer" } });
      await seedCollection();
      expect((await getGemWallet("viewer")).balance).toBe(0);
      expect(await client().coinTransaction.count({ where: { userId: "viewer" } })).toBe(0);
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
