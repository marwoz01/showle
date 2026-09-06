import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getTodayKey, previousDateKey, normalizeStoredDate } from "@/lib/game-date";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const stats = await tx.userStats.findUnique({ where: { userId } });
    const lastPlayed = normalizeStoredDate(stats?.lastPlayedDate);
    const today = getTodayKey();
    const yesterday = previousDateKey(today);
    if (!stats || !lastPlayed || lastPlayed >= yesterday || stats.currentStreak === 0) return { status: "ok" };
    const wallet = await tx.userWallet.findUnique({ where: { userId } });
    const missedDays = Math.round((Date.parse(yesterday) - Date.parse(lastPlayed)) / 86400000);
    if (wallet && missedDays > 0 && wallet.streakFreezes >= missedDays) {
      await tx.userWallet.update({ where: { userId }, data: { streakFreezes: { decrement: missedDays } } });
      await tx.coinTransaction.create({ data: { userId, amount: 0, reason: "use_freeze", dateKey: today } });
      await tx.userStats.update({ where: { userId }, data: { lastPlayedDate: yesterday } });
      return { status: "freeze_used", remainingFreezes: wallet.streakFreezes - missedDays };
    }
    await tx.userStats.update({ where: { userId }, data: { currentStreak: 0, lastPlayedDate: yesterday } });
    return { status: "streak_broken", previousStreak: stats.currentStreak };
  }, { timeout: 15000 });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
