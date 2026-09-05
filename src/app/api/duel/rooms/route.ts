import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createDuelQuestions, createRoomCode, DUEL_ROUND_MS } from "@/lib/duel";
import {
  getDuelRoomView,
  normalizeDuelCode,
  normalizePlayerId,
  normalizePlayerName,
} from "@/lib/duel-room";
import { getDuelMoviePool } from "@/lib/tmdb";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { success } = rateLimit(`duel-room:${ip}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;
  const playerId = normalizePlayerId(body?.playerId);
  const name = normalizePlayerName(body?.name);
  if (!playerId || !name) {
    return NextResponse.json({ error: "invalid_player" }, { status: 400 });
  }

  try {
    if (action === "create") {
      const locale = body?.locale === "pl" ? "pl-PL" : "en-US";
      const questions = createDuelQuestions(await getDuelMoviePool(locale));
      let code = createRoomCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const exists = await prisma.duelRoom.findUnique({ where: { code } });
        if (!exists) break;
        code = createRoomCode();
      }

      await prisma.duelRoom.create({
        data: {
          code,
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
      if (existing.status !== "waiting" || existing.guestId) {
        return NextResponse.json({ error: "room_full" }, { status: 409 });
      }

      const roundStartedAt = new Date();
      const joined = await prisma.duelRoom.updateMany({
        where: { code, status: "waiting", guestId: null },
        data: {
          guestId: playerId,
          guestName: name,
          status: "playing",
          roundStartedAt,
          roundEndsAt: new Date(roundStartedAt.getTime() + DUEL_ROUND_MS),
        },
      });
      if (joined.count === 0) {
        return NextResponse.json({ error: "room_full" }, { status: 409 });
      }

      return NextResponse.json(await getDuelRoomView(code, playerId));
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    console.error("Duel room error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
