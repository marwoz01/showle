import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaDetails } from "@/types";

type SnapshotKey = { dateKey: string; tmdbId: number; locale: string };
type Lookup = { where: { dateKey_tmdbId_locale: SnapshotKey } };
const mocks = vi.hoisted(() => ({
  rows: new Map<string, MediaDetails>(),
  find: vi.fn(),
  save: vi.fn(),
  readSaved: vi.fn(),
  details: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyMovieSnapshot: {
      findUnique: mocks.find,
      createMany: mocks.save,
      findUniqueOrThrow: mocks.readSaved,
    },
  },
}));
vi.mock("@/lib/tmdb", () => ({ getMovieDetails: mocks.details }));

const day = "2026-09-21";
const key = (value: SnapshotKey) =>
  JSON.stringify([value.dateKey, value.tmdbId, value.locale]);
const movie = (id = 42): MediaDetails => ({
  id,
  title: "Persisted title",
  type: "movie",
  year: 2001,
  genres: ["Drama"],
  country: "France",
  director: "Director",
  leadActor: "Actor",
  runtime: 120,
  budget: 20,
  popularity: 80,
  rating: 7,
  posterPath: "/poster",
  overview: "Persisted overview",
});

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.rows.clear();
  mocks.find.mockImplementation(async (args: Lookup) => {
    const details = mocks.rows.get(key(args.where.dateKey_tmdbId_locale));
    return details ? { details: structuredClone(details) } : null;
  });
  mocks.save.mockImplementation(
    async (args: { data: (SnapshotKey & { details: MediaDetails })[] }) => {
      for (const row of args.data)
        if (!mocks.rows.has(key(row)))
          mocks.rows.set(key(row), structuredClone(row.details));
    },
  );
  mocks.readSaved.mockImplementation(async (args: Lookup) => {
    const details = mocks.rows.get(key(args.where.dateKey_tmdbId_locale));
    if (!details) throw new Error("missing_snapshot");
    return { details: structuredClone(details) };
  });
  mocks.details.mockImplementation(async (id: number) => movie(id));
});
afterEach(() => vi.restoreAllMocks());

describe("daily movie snapshot reuse", () => {
  it("reuses persisted snapshots without allowing a caller to mutate them", async () => {
    mocks.rows.set(key({ dateKey: day, tmdbId: 42, locale: "en" }), movie());
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    const first = await getMovieSnapshot(day, 42);
    first.title = "Changed by caller";
    first.genres.push("Action");
    expect(await getMovieSnapshot(day, 42)).toEqual(movie());
    expect(mocks.find).toHaveBeenCalledOnce();
    expect(mocks.details).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("keeps different days, movies and languages separate", async () => {
    const keys: SnapshotKey[] = [
      { dateKey: day, tmdbId: 42, locale: "en" },
      { dateKey: "2026-09-22", tmdbId: 42, locale: "en" },
      { dateKey: day, tmdbId: 43, locale: "en" },
      { dateKey: day, tmdbId: 42, locale: "pl" },
    ];
    keys.forEach((value, index) =>
      mocks.rows.set(key(value), { ...movie(value.tmdbId), title: `Title ${index}` }),
    );
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    for (let repeat = 0; repeat < 2; repeat++)
      for (const [index, value] of keys.entries())
        expect(
          (await getMovieSnapshot(value.dateKey, value.tmdbId, value.locale)).title,
        ).toBe(`Title ${index}`);
    expect(mocks.find).toHaveBeenCalledTimes(4);
  });

  it("shares concurrent cold reads, including the insert and persisted readback", async () => {
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => getMovieSnapshot(day, 42)),
    );
    expect(results).toEqual(Array.from({ length: 10 }, () => movie()));
    expect(mocks.find).toHaveBeenCalledOnce();
    expect(mocks.details).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.readSaved).toHaveBeenCalledOnce();
    results[0].genres.push("Action");
    expect(results[1].genres).toEqual(["Drama"]);
  });

  it("fetches translation while the canonical snapshot is loading, keeping canonical game values", async () => {
    let resolveEnglish!: (details: MediaDetails) => void;
    let resolvePolish!: (details: MediaDetails) => void;
    mocks.details.mockImplementation((_id: number, locale?: string) =>
      new Promise<MediaDetails>((resolve) => {
        if (locale === "pl-PL") resolvePolish = resolve;
        else resolveEnglish = resolve;
      }),
    );
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    const result = getMovieSnapshot(day, 42, "pl");
    await vi.waitFor(() => expect(mocks.details).toHaveBeenCalledTimes(2));
    resolvePolish({ ...movie(), title: "Polski tytuł", year: 2026, rating: 9 });
    resolveEnglish(movie());
    expect(await result).toEqual({ ...movie(), title: "Polski tytuł" });
    expect(await getMovieSnapshot(day, 42)).toEqual(movie());
    expect(mocks.find).toHaveBeenCalledTimes(2);
  });

  it("caches the other instance's persisted winner instead of this instance's TMDB response", async () => {
    const winner = { ...movie(), title: "Other instance won", year: 1999 };
    mocks.save.mockImplementationOnce(async () => {
      mocks.rows.set(key({ dateKey: day, tmdbId: 42, locale: "en" }), winner);
    });
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    expect(await getMovieSnapshot(day, 42)).toEqual(winner);
    expect(await getMovieSnapshot(day, 42)).toEqual(winner);
    expect(mocks.readSaved).toHaveBeenCalledOnce();
    expect(mocks.find).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][0].skipDuplicates).toBe(true);
  });

  it.each(["find", "details", "save", "readSaved"] as const)(
    "retries after a failed %s without retaining its rejected promise",
    async (stage) => {
      mocks[stage].mockRejectedValueOnce(new Error("temporary_failure"));
      const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
      await expect(getMovieSnapshot(day, 42)).rejects.toThrow("temporary_failure");
      expect(await getMovieSnapshot(day, 42)).toEqual(movie());
      expect(mocks.find).toHaveBeenCalledTimes(2);
    },
  );

  it("does not cache an unavailable movie", async () => {
    mocks.details.mockResolvedValueOnce(null);
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    await expect(getMovieSnapshot(day, 42)).rejects.toThrow("movie_unavailable");
    expect(await getMovieSnapshot(day, 42)).toEqual(movie());
    expect(mocks.details).toHaveBeenCalledTimes(2);
  });

  it("revalidates expired entries against persistence", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    await getMovieSnapshot(day, 42);
    now.mockReturnValue(30 * 60 * 1000 + 1);
    await getMovieSnapshot(day, 42);
    expect(mocks.find).toHaveBeenCalledTimes(2);
    expect(mocks.details).toHaveBeenCalledOnce();
  });

  it("bounds retained snapshots and evicts the least recently used entry", async () => {
    for (let id = 1; id <= 513; id++)
      mocks.rows.set(key({ dateKey: day, tmdbId: id, locale: "en" }), movie(id));
    const { getMovieSnapshot } = await import("@/lib/movie-snapshot");
    for (let id = 1; id <= 512; id++) await getMovieSnapshot(day, id);
    await getMovieSnapshot(day, 1);
    await getMovieSnapshot(day, 513);
    await getMovieSnapshot(day, 1);
    expect(mocks.find).toHaveBeenCalledTimes(513);
    await getMovieSnapshot(day, 2);
    expect(mocks.find).toHaveBeenCalledTimes(514);
  });
});
