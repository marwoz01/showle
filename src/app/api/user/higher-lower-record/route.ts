import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getHigherLowerRecord, saveHigherLowerRecord } from "@/lib/higher-lower-record";
import { HIGHER_LOWER_MAX_BODY_BYTES, HigherLowerError } from "@/lib/higher-lower";
import { rateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

function failure(error: unknown) {
  const code = error instanceof RequestBodyError ? "invalid_request"
    : error instanceof HigherLowerError ? error.code : "record_unavailable";
  return NextResponse.json({ error: code }, { status: code === "invalid_request" ? 400 : code === "invalid_session" ? 409 : 503, headers });
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
    return NextResponse.json({ bestScore: await getHigherLowerRecord(userId) }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
    }
    if (!rateLimit(`higher-lower-record:${userId}`, { limit: 120, windowMs: 60_000 }).success) {
      return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
    }
    return NextResponse.json({ bestScore: await saveHigherLowerRecord(userId, await readJsonBody(request, HIGHER_LOWER_MAX_BODY_BYTES)) }, { headers });
  } catch (error) { return failure(error); }
}
