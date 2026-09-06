import { NextRequest, NextResponse } from "next/server";
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
  const playerId = normalizePlayerId(request.headers.get("x-duel-player"));
  const code = normalizeDuelCode((await params).code);
  const body = await request.json().catch(() => null);
  if (
    !playerId ||
    !code ||
    !Number.isSafeInteger(body?.answerIndex) ||
    body.answerIndex < 0 ||
    body.answerIndex > 3 ||
    !Number.isSafeInteger(body?.round) ||
    !Number.isSafeInteger(body?.match)
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (
    !rateLimit(`duel-answer:${playerId}`, { limit: 60, windowMs: 60000 })
      .success
  )
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    const room = await getDuelRoomView(code, playerId, {
      type: "answer",
      answerIndex: body.answerIndex,
      round: body.round,
      match: body.match,
    });
    return room
      ? NextResponse.json(room)
      : NextResponse.json({ error: "room_not_found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 503 });
  }
}
