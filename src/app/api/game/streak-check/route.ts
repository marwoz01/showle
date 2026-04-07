import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function getTodayKey(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getYesterdayKey(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await prisma.userStats.findUnique({ where: { userId } });

  // No stats or never played → nothing to check
  if (!stats || !stats.lastPlayedDate) {
    return NextResponse.json({ status: "ok" });
  }

  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  // Played today or yesterday → streak is fine
  if (stats.lastPlayedDate === today || stats.lastPlayedDate === yesterday) {
    return NextResponse.json({ status: "ok" });
  }

  // Streak is already 0 → nothing to break
  if (stats.currentStreak === 0) {
    return NextResponse.json({ status: "ok" });
  }

  // Missed more than 1 day — check for freeze
  const wallet = await prisma.userWallet.findUnique({ where: { userId } });

  if (wallet && wallet.streakFreezes > 0) {
    // Use freeze
    await prisma.$transaction([
      prisma.userWallet.update({
        where: { userId },
        data: { streakFreezes: { decrement: 1 } },
      }),
      prisma.coinTransaction.create({
        data: { userId, amount: 0, reason: "use_freeze" },
      }),
      // Update lastPlayedDate to yesterday so this check becomes idempotent
      prisma.userStats.update({
        where: { userId },
        data: { lastPlayedDate: yesterday },
      }),
    ]);

    return NextResponse.json({
      status: "freeze_used",
      remainingFreezes: wallet.streakFreezes - 1,
    });
  }

  // No freeze — break streak
  const previousStreak = stats.currentStreak;
  await prisma.userStats.update({
    where: { userId },
    data: { currentStreak: 0, lastPlayedDate: yesterday },
  });

  return NextResponse.json({
    status: "streak_broken",
    previousStreak,
  });
}
