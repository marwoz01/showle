import { describe, expect, it } from "vitest";
import { parseCollectionCreate, parseCollectionPatch, parseCollectionQuery, parseCollectionIds, MAX_REVIEW_LENGTH } from "@/lib/collection-input";

const movie = { tmdbId: 42, title: "Film", category: "watchlist" };
describe("collection input boundaries", () => {
  it("accepts valid metadata, half-star ratings and clearing a review", () => {
    expect(parseCollectionCreate({ ...movie, genres: ["Drama", "Drama"], rating: 7.5 })).toMatchObject({ tmdbId: 42, genres: ["Drama"], rating: 7.5 });
    expect(parseCollectionPatch({ rating: null, review: "", watchedAt: "2024-02-29" })).toEqual({ rating: null, review: null, watchedAt: new Date("2024-02-29") });
    expect(parseCollectionPatch({ review: "a".repeat(MAX_REVIEW_LENGTH) }).review).toHaveLength(MAX_REVIEW_LENGTH);
  });
  it.each(["8", {}, [], true, 0, 10.5, 7.2, NaN, Infinity])("rejects malformed ratings (%j)", (rating) => {
    expect(() => parseCollectionPatch({ rating })).toThrow();
    expect(() => parseCollectionCreate({ ...movie, rating })).toThrow();
  });
  it.each([{ tmdbId: "42" }, { tmdbId: -1 }, { tmdbId: 1.5 }, { title: "" }, { title: "a".repeat(301) },
    { category: "other" }, { genres: ["Drama", {}] }, { genres: Array(33).fill("Drama") },
    { review: "a".repeat(1001) }, { overview: "a".repeat(4001) }, { runtime: "120" },
    { posterPath: "//example.com/image" }, { posterPath: "/../image" }])("rejects invalid movie metadata %j", (change) => {
    expect(() => parseCollectionCreate({ ...movie, ...change })).toThrow();
  });
  it.each(["2026-02-30", "2025-02-29", "invalid", 1, {}, "2026-01-01T25:00:00Z"])("rejects invalid watched dates %j", (watchedAt) => {
    expect(() => parseCollectionPatch({ watchedAt })).toThrow();
  });
  it.each(["page=NaN", "page=-1", "page=0", "page=1.5", "page=1e3", "page=100001", "sort=unknown", "order=no", "category=other"])("rejects invalid query %s", (query) => {
    expect(() => parseCollectionQuery(new URLSearchParams(query))).toThrow();
  });
  it("validates bounded lookup batches independently of pagination", () => {
    expect(parseCollectionIds(new URLSearchParams("ids=42,42,999"))).toEqual([42, 999]);
    for (const value of ["", "1,no", "1.5", Array(51).fill("42").join(",")]) {
      expect(() => parseCollectionIds(new URLSearchParams({ ids: value }))).toThrow();
    }
  });
});
