import { NextRequest, NextResponse } from "next/server";
import { getDuelRoomView, normalizeDuelCode, normalizePlayerId } from "@/lib/duel-room";
import { createDuelQuestions } from "@/lib/duel";
import { getFrameMoviePool } from "@/lib/frame-catalog";
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
    if (!playerId || !code || !isRecord(body) || typeof body.match !== "number" ||
        !Number.isSafeInteger(body.match) || body.match < 1 ||
        (body.type !== "ready" && body.type !== "rematch") ||
        (body.type === "ready" && (typeof body.round !== "number" || !Number.isSafeInteger(body.round) || body.round < 0 || body.round > 5)))
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    if (!rateLimit(`duel-action:${playerId}`, { limit: 40, windowMs: 60000 }).success)
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    const current = await getDuelRoomView(code, playerId);
    if (!current) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    if (body.type === "ready" && typeof body.round === "number") {
      const view = await getDuelRoomView(code, playerId, { type: "ready", round: body.round, match: body.match });
      return view ? NextResponse.json(view) : NextResponse.json({ error: "room_not_found" }, { status: 404 });
    }
    if (body.type === "rematch" && current.status === "finished") {
      const questions = createDuelQuestions(getFrameMoviePool(body.locale === "pl" ? "pl-PL" : "en-US"));
      const view = await getDuelRoomView(code, playerId, { type: "rematch", match: body.match, questions });
      return view ? NextResponse.json(view) : NextResponse.json({ error: "room_not_found" }, { status: 404 });
    }
    return NextResponse.json(current);
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "server_error" }, { status: 503 });
  }
}
