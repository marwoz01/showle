import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { reportServerError } from "@/lib/server-error";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { getRecommendationSettings } from "@/lib/recommend-settings";
import { EMPTY_RECOMMENDATION_SETTINGS } from "@/lib/recommend-settings-input";
import { parsePickRequest } from "@/lib/recommend-picks-input";
import { getPersonalPicks, needsPickInterpretation, PickError } from "@/lib/recommend-picks";
import { reserveRecommendation } from "@/lib/recommend-quota";
import { inferRecommendationIntent } from "@/lib/recommend-intent";
import { getRecommendationWatchlist, prepareWatchlistCatalog } from "@/lib/recommend-watchlist";

const headers = { "Cache-Control": "private, no-store" };
async function handle(request: NextRequest, post: boolean) {
  let remaining: number | undefined;
  let limit: number | undefined;
  try {
    const { userId } = await auth();
    const ip = requestIp(request);
    const budget = await checkRateLimit(`recommend-picks:${userId ?? ip}`, { limit: 30, windowMs: 60000 });
    if (!budget.success) return NextResponse.json({ error: budget.unavailable ? "unavailable" : "rate_limited" },
      { status: budget.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": "60" } });
    const preferences = userId ? await getRecommendationSettings(userId) : null;
    const raw = post ? await readJsonBody(request, 16384) : { locale: request.nextUrl.searchParams.get("locale") ?? "pl" };
    const parsed = parsePickRequest(raw, preferences ?? EMPTY_RECOMMENDATION_SETTINGS);
    if (!parsed) throw new PickError("invalid_preferences", 400);
    const body = parsed.request;
    const local = inferRecommendationIntent(body.freeformText);
    if (body.genres.some((genre) => local.excludedGenres.includes(genre))) throw new PickError("conflicting_preferences", 400);
    if (body.source === "watchlist" && !userId) throw new PickError("watchlist_login_required", 401);
    const includeIds = body.source === "watchlist" && userId ? await getRecommendationWatchlist(userId) : undefined;
    if (includeIds && !includeIds.length) throw new PickError("watchlist_empty", 400);
    if (needsPickInterpretation(body)) {
      const expensive = await checkRateLimit(`recommend:${ip}`, { limit: 5, windowMs: 300000 });
      if (!expensive.success) throw new PickError(expensive.unavailable ? "unavailable" : "rate_limited", expensive.unavailable ? 503 : 429);
      const today = new Date().toISOString().slice(0, 10);
      limit = userId ? 20 : 1;
      const key = userId ? `recommend:${userId}:${today}` : `recommend:anon:${ip}:${today}`;
      const reserved = await reserveRecommendation(key, today, limit);
      if (reserved === null) {
        remaining = 0;
        throw new PickError(userId ? "daily_limit_reached" : "daily_limit_anon", 429);
      }
      remaining = reserved;
    }
    let watchlistUnavailable = 0;
    if (post) {
      const unavailable = await prepareWatchlistCatalog(parsed.favorites, { budgetKey: userId ?? ip });
      if (unavailable) throw new PickError("favorites_unavailable", 503);
      if (includeIds) watchlistUnavailable = await prepareWatchlistCatalog(includeIds, { budgetKey: userId ?? ip });
    }
    const result = await getPersonalPicks(body, userId, parsed.favorites, includeIds);
    result.meta.watchlistUnavailable = watchlistUnavailable;
    return NextResponse.json({ ...result, preferences, remaining, limit }, { headers });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: "invalid_request" }, { status: error.status, headers });
    if (error instanceof PickError) return NextResponse.json({ error: error.code, remaining, limit },
      { status: error.status, headers: error.status === 429 ? { ...headers, "Retry-After": "300" } : headers });
    const requestId = reportServerError("recommendation_picks", error);
    return NextResponse.json({ error: "unavailable", requestId, remaining, limit }, { status: 503, headers });
  }
}
export const GET = (request: NextRequest) => handle(request, false);
export const POST = (request: NextRequest) => handle(request, true);
