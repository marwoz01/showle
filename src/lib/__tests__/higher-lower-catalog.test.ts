import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getHigherLowerCatalog } from "@/lib/higher-lower-catalog";
import { answerHigherLowerRun, getHigherLowerView, nextHigherLowerRound, startHigherLowerRun } from "@/lib/higher-lower";
import { openHigherLowerRun, sealHigherLowerRun } from "@/lib/higher-lower-session";

describe("higher/lower checked-in snapshot", () => {
  it("provides a substantial localized, illustrated release-year pool without duplicate IDs", () => {
    const { movies, version } = getHigherLowerCatalog();
    expect(movies.length).toBeGreaterThanOrEqual(250);
    expect(new Set(movies.map((movie) => movie.id)).size).toBe(movies.length);
    expect(version).toMatch(/^[a-f0-9]{24}$/);
    expect(movies.find((movie) => movie.id === 18)?.titles.pl).toBe("Piąty element");
    for (const movie of movies) {
      expect(Number.isInteger(movie.year)).toBe(true);
      expect(movie.year).toBeGreaterThanOrEqual(1888);
      expect(movie.year).toBeLessThanOrEqual(new Date().getUTCFullYear());
      expect(movie.voteCount).toBeGreaterThanOrEqual(1000);
      expect(movie.backdropPath).toMatch(/^\/[A-Za-z0-9]+\.(jpg|png|webp)$/);
      expect(movie.titles.en.trim()).not.toBe("");
      expect(movie.titles.pl.trim()).not.toBe("");
    }
  });

  it("plays through the entire production pool with bounded encrypted history", () => {
    const { movies, version } = getHigherLowerCatalog();
    let run = startHigherLowerRun(movies, version, Date.now(), () => 0);
    const displayed = [run.leftId, run.rightId];
    let maximumTokenLength = 0;
    for (let index = 0; index < movies.length; index++) {
      const left = movies.find((movie) => movie.id === run.leftId)!;
      const right = movies.find((movie) => movie.id === run.rightId)!;
      run = nextHigherLowerRound(answerHigherLowerRun(run, movies, right.year >= left.year ? "higher" : "lower"), movies, () => 0);
      displayed.push(run.rightId);
      expect(getHigherLowerView(run, movies, "pl").right.year).toBeNull();
      maximumTokenLength = Math.max(maximumTokenLength, sealHigherLowerRun(run).length);
    }
    expect(new Set(displayed.slice(0, movies.length)).size).toBe(movies.length);
    expect(maximumTokenLength).toBeLessThan(32000);
    const token = sealHigherLowerRun(run);
    expect(token.length).toBeLessThan(32000);
    expect(openHigherLowerRun(token)).toEqual(run);
  });

  it("invalidates sessions when a release year is corrected", async () => {
    const movies = [
      { id: 1, titles: { pl: "Pierwszy", en: "First" }, year: 1990, backdropPath: "/first.jpg", voteCount: 4000 },
      { id: 2, titles: { pl: "Drugi", en: "Second" }, year: 2000, backdropPath: "/second.jpg", voteCount: 4000 },
    ];
    try {
      vi.doMock("@/data/higher-lower-catalog.json", () => ({ default: { version: 1, movies } }));
      vi.resetModules();
      const original = (await import("@/lib/higher-lower-catalog")).getHigherLowerCatalog();
      const run = startHigherLowerRun(original.movies, original.version);
      movies[1] = { ...movies[1], year: 2001 };
      vi.resetModules();
      const corrected = (await import("@/lib/higher-lower-catalog")).getHigherLowerCatalog();
      const { validateHigherLowerRun } = await import("@/lib/higher-lower");
      expect(corrected.version).not.toBe(original.version);
      expect(() => validateHigherLowerRun(run, corrected.movies, corrected.version)).toThrow("invalid_session");
    } finally {
      vi.doUnmock("@/data/higher-lower-catalog.json");
      vi.resetModules();
    }
  });
});
