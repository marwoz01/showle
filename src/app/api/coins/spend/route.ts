import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { COST_HINT, COST_EXTRA_ATTEMPT, COST_STREAK_FREEZE, MAX_EXTRA_ATTEMPTS, MAX_STREAK_FREEZES } from "@/lib/coins";

const ACTION_COSTS: Record<string, number> = {
  buy_hint: COST_HINT,
  buy_attempt: COST_EXTRA_ATTEMPT,
  buy_freeze: COST_STREAK_FREEZE,
};

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, dateKey } = await request.json();

  if (!action || !ACTION_COSTS[action]) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if ((action === "buy_hint" || action === "buy_attempt") && !dateKey) {
    return NextResponse.json({ error: "dateKey required" }, { status: 400 });
  }

  const cost = ACTION_COSTS[action];

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check balance
      const wallet = await tx.userWallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < cost) {
        throw new Error("insufficient_balance");
      }

      // Action-specific validation
      if (action === "buy_hint") {
        await tx.gameResult.upsert({
          where: { userId_dateKey_mode: { userId, dateKey, mode: "daily-movie" } },
          update: { paidHintUsed: true, paidHintsCount: { increment: 1 } },
          create: { userId, dateKey, mode: "daily-movie", status: "playing", guessIds: [], attemptCount: 0, hintsUsed: 0, paidHintUsed: true, paidHintsCount: 1 },
        });
      }

      if (action === "buy_attempt") {
        const game = await tx.gameResult.findUnique({
          where: { userId_dateKey_mode: { userId, dateKey, mode: "daily-movie" } },
        });
        if (!game) throw new Error("no_game");
        if (game.extraAttempts >= MAX_EXTRA_ATTEMPTS) throw new Error("max_reached");

        await tx.gameResult.update({
          where: { userId_dateKey_mode: { userId, dateKey, mode: "daily-movie" } },
          data: {
            extraAttempts: { increment: 1 },
            status: "playing",
          },
        });
      }

      if (action === "buy_freeze") {
        if (wallet.streakFreezes >= MAX_STREAK_FREEZES) throw new Error("max_reached");

        await tx.userWallet.update({
          where: { userId },
          data: { streakFreezes: { increment: 1 } },
        });
      }

      // Deduct coins
      const updatedWallet = await tx.userWallet.update({
        where: { userId },
        data: { balance: { decrement: cost } },
      });

      // Log transaction
      await tx.coinTransaction.create({
        data: { userId, amount: -cost, reason: action, dateKey },
      });

      return {
        balance: updatedWallet.balance,
        streakFreezes: action === "buy_freeze" ? updatedWallet.streakFreezes + 1 : updatedWallet.streakFreezes,
        success: true,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";

    if (message === "insufficient_balance") {
      return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
    }
    if (message === "already_purchased" || message === "max_reached") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "no_game") {
      return NextResponse.json({ error: "no_game" }, { status: 404 });
    }

    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
