import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedMovie } from "@prisma/client";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  rows: new Map<string, SavedMovie>(),
  transaction: vi.fn(),
  update: vi.fn(),
  auth: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: db.transaction } }));
vi.mock("@clerk/nextjs/server", () => ({ auth: db.auth }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: db.limit }));

import { addCollectionMovies, parseCollectionBulkInput, undoCollectionMovies } from "@/lib/collection-bulk";
import { PATCH, POST } from "@/app/api/collection/bulk/route";

const watchedAt = new Date("2025-05-01T12:00:00Z");
function saved(tmdbId: number, overrides: Partial<SavedMovie> = {}): SavedMovie {
  return {
    id: `saved-${tmdbId}`, userId: "viewer", tmdbId, title: `Film ${tmdbId}`, year: 2001,
    posterPath: "/poster.jpg", genres: ["Drama"], director: "Director", overview: "Description",
    runtime: 120, tmdbRating: 7.8, category: "watched", rating: 8.5, review: "My review",
    watchedAt, createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-05-02"), ...overrides,
  };
}
function input(category: "watched" | "watchlist", ...ids: number[]) {
  return parseCollectionBulkInput({ category, movies: ids.map((tmdbId) => ({ tmdbId, title: `Incoming ${tmdbId}` })) });
}
function put(row: SavedMovie) { db.rows.set(row.id, row); }
type Where = { id: string; userId: string; updatedAt: Date; category?: string };
function matches(row: SavedMovie | undefined, where: Where) {
  return row && row.userId === where.userId && row.updatedAt.getTime() === where.updatedAt.getTime() && (!where.category || row.category === where.category);
}
function request(body: unknown) {
  return new NextRequest("http://localhost/api/collection/bulk", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "test-collection-signing-secret");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
  db.rows.clear();
  vi.clearAllMocks();
  db.auth.mockResolvedValue({ userId: "viewer" });
  db.limit.mockReturnValue({ success: true });
  db.update.mockImplementation(async ({ where, data }: { where: Where; data: Partial<SavedMovie> }) => {
    const row = db.rows.get(where.id);
    if (!matches(row, where)) return { count: 0 };
    put({ ...row!, ...data });
    return { count: 1 };
  });
  const tx = { savedMovie: {
    findMany: async ({ where }: { where: { userId: string; tmdbId: { in: number[] } } }) => Array.from(db.rows.values()).filter((row) => row.userId === where.userId && where.tmdbId.in.includes(row.tmdbId)),
    createManyAndReturn: async ({ data }: { data: Partial<SavedMovie>[] }) => data.map((movie) => {
      const row = saved(movie.tmdbId!, { ...movie, rating: null, review: null, createdAt: new Date(), updatedAt: new Date() });
      put(row);
      return row;
    }),
    updateMany: db.update,
    deleteMany: async ({ where }: { where: Where }) => {
      if (!matches(db.rows.get(where.id), where)) return { count: 0 };
      db.rows.delete(where.id);
      return { count: 1 };
    },
  } };
  db.transaction.mockImplementation(async (run: (client: typeof tx) => Promise<unknown>) => {
    const before = structuredClone(db.rows);
    try { return await run(tx); } catch (error) { db.rows = before; throw error; }
  });
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("collection bulk add and undo", () => {
  it("adds selected movies atomically and removes only those additions on undo", async () => {
    put(saved(99));
    const result = await addCollectionMovies("viewer", input("watchlist", 1, 2));
    expect(result).toMatchObject({ count: 2, category: "watchlist" });
    expect(db.rows.get("saved-1")).toMatchObject({ category: "watchlist", watchedAt: null, rating: null });
    expect(db.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
    expect(await undoCollectionMovies("viewer", { undoToken: result.undoToken })).toEqual({ count: 2 });
    expect([...db.rows.keys()]).toEqual(["saved-99"]);
  });

  it("sets watchedAt for a newly watched movie", async () => {
    await addCollectionMovies("viewer", input("watched", 1));
    expect(db.rows.get("saved-1")?.watchedAt).toEqual(new Date());
  });

  it("keeps another user's copy of the same film untouched", async () => {
    const other = saved(1, { id: "other-copy", userId: "other-viewer" });
    put(other);
    const result = await addCollectionMovies("viewer", input("watchlist", 1));
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    expect([...db.rows.values()]).toEqual([other]);
  });

  it("preserves existing metadata, rating, review and original watch date on moves", async () => {
    const before = saved(1);
    put(before);
    const result = await addCollectionMovies("viewer", input("watchlist", 1));
    expect(db.rows.get("saved-1")).toEqual({ ...before, category: "watchlist", updatedAt: new Date() });
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    expect(db.rows.get("saved-1")).toEqual({ ...before, updatedAt: new Date(Date.now() + 1) });
  });

  it("restores a null watch date when undoing a watchlist-to-watched move", async () => {
    put(saved(1, { category: "watchlist", watchedAt: null }));
    const result = await addCollectionMovies("viewer", input("watched", 1));
    expect(db.rows.get("saved-1")?.watchedAt).toEqual(new Date());
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    expect(db.rows.get("saved-1")).toMatchObject({ category: "watchlist", watchedAt: null, rating: 8.5, review: "My review" });
  });

  it("does not modify or delete a movie already in the requested list", async () => {
    const before = saved(1);
    put(before);
    const result = await addCollectionMovies("viewer", input("watched", 1));
    expect(db.update).not.toHaveBeenCalled();
    expect(db.rows.get("saved-1")).toEqual(before);
    put({ ...before, review: "Later review", updatedAt: new Date() });
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    expect(db.rows.get("saved-1")?.review).toBe("Later review");
  });

  it("undoes a mixed selection without deleting pre-existing movies", async () => {
    put(saved(1));
    put(saved(2, { category: "watchlist", watchedAt: null }));
    const result = await addCollectionMovies("viewer", input("watched", 1, 2, 3));
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    expect(db.rows.size).toBe(2);
    expect(db.rows.get("saved-1")?.category).toBe("watched");
    expect(db.rows.get("saved-2")?.category).toBe("watchlist");
  });

  it("rolls back earlier additions if a later move fails", async () => {
    put(saved(2));
    db.update.mockResolvedValueOnce({ count: 0 });
    await expect(addCollectionMovies("viewer", input("watchlist", 1, 2))).rejects.toMatchObject({ status: 409 });
    expect([...db.rows.keys()]).toEqual(["saved-2"]);
    expect(db.rows.get("saved-2")?.category).toBe("watched");
  });

  it("rolls back the whole undo if a later movie was edited after adding", async () => {
    put(saved(2));
    const result = await addCollectionMovies("viewer", input("watchlist", 1, 2));
    put({ ...db.rows.get("saved-2")!, rating: 10, updatedAt: new Date(Date.now() + 5) });
    await expect(undoCollectionMovies("viewer", { undoToken: result.undoToken })).rejects.toMatchObject({ status: 409 });
    expect(db.rows.has("saved-1")).toBe(true);
    expect(db.rows.get("saved-2")).toMatchObject({ category: "watchlist", rating: 10 });
  });

  it("rejects undo after a newly added movie was edited", async () => {
    const result = await addCollectionMovies("viewer", input("watchlist", 1));
    put({ ...db.rows.get("saved-1")!, review: "Keep", updatedAt: new Date(Date.now() + 1) });
    await expect(undoCollectionMovies("viewer", { undoToken: result.undoToken })).rejects.toMatchObject({ status: 409 });
    expect(db.rows.get("saved-1")?.review).toBe("Keep");
  });

  it("cannot replay a move undo even within the same millisecond", async () => {
    put(saved(1));
    const result = await addCollectionMovies("viewer", input("watchlist", 1));
    await undoCollectionMovies("viewer", { undoToken: result.undoToken });
    await expect(undoCollectionMovies("viewer", { undoToken: result.undoToken })).rejects.toMatchObject({ status: 409 });
  });

  it("fails atomically when token signing is unavailable", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "");
    await expect(addCollectionMovies("viewer", input("watchlist", 1))).rejects.toThrow("signing");
    expect(db.rows.size).toBe(0);
  });

  it("rejects a forged receipt, another user's receipt, and an expired receipt before DB access", async () => {
    const result = await addCollectionMovies("viewer", input("watchlist", 1));
    const [payload, sig] = result.undoToken.split(".");
    const tampered = JSON.parse(Buffer.from(payload, "base64url").toString());
    tampered.changes[0].id = "saved-99";
    db.transaction.mockClear();
    await expect(undoCollectionMovies("viewer", { undoToken: `${Buffer.from(JSON.stringify(tampered)).toString("base64url")}.${sig}` })).rejects.toMatchObject({ status: 400 });
    await expect(undoCollectionMovies("different-user", { undoToken: result.undoToken })).rejects.toMatchObject({ status: 400 });
    vi.advanceTimersByTime(10 * 60_000);
    await expect(undoCollectionMovies("viewer", { undoToken: result.undoToken })).rejects.toMatchObject({ status: 400 });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe("collection bulk route", () => {
  it("requires authentication for both operations", async () => {
    db.auth.mockResolvedValue({ userId: null });
    expect((await POST(request(input("watched", 1)))).status).toBe(401);
    expect((await PATCH(request({ undoToken: "bad" }))).status).toBe(401);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("enforces the collection write budget", async () => {
    db.limit.mockReturnValue({ success: false });
    expect((await POST(request(input("watched", 1)))).status).toBe(429);
    expect((await PATCH(request({ undoToken: "bad" }))).status).toBe(429);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { category: "unknown", movies: [{ tmdbId: 1, title: "A" }] },
    { category: "watched", movies: [] },
    { category: "watched", movies: Array.from({ length: 51 }, (_, i) => ({ tmdbId: i + 1, title: "A" })) },
    { category: "watched", movies: [{ tmdbId: 1, title: "A" }, { tmdbId: 1, title: "B" }] },
    { category: "watched", movies: [{ tmdbId: 0, title: "A" }] },
    { category: "watched", movies: [{ tmdbId: "1", title: "A" }] },
    { category: "watched", movies: [{ tmdbId: 1, title: " " }] },
    { category: "watched", movies: [{ tmdbId: 1, title: "A", genres: [42] }] },
    { category: "watched", movies: [{ tmdbId: 1, title: "A", tmdbRating: 11 }] },
  ])("rejects invalid payload %# without changing data", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("returns a receipt on save and accepts it for undo", async () => {
    const response = await POST(request(input("watchlist", 1, 2)));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await response.json();
    expect(body).toMatchObject({ category: "watchlist", count: 2 });
    const undo = await PATCH(request({ undoToken: body.undoToken }));
    expect(undo.status).toBe(200);
    expect(undo.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await undo.json()).toEqual({ count: 2 });
  });

  it("returns a conflict when another request changed the movie", async () => {
    db.transaction.mockRejectedValueOnce({ code: "P2034" });
    expect((await POST(request(input("watched", 1)))).status).toBe(409);
  });

  it("rejects malformed JSON before opening a transaction", async () => {
    const malformed = new NextRequest("http://localhost/api/collection/bulk", { method: "POST", body: "{" });
    expect((await POST(malformed)).status).toBe(400);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("bounds POST bodies by actual bytes even without a Content-Length header", async () => {
    const oversized = request({ category: "watched", movies: [{ tmdbId: 1, title: "A", overview: "a".repeat(2 * 1024 * 1024) }] });
    expect(oversized.headers.has("Content-Length")).toBe(false);
    expect((await POST(oversized)).status).toBe(413);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("uses a smaller body limit for undo requests", async () => {
    expect((await PATCH(request({ undoToken: "a".repeat(64 * 1024) }))).status).toBe(413);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("reports an error instead of success when persistence fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      db.transaction.mockRejectedValueOnce(new Error("Database unavailable"));
      const response = await POST(request(input("watched", 1)));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Could not update collection" });
    } finally {
      log.mockRestore();
    }
  });
});
