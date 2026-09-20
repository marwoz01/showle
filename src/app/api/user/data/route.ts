import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { exportAccountData, clearAccountData } from "@/lib/account-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportServerError } from "@/lib/server-error";
import { isRecord, readJsonBody, RequestBodyError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/same-origin";

const headers = { "Cache-Control": "private, no-store" };
async function handle(request: NextRequest, remove: boolean) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
    const budget = await checkRateLimit(`account-data:${userId}`, { limit: 3, windowMs: 3600000 });
    if (!budget.success) return NextResponse.json({ error: "rate_limited" },
      { status: budget.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": "3600" } });
    if (remove) {
      if (!isSameOriginRequest(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
      const body = await readJsonBody(request, 1024);
      if (!isRecord(body) || body.confirm !== "clear-my-showle-data") {
        return NextResponse.json({ error: "confirmation_required" }, { status: 400, headers });
      }
      await clearAccountData(userId);
      return NextResponse.json({ ok: true }, { headers });
    }
    return NextResponse.json(await exportAccountData(userId), { headers: {
      ...headers, "Content-Disposition": 'attachment; filename="showle-data.json"',
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: "invalid_request" }, { status: error.status, headers });
    const requestId = reportServerError("account_data", error);
    return NextResponse.json({ error: "unavailable", requestId }, { status: 503, headers });
  }
}
export const GET = (request: NextRequest) => handle(request, false);
export const DELETE = (request: NextRequest) => handle(request, true);
