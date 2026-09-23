import type { Prisma } from "@prisma/client";
import type { ProfileBadge, ProfileMovie, ProfilePreferences, ProfileSummary } from "@/types/profile";
import type { ComparedMovieRating, PublicProfile, TasteComparison } from "@/types/public-profile";

export const MIN_SHARED_RATINGS = 3;

export function profileMovieSnapshots(value: unknown): ProfileMovie[] {
  if (!Array.isArray(value)) return [];
  const movies: ProfileMovie[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !Number.isSafeInteger(item.id) || item.id <= 0 || typeof item.title !== "string") continue;
    if (movies.some((movie) => movie.id === item.id)) continue;
    movies.push({ id: item.id, title: item.title.slice(0, 250), year: Number.isSafeInteger(item.year) ? item.year : 0,
      posterPath: typeof item.posterPath === "string" && /^\/[\w.-]+$/.test(item.posterPath) ? item.posterPath : "" });
    if (movies.length === 4) break;
  }
  return movies;
}

/** An explicit allowlist: never serialize a database profile or its summary directly. */
export function toPublicProfile(profile: {
  publicSlug: string; displayName: string; bio: string; avatarUrl: string | null; favoriteMovies: unknown;
}, summary: ProfileSummary, badges: ProfileBadge[]): PublicProfile {
  return {
    publicSlug: profile.publicSlug, displayName: profile.displayName, bio: profile.bio, avatarUrl: profile.avatarUrl,
    favoriteMovies: profileMovieSnapshots(profile.favoriteMovies), watchedCount: summary.watchedCount,
    totalMinutes: summary.totalMinutes, higherLowerBest: summary.higherLowerBest,
    daily: {
      gamesPlayed: summary.daily.gamesPlayed, gamesWon: summary.daily.gamesWon,
      currentStreak: summary.daily.currentStreak, maxStreak: summary.daily.maxStreak,
      averageGuesses: summary.daily.averageGuesses,
    },
    badges: badges.filter((badge) => badge.unlocked).map((badge) => ({ id: badge.id })),
  };
}

export interface ComparisonMovie {
  tmdbId: number; title: string; year: number; posterPath: string; genres: string[];
  rating: number | null; category: string;
}

function validRating(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0.5 && value <= 10;
}

/** A similarity indicator, not a prediction: average rating gap over the full 0.5–10 scale. */
export function compareMovieTaste(viewer: ComparisonMovie[], other: ComparisonMovie[], viewerFavorites: ProfileMovie[], otherFavorites: ProfileMovie[], ratingDetailsVisible = false): TasteComparison {
  const otherById = new Map(other.map((movie) => [movie.tmdbId, movie]));
  const sharedRatings: ComparedMovieRating[] = [];
  for (const movie of viewer) {
    const otherRating = otherById.get(movie.tmdbId)?.rating ?? null;
    if (!validRating(movie.rating) || !validRating(otherRating)) continue;
    // Share only mutually rated films, using the viewer's own known metadata.
    sharedRatings.push({ id: movie.tmdbId, title: movie.title, year: movie.year, posterPath: movie.posterPath,
      viewerRating: movie.rating, otherRating, gap: Math.abs(movie.rating - otherRating) });
  }
  const averageGap = sharedRatings.reduce((sum, movie) => sum + movie.gap, 0) / (sharedRatings.length || 1);
  const agreements = sharedRatings.filter((movie) => movie.gap <= 1).sort((a, b) => a.gap - b.gap || b.viewerRating + b.otherRating - a.viewerRating - a.otherRating || a.id - b.id);
  const differences = sharedRatings.filter((movie) => movie.gap >= 3).sort((a, b) => b.gap - a.gap || a.id - b.id);
  const canShowMovie = (movie: ComparedMovieRating) => ratingDetailsVisible && otherById.get(movie.id)?.category === "watched";
  const showAggregates = sharedRatings.length >= MIN_SHARED_RATINGS || (ratingDetailsVisible && sharedRatings.every(canShowMovie));
  const viewerFavoriteIds = new Set(viewerFavorites.map((movie) => movie.id));
  const sharedMovies = otherFavorites.filter((movie) => viewerFavoriteIds.has(movie.id));
  const sharedIds = new Set(sharedMovies.map((movie) => movie.id));
  for (const movie of sharedRatings) {
    if (canShowMovie(movie) && movie.viewerRating >= 8 && movie.otherRating >= 8 && !sharedIds.has(movie.id)) {
      sharedMovies.push({ id: movie.id, title: movie.title, year: movie.year, posterPath: movie.posterPath });
      sharedIds.add(movie.id);
    }
  }
  return {
    score: sharedRatings.length >= MIN_SHARED_RATINGS ? Math.max(0, Math.round(100 * (1 - averageGap / 9.5))) : null,
    sharedRatingCount: sharedRatings.length,
    sharedMovies: sharedMovies.slice(0, 8),
    averageRatingGap: showAggregates && sharedRatings.length ? Math.round(averageGap * 100) / 100 : null,
    agreementCount: showAggregates ? agreements.length : null,
    differenceCount: showAggregates ? differences.length : null,
    ratingDetailsVisible,
    similarRatings: agreements.filter(canShowMovie).slice(0, 4),
    differentRatings: differences.filter(canShowMovie).slice(0, 4),
  };
}

export function sharedSuggestionWhere(viewer: ProfilePreferences, other: ProfilePreferences, viewerMovies: ComparisonMovie[], otherMovies: ComparisonMovie[], negativeIds: number[]): Prisma.RecommendationMovieWhereInput {
  const excludedIds = new Set(negativeIds);
  for (const movie of [...viewerMovies, ...otherMovies]) {
    if (movie.category === "watched" || (validRating(movie.rating) && movie.rating <= 4)) excludedIds.add(movie.tmdbId);
  }
  const excludedGenres = [...new Set([...viewer.excludedGenres, ...other.excludedGenres])];
  const runtimes = [viewer.maxRuntime, other.maxRuntime].filter((value): value is number => value !== null && value > 0);
  const AND: Prisma.RecommendationMovieWhereInput[] = [];
  // A title must be available to each person who specified platforms. A common platform is
  // not required: the same film can be on Netflix for one viewer and Max for the other.
  if (viewer.providerIds.length) AND.push({ providerIds: { hasSome: viewer.providerIds } });
  if (other.providerIds.length) AND.push({ providerIds: { hasSome: other.providerIds } });
  if (excludedGenres.length) AND.push({ NOT: { genres: { hasSome: excludedGenres } } });
  return {
    tmdbId: { notIn: [...excludedIds] },
    ...(runtimes.length ? { runtime: { gt: 0, lte: Math.min(...runtimes) } } : {}),
    ...(AND.length ? { AND } : {}),
  };
}

export function rankSharedSuggestions<T extends { tmdbId: number; genres: string[]; rating: number; voteCount: number }>(movies: T[], viewer: ProfilePreferences, other: ProfilePreferences, viewerMovies: ComparisonMovie[], otherMovies: ComparisonMovie[]): T[] {
  function taste(preferences: ProfilePreferences, collection: ComparisonMovie[]) {
    const weights = new Map<string, number>();
    for (const genre of preferences.genres) weights.set(genre, 2);
    for (const movie of collection) {
      if (movie.rating === null || !validRating(movie.rating)) continue;
      for (const genre of movie.genres) weights.set(genre, (weights.get(genre) ?? 0) + (movie.rating - 5) / 5);
    }
    const scale = Math.max(1, ...[...weights.values()].map(Math.abs));
    return (genres: string[]) => genres.reduce((sum, genre) => sum + (weights.get(genre) ?? 0) / scale, 0) / Math.max(1, genres.length);
  }
  const viewerScore = taste(viewer, viewerMovies), otherScore = taste(other, otherMovies);
  const score = (movie: T) => {
    const a = viewerScore(movie.genres), b = otherScore(movie.genres);
    return Math.min(a, b) * 2 + (a + b) / 2 + movie.rating / 10;
  };
  return [...movies].sort((a, b) => score(b) - score(a) || b.voteCount - a.voteCount || a.tmdbId - b.tmdbId);
}
