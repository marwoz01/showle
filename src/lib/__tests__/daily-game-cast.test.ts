import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaDetails } from "@/types";
const mocks = vi.hoisted(() => ({ snapshots: new Map<number, MediaDetails>(), snapshot: vi.fn(), details: vi.fn(), game: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { gameResult: { findUnique: mocks.game } } }));
vi.mock("@/lib/movie-snapshot", () => ({ getMovieSnapshot: mocks.snapshot }));
vi.mock("@/lib/tmdb", () => ({ getMovieDetails: mocks.details }));
vi.mock("@/lib/daily", () => ({ getDailyMovieId: () => 42 }));
const cast = (...names: string[]) => names.map((name) => ({ name, character: "", profilePath: `/photo-${name}` }));
const movie = (id: number): MediaDetails => ({ id, title: `Film ${id}`, type: "movie", year: 2000, genres: ["Drama"], country: "France", director: `Director ${id}`, leadActor: "Unknown", runtime: 120, budget: 10, popularity: 50, rating: 7, posterPath: "/poster", overview: "Plot" });

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); mocks.snapshots.clear();
  mocks.game.mockResolvedValue({ guessIds: [1], status: "playing" });
  mocks.snapshots.set(42, { ...movie(42), leadActor: "Secret lead", cast: cast("Secret lead", "Shared support"), castNames: ["Secret lead", "Shared support", ...Array.from({ length: 10 }, (_, i) => `Secret actor ${i}`), "Lower billed"] });
  mocks.snapshots.set(1, { ...movie(1), leadActor: "Shared support", cast: cast("Shared support", "Lower billed", "Absent"), castNames: ["Shared support", "Lower billed", "Absent", "Not displayed"] });
  mocks.snapshot.mockImplementation(async (_day: string, id: number) => structuredClone(mocks.snapshots.get(id)));
});

describe("authoritative daily actor payload", () => {
  it("returns per-guessed-person statuses without changing lead clues or exposing hidden answer cast", async () => {
    const { getDailyGameView } = await import("@/lib/daily-game");
    const result = await getDailyGameView("viewer", "2026-09-24", "en");
    expect(result.guesses[0].castComparison).toEqual([{ name: "Shared support", status: "exact" }, { name: "Lower billed", status: "exact" }, { name: "Absent", status: "miss" }]);
    expect(result.guesses[0].comparison).toHaveLength(9);
    expect(result.guesses[0].comparison[4]).toMatchObject({ status: "miss", answerValue: "" });
    expect(result.answer).toBeNull();
    expect(result.revealedPeople.cast).toBeUndefined();
    expect(result.guesses[0].guess.castNames).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("Secret");
    expect(JSON.stringify(result)).not.toContain("Not displayed");
    expect(mocks.details).not.toHaveBeenCalled();
  });
  it("loads full legacy answer credits once without reloading guessed films", async () => {
    delete mocks.snapshots.get(42)!.castNames;
    mocks.details.mockResolvedValue({ ...movie(42), castNames: ["Secret lead", "Shared support", "Lower billed"] });
    const { getDailyGameView } = await import("@/lib/daily-game");
    const result = await getDailyGameView("viewer", "2026-09-24", "en");
    await getDailyGameView("viewer", "2026-09-24", "en");
    expect(result.guesses[0].castComparison).toContainEqual({ name: "Lower billed", status: "exact" });
    expect(mocks.details).toHaveBeenCalledExactlyOnceWith(42);
    expect(mocks.snapshot.mock.calls.map((call) => call[1])).toEqual([42, 1, 42, 1]);
  });
  it("does not paint uncertain actors red when legacy credits are unavailable", async () => {
    delete mocks.snapshots.get(42)!.castNames;
    mocks.details.mockResolvedValue(null);
    const { getDailyGameView } = await import("@/lib/daily-game");
    const result = await getDailyGameView("viewer", "2026-09-24", "en");
    expect(result.guesses[0].castComparison).toEqual([{ name: "Shared support", status: "exact" }]);
    expect(result.guesses[0].comparison[4]).toMatchObject({ status: "miss", answerValue: "" });
  });
  it("does not fetch legacy credits for a game with no guesses", async () => {
    delete mocks.snapshots.get(42)!.castNames;
    mocks.game.mockResolvedValue(null);
    const { getDailyGameView } = await import("@/lib/daily-game");
    expect((await getDailyGameView("viewer", "2026-09-24", "en")).guesses).toEqual([]);
    expect(mocks.details).not.toHaveBeenCalled();
  });
});
