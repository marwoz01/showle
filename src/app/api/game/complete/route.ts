import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getWinReward, STREAK_MILESTONES } from "@/lib/coins";
import { shiftDateKey } from "@/lib/daily";

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

  const [gameResult, coinsEarned, streakMilestone, newBalance, currentStreak, maxStreak] = await prisma.$transaction(async (tx) => {
    const existingResult = await tx.gameResult.findUnique({
      where: { userId_dateKey_mode: { userId, dateKey, mode } },
    });
    const alreadyCompleted = Boolean(
      existingResult && ["won", "lost"].includes(existingResult.status),
    );

    // A completion is idempotent: refreshing or retrying cannot add another day.
    const result = alreadyCompleted
      ? existingResult!
      : await tx.gameResult.upsert({
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

    if (alreadyCompleted) {
      return [
        result,
        0,
        null,
        wallet.balance,
        stats?.currentStreak ?? 0,
        stats?.maxStreak ?? 0,
      ] as const;
    }

    let totalCoinsEarned = 0;
    let milestone: number | null = null;
    // 4. One completed daily game extends the activity streak, win or lose.
    const previousDateKey = shiftDateKey(dateKey, -1);
    const currentStreak = stats?.lastPlayedDate === dateKey
      ? stats?.currentStreak ?? 0
      : stats?.lastPlayedDate === previousDateKey
        ? stats.currentStreak + 1
        : 1;

    if (won) {
      // Win reward
      const winReward = getWinReward(attemptCount);
      totalCoinsEarned += winReward;

      await tx.coinTransaction.create({
        data: { userId, amount: winReward, reason: "win_reward", dateKey },
      });

    }

    const maxStreak = Math.max(currentStreak, stats?.maxStreak || 0);
    const milestoneReward = STREAK_MILESTONES[currentStreak];
    if (milestoneReward) {
      totalCoinsEarned += milestoneReward;
      milestone = milestoneReward;
      await tx.coinTransaction.create({
        data: { userId, amount: milestoneReward, reason: "streak_milestone", dateKey },
      });
    }
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
    }

    return [result, totalCoinsEarned, milestone, updatedBalance, currentStreak, maxStreak] as const;
  });

  return NextResponse.json({
    ...gameResult,
    coinsEarned,
    newBalance,
    streakMilestone: streakMilestone,
    currentStreak,
    maxStreak,
    freezeUsed: false,
  });
}
