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
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
}

interface TmdbCredits {
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

  // Filter out obscure movies: require minimum popularity OR vote count, must have a release date
  const filtered = data.results.filter(
    (m) => (m.popularity >= 3 || m.vote_count >= 10) && m.release_date
  );

  // Fetch full details for top 6 results (in parallel)
  const top = filtered.slice(0, 6);
  const details = await Promise.all(top.map((m) => getMovieDetails(m.id)));
  return details.filter((d): d is MediaDetails => d !== null);
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
    const country = movie.production_countries[0]?.name ?? "Unknown";

    return {
      id: movie.id,
      title: movie.title,
      type: "movie",
      year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
      genres: movie.genres.map((g) => g.name),
      country,
      director,
      runtime: movie.runtime ?? 0,
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

/**
 * Get a deterministic daily movie from TMDB's top rated list.
 * Uses the date to pick a stable movie that changes daily.
 */
export async function getDailyMovieFromTmdb(): Promise<MediaDetails | null> {
  const dateStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });

  // Hash date to pick page (1-25) and index (0-19)
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const page = (hash % 25) + 1;
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/movie/top_rated", {
    language: "en-US",
    page: String(page),
  });

  if (data.results.length === 0) return null;

  const index = hash % data.results.length;
  return getMovieDetails(data.results[index].id);
}
