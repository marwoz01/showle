import type { Prisma } from "@prisma/client";
import { MOVIE_GENRES } from "@/constants/genres";
import { isRecord } from "@/lib/request-body";

const record = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
const rows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter(isRecord) : [];
const text = (value: unknown, limit = 250) => typeof value === "string" ? value.slice(0, limit) : "";
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

// SavedMovie text is editable client input. Only public TMDB metadata may enter AI candidates.
export function parseCatalogMetadata(value: unknown, id: number): Prisma.RecommendationMovieUncheckedCreateInput | null {
  const data = record(value);
  const releaseDate = text(data.release_date);
  const title = text(data.title);
  const overview = text(data.overview, 3500);
  const posterPath = text(data.poster_path);
  const runtime = Math.round(number(data.runtime));
  if (data.id !== id || data.adult !== false || !title || !overview ||
    !/^\/[a-zA-Z0-9]+\.(jpg|png)$/.test(posterPath) || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate) ||
    releaseDate > new Date().toISOString().slice(0, 10) || runtime < 40 || runtime > 2147483647) return null;
  const translations = rows(record(data.translations).translations);
  const polish = record(translations.find((item) => item.iso_639_1 === "pl")?.data);
  const credits = record(data.credits);
  const cast = rows(credits.cast).slice(0, 8);
  const countries = rows(data.production_countries);
  const providers = rows(record(record(record(data["watch/providers"]).results).PL).flatrate);
  return {
    tmdbId: id, title, titlePl: text(polish.title), year: Number(releaseDate.slice(0, 4)),
    overview, overviewPl: text(polish.overview, 3500), posterPath, backdropPath: text(data.backdrop_path),
    genres: rows(data.genres).map((genre) => text(genre.name)).filter((genre) => (MOVIE_GENRES as readonly string[]).includes(genre)),
    director: text(rows(credits.crew).find((person) => person.job === "Director")?.name),
    leadActor: text(cast[0]?.name), country: text(countries[0]?.name), countryCode: text(countries[0]?.iso_3166_1, 2),
    runtime, budget: Math.min(2147483647, Math.round(number(data.budget) / 1000000)),
    voteCount: Math.min(2147483647, Math.round(number(data.vote_count))), rating: Math.min(10, Math.round(number(data.vote_average) * 10) / 10),
    tagline: text(data.tagline) || null, taglinePl: text(polish.tagline) || null,
    cast: cast.map((person) => ({ name: text(person.name), character: text(person.character), profilePath: text(person.profile_path) })),
    keywords: rows(record(data.keywords).keywords).slice(0, 40).map((keyword) => text(keyword.name)),
    collectionId: Number.isSafeInteger(record(data.belongs_to_collection).id) ? Number(record(data.belongs_to_collection).id) : null,
    providerIds: providers.map((provider) => number(provider.provider_id)).filter((provider) => Number.isSafeInteger(provider) && provider > 0 && provider <= 2147483647),
    providersUpdatedAt: new Date(),
  };
}

export async function fetchCatalogMetadata(id: number, signal: AbortSignal) {
  try {
    const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
    url.searchParams.set("api_key", process.env.TMDB_API_KEY ?? "");
    url.searchParams.set("language", "en-US");
    url.searchParams.set("append_to_response", "credits,keywords,translations,watch/providers");
    const response = await fetch(url, { signal, next: { revalidate: 3600 } });
    return response.ok ? parseCatalogMetadata(await response.json(), id) : null;
  } catch { return null; }
}
