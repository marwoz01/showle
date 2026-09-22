import { MOVIE_GENRES } from "@/constants/genres";
import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import { isRecord } from "@/lib/request-body";
import { validMovieId } from "@/lib/recommend-input";
import type { ProfilePreferences } from "@/types/profile";

export class ProfileError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export interface ProfilePatch {
  displayName?: string;
  bio?: string;
  isPublic?: boolean;
  favoriteMovieIds?: number[];
}

export function parseProfilePatch(value: unknown): ProfilePatch {
  if (!isRecord(value)) throw new ProfileError("invalid_profile");
  const patch: ProfilePatch = {};
  if ("displayName" in value) {
    if (typeof value.displayName !== "string" || !value.displayName.trim() || value.displayName.trim().length > 40 || /[\u0000-\u001f]/.test(value.displayName)) throw new ProfileError("invalid_display_name");
    patch.displayName = value.displayName.trim();
  }
  if ("bio" in value) {
    if (typeof value.bio !== "string" || value.bio.trim().length > 280) throw new ProfileError("invalid_bio");
    patch.bio = value.bio.trim();
  }
  if ("isPublic" in value) {
    if (typeof value.isPublic !== "boolean") throw new ProfileError("invalid_visibility");
    patch.isPublic = value.isPublic;
  }
  if ("favoriteMovieIds" in value) {
    const ids = value.favoriteMovieIds;
    if (!Array.isArray(ids) || ids.length > 4 || ids.some((id) => !validMovieId(id)) || new Set(ids).size !== ids.length) throw new ProfileError("invalid_favorites");
    patch.favoriteMovieIds = ids;
  }
  if (!Object.keys(patch).length) throw new ProfileError("empty_patch");
  return patch;
}

export function parsePreferencePatch(value: unknown, current: ProfilePreferences) {
  if (!isRecord(value)) throw new ProfileError("invalid_preferences");
  const patch: Partial<ProfilePreferences> & { locale?: "pl" | "en" } = {};
  for (const key of ["genres", "excludedGenres"] as const) {
    if (!(key in value)) continue;
    const genres = value[key];
    if (!Array.isArray(genres) || genres.length > MOVIE_GENRES.length || genres.some((genre) => !(MOVIE_GENRES as readonly unknown[]).includes(genre)) || new Set(genres).size !== genres.length) throw new ProfileError("invalid_genres");
    patch[key] = genres;
  }
  if ((patch.genres ?? current.genres).some((genre) => (patch.excludedGenres ?? current.excludedGenres).includes(genre))) throw new ProfileError("conflicting_genres");
  if ("providerIds" in value) {
    const ids = value.providerIds;
    if (!Array.isArray(ids) || ids.length > RECOMMENDATION_PROVIDERS.length || ids.some((id) => !RECOMMENDATION_PROVIDERS.some((provider) => provider.id === id)) || new Set(ids).size !== ids.length) throw new ProfileError("invalid_providers");
    patch.providerIds = ids;
  }
  if ("maxRuntime" in value) {
    const runtime = value.maxRuntime;
    if (runtime !== null && (typeof runtime !== "number" || !Number.isInteger(runtime) || runtime < 40 || runtime > 360)) throw new ProfileError("invalid_runtime");
    patch.maxRuntime = runtime;
  }
  if ("locale" in value) {
    if (value.locale !== "pl" && value.locale !== "en") throw new ProfileError("invalid_locale");
    patch.locale = value.locale;
  }
  if (!Object.keys(patch).length) throw new ProfileError("empty_patch");
  return patch;
}
