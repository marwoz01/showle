import { reportServerError } from "@/lib/server-error";
import { requestIp } from "@/lib/request-ip";
import { NextResponse } from "next/server";
import { getHigherLowerCatalog } from "@/lib/higher-lower-catalog";
import {
  answerHigherLowerRun,
  getHigherLowerView,
  HIGHER_LOWER_MAX_BODY_BYTES,
  HigherLowerError,
  nextHigherLowerRound,
  parseHigherLowerRequest,
  startHigherLowerRun,
  validateHigherLowerRun,
} from "@/lib/higher-lower";
import { openHigherLowerRun, sealHigherLowerRun } from "@/lib/higher-lower-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import type { HigherLowerResponse } from "@/types/higher-lower";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const ip = requestIp(request);
  if (!(await checkRateLimit("higher-lower:global", { limit: 2400, windowMs: 60_000 })).success
    || !(await checkRateLimit(`higher-lower:ip:${ip}`, { limit: 180, windowMs: 60_000 })).success) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  }
  try {
    const input = parseHigherLowerRequest(await readJsonBody(request, HIGHER_LOWER_MAX_BODY_BYTES));
    const { movies, version } = getHigherLowerCatalog();
    let run;
    if (input.action === "start") {
      run = startHigherLowerRun(movies, version);
    } else {
      const previous = validateHigherLowerRun(openHigherLowerRun(input.token), movies, version);
      run = input.action === "answer"
        ? answerHigherLowerRun(previous, movies, input.choice)
        : input.action === "next" ? nextHigherLowerRound(previous, movies) : previous;
    }
    const response: HigherLowerResponse = {
      token: sealHigherLowerRun(run),
      game: getHigherLowerView(run, movies, input.locale),
    };
    return NextResponse.json(response, { headers });
  } catch (error) {
    const code = error instanceof RequestBodyError ? "invalid_request"
      : error instanceof HigherLowerError ? error.code : "game_unavailable";
    if (code === "game_unavailable") reportServerError("higher-lower", error);
    const status = code === "invalid_request" ? 400 : code === "invalid_session" ? 409 : 503;
    return NextResponse.json({ error: code }, { status, headers });
  }
}
