import type { MediaDetails } from "@/types";
import type { Recommendation, RecommendationMeta } from "@/types/recommendation";
import { validMovieId } from "@/lib/recommend-input";

export interface HomeRefinement { freeformText: string; maxRuntime: number | null; referenceMovieId: number | null }
export const EMPTY_HOME_REFINEMENT: HomeRefinement = { freeformText: "", maxRuntime: null, referenceMovieId: null };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function movie(value: unknown): MediaDetails | null {
  const raw = record(value);
  if (!raw || !validMovieId(raw.id) ||
    typeof raw.title !== "string" || !raw.title.trim() || !Array.isArray(raw.genres) || raw.genres.some((genre) => typeof genre !== "string")) return null;
  const number = (key: string) => typeof raw[key] === "number" && Number.isFinite(raw[key]) ? raw[key] : 0;
  const string = (key: string) => typeof raw[key] === "string" ? raw[key] : "";
  return { id: raw.id, title: raw.title, type: "movie", year: number("year"), genres: raw.genres as string[],
    country: string("country"), countryCode: string("countryCode"), director: string("director"), leadActor: string("leadActor"),
    runtime: number("runtime"), budget: number("budget"), popularity: number("popularity"), rating: number("rating"),
    posterPath: /^\/[a-zA-Z0-9._-]+$/.test(string("posterPath")) ? string("posterPath") : "", overview: string("overview") };
}

export function parseHomePicks(value: unknown): { recommendations: Recommendation[]; meta: RecommendationMeta | null } | null {
  const raw = record(value);
  if (!raw || !Array.isArray(raw.recommendations)) return null;
  const recommendations: Recommendation[] = [];
  for (const candidate of raw.recommendations.slice(0, 20)) {
    const item = record(candidate);
    const parsed = movie(item?.movie);
    if (!parsed || typeof item?.justification !== "string" || recommendations.some(({ movie }) => movie.id === parsed.id)) continue;
    recommendations.push({ movie: parsed, justification: item.justification });
    if (recommendations.length === 3) break;
  }
  if (!recommendations.length) return null;
  const meta = record(raw.meta);
  return { recommendations, meta: meta ? {
    mode: meta.mode === "personal" ? "personal" : "search",
    source: meta.source === "watchlist" ? "watchlist" : "catalog",
    matching: meta.matching === "semantic" ? "semantic" : "filters",
    interpretation: meta.interpretation === "ai" ? "ai" : "local",
    relevance: meta.relevance === "ai" ? "ai" : "local",
    personalized: meta.personalized === true, partial: meta.partial === true || recommendations.length < 3,
  } : null };
}

export function homeResponseError(value: unknown): string {
  const raw = record(value);
  return typeof raw?.error === "string" ? raw.error : "internal";
}
