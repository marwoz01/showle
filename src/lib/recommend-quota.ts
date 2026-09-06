import { prisma } from "@/lib/prisma";

// Commit the reservation before any provider work. A failed/empty expensive
// attempt remains charged; only invalid input is rejected before reservation.
export async function reserveRecommendation(key: string, date: string, limit: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"quota:" + key}))`;
    const usage = await tx.dailyUsage.findUnique({ where: { key } });
    if ((usage?.count ?? 0) >= limit) return null;
    const reserved = await tx.dailyUsage.upsert({
      where: { key },
      update: { count: { increment: 1 } },
      create: { key, count: 1, date },
    });
    return Math.max(0, limit - reserved.count);
  });
}
