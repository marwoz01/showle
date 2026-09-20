import { validMovieId } from "@/lib/recommend-input";

export const PENDING_MOVIE_SAVE_KEY = "showle-pending-movie-save:v1";
export const PENDING_MOVIE_SAVE_TTL = 10 * 60 * 1000;
type IntentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function rememberMovieSave(movieId: number, path: string, storage: IntentStorage, now = Date.now()): boolean {
  if (!validMovieId(movieId) || !path.startsWith("/") || path.startsWith("//") || path.length > 512) return false;
  try { storage.setItem(PENDING_MOVIE_SAVE_KEY, JSON.stringify({ version: 1, movieId, path, createdAt: now })); return true; }
  catch { return false; }
}

export function takePendingMovieSave(movieId: number, path: string, storage: IntentStorage, now = Date.now()): boolean {
  try {
    const value = storage.getItem(PENDING_MOVIE_SAVE_KEY);
    if (!value) return false;
    const raw: unknown = JSON.parse(value);
    if (!raw || typeof raw !== "object" || !("version" in raw) || raw.version !== 1 ||
      !("movieId" in raw) || !validMovieId(raw.movieId) || !("path" in raw) || typeof raw.path !== "string" ||
      !("createdAt" in raw) || typeof raw.createdAt !== "number" || !Number.isFinite(raw.createdAt) ||
      raw.createdAt > now || now - raw.createdAt >= PENDING_MOVIE_SAVE_TTL) {
      storage.removeItem(PENDING_MOVIE_SAVE_KEY); return false;
    }
    if (raw.movieId !== movieId || raw.path !== path) return false;
    storage.removeItem(PENDING_MOVIE_SAVE_KEY);
    return true;
  } catch {
    try { storage.removeItem(PENDING_MOVIE_SAVE_KEY); } catch { /* Private browsing may block session storage. */ }
    return false;
  }
}
