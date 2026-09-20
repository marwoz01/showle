import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCatalogMetadata, parseCatalogMetadata } from "@/lib/recommend-catalog-metadata";

const movie = {
  id: 42, adult: false, title: "Public title", overview: "Public plot", release_date: "2020-04-01", poster_path: "/poster.jpg", runtime: 95,
  genres: [{ name: "Drama" }], vote_count: 123, vote_average: 7.25, budget: 4000000,
  credits: { cast: [{ name: "Actor", character: "Character", profile_path: "/actor.jpg" }], crew: [{ name: "Director", job: "Director" }] },
  translations: { translations: [{ iso_639_1: "pl", data: { title: "Polski tytuł", overview: "Publiczna fabuła" } }] },
  "watch/providers": { results: { PL: { flatrate: [{ provider_id: 8 }], rent: [{ provider_id: 119 }] } } },
};
afterEach(() => vi.unstubAllGlobals());

describe("verified watchlist metadata", () => {
  it("maps bilingual metadata, vote counts and Polish subscriptions, not rentals", () => {
    expect(parseCatalogMetadata(movie, 42)).toMatchObject({ tmdbId: 42, title: "Public title", titlePl: "Polski tytuł", year: 2020,
      budget: 4, voteCount: 123, rating: 7.3, runtime: 95, genres: ["Drama"], providerIds: [8], director: "Director", leadActor: "Actor" });
  });
  it.each([{ adult: true }, { id: 99 }, { title: null }, { release_date: "9999-01-01" }, { runtime: 0 }, { poster_path: "https://example.com/tracker.jpg" }, { overview: null }])("rejects unusable metadata: %j", (patch) => {
    expect(parseCatalogMetadata({ ...movie, ...patch }, 42)).toBeNull();
  });
  it("ignores private and unexpected fields and bounds public descriptions", () => {
    const parsed = parseCatalogMetadata({ ...movie, overview: "x".repeat(10000), userId: "private", review: "private note" }, 42);
    expect(parsed?.overview).toHaveLength(3500);
    expect(JSON.stringify(parsed)).not.toContain("private");
    expect(parseCatalogMetadata(null, 42)).toBeNull();
  });
  it("uses a bounded request to a fixed TMDB host and never sends account data", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(movie)));
    vi.stubGlobal("fetch", fetcher);
    const signal = AbortSignal.timeout(1000);
    expect(await fetchCatalogMetadata(42, signal)).toMatchObject({ tmdbId: 42 });
    const [url, options] = fetcher.mock.calls[0];
    expect(url.origin).toBe("https://api.themoviedb.org");
    expect(url.pathname).toBe("/3/movie/42");
    expect(options.signal).toBe(signal);
    expect(url.searchParams.get("append_to_response")).toContain("translations");
  });
  it("handles provider errors without fabricating movie metadata or retrying", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await fetchCatalogMetadata(42, AbortSignal.timeout(1000))).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
