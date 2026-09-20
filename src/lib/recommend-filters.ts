import type { RecommendRequest } from "@/lib/recommend-input";
import type { RecommendationIntent } from "@/lib/recommend-intent";
import type { RecommendationCandidate, RecommendationPreference } from "@/types/recommendation";

export interface RecommendationFilters extends RecommendationPreference {
  excludeIds: number[];
}
export function resolveRecommendationFilters(
  request: RecommendRequest, intent: RecommendationIntent, excludedIds: number[],
): RecommendationFilters {
  const limits = [request.maxRuntime, intent.maxRuntime].filter((value): value is number => value !== null);
  return {
    ...request,
    genres: request.genres.length ? request.genres : intent.includedGenres,
    excludedGenres: [...new Set([...request.excludedGenres, ...intent.excludedGenres])],
    maxRuntime: limits.length ? Math.min(...limits) : null,
    excludeIds: [...new Set([...request.exclude, ...excludedIds, ...request.negativeIds,
      ...request.positiveIds, ...(request.referenceMovieId ? [request.referenceMovieId] : [])])],
  };
}
export function popularityMatches(votes: number, preference: RecommendationPreference["popularity"]): boolean {
  return preference === "any" || (preference === "popular" ? votes >= 5000 : preference === "medium" ? votes >= 1000 && votes < 5000 : votes < 1000);
}
export function satisfiesRecommendationFilters(movie: RecommendationCandidate, filters: RecommendationFilters): boolean {
  return movie.year >= filters.yearFrom && movie.year <= filters.yearTo &&
    !filters.excludeIds.includes(movie.tmdbId) &&
    (!filters.genres.length || filters.genres.some((g) => movie.genres.includes(g))) &&
    !filters.excludedGenres.some((g) => movie.genres.includes(g)) &&
    popularityMatches(movie.voteCount, filters.popularity) &&
    (filters.maxRuntime === null || (movie.runtime > 0 && movie.runtime <= filters.maxRuntime)) &&
    (!filters.providerIds.length || filters.providerIds.some((id) => movie.providerIds.includes(id)));
}
