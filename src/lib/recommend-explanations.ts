import pl from "@/i18n/pl";
import en from "@/i18n/en";
import { localizeGenre } from "@/lib/localization";
import { normalizeDisplayText } from "@/lib/typography";
import { tasteScore, type TasteSignal } from "@/lib/recommend-taste";
import { referenceSimilarity, type ReferenceMovie } from "@/lib/recommend-ranking";
import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import type { RecommendationFilters } from "@/lib/recommend-filters";
import type { Recommendation, RecommendationCandidate } from "@/types/recommendation";

export function explainRecommendation(
  movie: RecommendationCandidate, filters: RecommendationFilters, signals: TasteSignal[], reference: ReferenceMovie | null, locale: "pl" | "en",
): Recommendation {
  const t = locale === "pl" ? pl : en;
  const reasons: string[] = [];
  const providers = RECOMMENDATION_PROVIDERS.filter((provider) => filters.providerIds.includes(provider.id) && movie.providerIds.includes(provider.id));
  if (providers.length) reasons.push(t.recommendation.becauseProviders(providers.map((p) => p.name).join(", ")));
  if (filters.maxRuntime !== null) reasons.push(t.recommendation.becauseRuntime(movie.runtime));
  if (reference && referenceSimilarity(movie, reference) >= 0.2) reasons.push(t.recommendation.becauseReference(normalizeDisplayText(reference.title)));
  if (tasteScore(movie, signals) > 0.15) reasons.push(t.recommendation.becauseTaste);
  const genres = movie.genres.filter((g) => filters.genres.includes(g));
  if (genres.length) reasons.push(t.recommendation.becauseGenres(genres.map((g) => localizeGenre(g, t)).join(", ")));
  if (movie.voteCount > 0) reasons.push(t.recommendation.becauseRating(movie.rating, movie.voteCount.toLocaleString(locale === "pl" ? "pl-PL" : "en-US")));
  return {
    movie: {
      id: movie.tmdbId, type: "movie", title: locale === "pl" && movie.titlePl ? movie.titlePl : movie.title,
      year: movie.year, genres: movie.genres, country: movie.country, countryCode: movie.countryCode || undefined,
      director: movie.director, leadActor: movie.leadActor, runtime: movie.runtime, budget: movie.budget,
      popularity: movie.voteCount, rating: movie.rating, posterPath: movie.posterPath, backdropPath: movie.backdropPath,
      overview: locale === "pl" && movie.overviewPl ? movie.overviewPl : movie.overview,
      tagline: (locale === "pl" && movie.taglinePl ? movie.taglinePl : movie.tagline) || undefined, cast: movie.cast,
    },
    justification: reasons.slice(0, 2).join(" "),
  };
}
