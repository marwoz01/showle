import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { parseRecommendationSettings } from "@/lib/recommend-settings-input";
import { getRecommendationSettings, saveRecommendationSettings } from "@/lib/recommend-settings";
import { prepareWatchlistCatalog } from "@/lib/recommend-watchlist";
import { reportServerError } from "@/lib/server-error";

const headers = { "Cache-Control": "private, no-store" };
async function handle(request: NextRequest, write: boolean) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
    const budget = await checkRateLimit(`recommend-settings:${userId}`, { limit: 40, windowMs: 60000 });
    if (!budget.success) return NextResponse.json({ error: budget.unavailable ? "unavailable" : "rate_limited" },
      { status: budget.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": "60" } });
    if (!write) return NextResponse.json({ preferences: await getRecommendationSettings(userId) }, { headers });
    const settings = parseRecommendationSettings(await readJsonBody(request, 4096));
    if (!settings) return NextResponse.json({ error: "invalid_preferences" }, { status: 400, headers });
    const unavailable = await prepareWatchlistCatalog(settings.favoriteIds, { budgetKey: userId });
    if (unavailable) return NextResponse.json({ error: "favorites_unavailable" }, { status: 503, headers });
    return NextResponse.json({ preferences: await saveRecommendationSettings(userId, settings) }, { headers });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: "invalid_request" }, { status: error.status, headers });
    const requestId = reportServerError("recommendation_preferences", error);
    return NextResponse.json({ error: "unavailable", requestId }, { status: 503, headers });
  }
}
export const GET = (request: NextRequest) => handle(request, false);
export const PUT = (request: NextRequest) => handle(request, true);
