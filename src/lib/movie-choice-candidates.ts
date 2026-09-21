import { explainRecommendation } from "@/lib/recommend-explanations";
import { satisfiesRecommendationFilters, type RecommendationFilters } from "@/lib/recommend-filters";
import { findRecommendationCandidates, type RecommendationSearch } from "@/lib/recommend-search";
import type { MediaDetails } from "@/types";
import type { MovieChoicePreferences } from "@/types/movie-choice";
import type { RecommendationCandidate } from "@/types/recommendation";

const BATCH_SIZE = 20;

function quality(movie: RecommendationCandidate): number {
  return (movie.voteCount * movie.rating + 500 * 6.5) / (movie.voteCount + 500) / 10;
}

function takeBest(
  pool: RecommendationCandidate[],
  selected: RecommendationCandidate[],
): RecommendationCandidate | undefined {
  const score = (movie: RecommendationCandidate) => quality(movie) -
    (movie.collectionId !== null && selected.some((chosen) => chosen.collectionId === movie.collectionId) ? 0.28 : 0) -
    (movie.director && movie.director !== "Unknown" && selected.some((chosen) => chosen.director === movie.director) ? 0.06 : 0);
  pool.sort((a, b) => score(b) - score(a) || a.tmdbId - b.tmdbId);
  return pool.shift();
}

/**
 * Genres are preferences: common interests first, then alternating individual
 * interests, then other films. Exclusions, runtime and available platforms are
 * hard limits. Either person's streaming account can be used to watch together.
 * Empty query text keeps retrieval entirely inside the local movie catalogue.
 */
export async function generateMovieChoiceCandidates(
  preferences: [MovieChoicePreferences, MovieChoicePreferences],
  locale: "pl" | "en",
  excludeIds: number[],
): Promise<MediaDetails[]> {
  const excludedGenres = [...new Set(preferences.flatMap((preference) => preference.excludedGenres))];
  const genres = preferences.map((preference) =>
    [...new Set(preference.genres)].filter((genre) => !excludedGenres.includes(genre)));
  const preferredGenres = [...new Set(genres.flat())];
  const runtimeLimits = preferences.flatMap((preference) => preference.maxRuntime === null ? [] : [preference.maxRuntime]);
  const filters: RecommendationFilters = {
    genres: [],
    excludedGenres,
    maxRuntime: runtimeLimits.length ? Math.min(...runtimeLimits) : null,
    providerIds: [...new Set(preferences.flatMap((preference) => preference.providerIds))],
    excludeIds: [...new Set(excludeIds)],
    yearFrom: 1888,
    yearTo: new Date().getUTCFullYear(),
    popularity: "any",
    freeformText: "",
    referenceMovieId: null,
  };

  // A separate pool for each taste prevents the catalogue's global top 60 from
  // crowding out the other person's choices. Opposite tastes boost shared films.
  const searches: RecommendationSearch[] = [{ filters, queryText: "", preferredGenres }];
  const searchedGenres = new Set<string>();
  genres.forEach((taste, index) => {
    const key = [...taste].sort().join("|");
    if (!taste.length || searchedGenres.has(key)) return;
    searchedGenres.add(key);
    searches.push({
      filters: { ...filters, genres: taste },
      queryText: "",
      preferredGenres: genres[1 - index],
    });
  });
  const results = await Promise.all(searches.map((search) => findRecommendationCandidates(search)));
  const unique = new Map<number, RecommendationCandidate>();
  for (const { movies } of results) {
    for (const movie of movies) {
      if (!unique.has(movie.tmdbId) && satisfiesRecommendationFilters(movie, filters)) unique.set(movie.tmdbId, movie);
    }
  }

  const shared: RecommendationCandidate[] = [];
  const individual: [RecommendationCandidate[], RecommendationCandidate[]] = [[], []];
  const others: RecommendationCandidate[] = [];
  for (const movie of unique.values()) {
    const matches = genres.map((taste) => taste.some((genre) => movie.genres.includes(genre)));
    if (matches[0] && matches[1]) shared.push(movie);
    else if (matches[0]) individual[0].push(movie);
    else if (matches[1]) individual[1].push(movie);
    else others.push(movie);
  }

  const selected: RecommendationCandidate[] = [];
  let turn = 0;
  while (selected.length < BATCH_SIZE) {
    let next = takeBest(shared, selected);
    if (!next && (individual[0].length || individual[1].length)) {
      const owner = individual[turn].length ? turn : 1 - turn;
      next = takeBest(individual[owner], selected);
      turn = 1 - owner;
    }
    next ??= takeBest(others, selected);
    if (!next) break;
    selected.push(next);
  }
  return selected.map((movie) => explainRecommendation(movie, filters, [], null, locale).movie);
}
