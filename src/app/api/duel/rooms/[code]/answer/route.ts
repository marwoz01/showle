import { NextRequest, NextResponse } from "next/server";
import { getDuelRoomView, normalizeDuelCode, normalizePlayerId } from "@/lib/duel-room";
import { rateLimit } from "@/lib/rate-limit";
import { allowDuelRequest } from "@/lib/duel-rate-limit";
import { isRecord, readJsonBody, RequestBodyError } from "@/lib/request-body";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!allowDuelRequest(request, "mutation"))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    const playerId = normalizePlayerId(request.headers.get("x-duel-player"));
    const code = normalizeDuelCode((await params).code);
    const body = await readJsonBody(request, 4096);
    if (!playerId || !code || !isRecord(body) ||
        typeof body.answerIndex !== "number" || !Number.isSafeInteger(body.answerIndex) || body.answerIndex < 0 || body.answerIndex > 3 ||
        typeof body.round !== "number" || !Number.isSafeInteger(body.round) || body.round < 0 || body.round > 5 ||
        typeof body.match !== "number" || !Number.isSafeInteger(body.match) || body.match < 1)
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    if (!rateLimit(`duel-answer:${playerId}`, { limit: 60, windowMs: 60000 }).success)
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const room = await getDuelRoomView(code, playerId, { type: "answer", answerIndex: body.answerIndex, round: body.round, match: body.match });
    return room ? NextResponse.json(room) : NextResponse.json({ error: "room_not_found" }, { status: 404 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "server_error" }, { status: 503 });
  }
}
