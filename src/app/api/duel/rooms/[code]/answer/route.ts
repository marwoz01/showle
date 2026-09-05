import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { DuelQuestion } from "@/lib/duel";
import {
  getDuelRoomView,
  normalizeDuelCode,
  normalizePlayerId,
} from "@/lib/duel-room";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success } = rateLimit(`duel-answer:${ip}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const playerId = normalizePlayerId(request.headers.get("x-duel-player"));
  const code = normalizeDuelCode((await params).code);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const answerIndex = Number(body?.answerIndex);
  const round = Number(body?.round);

  if (
    !playerId ||
    code.length !== 6 ||
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex > 3 ||
    !Number.isInteger(round)
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const currentView = await getDuelRoomView(code, playerId);
  if (!currentView) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const room = await prisma.duelRoom.findUnique({ where: { code } });
  if (
    !room ||
    room.status !== "playing" ||
    room.currentRound !== round ||
    room.roundResolvedAt
  ) {
    return NextResponse.json(currentView);
  }

  const isHost = room.hostId === playerId;
  const isGuest = room.guestId === playerId;
  if (!isHost && !isGuest) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const marked = isHost
    ? await prisma.duelRoom.updateMany({
        where: {
          code,
          status: "playing",
          currentRound: round,
          roundResolvedAt: null,
          hostAnsweredRound: { not: round },
        },
        data: { hostAnsweredRound: round },
      })
    : await prisma.duelRoom.updateMany({
        where: {
          code,
          status: "playing",
          currentRound: round,
          roundResolvedAt: null,
          guestAnsweredRound: { not: round },
        },
        data: { guestAnsweredRound: round },
      });

  if (marked.count === 0) {
    return NextResponse.json(await getDuelRoomView(code, playerId));
  }

  const questions = room.questions as unknown as DuelQuestion[];
  const correct = questions[round]?.correctIndex === answerIndex;
  if (correct) {
    await prisma.duelRoom.updateMany({
      where: {
        code,
        status: "playing",
        currentRound: round,
        roundResolvedAt: null,
        roundWinnerId: null,
      },
      data: {
        roundWinnerId: playerId,
        roundResolvedAt: new Date(),
        ...(isHost
          ? { hostScore: { increment: 1 } }
          : { guestScore: { increment: 1 } }),
      },
    });
  } else {
    const afterAnswer = await prisma.duelRoom.findUnique({ where: { code } });
    if (
      afterAnswer &&
      afterAnswer.hostAnsweredRound === round &&
      afterAnswer.guestAnsweredRound === round
    ) {
      await prisma.duelRoom.updateMany({
        where: { code, currentRound: round, roundResolvedAt: null },
        data: { roundResolvedAt: new Date() },
      });
    }
  }

  return NextResponse.json(await getDuelRoomView(code, playerId));
}
