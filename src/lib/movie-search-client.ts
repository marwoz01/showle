import type { MovieSuggestion } from "@/types/movie-suggestion";

const SEARCH_TTL = 5 * 60_000;
const MAX_QUERIES = 40;
const queries = new Map<string, { expiresAt: number; movies: MovieSuggestion[] }>();
const keyFor = (query: string, locale: string) => `${locale}:${query.trim().toLowerCase()}`;
const searchable = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l");

function pruneQueries() {
  for (const [key, entry] of queries) if (entry.expiresAt <= Date.now()) queries.delete(key);
}

export function readMovieSearchCache(query: string, locale: string): MovieSuggestion[] | undefined {
  pruneQueries();
  return queries.get(keyFor(query, locale))?.movies;
}

export function rememberMovieSearch(query: string, locale: string, movies: MovieSuggestion[]) {
  pruneQueries();
  const key = keyFor(query, locale);
  queries.delete(key);
  queries.set(key, { movies, expiresAt: Date.now() + SEARCH_TTL });
  while (queries.size > MAX_QUERIES) queries.delete(queries.keys().next().value!);
}

/** Already-known matching titles can remain selectable while a refined query loads. */
export function findCachedMovieSuggestions(query: string, locale: string): MovieSuggestion[] {
  pruneQueries();
  const needle = searchable(query.trim());
  const matches = new Map<number, MovieSuggestion>();
  for (const [key, entry] of [...queries].reverse()) {
    if (!key.startsWith(`${locale}:`)) continue;
    for (const movie of entry.movies) {
      if (searchable(`${movie.title} ${movie.originalTitle}`).includes(needle)) matches.set(movie.id, movie);
      if (matches.size === 8) return [...matches.values()];
    }
  }
  return [...matches.values()];
}

const warmed = new Map<string, number>();
let warmWindow = 0;
let warmRequests = 0;

/** Warm public metadata only; never submit a guess or fetch the daily answer. */
export function warmMovieSelection(id: number, locale: string) {
  const now = Date.now();
  if (now - warmWindow >= 60_000) { warmWindow = now; warmRequests = 0; }
  for (const [key, expiresAt] of warmed) if (expiresAt <= now) warmed.delete(key);
  for (const language of locale === "pl" ? ["en", "pl"] : ["en"]) {
    const key = `${language}:${id}`;
    if (warmed.has(key) || warmRequests >= 24) continue;
    warmed.set(key, now + SEARCH_TTL);
    warmRequests++;
    while (warmed.size > 64) warmed.delete(warmed.keys().next().value!);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    void fetch(`/api/movies/details?id=${id}&lang=${language}`, { cache: "force-cache", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("metadata_unavailable");
        await response.json();
      })
      .catch(() => warmed.delete(key))
      .finally(() => clearTimeout(timeout));
  }
}
