import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameResult } from "@prisma/client";
import type { MediaDetails } from "@/types";

const mocks = vi.hoisted(() => ({
  findGame: vi.fn(),
  transaction: vi.fn(),
  snapshot: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    gameResult: { findUnique: mocks.findGame },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/movie-snapshot", () => ({ getMovieSnapshot: mocks.snapshot }));
vi.mock("@/lib/daily", () => ({ getDailyMovieId: () => 42 }));
import { applyDailyAction, getDailyGameView } from "@/lib/daily-game";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const day = "2026-09-21";
const movie = (id: number, locale = "en"): MediaDetails => ({
  id,
  title: id === 42 ? "Secret answer" : `${locale}: Guess ${id}`,
  type: "movie",
  year: id === 42 ? 2020 : 2001,
  genres: ["Drama"],
  country: "France",
  director: "Director",
  leadActor: "Actor",
  runtime: 120,
  budget: 20,
  popularity: 80,
  rating: 7,
  posterPath: "/poster",
  overview: "Plot",
});
const game: GameResult = {
  id: "game",
  userId: "player",
  dateKey: day,
  mode: "daily-movie",
  status: "playing",
  guessIds: [1, 2],
  attemptCount: 2,
  hintsUsed: 1,
  completedAt: new Date(),
  targetMovieId: 42,
  targetTitle: "Secret answer",
  targetYear: 2020,
  targetPoster: "/poster",
  extraAttempts: 0,
  paidHintUsed: false,
  paidHintsCount: 0,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findGame.mockResolvedValue(game);
  mocks.snapshot.mockImplementation(async (_day: string, id: number, locale?: string) =>
    movie(id, locale),
  );
});

describe("daily game parallel reads", () => {
  it("starts answer and guess validation together and waits for both before a transaction", async () => {
    const answer = deferred<MediaDetails>();
    const guess = deferred<MediaDetails>();
    mocks.snapshot.mockImplementation((_day: string, id: number) =>
      id === 42 ? answer.promise : guess.promise,
    );
    const action = applyDailyAction("player", day, { type: "guess", movieId: 1 }, false);
    expect(mocks.snapshot.mock.calls.map((call) => call[1])).toEqual([42, 1]);
    guess.resolve(movie(1));
    await Promise.resolve();
    expect(mocks.transaction).not.toHaveBeenCalled();
    answer.resolve(movie(42));
    await action;
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("never opens a transaction if parallel movie validation fails", async () => {
    const answer = deferred<MediaDetails>();
    mocks.snapshot.mockImplementation((_day: string, id: number) =>
      id === 42 ? answer.promise : Promise.reject(new Error("movie_unavailable")),
    );
    await expect(
      applyDailyAction("player", day, { type: "guess", movieId: 1 }, false),
    ).rejects.toThrow("movie_unavailable");
    answer.resolve(movie(42));
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("starts guess and localized reads before a slow answer finishes, keeping response order and hidden values", async () => {
    const saved = deferred<GameResult>();
    const answer = deferred<MediaDetails>();
    const localizedAnswer = deferred<MediaDetails>();
    mocks.findGame.mockReturnValue(saved.promise);
    mocks.snapshot.mockImplementation((_day: string, id: number, locale = "en") => {
      if (id === 42)
        return locale === "pl" ? localizedAnswer.promise : answer.promise;
      return Promise.resolve(movie(id, locale));
    });
    const view = getDailyGameView("player", day, "pl");
    expect(mocks.findGame).toHaveBeenCalledOnce();
    expect(mocks.snapshot).toHaveBeenCalledWith(day, 42);
    expect(mocks.snapshot).toHaveBeenCalledWith(day, 42, "pl");
    saved.resolve(game);
    await vi.waitFor(() => expect(mocks.snapshot).toHaveBeenCalledTimes(6));
    expect(mocks.snapshot).toHaveBeenCalledWith(day, 1, "pl");
    expect(mocks.snapshot).toHaveBeenCalledWith(day, 2, "pl");
    localizedAnswer.resolve(movie(42, "pl"));
    answer.resolve(movie(42));
    const result = await view;
    expect(result.guesses.map((guess) => guess.guess.title)).toEqual([
      "pl: Guess 2",
      "pl: Guess 1",
    ]);
    expect(result.guesses.map((guess) => guess.attemptNumber)).toEqual([2, 1]);
    expect(result.answer).toBeNull();
    expect(result.guesses[0].comparison[0].answerValue).toBe("");
    expect(JSON.stringify(result)).not.toContain("Secret answer");
  });

  it("reuses the same canonical read for English display and accepts a supplied game without rereading it", async () => {
    const view = await getDailyGameView("player", day, "en", game);
    expect(mocks.findGame).not.toHaveBeenCalled();
    expect(mocks.snapshot.mock.calls.map((call) => call[1])).toEqual([42, 1, 2]);
    expect(view.guesses).toHaveLength(2);
  });
});
