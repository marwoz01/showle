import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function assertUser(userId: string) {
  if (!/^user_[A-Za-z0-9_-]+$/.test(userId)) throw new Error("Invalid account identifier");
}

export async function exportAccountData(userId: string) {
  assertUser(userId);
  return prisma.$transaction(async (tx) => {
    const [collection, rankings, games, stats, wallet, transactions, feedback, preferences, usage] = await Promise.all([
      tx.savedMovie.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      tx.rankedList.findMany({ where: { userId }, include: { items: { orderBy: { position: "asc" } } } }),
      tx.gameResult.findMany({ where: { userId }, orderBy: { completedAt: "asc" } }),
      tx.userStats.findUnique({ where: { userId } }), tx.userWallet.findUnique({ where: { userId } }),
      tx.coinTransaction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      tx.recommendationFeedback.findMany({ where: { userId } }),
      tx.recommendationSettings.findUnique({ where: { userId } }),
      tx.$queryRaw<{ key: string; count: number; date: string; updatedAt: Date }[]>`
        SELECT key, count, date, "updatedAt" FROM "DailyUsage"
        WHERE split_part(key, ':', 1) = 'recommend' AND split_part(key, ':', 2) = ${userId}
        ORDER BY date
      `,
    ]);
    return { version: 1, exportedAt: new Date().toISOString(), collection, rankings, games,
      stats, wallet, transactions, feedback, preferences, usage };
  }, { isolationLevel: "RepeatableRead", timeout: 15000 });
}

export async function clearAccountData(userId: string, accountDeleted = false) {
  assertUser(userId);
  // A single transaction also makes duplicate Clerk deletion deliveries safe to retry.
  await prisma.$transaction(async (tx) => {
    if (accountDeleted) await tx.$executeRaw`
      INSERT INTO "AccountDeletionTask" ("userId", "retryAfter") VALUES (${userId}, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
      ON CONFLICT ("userId") DO UPDATE SET "retryAfter" = EXCLUDED."retryAfter"
    `;
    await eraseRows(tx, userId, accountDeleted);
  }, { timeout: 15000 });
}

async function eraseRows(tx: Prisma.TransactionClient, users: string | string[], removeQuota: boolean) {
  const where = { userId: Array.isArray(users) ? { in: users } : users };
  await tx.rankedList.deleteMany({ where });
  await tx.savedMovie.deleteMany({ where });
  await tx.gameResult.deleteMany({ where });
  await tx.userStats.deleteMany({ where });
  await tx.userWallet.deleteMany({ where });
  await tx.coinTransaction.deleteMany({ where });
  await tx.recommendationFeedback.deleteMany({ where });
  await tx.recommendationSettings.deleteMany({ where });
  // An active user's app reset must retain the paid-provider quota.
  if (removeQuota) await tx.$executeRaw`
    DELETE FROM "DailyUsage" WHERE split_part(key, ':', 1) = 'recommend'
      AND split_part(key, ':', 2) = ANY(${Array.isArray(users) ? users : [users]}::text[])
  `;
}

export async function processAccountDeletionTasks(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const tasks = await tx.$queryRaw<{ userId: string }[]>`
      SELECT "userId" FROM "AccountDeletionTask" WHERE "retryAfter" <= CURRENT_TIMESTAMP
      ORDER BY "retryAfter" LIMIT 10 FOR UPDATE SKIP LOCKED
    `;
    if (!tasks.length) return 0;
    const users = tasks.map(({ userId }) => { assertUser(userId); return userId; });
    await eraseRows(tx, users, true);
    await tx.$executeRaw`DELETE FROM "AccountDeletionTask" WHERE "userId" = ANY(${users}::text[])`;
    return users.length;
  }, { timeout: 15000 });
}
