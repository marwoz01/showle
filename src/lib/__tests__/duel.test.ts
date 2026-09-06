import { describe, expect, it } from "vitest";
import {
  calculateDuelPoints,
  createDuelQuestions,
  createRoomCode,
  DUEL_ROUND_MS,
  DUEL_ROUNDS,
  distractorScore,
} from "@/lib/duel";
import type { DuelMovieCandidate } from "@/types/frame-catalog";

const movies: DuelMovieCandidate[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  title: `Movie ${index + 1}`,
  year: 2000 + index,
  frames: [`/image-${index + 1}.jpg`, `/other-${index + 1}.jpg`],
  genreIds: [35, 18],
  keywordIds: [],
  castIds: [],
  directorIds: [],
  language: "en",
  collectionId: null,
}));

describe("duel questions", () => {
  it("rejects cartoon, horror, sci-fi and distant-era distractors for contemporary comedies", () => {
    for (const genre of [16, 27, 878, 10752, 37]) {
      expect(
        distractorScore(movies[0], { ...movies[1], genreIds: [35, genre] }),
      ).toBeNull();
    }
    expect(distractorScore(movies[0], { ...movies[1], year: 1950 })).toBeNull();
    expect(
      distractorScore(movies[0], { ...movies[1], genreIds: [28] }),
    ).toBeNull();
  });

  it("ranks shared themes and cast above a generic genre match", () => {
    const target = { ...movies[0], keywordIds: [10, 20], castIds: [30] };
    const similar = { ...movies[1], keywordIds: [10, 20], castIds: [30] };
    expect(distractorScore(target, similar)).toBeGreaterThan(
      distractorScore(target, movies[2])!,
    );
  });

  it("does not fall back to random unrelated answers when the pool is too sparse", () => {
    const sparse = movies.map((movie, index) => ({
      ...movie,
      year: 1700 + index * 30,
    }));
    expect(() => createDuelQuestions(sparse)).toThrow("plausible distractors");
  });

  it("keeps the input immutable and chooses frames from the fixed set", () => {
    const before = JSON.stringify(movies);
    const questions = createDuelQuestions(movies, () => 0.9);
    expect(JSON.stringify(movies)).toBe(before);
    for (const question of questions)
      expect(
        movies.find((movie) => movie.id === question.movieId)?.frames,
      ).toContain(question.imagePath);
  });

  it("creates six rounds with four unique answers", () => {
    const questions = createDuelQuestions(movies, () => 0.42);

    expect(questions).toHaveLength(DUEL_ROUNDS);
    expect(new Set(questions.map((question) => question.movieId)).size).toBe(
      DUEL_ROUNDS,
    );
    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      expect(
        new Set(question.options.map((option) => option.movieId)).size,
      ).toBe(4);
      expect(question.options[question.correctIndex].movieId).toBe(
        question.movieId,
      );
    }
  });

  it("creates readable six-character room codes", () => {
    expect(createRoomCode(() => 0)).toBe("AAAAAA");
    expect(createRoomCode(() => 0.999)).toBe("999999");
  });

  it("awards more points for a faster correct answer", () => {
    expect(calculateDuelPoints(DUEL_ROUND_MS)).toBe(1000);
    expect(calculateDuelPoints(DUEL_ROUND_MS / 2)).toBe(750);
    expect(calculateDuelPoints(0)).toBe(500);
  });
});
