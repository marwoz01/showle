import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_DAYS = 365;
const MAX_DAYS = 730;

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") ?? DEFAULT_DAYS);
  const days = Math.min(Math.max(requestedDays || DEFAULT_DAYS, 7), MAX_DAYS);

  // Window: last N days up to today. dateKey is stored as ISO date "YYYY-MM-DD"
  // in the user's timezone at game time, so string comparison works for filtering.
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  const startKey = start.toISOString().slice(0, 10);

  const results = await prisma.gameResult.findMany({
    where: {
      userId,
      mode: "daily-movie",
      dateKey: { gte: startKey },
    },
    select: { dateKey: true, status: true, attemptCount: true },
  });

  return NextResponse.json({ days, results });
}
