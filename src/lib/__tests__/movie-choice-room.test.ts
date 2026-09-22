import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { MovieChoiceState } from "@/lib/movie-choice-engine";
import { movieChoiceMovies, movieChoiceNow as now, movieChoicePreferences as preferences, movieChoiceRoomFixture as fixture } from "./movie-choice-fixtures";

const db = vi.hoisted(() => ({
  state: null as MovieChoiceState | null,
  read: vi.fn(), member: vi.fn(), write: vi.fn(), create: vi.fn(), remove: vi.fn(), lock: vi.fn(), transaction: vi.fn(), candidates: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  movieChoiceRoom: { findFirst: db.member, create: db.create, deleteMany: db.remove }, $transaction: db.transaction,
} }));
vi.mock("@/lib/movie-choice-candidates", () => ({ generateMovieChoiceCandidates: db.candidates }));

let tail: Promise<void>;
beforeEach(() => {
  vi.clearAllMocks();
  // Both Date.now() and new Date() must use the fixture clock for expiry checks.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  db.state = fixture();
  db.candidates.mockResolvedValue(movieChoiceMovies);
  db.remove.mockResolvedValue({ count: 0 });
  db.member.mockImplementation(async ({ where, select }) => {
    const room = db.state;
    const member = room && room.code === where.code && room.expiresAt > where.expiresAt.gt && where.OR.some((part: { hostId?: string; guestId?: string }) =>
      (part.hostId && part.hostId === room.hostId) || (part.guestId && part.guestId === room.guestId),
    );
    return member ? select ? { code: room.code } : structuredClone(room) : null;
  });
  db.read.mockImplementation(async () => db.state ? structuredClone(db.state) : null);
  db.write.mockImplementation(async ({ data }) => {
    if (!db.state) throw new Error("Missing room");
    const normalized = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === Prisma.JsonNull ? null : value]));
    db.state = { ...db.state, ...structuredClone(normalized) };
    return structuredClone(db.state);
  });
  db.create.mockImplementation(async ({ data }) => {
    db.state = fixture(data);
    return structuredClone(db.state);
  });
  tail = Promise.resolve();
  // Mimic only pg_advisory_xact_lock, not transaction invocation: removing the
  // awaited SQL lock makes concurrent read/modify/write operations race here.
  db.transaction.mockImplementation(async (run) => {
    let release: (() => void) | undefined;
    const tx = {
      $executeRaw: async (...args: unknown[]) => {
        db.lock(...args);
        const previous = tail;
        tail = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        return 1;
      },
      movieChoiceRoom: { findUnique: db.read, update: db.write },
    };
    try { return await run(tx); } finally { release?.(); }
  });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("shared choice persistence and races", () => {
  it("atomically gives the sole guest slot to one concurrent joiner", async () => {
    const { mutateMovieChoiceRoom } = await import("@/lib/movie-choice-room");
    const results = await Promise.allSettled(["guest-one", "guest-two"].map((identity) => mutateMovieChoiceRoom({ action: "join", code: "ABCDEF", name: identity }, identity)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(db.lock).toHaveBeenCalledTimes(2);
    expect(db.state?.guestId).toBe("guest-one");
    expect(db.state?.status).toBe("preferences");
  });

  it("does not lose simultaneous votes or produce duplicate matches", async () => {
    db.state = fixture({ status: "voting", guestId: "guest-secret", guestName: "Guest", movies: movieChoiceMovies });
    const { mutateMovieChoiceRoom } = await import("@/lib/movie-choice-room");
    const vote = { action: "vote" as const, code: "ABCDEF", batch: 1, movieId: 1, liked: true };
    await Promise.all([mutateMovieChoiceRoom(vote, "host-secret"), mutateMovieChoiceRoom(vote, "guest-secret")]);
    expect(db.state).toMatchObject({ status: "matched", matchMovieId: 1, revision: 3, hostVotes: [{ movieId: 1, liked: true }], guestVotes: [{ movieId: 1, liked: true }] });
    await mutateMovieChoiceRoom(vote, "guest-secret");
    expect(db.state?.revision).toBe(3);
  });

  it("claims one deck after simultaneous preference submissions and generates outside the lock", async () => {
    db.state = fixture({ status: "preferences", guestId: "guest-secret", guestName: "Guest" });
    const { mutateMovieChoiceRoom, getMovieChoiceRoom } = await import("@/lib/movie-choice-room");
    let releaseCandidates!: (movies: typeof movieChoiceMovies) => void;
    db.candidates.mockImplementation(() => new Promise((resolve) => { releaseCandidates = resolve; }));
    const submit = { action: "preferences" as const, code: "ABCDEF", batch: 1, preferences };
    const calls = [mutateMovieChoiceRoom(submit, "host-secret"), mutateMovieChoiceRoom(submit, "guest-secret")];
    await vi.waitFor(() => expect(db.candidates).toHaveBeenCalledTimes(1));
    expect(db.state).toMatchObject({ revision: 3, generationAttempts: 1, status: "preferences" });
    expect((await getMovieChoiceRoom("ABCDEF", "host-secret")).preparing).toBe(true);
    // A room mutation can acquire the lock during catalogue work and gets a
    // domain-level conflict, rather than waiting for a long DB transaction.
    await expect(mutateMovieChoiceRoom(submit, "host-secret")).rejects.toThrow("preparing");
    releaseCandidates(movieChoiceMovies);
    await Promise.all(calls);
    expect(db.state).toMatchObject({ status: "voting", revision: 4, generationToken: null, generationError: null, movies: movieChoiceMovies });
  });

  it.each(["empty", "unavailable"])("preserves preferences and allows retry after %s candidate generation", async (failure) => {
    db.state = fixture({ status: "preferences", guestId: "guest-secret", guestName: "Guest", hostPreferences: preferences });
    const { mutateMovieChoiceRoom } = await import("@/lib/movie-choice-room");
    if (failure === "empty") db.candidates.mockResolvedValueOnce([]);
    else db.candidates.mockRejectedValueOnce(new Error("database unavailable"));
    const submit = { action: "preferences" as const, code: "ABCDEF", batch: 1, preferences };
    await expect(mutateMovieChoiceRoom(submit, "guest-secret")).rejects.toThrow(failure === "empty" ? "no_results" : "service_unavailable");
    expect(db.state).toMatchObject({ status: "preferences", hostPreferences: preferences, guestPreferences: preferences, generationToken: null, movies: [] });
    const retried = await mutateMovieChoiceRoom(submit, "host-secret");
    expect(retried).toMatchObject({ status: "voting", preparing: false, generationError: null });
  });

  it("does not overwrite a newer generation with a stale worker's results", async () => {
    db.state = fixture({ status: "preferences", guestId: "guest-secret", hostPreferences: preferences });
    const { mutateMovieChoiceRoom } = await import("@/lib/movie-choice-room");
    let finish!: (movies: typeof movieChoiceMovies) => void;
    db.candidates.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const pending = mutateMovieChoiceRoom({ action: "preferences", code: "ABCDEF", batch: 1, preferences }, "guest-secret");
    await vi.waitFor(() => expect(db.candidates).toHaveBeenCalled());
    db.state = { ...db.state!, generationToken: "newer-worker", revision: 7 };
    finish(movieChoiceMovies);
    const response = await pending;
    expect(db.state).toMatchObject({ movies: [], generationToken: "newer-worker", revision: 7 });
    expect(response.revision).toBe(7);
  });

  it("rejects outsiders before locking and rechecks expiry after the lock", async () => {
    const { mutateMovieChoiceRoom, getMovieChoiceRoom } = await import("@/lib/movie-choice-room");
    await expect(getMovieChoiceRoom("ABCDEF", "outsider")).rejects.toThrow("room_not_found");
    await expect(mutateMovieChoiceRoom({ action: "reset", code: "ABCDEF", batch: 1 }, "outsider")).rejects.toThrow("room_not_found");
    expect(db.lock).not.toHaveBeenCalled();
    db.state = fixture({ expiresAt: new Date(now) });
    await expect(mutateMovieChoiceRoom({ action: "join", code: "ABCDEF", name: "Guest" }, "guest-secret")).rejects.toThrow("room_not_found");
    expect(db.write).not.toHaveBeenCalled();
  });

  it("stores host identity without putting it in views and cleans only expired movie-choice rooms", async () => {
    const { createMovieChoiceRoom } = await import("@/lib/movie-choice-room");
    const view = await createMovieChoiceRoom("private-host-hash", "Host", "pl");
    expect(db.state?.hostId).toBe("private-host-hash");
    expect(view.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(JSON.stringify(view)).not.toContain("private-host-hash");
    expect(db.remove).toHaveBeenCalledWith({ where: { expiresAt: { lte: new Date(now) } } });
  });
});
