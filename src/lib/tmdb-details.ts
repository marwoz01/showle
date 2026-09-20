import type { MediaDetails } from "@/types";
import type { TmdbMovieDetails, TmdbCredits } from "@/lib/tmdb-types";
import { tmdbFetch } from "@/lib/tmdb-http";

const CAST_LIMIT = 8;

/**
 * Get full movie details by ID, mapped to MediaDetails.
 */
export async function getMovieDetails(id: number, language = "en-US", signal?: AbortSignal): Promise<MediaDetails | null> {
  try {
    const movie = await tmdbFetch<TmdbMovieDetails & { credits: TmdbCredits }>(`/movie/${id}`, { language, append_to_response: "credits" }, signal);
    const credits = movie.credits;

    const directorCredit = credits.crew.find((c) => c.job === "Director");
    const director = directorCredit?.name ?? "Unknown";
    const sortedCast = (credits.cast ?? [])
      .slice()
      .sort((a, b) => a.order - b.order);
    const leadActor = sortedCast[0]?.name ?? "Unknown";
    const cast = sortedCast.slice(0, CAST_LIMIT).map((c) => ({
      name: c.name,
      character: c.character ?? "",
      profilePath: c.profile_path ?? "",
    }));
    const productionCountry = movie.production_countries[0];
    const country = productionCountry?.name ?? "Unknown";

    return {
      id: movie.id,
      title: movie.title,
      type: "movie",
      year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
      genres: movie.genres.map((g) => g.name),
      country,
      countryCode: productionCountry?.iso_3166_1,
      director,
      directorProfilePath: directorCredit?.profile_path ?? "",
      leadActor,
      runtime: movie.runtime ?? 0,
      budget: movie.budget ? Math.round(movie.budget / 1_000_000) : 0,
      // TMDB `popularity` is a daily-decaying activity metric (low for older classics
      // even when they're famous). `vote_count` is a stable accumulated-fame proxy.
      popularity: movie.vote_count ?? 0,
      rating: Math.round(movie.vote_average * 10) / 10,
      posterPath: movie.poster_path ?? "",
      backdropPath: movie.backdrop_path ?? "",
      overview: movie.overview,
      tagline: movie.tagline || undefined,
      cast,
    };
  } catch {
    return null;
  }
}
