import { describe, expect, it, vi } from "vitest";
import { PENDING_MOVIE_SAVE_KEY, PENDING_MOVIE_SAVE_TTL, rememberMovieSave, takePendingMovieSave } from "@/lib/pending-movie-save";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

describe("guest movie-save continuation", () => {
  it("resumes the selected movie once on the original page, without selecting a save category", () => {
    const store = storage();
    expect(rememberMovieSave(603, "/play/movie", store, 1000)).toBe(true);
    expect(JSON.parse(store.getItem(PENDING_MOVIE_SAVE_KEY)!)).toEqual({ version: 1, movieId: 603, path: "/play/movie", createdAt: 1000 });
    expect(takePendingMovieSave(603, "/play/movie", store, 2000)).toBe(true);
    expect(takePendingMovieSave(603, "/play/movie", store, 2000)).toBe(false);
  });
  it("does not consume another movie or another page's intent", () => {
    const store = storage();
    rememberMovieSave(603, "/play/movie", store, 1000);
    expect(takePendingMovieSave(550, "/play/movie", store, 2000)).toBe(false);
    expect(takePendingMovieSave(603, "/recommend", store, 2000)).toBe(false);
    expect(takePendingMovieSave(603, "/play/movie", store, 2000)).toBe(true);
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER])("does not persist invalid movie id %s", (id) => {
    const store = storage();
    expect(rememberMovieSave(id, "/", store)).toBe(false);
    expect(store.getItem(PENDING_MOVIE_SAVE_KEY)).toBeNull();
  });
  it("discards expired and future-dated intents", () => {
    for (const now of [999, 1000 + PENDING_MOVIE_SAVE_TTL]) {
      const store = storage();
      rememberMovieSave(603, "/play/movie", store, 1000);
      expect(takePendingMovieSave(603, "/play/movie", store, now)).toBe(false);
      expect(store.getItem(PENDING_MOVIE_SAVE_KEY)).toBeNull();
    }
  });
  it.each(["bad JSON", "null", "[]", "{}", '{"version":2}'])("ignores corrupt storage %s", (value) => {
    const store = storage();
    store.setItem(PENDING_MOVIE_SAVE_KEY, value);
    expect(takePendingMovieSave(603, "/", store)).toBe(false);
  });
  it("does not prevent signing in when the browser denies storage", () => {
    const blocked = vi.fn(() => { throw new Error("SecurityError"); });
    const store = { getItem: blocked, setItem: blocked, removeItem: blocked };
    expect(rememberMovieSave(603, "/", store)).toBe(false);
    expect(takePendingMovieSave(603, "/", store)).toBe(false);
  });
});
