import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
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
        userId: session.user.id,
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dateKey, mode = "daily-movie", status, guessIds, attemptCount, hintsUsed } = await request.json();

  if (!dateKey || !status || !guessIds) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await prisma.gameResult.upsert({
    where: {
      userId_dateKey_mode: {
        userId: session.user.id,
        dateKey,
        mode,
      },
    },
    update: { status, guessIds, attemptCount, hintsUsed },
    create: {
      userId: session.user.id,
      dateKey,
      mode,
      status,
      guessIds,
      attemptCount,
      hintsUsed,
    },
  });

  return NextResponse.json(result);
}
