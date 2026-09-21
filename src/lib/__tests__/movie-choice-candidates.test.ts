import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieChoicePreferences } from "@/types/movie-choice";
import type { RecommendationCandidate } from "@/types/recommendation";
import type { RecommendationSearch } from "@/lib/recommend-search";
import { candidate } from "@/lib/__tests__/fixtures/recommendations";

const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/recommend-search", () => ({ findRecommendationCandidates: mocks.search }));

import { generateMovieChoiceCandidates } from "@/lib/movie-choice-candidates";

const preference = (patch: Partial<MovieChoicePreferences> = {}): MovieChoicePreferences => ({
  genres: [], excludedGenres: [], maxRuntime: null, providerIds: [], ...patch,
});
const usePool = (movies: RecommendationCandidate[]) => mocks.search.mockResolvedValue({ movies, matching: "filters" });
beforeEach(() => { vi.clearAllMocks(); usePool([]); });

describe("shared movie candidates", () => {
  it("puts films matching both tastes first and balances otherwise different tastes", async () => {
    usePool([
      candidate(1, { genres: ["Comedy"], rating: 9 }),
      candidate(2, { genres: ["Comedy"], rating: 8 }),
      candidate(3, { genres: ["Horror"], rating: 6 }),
      candidate(4, { genres: ["Horror"], rating: 5 }),
      candidate(5, { genres: ["Comedy", "Horror"], rating: 4 }),
      candidate(6, { genres: ["Drama"], rating: 10 }),
    ]);
    const result = await generateMovieChoiceCandidates([
      preference({ genres: ["Comedy"] }), preference({ genres: ["Horror"] }),
    ], "en", []);
    expect(result.map((movie) => movie.id)).toEqual([5, 1, 3, 2, 4, 6]);
  });

  it("retrieves each person's taste separately so popular films cannot crowd one person out", async () => {
    mocks.search.mockImplementation(async ({ filters }: RecommendationSearch) => ({
      movies: filters.genres.includes("Horror")
        ? [candidate(101, { genres: ["Horror"], rating: 5 })]
        : Array.from({ length: 60 }, (_, index) => candidate(index + 1, { genres: ["Comedy"], rating: 9 })),
    }));
    const result = await generateMovieChoiceCandidates([
      preference({ genres: ["Comedy"] }), preference({ genres: ["Horror"] }),
    ], "en", []);
    expect(result).toHaveLength(20);
    expect(result[1].id).toBe(101);
    const searches = mocks.search.mock.calls.map(([search]) => search as RecommendationSearch);
    expect(searches.map((search) => search.filters.genres)).toEqual([[], ["Comedy"], ["Horror"]]);
    expect(searches.map((search) => search.preferredGenres)).toEqual([["Comedy", "Horror"], ["Horror"], ["Comedy"]]);
    expect(searches.every((search) => search.queryText === "")).toBe(true);
  });

  it("preserves both exclusions, the stricter runtime, available platform union and seen IDs", async () => {
    usePool([
      candidate(1, { runtime: 90, providerIds: [8] }),
      candidate(2, { runtime: 100, providerIds: [337] }),
      candidate(3, { runtime: 101, providerIds: [8] }),
      candidate(4, { runtime: 0, providerIds: [8] }),
      candidate(5, { runtime: 90, genres: ["Horror"], providerIds: [8] }),
      candidate(6, { runtime: 90, genres: ["War"], providerIds: [8] }),
      candidate(7, { runtime: 90, providerIds: [119] }),
      candidate(8, { runtime: 90, providerIds: [8] }),
      candidate(9, { runtime: 90, providerIds: [] }),
    ]);
    const result = await generateMovieChoiceCandidates([
      preference({ genres: ["Drama"], excludedGenres: ["Horror"], maxRuntime: 130, providerIds: [8] }),
      preference({ genres: ["Comedy"], excludedGenres: ["War"], maxRuntime: 100, providerIds: [337] }),
    ], "en", [8]);
    expect(result.map((movie) => movie.id)).toEqual([1, 2]);
    for (const [search] of mocks.search.mock.calls) {
      expect(search.filters).toMatchObject({
        excludedGenres: ["Horror", "War"], maxRuntime: 100, providerIds: [8, 337], excludeIds: [8],
      });
    }
  });

  it("keeps exclusions even when they conflict with the other person's preferred genre", async () => {
    usePool([candidate(1, { genres: ["Horror"] }), candidate(2, { genres: ["Drama"] })]);
    const result = await generateMovieChoiceCandidates([
      preference({ genres: ["Horror"] }), preference({ excludedGenres: ["Horror"] }),
    ], "en", []);
    expect(result.map((movie) => movie.id)).toEqual([2]);
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });

  it("deduplicates overlapping pools and caps a balanced batch at twenty", async () => {
    const movies = Array.from({ length: 50 }, (_, index) => candidate(index + 1, {
      genres: [index < 25 ? "Comedy" : "Horror"],
    }));
    usePool([...movies, movies[0]]);
    const result = await generateMovieChoiceCandidates([
      preference({ genres: ["Comedy"] }), preference({ genres: ["Horror"] }),
    ], "en", []);
    expect(result).toHaveLength(20);
    expect(new Set(result.map((movie) => movie.id)).size).toBe(20);
    expect(result.filter((movie) => movie.genres.includes("Comedy"))).toHaveLength(10);
    expect(result.filter((movie) => movie.genres.includes("Horror"))).toHaveLength(10);
  });

  it("does not repeat movies in later batches", async () => {
    const movies = Array.from({ length: 45 }, (_, index) => candidate(index + 1));
    mocks.search.mockImplementation(async ({ filters }: RecommendationSearch) => ({
      movies: movies.filter((movie) => !filters.excludeIds.includes(movie.tmdbId)),
    }));
    const preferences: [MovieChoicePreferences, MovieChoicePreferences] = [preference(), preference()];
    const first = await generateMovieChoiceCandidates(preferences, "en", []);
    const second = await generateMovieChoiceCandidates(preferences, "en", first.map((movie) => movie.id));
    expect(first).toHaveLength(20);
    expect(second).toHaveLength(20);
    expect(second.every((movie) => !first.some((previous) => previous.id === movie.id))).toBe(true);
  });

  it("uses one unrestricted search when neither person specifies a genre", async () => {
    usePool([candidate(1, { rating: 6 }), candidate(2, { rating: 8 })]);
    const result = await generateMovieChoiceCandidates([preference(), preference()], "en", []);
    expect(result.map((movie) => movie.id)).toEqual([2, 1]);
    expect(mocks.search).toHaveBeenCalledTimes(1);
    expect(mocks.search.mock.calls[0][0].filters).toMatchObject({ genres: [], providerIds: [], maxRuntime: null });
  });

  it("prioritizes the only specified taste and avoids querying identical tastes twice", async () => {
    usePool([candidate(1, { genres: ["Drama"], rating: 9 }), candidate(2, { genres: ["Comedy"], rating: 5 })]);
    const result = await generateMovieChoiceCandidates([preference(), preference({ genres: ["Comedy"] })], "en", []);
    expect(result.map((movie) => movie.id)).toEqual([2, 1]);
    mocks.search.mockClear();
    await generateMovieChoiceCandidates([
      preference({ genres: ["Comedy", "Drama"] }), preference({ genres: ["Drama", "Comedy"] }),
    ], "en", []);
    expect(mocks.search).toHaveBeenCalledTimes(2);
  });

  it("adds variety within a taste without sacrificing the other person's turn", async () => {
    usePool([
      candidate(1, { genres: ["Comedy"], rating: 9, collectionId: 100, director: "One" }),
      candidate(2, { genres: ["Comedy"], rating: 9, collectionId: 100, director: "One" }),
      candidate(3, { genres: ["Comedy"], rating: 8, director: "Another" }),
      candidate(4, { genres: ["Horror"], rating: 6 }),
    ]);
    const result = await generateMovieChoiceCandidates([
      preference({ genres: ["Comedy"] }), preference({ genres: ["Horror"] }),
    ], "en", []);
    expect(result.map((movie) => movie.id)).toEqual([1, 4, 3, 2]);
  });

  it("returns complete localized movie data and falls back to the English catalogue text", async () => {
    const cast = [{ name: "Actor", character: "Role", profilePath: "/actor.jpg" }];
    usePool([candidate(1, { titlePl: "Polski tytuł", overviewPl: "Polski opis", taglinePl: "Polskie hasło", tagline: "English tagline", cast })]);
    const prefs: [MovieChoicePreferences, MovieChoicePreferences] = [preference(), preference()];
    const [polish] = await generateMovieChoiceCandidates(prefs, "pl", []);
    expect(polish).toEqual({
      id: 1, type: "movie", title: "Polski tytuł", year: 2020, genres: ["Drama"],
      country: "Poland", countryCode: "PL", director: "Director 1", leadActor: "Actor", runtime: 100,
      budget: 1, popularity: 8000, rating: 7, posterPath: "/poster.jpg", backdropPath: "/backdrop.jpg",
      overview: "Polski opis", tagline: "Polskie hasło", cast,
    });
    const [english] = await generateMovieChoiceCandidates(prefs, "en", []);
    expect(english).toMatchObject({ title: "Movie 1", overview: "Verified plot", tagline: "English tagline" });
    usePool([candidate(1, { titlePl: "", overviewPl: "", taglinePl: null, tagline: "English tagline" })]);
    expect((await generateMovieChoiceCandidates(prefs, "pl", []))[0]).toMatchObject({
      title: "Movie 1", overview: "Verified plot", tagline: "English tagline",
    });
  });

  it("returns no candidates when hard constraints exhaust the catalogue and propagates failures", async () => {
    usePool([candidate(1, { runtime: 200 })]);
    const prefs: [MovieChoicePreferences, MovieChoicePreferences] = [preference({ maxRuntime: 90 }), preference()];
    expect(await generateMovieChoiceCandidates(prefs, "en", [])).toEqual([]);
    mocks.search.mockRejectedValue(new Error("catalogue unavailable"));
    await expect(generateMovieChoiceCandidates(prefs, "en", [])).rejects.toThrow("catalogue unavailable");
  });
});
