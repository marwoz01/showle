import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildDailyPerformanceSummary } from "@/lib/daily-summary";
import { getDailyMovie, getTodayKey, shiftDateKey } from "@/lib/daily";
import { MAX_ATTEMPTS } from "@/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  const dateKey = request.nextUrl.searchParams.get("dateKey") ?? getTodayKey();
  const requestedStatus = request.nextUrl.searchParams.get("status") === "won"
    ? "won"
    : "lost";
  const rawAttempts = Number(request.nextUrl.searchParams.get("attempts"));
  const requestedAttempts = Number.isFinite(rawAttempts)
    ? Math.min(Math.max(Math.round(rawAttempts), 0), MAX_ATTEMPTS)
    : MAX_ATTEMPTS;

  const [results, stats, ownResult, tomorrowMovie] = await Promise.all([
    prisma.gameResult.findMany({
      where: {
        dateKey,
        mode: "daily-movie",
        status: { in: ["won", "lost"] },
      },
      select: { status: true, attemptCount: true },
    }),
    userId ? prisma.userStats.findUnique({ where: { userId } }) : null,
    userId
      ? prisma.gameResult.findUnique({
          where: {
            userId_dateKey_mode: { userId, dateKey, mode: "daily-movie" },
          },
          select: { status: true, attemptCount: true },
        })
      : null,
    getDailyMovie(shiftDateKey(dateKey, 1)).catch(() => null),
  ]);

  const currentResult = ownResult && ["won", "lost"].includes(ownResult.status)
    ? ownResult
    : { status: requestedStatus, attemptCount: requestedAttempts };
  const sample = ownResult && ["won", "lost"].includes(ownResult.status)
    ? results
    : [...results, currentResult];
  const performance = buildDailyPerformanceSummary(sample, currentResult);
  const alreadyCompleted = Boolean(
    ownResult && ["won", "lost"].includes(ownResult.status),
  );
  const projectedStreak = stats
    ? alreadyCompleted || stats.lastPlayedDate === dateKey
      ? stats.currentStreak
      : stats.lastPlayedDate === shiftDateKey(dateKey, -1)
        ? stats.currentStreak + 1
        : 1
    : null;

  return NextResponse.json({
    ...performance,
    currentStreak: projectedStreak,
    maxStreak: projectedStreak === null
      ? null
      : Math.max(stats?.maxStreak ?? 0, projectedStreak),
    tomorrow: tomorrowMovie
      ? {
          decade: Math.floor(tomorrowMovie.year / 10) * 10,
          genre: tomorrowMovie.genres[0] ?? null,
        }
      : null,
  });
}
