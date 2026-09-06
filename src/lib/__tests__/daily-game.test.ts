import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaDetails } from "@/types";

const mocks = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  stats: vi.fn(),
  wallet: vi.fn(),
  coins: vi.fn(),
  lock: vi.fn(),
}));
vi.mock("@/lib/prisma", () => {
  const key = (args: {
    where: { userId_dateKey_mode: { userId: string; dateKey: string } };
  }) => JSON.stringify(args.where.userId_dateKey_mode);
  const tx = {
    $executeRaw: mocks.lock,
    gameResult: {
      findUnique: vi.fn(async (args) => mocks.rows.get(key(args)) ?? null),
      upsert: vi.fn(async (args) => {
        const row = {
          ...(mocks.rows.get(key(args)) ?? args.create),
          ...args.update,
        };
        mocks.rows.set(key(args), structuredClone(row));
        return structuredClone(row);
      }),
    },
    userStats: { findUnique: vi.fn(async () => null), upsert: mocks.stats },
    userWallet: {
      upsert: vi.fn(async () => ({ balance: 0, streakFreezes: 0 })),
      update: mocks.wallet,
    },
    coinTransaction: { create: mocks.coins },
  };
  return {
    prisma: {
      ...tx,
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    },
  };
});
vi.mock("@/lib/daily", () => ({ getDailyMovieId: () => 42 }));
vi.mock("@/lib/movie-snapshot", () => ({
  getMovieSnapshot: async (_date: string, id: number) => {
    if (id === 999) throw new Error("movie_unavailable");
    return {
      id,
      title: id === 42 ? "Secret answer" : "Guess",
      type: "movie",
      year: id === 42 ? 2020 : 1990,
      genres: [id === 42 ? "Drama" : "Action"],
      country: "France",
      director: "Director",
      leadActor: "Actor",
      runtime: 120,
      budget: 20,
      popularity: 8000,
      rating: 7,
      posterPath: "/poster",
      overview: "Plot",
    } satisfies MediaDetails;
  },
}));
import {
  applyDailyAction,
  getDailyGameView,
  parseDailyAction,
} from "@/lib/daily-game";

beforeEach(() => {
  mocks.rows.clear();
  vi.clearAllMocks();
});
describe("authoritative daily game", () => {
  it("rejects legacy client-supplied outcomes and malformed IDs", () => {
    expect(
      parseDailyAction({ status: "won", attemptCount: 1, targetMovieId: 42 }),
    ).toBeNull();
    for (const movieId of [-1, 0, 1.5, "42", Infinity])
      expect(parseDailyAction({ type: "guess", movieId })).toBeNull();
  });
  it("derives the result instead of trusting extra client fields", async () => {
    const action = parseDailyAction({
      type: "guess",
      movieId: 1,
      status: "won",
      attemptCount: 1,
    })!;
    const result = await applyDailyAction("user", "2026-09-06", action, true);
    expect(result.status).toBe("playing");
    expect(mocks.coins).not.toHaveBeenCalled();
    expect(mocks.lock).toHaveBeenCalledOnce();
  });
  it("does not count duplicate attempts or pay twice for a completed game", async () => {
    await applyDailyAction(
      "user",
      "2026-09-06",
      { type: "guess", movieId: 1 },
      true,
    );
    await applyDailyAction(
      "user",
      "2026-09-06",
      { type: "guess", movieId: 1 },
      true,
    );
    const won = await applyDailyAction(
      "user",
      "2026-09-06",
      { type: "guess", movieId: 42 },
      true,
    );
    const repeated = await applyDailyAction(
      "user",
      "2026-09-06",
      { type: "give-up" },
      true,
    );
    expect(won.attemptCount).toBe(2);
    expect(repeated.status).toBe("won");
    expect(mocks.stats).toHaveBeenCalledOnce();
    expect(mocks.coins).toHaveBeenCalledOnce();
  });
  it("restores giving up with no attempts and does not reward guests", async () => {
    await applyDailyAction(
      "guest:test",
      "2026-09-06",
      { type: "give-up" },
      false,
    );
    const view = await getDailyGameView("guest:test", "2026-09-06", "en");
    expect(view.status).toBe("lost");
    expect(view.guesses).toHaveLength(0);
    expect(view.answer?.id).toBe(42);
    expect(mocks.stats).not.toHaveBeenCalled();
  });
  it("does not reveal the answer or unsolved values during play", async () => {
    await applyDailyAction(
      "guest:test",
      "2026-09-06",
      { type: "guess", movieId: 1 },
      false,
    );
    const view = await getDailyGameView("guest:test", "2026-09-06", "en");
    expect(view.answer).toBeNull();
    expect(view.hints).toHaveLength(0);
    expect(JSON.stringify(view)).not.toContain("Secret answer");
    expect(view.guesses[0].comparison[0].answerValue).toBe("");
  });
  it("rejects unavailable movies without recording an attempt", async () => {
    await expect(
      applyDailyAction(
        "user",
        "2026-09-06",
        { type: "guess", movieId: 999 },
        true,
      ),
    ).rejects.toThrow();
    expect(mocks.rows.size).toBe(0);
  });
  it("ends on the seventh incorrect attempt", async () => {
    for (let movieId = 1; movieId <= 7; movieId++)
      await applyDailyAction(
        "user",
        "2026-09-06",
        { type: "guess", movieId },
        true,
      );
    const result = await applyDailyAction(
      "user",
      "2026-09-06",
      { type: "guess", movieId: 42 },
      true,
    );
    expect(result.status).toBe("lost");
    expect(result.attemptCount).toBe(7);
    expect(mocks.coins).toHaveBeenCalledOnce();
  });
});
