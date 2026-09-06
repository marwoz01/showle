import { MOVIE_GENRES } from "@/constants/genres";
import { isRecord } from "@/lib/request-body";
import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import type { RecommendationPreference } from "@/types/recommendation";

export const MAX_RECOMMEND_EXCLUDES = 1000;
export const MAX_RECOMMEND_BODY_BYTES = 16 * 1024;

export interface RecommendRequest extends RecommendationPreference {
  locale: "pl" | "en";
  exclude: number[];
  positiveIds: number[];
  negativeIds: number[];
}

export function validMovieId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}
function validIds(value: unknown, max: number): value is number[] {
  return Array.isArray(value) && value.length <= max && value.every(validMovieId) && new Set(value).size === value.length;
}
function validGenres(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= MOVIE_GENRES.length &&
    value.every((genre) => typeof genre === "string" && (MOVIE_GENRES as readonly string[]).includes(genre)) &&
    new Set(value).size === value.length;
}

export function parseRecommendRequest(value: unknown): RecommendRequest | null {
  if (!isRecord(value)) return null;
  const {
    genres, yearFrom, yearTo, popularity, locale = "en", exclude = [], freeformText = "",
    excludedGenres = [], maxRuntime = null, providerIds = [], referenceMovieId = null,
    positiveIds = [], negativeIds = [],
  } = value;
  if (
    !validGenres(genres) || !validGenres(excludedGenres) || genres.some((g) => excludedGenres.includes(g)) ||
    typeof freeformText !== "string" || freeformText.length > 400 ||
    (referenceMovieId !== null && !validMovieId(referenceMovieId)) ||
    (!genres.length && !freeformText.trim() && referenceMovieId === null) ||
    typeof yearFrom !== "number" || !Number.isInteger(yearFrom) || yearFrom < 1888 ||
    typeof yearTo !== "number" || !Number.isInteger(yearTo) || yearTo > new Date().getUTCFullYear() + 1 ||
    yearFrom > yearTo ||
    (popularity !== "any" && popularity !== "popular" && popularity !== "medium" && popularity !== "niche") ||
    (locale !== "pl" && locale !== "en") ||
    (maxRuntime !== null && (typeof maxRuntime !== "number" || !Number.isInteger(maxRuntime) || maxRuntime < 40 || maxRuntime > 360)) ||
    !validIds(providerIds, RECOMMENDATION_PROVIDERS.length) ||
    providerIds.some((id) => !RECOMMENDATION_PROVIDERS.some((provider) => provider.id === id)) ||
    !validIds(exclude, MAX_RECOMMEND_EXCLUDES) || !validIds(positiveIds, 50) || !validIds(negativeIds, 50) ||
    positiveIds.some((id) => negativeIds.includes(id))
  ) return null;
  return {
    genres, excludedGenres, yearFrom, yearTo, popularity, locale, exclude,
    freeformText: freeformText.trim(), maxRuntime, providerIds, referenceMovieId, positiveIds, negativeIds,
  };
}
