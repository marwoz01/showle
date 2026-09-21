import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalPostgres, POSTGRES_TEST_ENABLED } from "@/lib/__tests__/helpers/local-postgres";
import { movieChoiceBackendPids, movieChoiceTestSchema } from "@/lib/__tests__/helpers/local-movie-choice-postgres";
import type { MediaDetails } from "@/types";
import type { MovieChoicePreferences } from "@/types/movie-choice";

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/prisma", async () => {
  const { movieChoicePostgresAdapter } = await import("@/lib/__tests__/helpers/local-movie-choice-postgres");
  return { prisma: movieChoicePostgresAdapter };
});
vi.mock("@/lib/movie-choice-candidates", () => ({ generateMovieChoiceCandidates: generate }));
import { createMovieChoiceRoom, getMovieChoiceRoom, mutateMovieChoiceRoom } from "@/lib/movie-choice-room";

const preferences: MovieChoicePreferences = { genres: ["Drama"], excludedGenres: [], maxRuntime: 120, providerIds: [] };
function movie(id: number): MediaDetails {
  return {
    id, type: "movie", title: `Film ${id}`, year: 2020, genres: ["Drama"], country: "Poland",
    director: "Director", leadActor: "Actor", runtime: 100, budget: 1, popularity: 1000,
    rating: 7, posterPath: "/test.jpg", overview: "Test film",
  };
}
function deferred<T>() {
  let fulfill!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { fulfill = resolvePromise; });
  return { promise, fulfill };
}
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

describe.skipIf(!POSTGRES_TEST_ENABLED)("movie choice persistence on isolated PostgreSQL", () => {
  let pg: LocalPostgres;
  let schemaCreated = false;

  beforeAll(async () => {
    pg = new LocalPostgres();
    expect(await pg.query("SELECT current_database() || ':' || current_user")).toBe("showle_security_fix:showle_security");
    expect(movieChoiceTestSchema).toMatch(/^movie_choice_it_[a-f0-9]{32}$/);
    // The actual additive migration runs in a fresh schema; existing game and
    // collection tables (including the old security harness) are never touched.
    await pg.query(`CREATE SCHEMA "${movieChoiceTestSchema}"; SET search_path TO "${movieChoiceTestSchema}"; SET TIME ZONE 'UTC'`);
    schemaCreated = true;
    const migration = await readFile(resolve("prisma/migrations/20260921_movie_choice_rooms/migration.sql"), "utf8");
    await pg.query(migration);
  }, 20_000);

  afterAll(async () => {
    try {
      if (schemaCreated) await pg.query(`DROP SCHEMA "${movieChoiceTestSchema}" CASCADE`);
    } finally { await pg?.close(); }
  });

  beforeEach(() => {
    generate.mockReset();
    generate.mockResolvedValue([movie(101), movie(102)]);
  });

  async function joinedRoom() {
    const room = await createMovieChoiceRoom("host", "Host", "pl");
    await mutateMovieChoiceRoom({ action: "join", code: room.code, name: "Guest" }, "guest");
    return room.code;
  }

  async function votingRoom() {
    const code = await joinedRoom();
    await Promise.all(["host", "guest"].map((identity) => mutateMovieChoiceRoom({
      action: "preferences", code, batch: 1, preferences,
    }, identity)));
    return code;
  }

  async function saved(code: string) {
    const rows = await pg.rows(`SELECT * FROM "MovieChoiceRoom" WHERE code = ${literal(code)}`);
    expect(rows).toHaveLength(1);
    return rows[0];
  }

  it("admits exactly one of two concurrent guests and preserves the winner on retry", async () => {
    const room = await createMovieChoiceRoom("host", "Host", "pl");
    const identities = ["guest-one", "guest-two"];
    const outcomes = await Promise.allSettled(identities.map((identity) => mutateMovieChoiceRoom({
      action: "join", code: room.code, name: identity,
    }, identity)));
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "room_full", status: 409 } });
    const winner = identities[outcomes.findIndex((result) => result.status === "fulfilled")];
    expect(await saved(room.code)).toMatchObject({ guestId: winner, guestName: winner, status: "preferences", revision: 2 });
    const retried = await mutateMovieChoiceRoom({ action: "join", code: room.code, name: "Changed name" }, winner);
    expect(retried.revision).toBe(2);
    expect(retried.players).toHaveLength(2);
    expect(await saved(room.code)).toMatchObject({ guestId: winner, guestName: winner, revision: 2 });
  }, 20_000);

  it("persists concurrent preferences once and claims a single candidate generation", async () => {
    const code = await votingRoom();
    expect(generate).toHaveBeenCalledTimes(1);
    const state = await saved(code);
    expect(state).toMatchObject({
      status: "voting", hostPreferences: preferences, guestPreferences: preferences,
      generationAttempts: 1, generationToken: null, generationStartedAt: null,
    });
    expect(state.movies).toEqual([movie(101), movie(102)]);
    expect(movieChoiceBackendPids.size).toBeGreaterThan(2);
  }, 20_000);

  it("commits both simultaneous likes and keeps matching retries idempotent", async () => {
    const code = await votingRoom();
    const vote = { action: "vote", code, batch: 1, movieId: 101, liked: true } as const;
    await Promise.all([mutateMovieChoiceRoom(vote, "host"), mutateMovieChoiceRoom(vote, "guest")]);
    const matched = await saved(code);
    expect(matched).toMatchObject({
      status: "matched", matchMovieId: 101,
      hostVotes: [{ movieId: 101, liked: true }], guestVotes: [{ movieId: 101, liked: true }],
    });
    const retried = await Promise.all([mutateMovieChoiceRoom(vote, "host"), mutateMovieChoiceRoom(vote, "guest")]);
    for (const view of retried) {
      expect(view).toMatchObject({ status: "matched", revision: matched.revision, match: { id: 101 } });
      expect(view.votes).toEqual([{ movieId: 101, liked: true }]);
      expect(view).not.toHaveProperty("hostId");
      expect(view).not.toHaveProperty("guestVotes");
    }
    await expect(mutateMovieChoiceRoom({ ...vote, liked: false }, "host")).rejects.toMatchObject({ code: "already_voted", status: 409 });
    expect(await saved(code)).toEqual(matched);
  }, 20_000);

  it("rejects outsider reads and writes without changing the persisted room", async () => {
    const code = await votingRoom();
    const before = await saved(code);
    await expect(getMovieChoiceRoom(code, "outsider")).rejects.toMatchObject({ code: "room_not_found", status: 404 });
    for (const action of [
      { action: "vote", code, batch: 1, movieId: 101, liked: true } as const,
      { action: "preferences", code, batch: 1, preferences } as const,
      { action: "reset", code, batch: 1 } as const,
    ]) {
      await expect(mutateMovieChoiceRoom(action, "outsider")).rejects.toMatchObject({ code: "room_not_found", status: 404 });
    }
    expect(await saved(code)).toEqual(before);
  }, 20_000);

  it("denies an expired room to its members and to someone attempting to join", async () => {
    const code = await joinedRoom();
    await pg.query(`UPDATE "MovieChoiceRoom" SET "expiresAt" = CURRENT_TIMESTAMP - interval '1 minute' WHERE code = ${literal(code)}`);
    const before = await saved(code);
    await expect(getMovieChoiceRoom(code, "host")).rejects.toMatchObject({ code: "room_not_found", status: 404 });
    await expect(mutateMovieChoiceRoom({ action: "preferences", code, batch: 1, preferences }, "guest")).rejects.toMatchObject({ code: "room_not_found", status: 404 });
    await expect(mutateMovieChoiceRoom({ action: "join", code, name: "Third" }, "third")).rejects.toMatchObject({ code: "room_not_found", status: 404 });
    expect(await saved(code)).toEqual(before);
  }, 20_000);

  it("releases the DB lock during generation and prevents duplicate work while it is pending", async () => {
    const code = await joinedRoom();
    await mutateMovieChoiceRoom({ action: "preferences", code, batch: 1, preferences }, "host");
    const started = deferred<void>();
    const candidates = deferred<MediaDetails[]>();
    generate.mockImplementationOnce(() => { started.fulfill(); return candidates.promise; });
    const generating = mutateMovieChoiceRoom({ action: "preferences", code, batch: 1, preferences }, "guest");
    await started.promise;
    try {
      expect(await getMovieChoiceRoom(code, "host")).toMatchObject({ status: "preferences", preparing: true });
      // This takes the same actual advisory lock. It would time out if the
      // candidate provider still owned the original transaction.
      await expect(mutateMovieChoiceRoom({ action: "preferences", code, batch: 1, preferences }, "host"))
        .rejects.toMatchObject({ code: "preparing", status: 409 });
      expect(generate).toHaveBeenCalledTimes(1);
    } finally {
      candidates.fulfill([movie(101)]);
      await generating;
    }
    expect(await saved(code)).toMatchObject({ status: "voting", generationAttempts: 1, generationToken: null });
  }, 20_000);

  it("does not let a stale generation overwrite its replacement", async () => {
    const code = await joinedRoom();
    await mutateMovieChoiceRoom({ action: "preferences", code, batch: 1, preferences }, "host");
    const started = deferred<void>();
    const staleCandidates = deferred<MediaDetails[]>();
    generate.mockImplementationOnce(() => { started.fulfill(); return staleCandidates.promise; });
    const staleWorker = mutateMovieChoiceRoom({ action: "preferences", code, batch: 1, preferences }, "guest");
    await started.promise;
    let replacement;
    try {
      await pg.query(`UPDATE "MovieChoiceRoom" SET "generationStartedAt" = CURRENT_TIMESTAMP - interval '1 minute' WHERE code = ${literal(code)}`);
      generate.mockResolvedValueOnce([movie(202)]);
      replacement = await mutateMovieChoiceRoom({ action: "preferences", code, batch: 1, preferences }, "host");
      expect(replacement.movies).toEqual([movie(202)]);
    } finally { staleCandidates.fulfill([movie(101)]); }
    const late = await staleWorker;
    expect(late.movies).toEqual([movie(202)]);
    expect(late.revision).toBe(replacement!.revision);
    expect(await saved(code)).toMatchObject({ status: "voting", movies: [movie(202)], generationAttempts: 2, generationToken: null });
  }, 20_000);
});
