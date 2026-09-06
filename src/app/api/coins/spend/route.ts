import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { COST_STREAK_FREEZE, MAX_STREAK_FREEZES } from "@/lib/coins";
import { getTodayKey } from "@/lib/game-date";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action !== "buy_freeze") {
    // Do not charge for unsupported hints/attempts or reopen completed games.
    return NextResponse.json(
      { error: "feature_not_available" },
      { status: 400 },
    );
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const wallet = await tx.userWallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < COST_STREAK_FREEZE)
        throw new Error("insufficient_balance");
      if (wallet.streakFreezes >= MAX_STREAK_FREEZES)
        throw new Error("max_reached");
      const updated = await tx.userWallet.update({
        where: { userId },
        data: {
          balance: { decrement: COST_STREAK_FREEZE },
          streakFreezes: { increment: 1 },
        },
      });
      await tx.coinTransaction.create({
        data: {
          userId,
          amount: -COST_STREAK_FREEZE,
          reason: "buy_freeze",
          dateKey: getTodayKey(),
        },
      });
      return {
        success: true,
        balance: updated.balance,
        streakFreezes: updated.streakFreezes,
      };
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal";
    return NextResponse.json(
      {
        error:
          message === "insufficient_balance" || message === "max_reached"
            ? message
            : "internal",
      },
      {
        status:
          message === "insufficient_balance" || message === "max_reached"
            ? 400
            : 500,
      },
    );
  }
}
