import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { compareMovieTaste, profileMovieSnapshots, rankSharedSuggestions, sharedSuggestionWhere } from "@/lib/profile-comparison";
import type { ProfilePreferences } from "@/types/profile";
import type { ProfileComparisonResponse } from "@/types/public-profile";
import { canReadSocialActivity, canReadSocialProfile } from "@/lib/social";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const preferenceSelect = { genres: true, excludedGenres: true, providerIds: true, maxRuntime: true, favoriteMovies: true } as const;
const movieSelect = { tmdbId: true, title: true, year: true, posterPath: true, genres: true, rating: true, category: true } as const;
const emptyPreferences: ProfilePreferences = { genres: [], excludedGenres: [], providerIds: [], maxRuntime: null };

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  if (!rateLimit(`profile-compare:${userId}`, { limit: 20, windowMs: 60_000 }).success)
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers });
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,64}$/.test(slug)) return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  try {
    const other = await prisma.userProfile.findUnique({
      where: { publicSlug: slug }, select: { userId: true, isPublic: true, ...preferenceSelect },
    });
    if (!other || !await canReadSocialProfile(other, userId)) return NextResponse.json({ error: "not_found" }, { status: 404, headers });
    if (other.userId === userId) return NextResponse.json({ error: "own_profile" }, { status: 409, headers });
    const [viewer, viewerMovies, otherMovies, negativeFeedback] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId }, select: preferenceSelect }),
      prisma.savedMovie.findMany({ where: { userId }, select: movieSelect }),
      prisma.savedMovie.findMany({ where: { userId: other.userId }, select: movieSelect }),
      prisma.recommendationFeedback.findMany({ where: { userId: { in: [userId, other.userId] }, reaction: "less" }, select: { tmdbId: true } }),
    ]);
    const viewerPreferences = viewer ?? emptyPreferences;
    const candidates = await prisma.recommendationMovie.findMany({
      where: sharedSuggestionWhere(viewerPreferences, other, viewerMovies, otherMovies, negativeFeedback.map((movie) => movie.tmdbId)),
      orderBy: [{ voteCount: "desc" }, { tmdbId: "asc" }], take: 300,
      select: { tmdbId: true, title: true, titlePl: true, year: true, genres: true, director: true, leadActor: true,
        country: true, countryCode: true, runtime: true, budget: true, rating: true, voteCount: true,
        posterPath: true, backdropPath: true, overview: true, overviewPl: true },
    });
    const polish = request.nextUrl.searchParams.get("lang") !== "en";
    const suggestions = rankSharedSuggestions(candidates, viewerPreferences, other, viewerMovies, otherMovies).slice(0, 3).map((movie) => ({
      id: movie.tmdbId, type: "movie" as const, title: polish ? movie.titlePl || movie.title : movie.title,
      year: movie.year, genres: movie.genres, director: movie.director, leadActor: movie.leadActor,
      country: movie.country, countryCode: movie.countryCode, runtime: movie.runtime, budget: movie.budget,
      rating: movie.rating, popularity: 0, posterPath: movie.posterPath, backdropPath: movie.backdropPath,
      overview: polish ? movie.overviewPl || movie.overview : movie.overview,
    }));
    const current = await prisma.userProfile.findUnique({ where: { publicSlug: slug }, select: { userId: true, isPublic: true, activityVisibility: true } });
    if (!current || current.userId !== other.userId || !await canReadSocialProfile(current, userId))
      return NextResponse.json({ error: "not_found" }, { status: 404, headers });
    const comparison = compareMovieTaste(viewerMovies, otherMovies, profileMovieSnapshots(viewer?.favoriteMovies), profileMovieSnapshots(other.favoriteMovies), await canReadSocialActivity(current, userId));
    return NextResponse.json({ comparison, suggestions } satisfies ProfileComparisonResponse, { headers });
  } catch (error) {
    console.error("Profile comparison unavailable", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }
}
