import { MOVIE_GENRES } from "@/constants/genres";
import { isRecord } from "@/lib/request-body";

export const MAX_RECOMMEND_EXCLUDES = 1000;
export const MAX_RECOMMEND_BODY_BYTES = 16 * 1024;
export const MAX_JUSTIFICATION_PROMPT_CHARS = 6000;

export interface RecommendRequest {
  genres: string[];
  yearFrom: number;
  yearTo: number;
  popularity: "popular" | "medium" | "niche";
  locale: "pl" | "en";
  exclude: number[];
  freeformText: string;
}

export function parseRecommendRequest(value: unknown): RecommendRequest | null {
  if (!isRecord(value)) return null;
  const { genres, yearFrom, yearTo, popularity, locale = "en", exclude = [], freeformText = "" } = value;
  if (
    !Array.isArray(genres) || genres.length > MOVIE_GENRES.length ||
    genres.some((genre) => typeof genre !== "string" || !(MOVIE_GENRES as readonly string[]).includes(genre)) ||
    new Set(genres).size !== genres.length ||
    typeof freeformText !== "string" || freeformText.length > 400 ||
    (!genres.length && !freeformText.trim()) ||
    typeof yearFrom !== "number" || !Number.isInteger(yearFrom) || yearFrom < 1888 ||
    typeof yearTo !== "number" || !Number.isInteger(yearTo) || yearTo > new Date().getUTCFullYear() + 1 ||
    yearFrom > yearTo ||
    (popularity !== "popular" && popularity !== "medium" && popularity !== "niche") ||
    (locale !== "pl" && locale !== "en") ||
    !Array.isArray(exclude) || exclude.length > MAX_RECOMMEND_EXCLUDES ||
    exclude.some((id) => !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) ||
    new Set(exclude).size !== exclude.length
  ) return null;
  return { genres, yearFrom, yearTo, popularity, locale, exclude, freeformText: freeformText.trim() };
}
