import { parseRecommendationSettings } from "@/lib/recommend-settings-input";
import type { RecommendationSettings } from "@/types/recommendation-settings";

export const GUEST_PREFERENCES_KEY = "showle-recommend-preferences:guest:v1";
export const EMPTY_HOME_PREFERENCES: RecommendationSettings = { favoriteIds: [], providerIds: [], onboarded: false };

export function readGuestPreferences(value: string | null): RecommendationSettings | null {
  if (!value || value.length > 4000) return null;
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("preferences" in data)) return null;
    return parseRecommendationSettings(data.preferences);
  } catch { return null; }
}

export function serializeGuestPreferences(preferences: RecommendationSettings): string {
  return JSON.stringify({ version: 1, preferences });
}
