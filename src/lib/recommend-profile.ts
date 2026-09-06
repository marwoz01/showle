import { prisma } from "@/lib/prisma";
import type { RecommendRequest } from "@/lib/recommend-input";
import type { TasteSignal } from "@/lib/recommend-taste";

export interface RecommendationProfile { signals: TasteSignal[]; excludedIds: number[] }

export async function getRecommendationProfile(userId: string | null, request: RecommendRequest): Promise<RecommendationProfile> {
  const signals: TasteSignal[] = [];
  const excluded = new Set<number>();
  const reactions = new Map<number, "more" | "less">();
  if (userId) {
    const [watched, ratings, feedback] = await Promise.all([
      prisma.savedMovie.findMany({ where: { userId, category: "watched" }, select: { tmdbId: true } }),
      prisma.savedMovie.findMany({ where: { userId, rating: { not: null } },
        select: { genres: true, director: true, rating: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
      prisma.recommendationFeedback.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 100 }),
    ]);
    watched.forEach((movie) => excluded.add(movie.tmdbId));
    ratings.forEach((movie) => {
      const rating = movie.rating ?? 5;
      const weight = rating >= 7 ? (rating - 6) / 4 : rating <= 4 ? -(5 - rating) / 4 : 0;
      if (weight) signals.push({ genres: movie.genres, director: movie.director, weight });
    });
    feedback.forEach((item) => { if (item.reaction === "more" || item.reaction === "less") reactions.set(item.tmdbId, item.reaction); });
  }
  request.positiveIds.forEach((id) => reactions.set(id, "more"));
  request.negativeIds.forEach((id) => reactions.set(id, "less"));
  if (reactions.size) {
    const movies = await prisma.recommendationMovie.findMany({
      where: { tmdbId: { in: [...reactions.keys()] } }, select: { tmdbId: true, genres: true, director: true },
    });
    for (const movie of movies) {
      excluded.add(movie.tmdbId);
      signals.push({ genres: movie.genres, director: movie.director, weight: reactions.get(movie.tmdbId) === "more" ? 1 : -1 });
    }
  }
  return { signals, excludedIds: [...excluded] };
}
