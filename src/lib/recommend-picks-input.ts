import { parseRecommendRequest, type RecommendRequest } from "@/lib/recommend-input";
import { isRecord } from "@/lib/request-body";
import { MAX_FAVORITE_MOVIES, parseRecommendationSettings, uniqueMovieIds } from "@/lib/recommend-settings-input";
import type { RecommendationSettings } from "@/types/recommendation-settings";

export function parsePickRequest(value: unknown, saved: RecommendationSettings): {
  request: RecommendRequest; favorites: number[];
} | null {
  if (!isRecord(value)) return null;
  const favorites = value.favoriteIds ?? saved.favoriteIds;
  if (!uniqueMovieIds(favorites, MAX_FAVORITE_MOVIES)) return null;
  const settings = parseRecommendationSettings({ favoriteIds: favorites,
    providerIds: value.providerIds ?? saved.providerIds, onboarded: true });
  if (!settings) return null;
  const request = parseRecommendRequest({ genres: [], excludedGenres: [], yearFrom: 1888,
    yearTo: new Date().getUTCFullYear(), popularity: "any", locale: "pl", source: "catalog",
    ...value, providerIds: settings.providerIds,
  }, { allowEmpty: true });
  return request ? { request, favorites } : null;
}
