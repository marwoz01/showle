import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

export function catalogClient() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
}
export const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function tmdb(path, parameters = {}) {
  if (!process.env.TMDB_API_KEY) throw new Error("TMDB_API_KEY is required");
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (response.ok) return response.json();
    if (response.status !== 429 && response.status < 500) throw new Error(`TMDB HTTP ${response.status}`);
    await pause(1500 * (attempt + 1));
  }
  throw new Error("TMDB retry budget exhausted");
}

export async function discoverIds() {
  const ids = new Set();
  const buckets = [
    { pages: 20, sort_by: "vote_count.desc" },
    { pages: 15, sort_by: "vote_average.desc", "vote_count.lte": 999 },
    { pages: 15, sort_by: "popularity.desc", with_genres: 99 },
    { pages: 10, sort_by: "popularity.desc", with_original_language: "pl" },
    { pages: 10, sort_by: "popularity.desc", "primary_release_date.gte": `${new Date().getUTCFullYear() - 2}-01-01` },
    ...[28, 12, 16, 35, 80, 18, 14, 27, 9648, 10749, 878, 53, 10752, 37].map((genre) => ({ pages: 10, sort_by: "vote_average.desc", with_genres: genre })),
    ...[1950, 1960, 1970, 1980, 1990, 2000, 2010].map((year) => ({ pages: 3, sort_by: "vote_count.desc", "primary_release_date.gte": `${year}-01-01`, "primary_release_date.lte": `${year + 9}-12-31` })),
  ];
  for (const { pages, ...params } of buckets) {
    for (let page = 1; page <= pages; page++) {
      const data = await tmdb("/discover/movie", { language: "en-US", include_adult: false,
        "vote_count.gte": 50, "with_runtime.gte": 40, "primary_release_date.lte": new Date().toISOString().slice(0, 10), ...params, page });
      for (const movie of data.results ?? []) if (!movie.adult && movie.poster_path && movie.overview && movie.release_date) ids.add(movie.id);
      if (page >= data.total_pages) break;
      await pause(80);
    }
  }
  return [...ids];
}

export function catalogMovie(data) {
  if (data.adult || !data.title || !data.overview || !data.poster_path || !data.release_date ||
    data.release_date > new Date().toISOString().slice(0, 10) || !data.runtime || data.runtime < 40) return null;
  const polish = data.translations?.translations?.find((translation) => translation.iso_639_1 === "pl")?.data;
  const cast = [...(data.credits?.cast ?? [])].sort((a, b) => a.order - b.order).slice(0, 8);
  const providers = data["watch/providers"]?.results?.PL?.flatrate ?? [];
  return {
    tmdbId: data.id, title: data.title.slice(0, 250), titlePl: (polish?.title || "").slice(0, 250),
    year: Number(data.release_date.slice(0, 4)), genres: (data.genres ?? []).map((g) => g.name),
    overview: data.overview.slice(0, 3500), overviewPl: (polish?.overview || "").slice(0, 3500),
    posterPath: data.poster_path, backdropPath: data.backdrop_path ?? "",
    director: data.credits?.crew?.find((person) => person.job === "Director")?.name ?? "",
    leadActor: cast[0]?.name ?? "", country: data.production_countries?.[0]?.name ?? "", countryCode: data.production_countries?.[0]?.iso_3166_1 ?? "",
    runtime: data.runtime, budget: Math.round((data.budget || 0) / 1000000), voteCount: data.vote_count || 0,
    rating: Math.round((data.vote_average || 0) * 10) / 10, tagline: data.tagline || null, taglinePl: polish?.tagline || null,
    cast: cast.map((person) => ({ name: person.name, character: person.character ?? "", profilePath: person.profile_path ?? "" })),
    keywords: (data.keywords?.keywords ?? []).map((keyword) => keyword.name).slice(0, 40),
    collectionId: data.belongs_to_collection?.id ?? null, providerIds: [...new Set(providers.map((provider) => provider.provider_id))],
    providersUpdatedAt: new Date(), updatedAt: new Date(),
  };
}

export function embeddingText(movie) {
  return `Title: ${movie.title}\nYear: ${movie.year}\nGenres: ${movie.genres.join(", ")}\nDirector: ${movie.director}\nKeywords: ${movie.keywords.join(", ")}\nOverview: ${movie.overview}`.slice(0, 2000);
}
export const embeddingHash = (text) => createHash("sha256").update(text).digest("hex");
