import { MediaDetails } from "@/types";

const API_KEY = process.env.TMDB_API_KEY!;
const BASE_URL = "https://api.themoviedb.org/3";

interface TmdbMovieListItem {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  tagline: string;
  popularity: number;
  vote_average: number;
  runtime: number;
  budget: number;
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
}

interface TmdbCredits {
  cast: { name: string; order: number }[];
  crew: { job: string; name: string }[];
}

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

/**
 * Get full movie details by ID, mapped to MediaDetails.
 */
export async function getMovieDetails(id: number): Promise<MediaDetails | null> {
  try {
    const [movie, credits] = await Promise.all([
      tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, { language: "en-US" }),
      tmdbFetch<TmdbCredits>(`/movie/${id}/credits`),
    ]);

    const director = credits.crew.find((c) => c.job === "Director")?.name ?? "Unknown";
    const leadActor = credits.cast?.[0]?.name ?? "Unknown";
    const country = movie.production_countries[0]?.name ?? "Unknown";

    return {
      id: movie.id,
      title: movie.title,
      type: "movie",
      year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
      genres: movie.genres.map((g) => g.name),
      country,
      director,
      leadActor,
      runtime: movie.runtime ?? 0,
      budget: movie.budget ? Math.round(movie.budget / 1_000_000) : 0,
      popularity: Math.round(movie.popularity),
      rating: Math.round(movie.vote_average * 10) / 10,
      posterPath: movie.poster_path ?? "",
      overview: movie.overview,
      tagline: movie.tagline || undefined,
    };
  } catch {
    return null;
  }
}

