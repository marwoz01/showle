import { NextRequest, NextResponse } from "next/server";
import {
  getDuelRoomView,
  normalizeDuelCode,
  normalizePlayerId,
} from "@/lib/duel-room";
import { createDuelQuestions } from "@/lib/duel";
import { getDuelMoviePool } from "@/lib/tmdb";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const playerId = normalizePlayerId(request.headers.get("x-duel-player"));
  const code = normalizeDuelCode((await params).code);
  const body = await request.json().catch(() => null);
  if (!playerId || !code || !Number.isSafeInteger(body?.match))
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (
    !rateLimit(`duel-action:${playerId}`, { limit: 40, windowMs: 60000 })
      .success
  )
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    const current = await getDuelRoomView(code, playerId);
    if (!current)
      return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    if (body.type === "ready" && Number.isSafeInteger(body.round)) {
      return NextResponse.json(
        await getDuelRoomView(code, playerId, {
          type: "ready",
          round: body.round,
          match: body.match,
        }),
      );
    }
    if (body.type === "rematch" && current.status === "finished") {
      const questions = createDuelQuestions(
        await getDuelMoviePool(body.locale === "pl" ? "pl-PL" : "en-US"),
      );
      return NextResponse.json(
        await getDuelRoomView(code, playerId, {
          type: "rematch",
          match: body.match,
          questions,
        }),
      );
    }
    return NextResponse.json(current);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 503 });
  }
}
