import { describe, expect, it } from "vitest";
import { createDuelQuestions, createRoomCode, DUEL_ROUNDS } from "@/lib/duel";
import type { DuelMovieCandidate } from "@/lib/tmdb";

const movies: DuelMovieCandidate[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  title: `Movie ${index + 1}`,
  year: 2000 + index,
  backdropPath: `/image-${index + 1}.jpg`,
}));

describe("duel questions", () => {
  it("creates six rounds with four unique answers", () => {
    const questions = createDuelQuestions(movies, () => 0.42);

    expect(questions).toHaveLength(DUEL_ROUNDS);
    expect(new Set(questions.map((question) => question.movieId)).size).toBe(
      DUEL_ROUNDS,
    );
    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options.map((option) => option.movieId)).size).toBe(4);
      expect(question.options[question.correctIndex].movieId).toBe(question.movieId);
    }
  });

  it("creates readable six-character room codes", () => {
    expect(createRoomCode(() => 0)).toBe("AAAAAA");
    expect(createRoomCode(() => 0.999)).toBe("999999");
  });
});
