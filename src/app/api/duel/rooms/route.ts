import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createDuelQuestions, createRoomCode } from "@/lib/duel";
import {
  getDuelRoomView,
  normalizeDuelCode,
  normalizePlayerId,
  normalizePlayerName,
} from "@/lib/duel-room";
import { getFrameMoviePool } from "@/lib/frame-catalog";
import { allowDuelRequest } from "@/lib/duel-rate-limit";
import { isRecord, readJsonBody, RequestBodyError } from "@/lib/request-body";

export async function POST(request: NextRequest) {
  if (!allowDuelRequest(request, "room")) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
  const parsed = await readJsonBody(request, 4096);
  const body = isRecord(parsed) ? parsed : null;
  const action = body?.action;
  const playerId = normalizePlayerId(body?.playerId);
  const name = normalizePlayerName(body?.name);
  if (!playerId || !name) {
    return NextResponse.json({ error: "invalid_player" }, { status: 400 });
  }

    if (action === "create") {
      const locale = body?.locale === "pl" ? "pl-PL" : "en-US";
      const questions = createDuelQuestions(getFrameMoviePool(locale));
      let code = createRoomCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const exists = await prisma.duelRoom.findUnique({ where: { code } });
        if (!exists) break;
        code = createRoomCode();
      }

      await prisma.duelRoom.create({
        data: {
          code,
          mode: body?.mode === "practice" ? "practice" : "duel",
          status: body?.mode === "practice" ? "playing" : "waiting",
          hostId: playerId,
          hostName: name,
          questions: questions as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json(await getDuelRoomView(code, playerId));
    }

    if (action === "join") {
      const code = normalizeDuelCode(body?.code);
      if (code.length !== 6) {
        return NextResponse.json({ error: "invalid_code" }, { status: 400 });
      }

      const existing = await prisma.duelRoom.findUnique({ where: { code } });
      if (!existing || existing.expiresAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: "room_not_found" }, { status: 404 });
      }
      if (existing.hostId === playerId || existing.guestId === playerId) {
        return NextResponse.json(await getDuelRoomView(code, playerId));
      }
      if (
        existing.mode !== "duel" ||
        existing.status !== "waiting" ||
        existing.guestId
      ) {
        return NextResponse.json({ error: "room_full" }, { status: 409 });
      }

      const joined = await prisma.duelRoom.updateMany({
        where: { code, status: "waiting", guestId: null },
        data: {
          guestId: playerId,
          guestName: name,
          status: "playing",
          roundStartedAt: null,
          roundEndsAt: null,
        },
      });
      if (joined.count === 0) {
        return NextResponse.json({ error: "room_full" }, { status: 409 });
      }

      return NextResponse.json(await getDuelRoomView(code, playerId));
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Duel room error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
