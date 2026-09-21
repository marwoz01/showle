import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const movie = { id: 141, title: "Donnie Darko", originalTitle: "Donnie Darko", year: 2001, posterPath: "/poster.jpg" };

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-21T12:00:00Z"));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("movie search reuse", () => {
  it("reuses exact queries, isolates locales, and expires old results", async () => {
    const cache = await import("@/lib/movie-search-client");
    cache.rememberMovieSearch("Donnie", "pl", [movie]);
    expect(cache.readMovieSearchCache(" DONNIE ", "pl")).toEqual([movie]);
    expect(cache.readMovieSearchCache("Donnie", "en")).toBeUndefined();
    vi.advanceTimersByTime(5 * 60_000);
    expect(cache.readMovieSearchCache("Donnie", "pl")).toBeUndefined();
  });

  it("offers only matching known titles while a refined query loads", async () => {
    const cache = await import("@/lib/movie-search-client");
    cache.rememberMovieSearch("don", "pl", [movie, { ...movie, id: 2, title: "Don Juan", originalTitle: "Don Juan" }]);
    cache.rememberMovieSearch("donnie", "pl", [movie]);
    expect(cache.findCachedMovieSuggestions("darko", "pl")).toEqual([movie]);
    expect(cache.findCachedMovieSuggestions("inception", "pl")).toEqual([]);
    expect(cache.findCachedMovieSuggestions("darko", "en")).toEqual([]);
  });

  it("bounds memory even across many different queries", async () => {
    const cache = await import("@/lib/movie-search-client");
    for (let i = 0; i < 45; i++) cache.rememberMovieSearch(`query ${i}`, "pl", [movie]);
    expect(cache.readMovieSearchCache("query 0", "pl")).toBeUndefined();
    expect(cache.readMovieSearchCache("query 44", "pl")).toEqual([movie]);
  });

  it("warms only public metadata, deduplicates languages, and bounds speculative requests", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(movie));
    vi.stubGlobal("fetch", fetcher);
    const { warmMovieSelection } = await import("@/lib/movie-search-client");
    warmMovieSelection(141, "pl");
    warmMovieSelection(141, "pl");
    warmMovieSelection(141, "en");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/movies/details?id=141&lang=en", "/api/movies/details?id=141&lang=pl",
    ]);
    for (let id = 200; id < 240; id++) warmMovieSelection(id, "pl");
    expect(fetcher).toHaveBeenCalledTimes(24);
    await vi.advanceTimersByTimeAsync(0);
  });

  it("allows another preparation after a transient failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(Response.json(movie));
    vi.stubGlobal("fetch", fetcher);
    const { warmMovieSelection } = await import("@/lib/movie-search-client");
    warmMovieSelection(141, "en");
    await vi.advanceTimersByTimeAsync(0);
    warmMovieSelection(141, "en");
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0);
  });
});
