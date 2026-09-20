import { reportServerError } from "@/lib/server-error";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/game-date";
import { resolveStreak } from "@/lib/streak";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const [stats, wallet] = await prisma.$transaction([
      prisma.userStats.findUnique({ where: { userId } }),
      prisma.userWallet.findUnique({ where: { userId } }),
    ], { isolationLevel: "RepeatableRead" });
    const streak = resolveStreak(stats, wallet?.streakFreezes ?? 0, getTodayKey());
    return NextResponse.json({
      gamesPlayed: stats?.gamesPlayed ?? 0, gamesWon: stats?.gamesWon ?? 0,
      currentStreak: streak.currentStreak, maxStreak: stats?.maxStreak ?? 0,
      averageGuesses: Math.round((stats?.averageGuesses ?? 0) * 10) / 10,
      coinBalance: wallet?.balance ?? 0, streakFreezes: (wallet?.streakFreezes ?? 0) - streak.freezesUsed,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    reportServerError("user.stats", error);
    return NextResponse.json({ error: "stats_unavailable" }, { status: 503 });
  }
}
