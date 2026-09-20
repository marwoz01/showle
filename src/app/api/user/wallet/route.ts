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
    return NextResponse.json({ balance: wallet?.balance ?? 0, streakFreezes: (wallet?.streakFreezes ?? 0) - streak.freezesUsed },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    reportServerError("user.wallet", error);
    return NextResponse.json({ error: "wallet_unavailable" }, { status: 503 });
  }
}
