import { getRecommendationProfile } from "@/lib/recommend-profile";
import { inferRecommendationIntent } from "@/lib/recommend-intent";
import { interpretRecommendation } from "@/lib/recommend-ai";
import { getRecommendationReference } from "@/lib/recommend-reference";
import { resolveRecommendationFilters } from "@/lib/recommend-filters";
import { findRecommendationCandidates } from "@/lib/recommend-search";
import { rankRecommendations } from "@/lib/recommend-ranking";
import { reviewRecommendationRelevance } from "@/lib/recommend-relevance";
import { explainRecommendation } from "@/lib/recommend-explanations";
import type { RecommendRequest } from "@/lib/recommend-input";
import type { RecommendationMeta } from "@/types/recommendation";

export class PickError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

export function needsPickInterpretation(request: RecommendRequest) {
  return Boolean(request.freeformText || request.referenceMovieId);
}

export async function getPersonalPicks(request: RecommendRequest, userId: string | null,
  favorites: number[], includeIds?: number[]) {
  const search = needsPickInterpretation(request);
  const [profile, intent, reference] = await Promise.all([
    getRecommendationProfile(userId, request, favorites),
    search ? interpretRecommendation(request.freeformText) : inferRecommendationIntent(""),
    request.referenceMovieId ? getRecommendationReference(request.referenceMovieId) : null,
  ]);
  if (request.referenceMovieId && !reference) throw new PickError("reference_unavailable", 503);
  const filters = resolveRecommendationFilters(request, intent, profile.excludedIds);
  filters.includeIds = includeIds;
  if (filters.genres.some((genre) => filters.excludedGenres.includes(genre))) {
    throw new PickError("conflicting_preferences", 400);
  }
  // Opening the personal shelf uses the catalog directly, without an embedding or chat request.
  const queryText = search ? [intent.queryEnglish,
    reference ? `Similar to ${reference.title}. ${reference.overview.slice(0, 900)}` : "",
  ].filter(Boolean).join(". ") : "";
  const preferredGenres = [...new Set(profile.signals.filter((signal) => signal.weight > 0)
    .flatMap((signal) => signal.genres))].slice(0, 8);
  const { movies, matching } = await findRecommendationCandidates({ filters, queryText, preferredGenres });
  const shortlist = rankRecommendations(movies, filters, profile.signals, reference, { limit: 24 });
  const relevance = search ? await reviewRecommendationRelevance(shortlist, request.freeformText, reference)
    : { scores: null, source: "local" as const };
  const ranked = rankRecommendations(shortlist, filters, profile.signals, reference,
    { limit: 3, relevance: relevance.scores });
  const meta: RecommendationMeta = { mode: search ? "search" : "personal", source: request.source,
    matching, interpretation: intent.source, relevance: relevance.source,
    personalized: profile.signals.length > 0, partial: ranked.length < 3 };
  return { recommendations: ranked.map((movie) =>
    explainRecommendation(movie, filters, profile.signals, reference, request.locale)), meta };
}
