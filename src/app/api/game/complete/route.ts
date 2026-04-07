import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getWinReward, STREAK_MILESTONES } from "@/lib/coins";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    dateKey, mode = "daily-movie", status, guessIds, attemptCount, hintsUsed,
    targetMovieId = 0, targetTitle = "", targetYear = 0, targetPoster = "",
    extraAttempts = 0, paidHintUsed = false, paidHintsCount = 0,
  } = await request.json();

  if (!dateKey || !status || !guessIds) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [gameResult, coinsEarned, streakMilestone, newBalance, freezeUsed] = await prisma.$transaction(async (tx) => {
    // 1. Upsert game result
    const result = await tx.gameResult.upsert({
      where: {
        userId_dateKey_mode: { userId, dateKey, mode },
      },
      update: { status, guessIds, attemptCount, hintsUsed, targetMovieId, targetTitle, targetYear, targetPoster, extraAttempts, paidHintUsed, paidHintsCount },
      create: { userId, dateKey, mode, status, guessIds, attemptCount, hintsUsed, targetMovieId, targetTitle, targetYear, targetPoster, extraAttempts, paidHintUsed, paidHintsCount },
    });

    // 2. Get current stats
    const stats = await tx.userStats.findUnique({ where: { userId } });

    const won = status === "won";
    const gamesPlayed = (stats?.gamesPlayed || 0) + 1;
    const gamesWon = (stats?.gamesWon || 0) + (won ? 1 : 0);

    // 3. Get wallet (or create)
    const wallet = await tx.userWallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    let totalCoinsEarned = 0;
    let milestone: number | null = null;
    let usedFreeze = false;

    // 4. Streak + coins logic
    let currentStreak: number;

    if (won) {
      currentStreak = (stats?.currentStreak || 0) + 1;

      // Win reward
      const winReward = getWinReward(attemptCount);
      totalCoinsEarned += winReward;

      await tx.coinTransaction.create({
        data: { userId, amount: winReward, reason: "win_reward", dateKey },
      });

      // Streak milestone check
      const milestoneReward = STREAK_MILESTONES[currentStreak];
      if (milestoneReward) {
        totalCoinsEarned += milestoneReward;
        milestone = milestoneReward;

        await tx.coinTransaction.create({
          data: { userId, amount: milestoneReward, reason: "streak_milestone", dateKey },
        });
      }
    } else {
      // Loss — check for streak freeze
      if (wallet.streakFreezes > 0) {
        // Use freeze: keep streak, decrement freeze count
        currentStreak = stats?.currentStreak || 0;
        usedFreeze = true;

        await tx.userWallet.update({
          where: { userId },
          data: { streakFreezes: { decrement: 1 } },
        });

        await tx.coinTransaction.create({
          data: { userId, amount: 0, reason: "use_freeze", dateKey },
        });
      } else {
        currentStreak = 0;
      }
    }

    const maxStreak = Math.max(currentStreak, stats?.maxStreak || 0);
    const totalGuesses = (stats?.averageGuesses || 0) * (stats?.gamesPlayed || 0) + attemptCount;
    const averageGuesses = totalGuesses / gamesPlayed;

    // 5. Update stats with lastPlayedDate
    await tx.userStats.upsert({
      where: { userId },
      update: { gamesPlayed, gamesWon, currentStreak, maxStreak, averageGuesses, lastPlayedDate: dateKey },
      create: { userId, gamesPlayed, gamesWon, currentStreak, maxStreak, averageGuesses, lastPlayedDate: dateKey },
    });

    // 6. Update wallet balance
    let updatedBalance = wallet.balance;
    if (totalCoinsEarned > 0) {
      const updatedWallet = await tx.userWallet.update({
        where: { userId },
        data: { balance: { increment: totalCoinsEarned } },
      });
      updatedBalance = updatedWallet.balance;
    } else if (usedFreeze) {
      // Balance already updated via freeze decrement, re-read
      const refreshedWallet = await tx.userWallet.findUnique({ where: { userId } });
      updatedBalance = refreshedWallet?.balance ?? wallet.balance;
    }

    return [result, totalCoinsEarned, milestone, updatedBalance, usedFreeze] as const;
  });

  return NextResponse.json({
    ...gameResult,
    coinsEarned,
    newBalance,
    streakMilestone: streakMilestone,
    freezeUsed,
  });
}
