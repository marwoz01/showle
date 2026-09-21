import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { rateLimit } from "@/lib/rate-limit";
import { MovieChoiceError, normalizeMovieChoiceCode, parseMovieChoiceRequest } from "@/lib/movie-choice-input";
import { createMovieChoiceRoom, getMovieChoiceRoom, mutateMovieChoiceRoom } from "@/lib/movie-choice-room";
import { assertMovieChoiceOrigin, createMovieChoiceSession, movieChoiceIdentity, readMovieChoiceSession, setMovieChoiceSession } from "@/lib/movie-choice-session";

export const runtime = "nodejs";
export const maxDuration = 60;

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
function fail(error: unknown): NextResponse {
  if (error instanceof MovieChoiceError) return NextResponse.json({ error: error.code }, { status: error.status, headers });
  if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  console.error("Shared movie choice unavailable:", error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers });
}

function budget(request: NextRequest, kind: "read" | "write" | "create" | "join"): void {
  const limits = { read: [6000, 240], write: [1200, 120], create: [120, 10], join: [240, 20] } as const;
  const [global, perIp] = limits[kind];
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0].trim() ?? "";
  const ip = forwarded.length <= 64 && isIP(forwarded) ? forwarded : "unknown";
  const windowMs = kind === "create" || kind === "join" ? 10 * 60_000 : 60_000;
  // Per-process load shedding matches the app's existing deployment model.
  if (!rateLimit(`movie-choice:${kind}:all`, { limit: global, windowMs }).success ||
      !rateLimit(`movie-choice:${kind}:ip:${ip}`, { limit: perIp, windowMs }).success) {
    throw new MovieChoiceError("rate_limited", 429);
  }
}

export async function GET(request: NextRequest) {
  try {
    budget(request, "read");
    const session = readMovieChoiceSession(request);
    const requestedCode = request.nextUrl.searchParams.get("code");
    // Establish membership identity before a potentially retried create/join.
    // The browser stores the cookie even if the subsequent room request times out.
    if (requestedCode === null) {
      const response = NextResponse.json({ ready: true }, { headers });
      if (!session) setMovieChoiceSession(response, createMovieChoiceSession());
      return response;
    }
    const code = normalizeMovieChoiceCode(requestedCode);
    if (!session) throw new MovieChoiceError("room_not_found", 404);
    const view = await getMovieChoiceRoom(code, movieChoiceIdentity(session));
    return NextResponse.json(view, { headers });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertMovieChoiceOrigin(request);
    budget(request, "write");
    const action = parseMovieChoiceRequest(await readJsonBody(request, 4096));
    if (action.action === "create" || action.action === "join") budget(request, action.action);
    const previousSession = readMovieChoiceSession(request);
    if (!previousSession && action.action !== "create" && action.action !== "join") throw new MovieChoiceError("room_not_found", 404);
    const session = previousSession ?? createMovieChoiceSession();
    const identity = movieChoiceIdentity(session);
    const view = action.action === "create"
      ? await createMovieChoiceRoom(identity, action.name, action.locale)
      : await mutateMovieChoiceRoom(action, identity);
    const response = NextResponse.json(view, { headers });
    if (!previousSession) setMovieChoiceSession(response, session);
    return response;
  } catch (error) { return fail(error); }
}
