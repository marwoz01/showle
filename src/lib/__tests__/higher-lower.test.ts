import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  answerHigherLowerRun,
  getHigherLowerView,
  HIGHER_LOWER_SESSION_MS,
  nextHigherLowerRound,
  parseHigherLowerRequest,
  selectNextMovie,
  startHigherLowerRun,
  validateHigherLowerRun,
} from "@/lib/higher-lower";
import type { HigherLowerCatalogMovie } from "@/types/higher-lower";

const now = Date.parse("2026-09-07T12:00:00Z");
const first = () => 0;
const pool = (runtimes: number[]): HigherLowerCatalogMovie[] => runtimes.map((runtime, index) => ({
  id: index + 1, titles: { pl: `Film ${index + 1}`, en: `Movie ${index + 1}` },
  runtime, year: 2000 + index, backdropPath: `/image${index}.jpg`, voteCount: 4000,
}));

describe("higher/lower run", () => {
  it("keeps the right runtime hidden, then reveals it and moves that same film left", () => {
    const movies = pool([100, 140, 180]);
    const run = startHigherLowerRun(movies, "catalog-v1", now, first);
    const initial = getHigherLowerView(run, movies, "pl");
    expect(initial).toMatchObject({ round: 1, score: 0, status: "guessing", outcome: null,
      left: { id: 1, runtime: 100, title: "Film 1" }, right: { id: 2, runtime: null } });
    expect(Object.keys(initial.right)).toEqual(["id", "title", "year", "backdropPath", "runtime"]);
    const answered = answerHigherLowerRun(run, movies, "higher");
    expect(getHigherLowerView(answered, movies, "en")).toMatchObject({
      score: 1, status: "revealed", outcome: "correct", right: { id: 2, runtime: 140, title: "Movie 2" },
    });
    const next = nextHigherLowerRound(answered, movies, first);
    expect(getHigherLowerView(next, movies, "en")).toMatchObject({
      round: 2, score: 1, status: "guessing", outcome: null,
      left: { id: 2, runtime: 140 }, right: { id: 3, runtime: null },
    });
    expect(run.score).toBe(0);
    expect(() => answerHigherLowerRun(answered, movies, "higher")).toThrow("invalid_session");
    expect(() => nextHigherLowerRound(run, movies)).toThrow("invalid_session");
  });

  it("ends a run on the first wrong answer and reveals the actual duration", () => {
    const movies = pool([100, 140]);
    const run = startHigherLowerRun(movies, "catalog-v1", now, first);
    const finished = answerHigherLowerRun(run, movies, "lower");
    expect(getHigherLowerView(finished, movies, "pl")).toMatchObject({
      score: 0, status: "finished", outcome: "wrong", right: { runtime: 140 },
    });
    expect(() => nextHigherLowerRound(finished, movies)).toThrow("invalid_session");
    expect(() => answerHigherLowerRun(finished, movies, "higher")).toThrow("invalid_session");
  });

  it.each(["higher", "lower"] as const)("accepts %s for equal runtimes and keeps the streak alive", (choice) => {
    const movies = pool([120, 120, 120]);
    const run = startHigherLowerRun(movies, "catalog-v1", now, first);
    const answered = answerHigherLowerRun(run, movies, choice);
    expect(answered).toMatchObject({ status: "revealed", outcome: "equal", score: 1 });
    expect(nextHigherLowerRound(answered, movies, first).status).toBe("guessing");
  });

  it("avoids repeating movies until exhaustion and protects a recent window on later cycles", () => {
    const movies = pool(Array.from({ length: 20 }, (_, index) => 80 + index * 5));
    let run = startHigherLowerRun(movies, "catalog-v1", now, first);
    const displayed = [run.leftId, run.rightId];
    for (let index = 0; index < 65; index++) {
      const left = movies.find((movie) => movie.id === run.leftId)!;
      const right = movies.find((movie) => movie.id === run.rightId)!;
      const answered = answerHigherLowerRun(run, movies, right.runtime >= left.runtime ? "higher" : "lower");
      run = nextHigherLowerRound(answered, movies, first);
      expect(displayed.slice(-12)).not.toContain(run.rightId);
      displayed.push(run.rightId);
      expect(validateHigherLowerRun(run, movies, "catalog-v1", now)).toEqual(run);
    }
    expect(new Set(displayed.slice(0, movies.length)).size).toBe(movies.length);
  });

  it("keeps a tiny pool playable after exhaustion", () => {
    const movies = pool([100, 140]);
    const run = startHigherLowerRun(movies, "catalog-v1", now, first);
    const next = nextHigherLowerRound(answerHigherLowerRun(run, movies, "higher"), movies, first);
    expect(next).toMatchObject({ leftId: 2, rightId: 1 });
    expect(validateHigherLowerRun(next, movies, "catalog-v1", now)).toEqual(next);
  });

  it("tightens comparisons as a streak grows without forcing tiny gaps", () => {
    const movies = pool([120, 160, 125, 122]);
    expect(selectNextMovie(movies, movies[0], [1], 0, first).runtime).toBe(160);
    expect(selectNextMovie(movies, movies[0], [1], 15, first).runtime).toBe(125);
    const fallback = pool([120, 122, 190]);
    expect(selectNextMovie(fallback, fallback[0], [1], 15, first).runtime).toBe(190);
  });

  it("rejects expired sessions, catalog changes, impossible scores and unknown movies", () => {
    const movies = pool([100, 140]);
    const run = startHigherLowerRun(movies, "catalog-v1", now, first);
    expect(validateHigherLowerRun(run, movies, "catalog-v1", now)).toEqual(run);
    expect(() => validateHigherLowerRun(run, movies, "catalog-v1", now + HIGHER_LOWER_SESSION_MS)).toThrow("invalid_session");
    expect(() => validateHigherLowerRun(run, movies, "catalog-v2", now)).toThrow("invalid_session");
    for (const patch of [{ score: 99 }, { rightId: 900 }, { seenIds: [1, 1] }, { status: "finished" }, { recentIds: [2, 1] }]) {
      expect(() => validateHigherLowerRun({ ...run, ...patch }, movies, "catalog-v1", now)).toThrow("invalid_session");
    }
  });

  it("accepts only bounded, explicitly shaped requests", () => {
    expect(parseHigherLowerRequest({ action: "start", locale: "pl" })).toEqual({ action: "start", locale: "pl" });
    expect(parseHigherLowerRequest({ action: "resume", locale: "en", token: "abc" }).action).toBe("resume");
    for (const input of [null, [], { action: "start" }, { action: "start", locale: "de" },
      { action: "start", locale: "pl", score: 100 }, { action: "answer", locale: "pl", token: "abc", choice: "equal" },
      { action: "next", locale: "pl", token: "x".repeat(32001) }]) {
      expect(() => parseHigherLowerRequest(input)).toThrow("invalid_request");
    }
  });
});
