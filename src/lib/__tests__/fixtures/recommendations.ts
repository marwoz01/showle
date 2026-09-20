import type { RecommendationCandidate } from "@/types/recommendation";
import type { RecommendRequest } from "@/lib/recommend-input";
import type { RecommendationFilters } from "@/lib/recommend-filters";

export const preferences: RecommendRequest = {
  genres: [], excludedGenres: [], yearFrom: 1888, yearTo: 2026, popularity: "any",
  locale: "en", freeformText: "", exclude: [], maxRuntime: null, providerIds: [],
  referenceMovieId: null, positiveIds: [], negativeIds: [],
};
export const filters: RecommendationFilters = { ...preferences, excludeIds: [] };
export function candidate(id = 1, patch: Partial<RecommendationCandidate> = {}): RecommendationCandidate {
  return {
    tmdbId: id, title: `Movie ${id}`, titlePl: `Film ${id}`, year: 2020,
    genres: ["Drama"], overview: "Verified plot", overviewPl: "Sprawdzona fabuła",
    country: "Poland", countryCode: "PL", director: `Director ${id}`, leadActor: "Actor",
    runtime: 100, budget: 1, voteCount: 8000, rating: 7, posterPath: "/poster.jpg", backdropPath: "/backdrop.jpg",
    cast: [], keywords: [], collectionId: null, providerIds: [], providersUpdatedAt: null,
    tagline: null, taglinePl: null, similarity: 0.75, lexicalScore: 0.5, hasEmbedding: true, ...patch,
  };
}
