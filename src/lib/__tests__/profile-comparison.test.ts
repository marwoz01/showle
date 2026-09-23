import { describe, expect, it } from "vitest";
import { compareMovieTaste, profileMovieSnapshots, rankSharedSuggestions, sharedSuggestionWhere, toPublicProfile, type ComparisonMovie } from "@/lib/profile-comparison";
import type { ProfilePreferences, ProfileSummary } from "@/types/profile";

const preferences: ProfilePreferences = { genres: [], excludedGenres: [], providerIds: [], maxRuntime: null };
const movie = (tmdbId: number, rating: number | null, overrides: Partial<ComparisonMovie> = {}): ComparisonMovie => ({ tmdbId, title: `Film ${tmdbId}`, year: 2000, posterPath: "/poster.jpg", genres: ["Drama"], rating, category: "watched", ...overrides });
const summary: ProfileSummary = { watchedCount: 12, watchlistCount: 30, totalMinutes: 1234, averageRating: 7,
  favoriteGenres: [{ genre: "Drama", count: 10 }], daily: { gamesPlayed: 5, gamesWon: 3, currentStreak: 2, maxStreak: 3, averageGuesses: 2.5 }, higherLowerBest: 8 };

describe("public profile data boundary", () => {
  it("allows only approved public fields, including nested favourites and badges", () => {
    const result = toPublicProfile({ publicSlug: "public-name", displayName: "Viewer", bio: "Hi", avatarUrl: null,
      favoriteMovies: [{ id: 1, title: "A", year: 2000, posterPath: "/poster.jpg", review: "secret", rating: 9, userId: "private" }],
      userId: "private", email: "private@example.com", providerIds: [8], genres: ["Drama"],
    } as Parameters<typeof toPublicProfile>[0], summary, [
      { id: "first-film", unlocked: true, progress: 12, target: 1 },
      { id: "film-collector", unlocked: false, progress: 12, target: 100 },
    ]);
    expect(Object.keys(result).sort()).toEqual(["avatarUrl", "badges", "bio", "daily", "displayName", "favoriteMovies", "higherLowerBest", "publicSlug", "totalMinutes", "watchedCount"].sort());
    expect(result.favoriteMovies).toEqual([{ id: 1, title: "A", year: 2000, posterPath: "/poster.jpg" }]);
    expect(result.badges).toEqual([{ id: "first-film" }]);
    expect(JSON.stringify(result)).not.toMatch(/private|watchlist|averageRating|favoriteGenres|progress|providerIds/);
  });
  it("bounds and sanitizes legacy or malformed favourites", () => {
    expect(profileMovieSnapshots(null)).toEqual([]);
    expect(profileMovieSnapshots([null, { id: -1, title: "Invalid" }, { id: 1, title: "A", posterPath: "https://tracker.test/a" }, { id: 1, title: "Duplicate" }]))
      .toEqual([{ id: 1, title: "A", year: 0, posterPath: "" }]);
    expect(profileMovieSnapshots(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: "A" })))).toHaveLength(4);
  });
});

describe("taste comparison", () => {
  it("does not invent a percentage for insufficient or invalid common ratings", () => {
    expect(compareMovieTaste([movie(1, 8), movie(2, 9), movie(3, null)], [movie(1, 8), movie(2, 9), movie(3, 8)], [], []).score).toBeNull();
    const result = compareMovieTaste([movie(1, 8), movie(2, 9), movie(3, NaN)], [movie(1, 8), movie(2, 9), movie(3, 8)], [], []);
    expect(result.sharedRatingCount).toBe(2);
    expect(result.score).toBeNull();
  });
  it("uses the mean absolute gap only across mutually rated films", () => {
    const own = [movie(1, 8), movie(2, 9), movie(3, 7), movie(4, 10)];
    const other = [movie(1, 8), movie(2, 9), movie(3, 7), movie(5, 0.5)];
    expect(compareMovieTaste(own, other, [], []).score).toBe(100);
    expect(compareMovieTaste([movie(1, 0.5), movie(2, 0.5), movie(3, 0.5)], [movie(1, 10), movie(2, 10), movie(3, 10)], [], []).score).toBe(0);
  });
  it("returns known shared favourites and high ratings without exposing private ratings or unknown films", () => {
    const fav = { id: 99, title: "Favourite", year: 1999, posterPath: "" };
    const result = compareMovieTaste([movie(1, 8), movie(2, 7)], [movie(1, 9, { title: "Private metadata" }), movie(2, 9), movie(3, 10)], [fav], [fav], true);
    expect(result.sharedMovies.map((film) => film.id)).toEqual([99, 1]);
    expect(result.sharedMovies[1].title).toBe("Film 1");
    expect(JSON.stringify(result.sharedMovies)).not.toMatch(/rating|Private|category/);
  });
  it("shows both agreement and disagreement only on mutually rated known titles", () => {
    const own = [movie(1, 9), movie(2, 3), movie(3, 9), movie(4, 6), movie(5, null), movie(6, 10)];
    const other = [movie(1, 8.5), movie(2, 3), movie(3, 4), movie(4, 8), movie(5, 9), movie(7, 10, { title: "Unknown private film" })];
    const result = compareMovieTaste(own, other, [], [], true);
    expect(result.sharedRatingCount).toBe(4);
    expect(result.averageRatingGap).toBe(1.88);
    expect(result.score).toBe(80);
    expect(result.agreementCount).toBe(2);
    expect(result.differenceCount).toBe(1);
    expect(result.similarRatings.map(({ id }) => id)).toEqual([2, 1]);
    expect(result.differentRatings).toEqual([{ id: 3, title: "Film 3", year: 2000, posterPath: "/poster.jpg", viewerRating: 9, otherRating: 4, gap: 5 }]);
    expect(JSON.stringify(result)).not.toContain("Unknown private film");
  });
  it("includes threshold boundaries, keeps complete counts and caps each example list", () => {
    const own = Array.from({ length: 12 }, (_, index) => movie(index + 1, 8));
    const other = own.map((entry, index) => movie(entry.tmdbId, index < 6 ? 7 : 5));
    const result = compareMovieTaste(own, other, [], [], true);
    expect(result.agreementCount).toBe(6);
    expect(result.differenceCount).toBe(6);
    expect(result.similarRatings).toHaveLength(4);
    expect(result.differentRatings).toHaveLength(4);
    expect(result.similarRatings.map(({ id }) => id)).toEqual([1, 2, 3, 4]);
    expect(result.differentRatings.map(({ id }) => id)).toEqual([7, 8, 9, 10]);
  });
  it("keeps detailed ratings and inferred favourites private by default", () => {
    const favourite = { id: 99, title: "Shared favourite", year: 1999, posterPath: "" };
    const own = [movie(1, 9), movie(2, 3), movie(3, 10)];
    const other = [movie(1, 9), movie(2, 8), movie(3, 9)];
    const result = compareMovieTaste(own, other, [favourite], [favourite]);
    expect(result.score).toBe(79);
    expect(result.ratingDetailsVisible).toBe(false);
    expect(result.similarRatings).toEqual([]);
    expect(result.differentRatings).toEqual([]);
    expect(result.sharedMovies).toEqual([favourite]);
    expect(JSON.stringify(result)).not.toMatch(/viewerRating|otherRating|Film 1/);
  });
  it("does not expose a private rating gap through a small aggregate", () => {
    const result = compareMovieTaste([movie(1, 7)], [movie(1, 10)], [], []);
    expect(result.score).toBeNull();
    expect(result.averageRatingGap).toBeNull();
    expect(result.agreementCount).toBeNull();
    expect(result.differenceCount).toBeNull();
    expect(result.sharedRatingCount).toBe(1);
    expect(compareMovieTaste([], [], [], [], true).averageRatingGap).toBeNull();
  });
  it("never reveals rated watchlist entries through examples or inferred favourites", () => {
    const result = compareMovieTaste([movie(1, 9), movie(2, 3), movie(3, 8)],
      [movie(1, 9, { category: "watchlist" }), movie(2, 9, { category: "watchlist" }), movie(3, 8)], [], [], true);
    expect(result.sharedRatingCount).toBe(3);
    expect(result.sharedMovies.map(({ id }) => id)).toEqual([3]);
    expect(result.similarRatings.map(({ id }) => id)).toEqual([3]);
    expect(result.differentRatings).toEqual([]);
  });
});

describe("shared movie suggestions", () => {
  it("excludes both watched collections, low ratings and negative feedback", () => {
    const where = sharedSuggestionWhere(preferences, preferences,
      [movie(1, null), movie(2, 4, { category: "watchlist" }), movie(5, null, { category: "watchlist" })],
      [movie(3, 8)], [4, 1]);
    expect(where.tmdbId).toEqual({ notIn: [4, 1, 2, 3] });
  });
  it("requires availability for each viewer and the stricter runtime, with union exclusions", () => {
    const where = sharedSuggestionWhere({ ...preferences, providerIds: [8, 9], maxRuntime: 120, excludedGenres: ["Horror"] },
      { ...preferences, providerIds: [337], maxRuntime: 90, excludedGenres: ["Horror", "War"] }, [], [], []);
    expect(where.runtime).toEqual({ gt: 0, lte: 90 });
    expect(where.AND).toEqual([{ providerIds: { hasSome: [8, 9] } }, { providerIds: { hasSome: [337] } }, { NOT: { genres: { hasSome: ["Horror", "War"] } } }]);
  });
  it("does not add empty provider restrictions or an invented runtime", () => {
    expect(sharedSuggestionWhere(preferences, preferences, [], [], [])).toEqual({ tmdbId: { notIn: [] } });
  });
  it("favours a compromise over satisfying only one viewer", () => {
    const candidates = [
      { tmdbId: 1, genres: ["Horror"], rating: 8, voteCount: 1000 },
      { tmdbId: 2, genres: ["Horror", "Drama"], rating: 8, voteCount: 1000 },
    ];
    const sorted = rankSharedSuggestions(candidates, { ...preferences, genres: ["Horror"] }, { ...preferences, genres: ["Drama"] }, [], []);
    expect(sorted[0].tmdbId).toBe(2);
    expect(candidates[0].tmdbId).toBe(1);
  });
});
