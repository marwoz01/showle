import { NextRequest, NextResponse } from "next/server";
import { getDuelRoomView, normalizeDuelCode, normalizePlayerId } from "@/lib/duel-room";
import { allowDuelRequest } from "@/lib/duel-rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  if (!allowDuelRequest(request, "state")) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const playerId = normalizePlayerId(request.headers.get("x-duel-player"));
  const code = normalizeDuelCode((await params).code);
  if (!playerId || code.length !== 6) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const room = await getDuelRoomView(code, playerId);
  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  return NextResponse.json(room, { headers: { "Cache-Control": "no-store" } });
}
