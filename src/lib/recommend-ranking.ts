import { satisfiesRecommendationFilters, type RecommendationFilters } from "@/lib/recommend-filters";
import { tasteScore, type TasteSignal } from "@/lib/recommend-taste";
import type { RecommendationCandidate } from "@/types/recommendation";
import { RECOMMENDATION_TARGET } from "@/constants/recommendation";

export interface ReferenceMovie { id: number; title: string; overview: string; genres: string[]; director: string; keywords?: string[] }

export function referenceSimilarity(movie: RecommendationCandidate, reference: ReferenceMovie | null): number {
  if (!reference) return 0;
  const genres = movie.genres.filter((g) => reference.genres.includes(g)).length / Math.max(1, movie.genres.length, reference.genres.length);
  const keywords = movie.keywords.filter((k) => reference.keywords?.includes(k)).length;
  const director = movie.director && movie.director !== "Unknown" && movie.director === reference.director ? 1 : 0;
  return Math.min(1, 0.45 * genres + 0.3 * Math.min(1, keywords / 3) + 0.25 * director);
}

export function rankRecommendations(
  candidates: RecommendationCandidate[], filters: RecommendationFilters, signals: TasteSignal[], reference: ReferenceMovie | null,
  options: { limit?: number; relevance?: Map<number, number> | null } = {},
): RecommendationCandidate[] {
  const pool = [...new Map(candidates.filter((movie) => satisfiesRecommendationFilters(movie, filters) &&
    (!options.relevance || (options.relevance.get(movie.tmdbId) ?? 0) >= 2)).map((movie) => [movie.tmdbId, movie])).values()];
  const selected: RecommendationCandidate[] = [];
  while (pool.length && selected.length < (options.limit ?? RECOMMENDATION_TARGET)) {
    const ranked = pool.map((movie) => {
      const quality = (movie.voteCount * movie.rating + 500 * 6.5) / (movie.voteCount + 500) / 10;
      const semantic = Math.max(0, Math.min(1, movie.similarity || 0));
      const score = 0.62 * semantic + 0.12 * Math.min(1, movie.lexicalScore || 0) + 0.1 * quality +
        0.16 * tasteScore(movie, signals) + 0.22 * referenceSimilarity(movie, reference) +
        (options.relevance ? 0.3 * (options.relevance.get(movie.tmdbId) ?? 0) / 3 : 0);
      const sameSeries = movie.collectionId !== null && selected.some((m) => m.collectionId === movie.collectionId);
      const sameDirector = movie.director && movie.director !== "Unknown" && selected.some((m) => m.director === movie.director);
      return { movie, score: score - (sameSeries ? 0.28 : 0) - (sameDirector ? 0.06 : 0) };
    }).sort((a, b) => b.score - a.score || a.movie.tmdbId - b.movie.tmdbId);
    selected.push(ranked[0].movie);
    pool.splice(pool.indexOf(ranked[0].movie), 1);
  }
  return selected;
}
