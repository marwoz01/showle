import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { reportServerError } from "@/lib/server-error";
import { prisma } from "@/lib/prisma";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { parseRecommendRequest, MAX_RECOMMEND_BODY_BYTES } from "@/lib/recommend-input";
import { reserveRecommendation } from "@/lib/recommend-quota";
import { interpretRecommendation } from "@/lib/recommend-ai";
import { inferRecommendationIntent } from "@/lib/recommend-intent";
import { resolveRecommendationFilters } from "@/lib/recommend-filters";
import { getRecommendationProfile } from "@/lib/recommend-profile";
import { getRecommendationReference } from "@/lib/recommend-reference";
import { findRecommendationCandidates } from "@/lib/recommend-search";
import { rankRecommendations } from "@/lib/recommend-ranking";
import { reviewRecommendationRelevance } from "@/lib/recommend-relevance";
import { explainRecommendation } from "@/lib/recommend-explanations";
import { RECOMMENDATION_TARGET } from "@/constants/recommendation";
import { getRecommendationWatchlist, prepareWatchlistCatalog } from "@/lib/recommend-watchlist";

const DAILY_LIMIT_AUTH = 20;
const DAILY_LIMIT_ANON = 1;
const noStore = { "Cache-Control": "no-store" };

async function context(request: NextRequest) {
  const ip = requestIp(request);
  const { userId } = await auth();
  const today = new Date().toISOString().slice(0, 10);
  const limit = userId ? DAILY_LIMIT_AUTH : DAILY_LIMIT_ANON;
  const key = userId ? `recommend:${userId}:${today}` : `recommend:anon:${ip}:${today}`;
  return { userId, today, limit, key };
}

export async function GET(request: NextRequest) {
  try {
    const { key, limit, userId } = await context(request);
    const budget = await checkRateLimit(`recommend-quota:${userId ?? requestIp(request)}`, { limit: 60, windowMs: 60000 });
    if (!budget.success) return NextResponse.json({ error: budget.unavailable ? "unavailable" : "rate_limited" },
      { status: budget.unavailable ? 503 : 429, headers: { ...noStore, "Retry-After": "60" } });
    const [usage, watchlistCount] = await Promise.all([
      prisma.dailyUsage.findUnique({ where: { key } }),
      userId ? prisma.savedMovie.count({ where: { userId, category: "watchlist" } }) : null,
    ]);
    return NextResponse.json({ remaining: Math.max(0, limit - (usage?.count ?? 0)), limit, watchlistCount }, { headers: noStore });
  } catch (error) {
    const requestId = reportServerError("recommendation_quota", error);
    return NextResponse.json({ error: "internal", requestId }, { status: 500, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  const ip = requestIp(request);
  const budget = await checkRateLimit(`recommend:${ip}`, { limit: 5, windowMs: 300_000 });
  if (!budget.success) {
    return NextResponse.json({ error: budget.unavailable ? "internal" : "rate_limited" },
      { status: budget.unavailable ? 503 : 429, headers: { ...noStore, "Retry-After": "300" } });
  }
  let remaining: number | null = null;
  let limit = DAILY_LIMIT_ANON;
  try {
    const raw = await readJsonBody(request, MAX_RECOMMEND_BODY_BYTES);
    const body = parseRecommendRequest(raw);
    if (!body) return NextResponse.json({ error: "invalid_preferences" }, { status: 400, headers: noStore });
    const localIntent = inferRecommendationIntent(body.freeformText);
    if (body.genres.some((genre) => localIntent.excludedGenres.includes(genre))) {
      return NextResponse.json({ error: "conflicting_preferences" }, { status: 400, headers: noStore });
    }
    const ctx = await context(request);
    if (body.source === "watchlist" && !ctx.userId) {
      return NextResponse.json({ error: "watchlist_login_required" }, { status: 401, headers: noStore });
    }
    const watchlistIds = body.source === "watchlist" && ctx.userId ? await getRecommendationWatchlist(ctx.userId) : undefined;
    if (watchlistIds && !watchlistIds.length) {
      return NextResponse.json({ error: "watchlist_empty" }, { status: 400, headers: noStore });
    }
    limit = ctx.limit;
    remaining = await reserveRecommendation(ctx.key, ctx.today, limit);
    if (remaining === null) {
      return NextResponse.json({ error: ctx.userId ? "daily_limit_reached" : "daily_limit_anon", remaining: 0, limit }, { status: 429, headers: noStore });
    }
    const [intent, profile, reference, watchlistUnavailable] = await Promise.all([
      interpretRecommendation(body.freeformText),
      getRecommendationProfile(ctx.userId, body),
      getRecommendationReference(body.referenceMovieId),
      watchlistIds ? prepareWatchlistCatalog(watchlistIds, { budgetKey: ctx.userId ?? ip }) : 0,
    ]);
    if (body.referenceMovieId && !reference) {
      return NextResponse.json({ error: "reference_unavailable", remaining, limit }, { status: 503, headers: noStore });
    }
    const filters = resolveRecommendationFilters(body, intent, profile.excludedIds);
    filters.includeIds = watchlistIds;
    if (filters.genres.some((genre) => filters.excludedGenres.includes(genre))) {
      return NextResponse.json({ error: "conflicting_preferences", remaining, limit }, { status: 400, headers: noStore });
    }
    const queryText = body.freeformText || reference ? [
      intent.queryEnglish, filters.genres.length ? `Genres: ${filters.genres.join(", ")}` : "",
      reference ? `Similar to ${reference.title}. ${reference.overview.slice(0, 900)}` : "",
    ].filter(Boolean).join(". ") : "";
    const preferredGenres = [...new Set(profile.signals.filter((signal) => signal.weight > 0).flatMap((signal) => signal.genres))].slice(0, 8);
    const { movies, matching } = await findRecommendationCandidates({ filters, queryText, preferredGenres });
    const shortlist = rankRecommendations(movies, filters, profile.signals, reference, { limit: 24 });
    const relevance = await reviewRecommendationRelevance(shortlist, body.freeformText, reference);
    const ranked = rankRecommendations(shortlist, filters, profile.signals, reference, { relevance: relevance.scores });
    const meta = { source: body.source, watchlistUnavailable, matching, interpretation: intent.source, relevance: relevance.source, partial: ranked.length < RECOMMENDATION_TARGET, personalized: profile.signals.length > 0 };
    if (!ranked.length) {
      return NextResponse.json({ error: body.source === "watchlist" ? "watchlist_no_results" : body.exclude.length ? "pool_exhausted" : "no_results", remaining, limit, meta }, { status: 404, headers: noStore });
    }
    const recommendations = ranked.map((movie) => explainRecommendation(movie, filters, profile.signals, reference, body.locale));
    return NextResponse.json({ recommendations, remaining, limit, meta }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: "invalid_request" }, { status: error.status, headers: noStore });
    const requestId = reportServerError("recommendation_search", error);
    return NextResponse.json({ error: "internal", requestId, ...(remaining !== null ? { remaining, limit } : {}) }, { status: 500, headers: noStore });
  }
}
