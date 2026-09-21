import { MOVIE_GENRES } from "@/constants/genres";
import { isRecord } from "@/lib/request-body";
import type { MovieChoiceErrorCode, MovieChoicePreferences, MovieChoiceRequest } from "@/types/movie-choice";

export class MovieChoiceError extends Error {
  constructor(public readonly code: MovieChoiceErrorCode, public readonly status = 400) {
    super(code);
  }
}

export function normalizeMovieChoiceCode(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Z0-9]{6}$/i.test(value.trim())) {
    throw new MovieChoiceError("invalid_code");
  }
  return value.trim().toUpperCase();
}

function name(value: unknown): string {
  if (typeof value !== "string") throw new MovieChoiceError("invalid_name");
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized.length || normalized.length > 24 || /[\u0000-\u001f\u007f<>]/.test(normalized)) {
    throw new MovieChoiceError("invalid_name");
  }
  return normalized;
}

function genres(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MOVIE_GENRES.length || value.some(
    (item) => typeof item !== "string" || !(MOVIE_GENRES as readonly string[]).includes(item),
  )) throw new MovieChoiceError("invalid_preferences");
  return [...new Set(value)] as string[];
}

export function parseMovieChoicePreferences(value: unknown): MovieChoicePreferences {
  if (!isRecord(value)) throw new MovieChoiceError("invalid_preferences");
  const selected = genres(value.genres);
  const excluded = genres(value.excludedGenres);
  if (selected.some((genre) => excluded.includes(genre))) throw new MovieChoiceError("invalid_preferences");
  const runtime = value.maxRuntime;
  if (runtime !== null && (typeof runtime !== "number" || !Number.isInteger(runtime) || runtime < 30 || runtime > 300)) {
    throw new MovieChoiceError("invalid_preferences");
  }
  const providers = value.providerIds;
  if (!Array.isArray(providers) || providers.length > 30 || providers.some(
    (id) => typeof id !== "number" || !Number.isInteger(id) || id < 1 || id > 100000,
  )) throw new MovieChoiceError("invalid_preferences");
  return { genres: selected, excludedGenres: excluded, maxRuntime: runtime as number | null, providerIds: [...new Set(providers)] as number[] };
}

export function parseMovieChoiceRequest(value: unknown): MovieChoiceRequest {
  if (!isRecord(value)) throw new MovieChoiceError("invalid_input");
  // Identity always comes from the HttpOnly cookie, never a submitted token.
  if ("playerId" in value || "hostId" in value || "guestId" in value) throw new MovieChoiceError("invalid_input");
  if (value.action === "create") {
    if (value.locale !== "pl" && value.locale !== "en") throw new MovieChoiceError("invalid_input");
    return { action: "create", name: name(value.name), locale: value.locale };
  }
  if (value.action === "join") return { action: "join", code: normalizeMovieChoiceCode(value.code), name: name(value.name) };
  if (value.action !== "preferences" && value.action !== "vote" && value.action !== "reset") {
    throw new MovieChoiceError("invalid_action");
  }
  const code = normalizeMovieChoiceCode(value.code);
  const batch = value.batch;
  if (typeof batch !== "number" || !Number.isSafeInteger(batch) || batch < 1) throw new MovieChoiceError("invalid_batch");
  if (value.action === "preferences") return { action: "preferences", code, batch, preferences: parseMovieChoicePreferences(value.preferences) };
  if (value.action === "reset") return { action: "reset", code, batch };
  if (typeof value.movieId !== "number" || !Number.isSafeInteger(value.movieId) || value.movieId < 1 || typeof value.liked !== "boolean") {
    throw new MovieChoiceError("invalid_vote");
  }
  return { action: "vote", code, batch, movieId: value.movieId, liked: value.liked };
}
