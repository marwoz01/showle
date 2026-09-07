import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getHigherLowerCatalog } from "@/lib/higher-lower-catalog";
import { answerHigherLowerRun, getHigherLowerView, nextHigherLowerRound, startHigherLowerRun } from "@/lib/higher-lower";
import { openHigherLowerRun, sealHigherLowerRun } from "@/lib/higher-lower-session";

describe("higher/lower checked-in snapshot", () => {
  it("provides a substantial localized, illustrated runtime pool without duplicate IDs", () => {
    const { movies, version } = getHigherLowerCatalog();
    expect(movies.length).toBeGreaterThanOrEqual(250);
    expect(new Set(movies.map((movie) => movie.id)).size).toBe(movies.length);
    expect(version).toMatch(/^[a-f0-9]{24}$/);
    expect(movies.find((movie) => movie.id === 18)?.titles.pl).toBe("Piąty element");
    for (const movie of movies) {
      expect(movie.runtime).toBeGreaterThanOrEqual(40);
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
      run = nextHigherLowerRound(answerHigherLowerRun(run, movies, right.runtime >= left.runtime ? "higher" : "lower"), movies, () => 0);
      displayed.push(run.rightId);
      expect(getHigherLowerView(run, movies, "pl").right.runtime).toBeNull();
      maximumTokenLength = Math.max(maximumTokenLength, sealHigherLowerRun(run).length);
    }
    expect(new Set(displayed.slice(0, movies.length)).size).toBe(movies.length);
    expect(maximumTokenLength).toBeLessThan(32000);
    const token = sealHigherLowerRun(run);
    expect(token.length).toBeLessThan(32000);
    expect(openHigherLowerRun(token)).toEqual(run);
  });
});
