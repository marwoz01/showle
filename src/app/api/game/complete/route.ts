import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dateKey, mode = "daily-movie", status, guessIds, attemptCount, hintsUsed } = await request.json();

  if (!dateKey || !status || !guessIds) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const userId = session.user.id;

  // Save game result
  const gameResult = await prisma.gameResult.upsert({
    where: {
      userId_dateKey_mode: { userId, dateKey, mode },
    },
    update: { status, guessIds, attemptCount, hintsUsed },
    create: { userId, dateKey, mode, status, guessIds, attemptCount, hintsUsed },
  });

  // Update user stats
  const stats = await prisma.userStats.findUnique({
    where: { userId },
  });

  const won = status === "won";
  const gamesPlayed = (stats?.gamesPlayed || 0) + 1;
  const gamesWon = (stats?.gamesWon || 0) + (won ? 1 : 0);
  const currentStreak = won ? (stats?.currentStreak || 0) + 1 : 0;
  const maxStreak = Math.max(currentStreak, stats?.maxStreak || 0);
  const totalGuesses = (stats?.averageGuesses || 0) * (stats?.gamesPlayed || 0) + attemptCount;
  const averageGuesses = totalGuesses / gamesPlayed;

  await prisma.userStats.upsert({
    where: { userId },
    update: { gamesPlayed, gamesWon, currentStreak, maxStreak, averageGuesses },
    create: { userId, gamesPlayed, gamesWon, currentStreak, maxStreak, averageGuesses },
  });

  return NextResponse.json(gameResult);
}
