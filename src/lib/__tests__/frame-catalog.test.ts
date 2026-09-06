import { describe, expect, it } from "vitest";
import catalog from "@/data/frame-catalog.json";
import overrides from "@/data/frame-catalog-overrides.json";
import { getFrameMoviePool } from "@/lib/frame-catalog";
import { createDuelQuestions, distractorScore } from "@/lib/duel";
import type { FrameMovieOverride } from "@/types/frame-catalog";

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

describe("permanent frame catalog", () => {
  it("has a large, unique, bilingual base with usable landscape image paths", () => {
    expect(catalog.version).toBe(1);
    expect(catalog.movies.length).toBeGreaterThanOrEqual(900);
    expect(new Set(catalog.movies.map((movie) => movie.id)).size).toBe(
      catalog.movies.length,
    );
    for (const movie of catalog.movies) {
      expect(movie.titles.pl.trim()).not.toBe("");
      expect(movie.titles.en.trim()).not.toBe("");
      expect(movie.year).toBeGreaterThan(1900);
      expect(movie.genreIds.length).toBeGreaterThan(0);
      expect(movie.frames.length).toBeGreaterThan(0);
      expect(new Set(movie.frames).size).toBe(movie.frames.length);
      for (const frame of movie.frames)
        expect(frame).toMatch(/^\/[a-zA-Z0-9]+\.(jpg|png)$/);
    }
  });

  it("keeps editorial overrides valid as the catalog grows", () => {
    const ids = new Set(catalog.movies.map((movie) => movie.id));
    for (const [id, edit] of Object.entries(
      overrides as Record<string, FrameMovieOverride>,
    )) {
      expect(ids.has(Number(id))).toBe(true);
      for (const related of edit.relatedMovieIds ?? []) {
        expect(ids.has(related)).toBe(true);
        expect(related).not.toBe(Number(id));
      }
      for (const frame of edit.frames ?? [])
        expect(frame).toMatch(/^\/[a-zA-Z0-9]+\.(jpg|png)$/);
    }
  });

  it("uses the selected language and reuses the server pool", () => {
    const pl = getFrameMoviePool("pl-PL");
    const en = getFrameMoviePool("en-US");
    expect(getFrameMoviePool("pl")).toBe(pl);
    expect(pl.find((movie) => movie.id === 350)?.title).toBe(
      "Diabeł ubiera się u Prady",
    );
    expect(en.find((movie) => movie.id === 350)?.title).toBe(
      "The Devil Wears Prada",
    );
  });

  it("offers credible workplace/fashion comedies for Prada, never Mario", () => {
    const pool = getFrameMoviePool("pl");
    const prada = pool.find((movie) => movie.id === 350)!;
    const mario = pool.find((movie) => movie.id === 502356)!;
    expect(distractorScore(prada, mario)).toBeNull();
    const ranked = pool
      .map((movie) => ({ movie, score: distractorScore(prada, movie) }))
      .filter((entry) => entry.score !== null)
      .sort((a, b) => b.score! - a.score!)
      .slice(0, 3);
    for (const { movie } of ranked)
      expect(prada.relatedMovieIds).toContain(movie.id);
  });

  it.each(["pl", "en"])(
    "generates varied, unambiguous matches with only plausible distractors (%s)",
    (locale) => {
      const pool = getFrameMoviePool(locale);
      const byId = new Map(pool.map((movie) => [movie.id, movie]));
      const targets = new Set<number>();
      for (let seed = 1; seed <= 100; seed++) {
        const questions = createDuelQuestions(pool, seeded(seed));
        expect(
          new Set(questions.map((question) => question.movieId)).size,
        ).toBe(6);
        for (const question of questions) {
          targets.add(question.movieId);
          const target = byId.get(question.movieId)!;
          expect(target.frames).toContain(question.imagePath);
          expect(question.options[question.correctIndex].movieId).toBe(
            target.id,
          );
          expect(
            new Set(question.options.map((option) => option.title)).size,
          ).toBe(4);
          for (const option of question.options) {
            expect(option.title).toBe(byId.get(option.movieId)?.title);
            if (option.movieId !== target.id)
              expect(
                distractorScore(target, byId.get(option.movieId)!),
              ).not.toBeNull();
          }
        }
      }
      expect(targets.size).toBeGreaterThan(300);
    },
  );
});
