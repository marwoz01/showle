import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
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

const DAILY_LIMIT_AUTH = 20;
const DAILY_LIMIT_ANON = 1;
const noStore = { "Cache-Control": "no-store" };

async function context(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { userId } = await auth();
  const today = new Date().toISOString().slice(0, 10);
  const limit = userId ? DAILY_LIMIT_AUTH : DAILY_LIMIT_ANON;
  const key = userId ? `recommend:${userId}:${today}` : `recommend:anon:${ip}:${today}`;
  return { userId, today, limit, key };
}

export async function GET(request: NextRequest) {
  try {
    const { key, limit } = await context(request);
    const usage = await prisma.dailyUsage.findUnique({ where: { key } });
    return NextResponse.json({ remaining: Math.max(0, limit - (usage?.count ?? 0)), limit }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`recommend:${ip}`, { limit: 5, windowMs: 300_000 }).success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { ...noStore, "Retry-After": "300" } });
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
    limit = ctx.limit;
    remaining = await reserveRecommendation(ctx.key, ctx.today, limit);
    if (remaining === null) {
      return NextResponse.json({ error: ctx.userId ? "daily_limit_reached" : "daily_limit_anon", remaining: 0, limit }, { status: 429, headers: noStore });
    }
    const [intent, profile, reference] = await Promise.all([
      interpretRecommendation(body.freeformText),
      getRecommendationProfile(ctx.userId, body),
      getRecommendationReference(body.referenceMovieId),
    ]);
    if (body.referenceMovieId && !reference) {
      return NextResponse.json({ error: "reference_unavailable", remaining, limit }, { status: 503, headers: noStore });
    }
    const filters = resolveRecommendationFilters(body, intent, profile.excludedIds);
    if (filters.genres.some((genre) => filters.excludedGenres.includes(genre))) {
      return NextResponse.json({ error: "conflicting_preferences", remaining, limit }, { status: 400, headers: noStore });
    }
    const queryText = [
      intent.queryEnglish, filters.genres.length ? `Genres: ${filters.genres.join(", ")}` : "",
      reference ? `Similar to ${reference.title}. ${reference.overview.slice(0, 900)}` : "",
    ].filter(Boolean).join(". ");
    const preferredGenres = [...new Set(profile.signals.filter((signal) => signal.weight > 0).flatMap((signal) => signal.genres))].slice(0, 8);
    const { movies, matching } = await findRecommendationCandidates({ filters, queryText, preferredGenres });
    const shortlist = rankRecommendations(movies, filters, profile.signals, reference, { limit: 24 });
    const relevance = await reviewRecommendationRelevance(shortlist, body.freeformText, reference);
    const ranked = rankRecommendations(shortlist, filters, profile.signals, reference, { relevance: relevance.scores });
    const meta = { matching, interpretation: intent.source, relevance: relevance.source, partial: ranked.length < RECOMMENDATION_TARGET, personalized: profile.signals.length > 0 };
    if (!ranked.length) {
      return NextResponse.json({ error: body.exclude.length ? "pool_exhausted" : "no_results", remaining, limit, meta }, { status: 404, headers: noStore });
    }
    const recommendations = ranked.map((movie) => explainRecommendation(movie, filters, profile.signals, reference, body.locale));
    return NextResponse.json({ recommendations, remaining, limit, meta }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: "invalid_request" }, { status: error.status, headers: noStore });
    console.error("Recommendation request failed");
    return NextResponse.json({ error: "internal", ...(remaining !== null ? { remaining, limit } : {}) }, { status: 500, headers: noStore });
  }
}
