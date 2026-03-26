import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const dateKey = searchParams.get("dateKey");
  const mode = searchParams.get("mode") || "daily-movie";

  if (!dateKey) {
    return NextResponse.json({ error: "dateKey required" }, { status: 400 });
  }

  const result = await prisma.gameResult.findUnique({
    where: {
      userId_dateKey_mode: {
        userId,
        dateKey,
        mode,
      },
    },
  });

  if (!result) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    dateKey, mode = "daily-movie", status, guessIds, attemptCount, hintsUsed,
    targetMovieId = 0, targetTitle = "", targetYear = 0, targetPoster = "",
  } = await request.json();

  if (!dateKey || !status || !guessIds) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await prisma.gameResult.upsert({
    where: {
      userId_dateKey_mode: {
        userId,
        dateKey,
        mode,
      },
    },
    update: { status, guessIds, attemptCount, hintsUsed, targetMovieId, targetTitle, targetYear, targetPoster },
    create: {
      userId,
      dateKey,
      mode,
      status,
      guessIds,
      attemptCount,
      hintsUsed,
      targetMovieId,
      targetTitle,
      targetYear,
      targetPoster,
    },
  });

  return NextResponse.json(result);
}
