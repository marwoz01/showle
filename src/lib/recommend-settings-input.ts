import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import { validMovieId } from "@/lib/recommend-input";
import { isRecord } from "@/lib/request-body";
import type { RecommendationSettings } from "@/types/recommendation-settings";

export const MAX_FAVORITE_MOVIES = 12;
export const EMPTY_RECOMMENDATION_SETTINGS: RecommendationSettings = {
  favoriteIds: [], providerIds: [], onboarded: false,
};

export function uniqueMovieIds(value: unknown, limit: number): value is number[] {
  return Array.isArray(value) && value.length <= limit && value.every(validMovieId) &&
    new Set(value).size === value.length;
}

export function parseRecommendationSettings(value: unknown): RecommendationSettings | null {
  if (!isRecord(value) || !uniqueMovieIds(value.favoriteIds, MAX_FAVORITE_MOVIES) ||
    !uniqueMovieIds(value.providerIds, RECOMMENDATION_PROVIDERS.length) ||
    value.providerIds.some((id) => !RECOMMENDATION_PROVIDERS.some((provider) => provider.id === id)) ||
    typeof value.onboarded !== "boolean") return null;
  return { favoriteIds: [...value.favoriteIds], providerIds: [...value.providerIds], onboarded: value.onboarded };
}
