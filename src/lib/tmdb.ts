import { MediaDetails } from "@/types";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import {
  selectBestTrailer,
  type MovieTrailer,
  type TrailerCandidate,
} from "@/lib/trailers";

import type { TmdbMovieListItem } from "@/lib/tmdb-types";
import { tmdbFetch } from "@/lib/tmdb-http";
import { getMovieDetails } from "@/lib/tmdb-details";
export { getMovieDetails } from "@/lib/tmdb-details";

/**
 * Search movies by title query.
 */
export async function searchMovies(query: string, language = "en-US"): Promise<MovieSuggestion[]> {
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/search/movie", {
    query,
    language,
    page: "1",
  });

  // Filter out obscure movies: require meaningful vote count and a release date
  const filtered = data.results.filter(
    (m) => m.vote_count >= 50 && m.release_date
  );

  // Suggestions need one upstream request. Fetch credits/details only after selection.
  return filtered.slice(0, 8).map((movie) => ({ id: movie.id, title: movie.title,
    originalTitle: movie.original_title ?? movie.title, year: Number(movie.release_date.slice(0, 4)),
    posterPath: movie.poster_path ?? "" }));
}

/**
 * Get popular movies from TMDB, paginated.
 */
export async function getPopularMovies(page: number = 1): Promise<{ results: MediaDetails[]; totalPages: number }> {
  const data = await tmdbFetch<{ results: TmdbMovieListItem[]; total_pages: number }>("/movie/popular", {
    language: "en-US",
    page: String(page),
  });

  const filtered = data.results.filter(
    (m) => m.vote_count >= 50 && m.release_date && m.poster_path
  );

  const selected = filtered.slice(0, 20);
  const details: (MediaDetails | null)[] = Array(selected.length).fill(null);
  const deadline = AbortSignal.timeout(10000);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, selected.length) }, async () => {
    while (next < selected.length && !deadline.aborted) {
      const index = next++;
      details[index] = await getMovieDetails(selected[index].id, "en-US", deadline);
    }
  }));
  if (selected.length && details.every((movie) => !movie)) throw new Error("TMDB details unavailable");
  return {
    results: details.filter((d): d is MediaDetails => d !== null),
    totalPages: Math.min(data.total_pages, 20),
  };
}

/**
 * Search TMDB for a movie by title and optional year. Returns the best match.
 */
export async function searchMovieByTitleAndYear(
  title: string,
  year?: number
): Promise<MediaDetails | null> {
  try {
    const params: Record<string, string> = {
      query: title,
      language: "en-US",
      page: "1",
    };
    if (year) params.year = String(year);

    const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>(
      "/search/movie",
      params
    );

    if (data.results.length === 0) return null;

    const sorted = [...data.results]
      .filter((m) => m.vote_count >= 10 && m.release_date)
      .sort((a, b) => {
        if (year) {
          const aYear = parseInt(a.release_date.slice(0, 4));
          const bYear = parseInt(b.release_date.slice(0, 4));
          if (aYear === year && bYear !== year) return -1;
          if (bYear === year && aYear !== year) return 1;
        }
        return b.vote_count - a.vote_count;
      });

    if (sorted.length === 0) return null;
    return getMovieDetails(sorted[0].id);
  } catch {
    return null;
  }
}

interface TmdbImagesResponse {
  backdrops: { file_path: string; vote_count: number; aspect_ratio: number }[];
}

interface TmdbVideosResponse {
  results: TrailerCandidate[];
}

/**
 * Get the best available YouTube trailer, preferring the selected language
 * and falling back to English when TMDB has no localized trailer.
 */
export async function getMovieTrailer(
  id: number,
  language = "en-US",
): Promise<MovieTrailer | null> {
  const languages = language === "en-US" ? [language] : [language, "en-US"];

  const responses = await Promise.all(
    languages.map(async (videoLanguage) => {
      try {
        const data = await tmdbFetch<TmdbVideosResponse>(`/movie/${id}/videos`, {
          language: videoLanguage,
        });
        return data.results;
      } catch {
        return [];
      }
    }),
  );

  return selectBestTrailer(responses.flat(), language);
}

/**
 * Get up to `limit` cinematic stills (backdrops) for a movie, ranked by community votes.
 * Returns just the file paths — caller composes the URL with the desired CDN size.
 */
export async function getMovieGallery(id: number, limit = 6): Promise<string[]> {
  try {
    const data = await tmdbFetch<TmdbImagesResponse>(`/movie/${id}/images`, {
      // Allow language-less stills first; many backdrops have no localized text overlay.
      include_image_language: "en,null",
    });
    return data.backdrops
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, limit)
      .map((b) => b.file_path);
  } catch {
    return [];
  }
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProvidersResult {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  link?: string;
}

/**
 * Get streaming/rental providers for a movie in a given region (default: PL).
 * Data sourced from JustWatch via TMDB.
 */
export async function getWatchProviders(id: number, region = "PL"): Promise<WatchProvidersResult | null> {
  try {
    const data = await tmdbFetch<{
      results: Record<string, { flatrate?: WatchProvider[]; rent?: WatchProvider[]; link?: string }>;
    }>(`/movie/${id}/watch/providers`);
    const r = data.results?.[region];
    if (!r) return null;
    return { flatrate: r.flatrate, rent: r.rent, link: r.link };
  } catch {
    return null;
  }
}

