import { MediaDetails } from "@/types";
import {
  selectBestTrailer,
  type MovieTrailer,
  type TrailerCandidate,
} from "@/lib/trailers";

const API_KEY = process.env.TMDB_API_KEY!;
const BASE_URL = "https://api.themoviedb.org/3";

interface TmdbMovieListItem {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface DuelMovieCandidate {
  id: number;
  title: string;
  year: number;
  backdropPath: string;
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  tagline: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  runtime: number;
  budget: number;
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
}

interface TmdbCredits {
  cast: {
    name: string;
    order: number;
    character: string;
    profile_path: string | null;
  }[];
  crew: {
    job: string;
    name: string;
    profile_path: string | null;
  }[];
}

const CAST_LIMIT = 8;

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

/**
 * Search movies by title query.
 */
export async function searchMovies(query: string): Promise<MediaDetails[]> {
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/search/movie", {
    query,
    language: "en-US",
    page: "1",
  });

  // Filter out obscure movies: require meaningful vote count and a release date
  const filtered = data.results.filter(
    (m) => m.vote_count >= 50 && m.release_date
  );

  // Fetch full details for top 6 results (in parallel)
  const top = filtered.slice(0, 6);
  const details = await Promise.all(top.map((m) => getMovieDetails(m.id)));
  return details.filter((d): d is MediaDetails => d !== null);
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

  const details = await Promise.all(filtered.slice(0, 20).map((m) => getMovieDetails(m.id)));
  return {
    results: details.filter((d): d is MediaDetails => d !== null),
    totalPages: Math.min(data.total_pages, 20),
  };
}

/**
 * Fetch a broad pool of recognizable movies with cinematic stills for duels.
 * This uses list responses only, avoiding dozens of detail requests per room.
 */
export async function getDuelMoviePool(
  language = "en-US",
): Promise<DuelMovieCandidate[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      tmdbFetch<{ results: TmdbMovieListItem[] }>("/movie/popular", {
        language,
        page: String(page),
      }),
    ),
  );

  const unique = new Map<number, DuelMovieCandidate>();
  for (const movie of pages.flatMap((page) => page.results)) {
    if (
      unique.has(movie.id) ||
      movie.vote_count < 750 ||
      !movie.release_date ||
      !movie.backdrop_path
    ) {
      continue;
    }

    unique.set(movie.id, {
      id: movie.id,
      title: movie.title,
      year: Number(movie.release_date.slice(0, 4)),
      backdropPath: movie.backdrop_path,
    });
  }

  return [...unique.values()];
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

/**
 * Get full movie details by ID, mapped to MediaDetails.
 */
export async function getMovieDetails(id: number, language = "en-US"): Promise<MediaDetails | null> {
  try {
    const [movie, credits] = await Promise.all([
      tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, { language }),
      tmdbFetch<TmdbCredits>(`/movie/${id}/credits`),
    ]);

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

