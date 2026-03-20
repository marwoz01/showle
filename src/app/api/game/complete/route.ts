import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dateKey, mode = "daily-movie", status, guessIds, attemptCount, hintsUsed } = await request.json();

  if (!dateKey || !status || !guessIds) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Save game result and update stats in a transaction
  const [gameResult] = await prisma.$transaction(async (tx) => {
    const result = await tx.gameResult.upsert({
      where: {
        userId_dateKey_mode: { userId, dateKey, mode },
      },
      update: { status, guessIds, attemptCount, hintsUsed },
      create: { userId, dateKey, mode, status, guessIds, attemptCount, hintsUsed },
    });

    const stats = await tx.userStats.findUnique({
      where: { userId },
    });

    const won = status === "won";
    const gamesPlayed = (stats?.gamesPlayed || 0) + 1;
    const gamesWon = (stats?.gamesWon || 0) + (won ? 1 : 0);
    const currentStreak = won ? (stats?.currentStreak || 0) + 1 : 0;
    const maxStreak = Math.max(currentStreak, stats?.maxStreak || 0);
    const totalGuesses = (stats?.averageGuesses || 0) * (stats?.gamesPlayed || 0) + attemptCount;
    const averageGuesses = totalGuesses / gamesPlayed;

    await tx.userStats.upsert({
      where: { userId },
      update: { gamesPlayed, gamesWon, currentStreak, maxStreak, averageGuesses },
      create: { userId, gamesPlayed, gamesWon, currentStreak, maxStreak, averageGuesses },
    });

    return [result];
  });

  return NextResponse.json(gameResult);
}
