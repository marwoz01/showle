import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BADGE_GEM_REWARDS, GEM_REWARD_KEYS, HIGHER_LOWER_MILESTONES, RATED_COLLECTION_MILESTONES } from "@/constants/gems";
import type { ProfileBadge } from "@/types/profile";
import type { GemsWallet } from "@/types/gems";

interface GemReward { rewardKey: string; amount: number; reason: string }
interface GemProgress { watched: number; rated: number; gamesWon: number; maxStreak: number; higherLowerBest: number }

export function eligibleGemRewards(progress: GemProgress): GemReward[] {
  const badges: [ProfileBadge["id"], boolean][] = [
    ["first-film", progress.watched >= 1],
    ["film-collector", progress.watched >= 50],
    ["daily-first-win", progress.gamesWon >= 1],
    ["daily-streak-7", progress.maxStreak >= 7],
    ["year-expert", progress.higherLowerBest >= 10],
  ];
  return [
    ...badges.filter(([, unlocked]) => unlocked).map(([id]) => ({ rewardKey: `badge:${id}`, amount: BADGE_GEM_REWARDS[id], reason: "badge_reward" })),
    ...RATED_COLLECTION_MILESTONES.filter(({ target }) => progress.rated >= target).map(({ target, amount }) => ({ rewardKey: `rated:${target}`, amount, reason: "rated_collection_reward" })),
    ...HIGHER_LOWER_MILESTONES.filter(({ target }) => progress.higherLowerBest >= target).map(({ target, amount }) => ({ rewardKey: `higher-lower:${target}`, amount, reason: "higher_lower_reward" })),
  ];
}

export async function lockGemWallet(tx: Prisma.TransactionClient, userId: string) {
  // Match profile reset before the existing daily/spending lock to prevent credit/reset races.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"profile:" + userId}))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}

export async function getGemWallet(userId: string): Promise<GemsWallet> {
  return prisma.$transaction(async (tx) => {
    await lockGemWallet(tx, userId);
    const [watched, rated, stats, record, received] = await Promise.all([
      tx.savedMovie.count({ where: { userId, category: "watched" } }),
      tx.savedMovie.count({ where: { userId, category: "watched", rating: { not: null } } }),
      tx.userStats.findUnique({ where: { userId }, select: { gamesWon: true, maxStreak: true } }),
      tx.higherLowerRecord.findUnique({ where: { userId }, select: { bestScore: true } }),
      tx.coinTransaction.findMany({ where: { userId, rewardKey: { in: GEM_REWARD_KEYS } }, select: { rewardKey: true } }),
    ]);
    const earnedKeys = new Set(received.flatMap(({ rewardKey }) => rewardKey ? [rewardKey] : []));
    const pending = eligibleGemRewards({ watched, rated, gamesWon: stats?.gamesWon ?? 0, maxStreak: stats?.maxStreak ?? 0, higherLowerBest: record?.bestScore ?? 0 }).filter(({ rewardKey }) => !earnedKeys.has(rewardKey));
    const amount = pending.reduce((sum, reward) => sum + reward.amount, 0);
    const wallet = await tx.userWallet.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
    });
    if (pending.length) await tx.coinTransaction.createMany({ data: pending.map((reward) => ({ ...reward, userId })) });
    const transactions = await tx.coinTransaction.findMany({
      where: { userId, amount: { gt: 0 } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 12,
      select: { id: true, amount: true, reason: true, dateKey: true, createdAt: true, rewardKey: true },
    });
    return {
      balance: wallet.balance, streakFreezes: wallet.streakFreezes,
      earnedRewardKeys: [...earnedKeys, ...pending.map(({ rewardKey }) => rewardKey)],
      transactions: transactions.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
    };
  }, { timeout: 15_000 });
}
