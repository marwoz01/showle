import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({
  userId: "owner" as string | null,
  rows: [] as { id: string; listId: string; tmdbId: number; position: number }[],
  transaction: vi.fn(), raw: vi.fn(), create: vi.fn(), find: vi.fn(), limit: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: db.userId }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: db.limit }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: db.transaction } }));
import { POST, PUT } from "@/app/api/collection/rankings/[id]/items/route";

const context = (id = "mine") => ({ params: Promise.resolve({ id }) });
const request = (body: unknown) => new NextRequest("http://localhost/api/collection/rankings/mine/items", {
  method: "POST", body: JSON.stringify(body),
});
const movie = (tmdbId = 10) => ({ tmdbId, title: "Film", year: 2020, genres: ["Drama"] });
const tx = {
  $executeRaw: db.raw,
  rankedList: { findUnique: async ({ where }: { where: { id: string } }) =>
    ["mine", "own2", "other"].includes(where.id) ? { id: where.id, userId: where.id === "other" ? "victim" : "owner" } : null },
  rankedListItem: { findMany: db.find, create: db.create },
};
beforeEach(() => {
  vi.clearAllMocks();
  db.userId = "owner";
  db.rows = [
    { id: "owned", listId: "mine", tmdbId: 1, position: 1 },
    { id: "foreign", listId: "other", tmdbId: 2, position: 1 },
    { id: "own-other", listId: "own2", tmdbId: 3, position: 1 },
  ];
  db.limit.mockReturnValue({ success: true });
  db.find.mockImplementation(async ({ where, orderBy }: { where: { listId: string; id?: { in: string[] } }; orderBy?: { position: string } }) => {
    const rows = db.rows.filter((row) => row.listId === where.listId && (!where.id || where.id.in.includes(row.id)));
    return rows.sort((a, b) => orderBy?.position === "desc" ? b.position - a.position : a.position - b.position);
  });
  db.create.mockImplementation(async ({ data }: { data: Omit<typeof db.rows[number], "id"> }) => {
    const row = { ...data, id: `created-${data.tmdbId}` };
    db.rows.push(row);
    return row;
  });
  db.raw.mockImplementation(async (query: TemplateStringsArray | Prisma.Sql) => {
    if (Array.isArray(query)) return 1; // Advisory lock, modeled by the queue below.
    const sql = query as Prisma.Sql;
    expect(sql.sql).toContain('item."listId" = ?');
    const listId = sql.values.at(-1);
    let count = 0;
    for (let i = 0; i < sql.values.length - 1; i += 2) {
      const row = db.rows.find((item) => item.id === sql.values[i] && item.listId === listId);
      if (row) { row.position = sql.values[i + 1] as number; count++; }
    }
    return count;
  });
  let queue = Promise.resolve();
  db.transaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const before = structuredClone(db.rows);
    try { return await fn(tx); } catch (error) { db.rows = before; throw error; } finally { release(); }
  });
});

describe("ranking authorization and bounded writes", () => {
  it.each(["foreign", "own-other", "missing"])("rejects a mixed reorder containing %s before any write", async (id) => {
    const before = structuredClone(db.rows);
    const res = await PUT(request({ items: [{ id: "owned", position: 2 }, { id, position: 1 }] }), context());
    expect(res.status).toBe(404);
    expect(db.rows).toEqual(before);
    expect(db.raw).toHaveBeenCalledTimes(1); // Lock only, no UPDATE.
  });
  it("checks the parent owner inside both write transactions", async () => {
    for (const res of [await POST(request(movie()), context("other")),
      await PUT(request({ items: [{ id: "foreign", position: 2 }] }), context("other"))]) expect(res.status).toBe(404);
    expect(db.create).not.toHaveBeenCalled();
    expect(db.find).not.toHaveBeenCalled();
  });
  it("updates only owned items with a bounded, parameterized SQL mutation", async () => {
    const res = await PUT(request({ items: [{ id: "owned", position: 501 }] }), context());
    expect(res.status).toBe(200); // Legacy lists larger than 500 remain editable.
    expect(db.rows.find((r) => r.id === "owned")?.position).toBe(501);
    expect(db.rows.find((r) => r.id === "foreign")?.position).toBe(1);
    const query = db.raw.mock.calls[1][0] as Prisma.Sql;
    expect(query.values).toEqual(["owned", 501, "mine"]);
    expect(query.sql).not.toContain("owned");
    expect(db.limit).toHaveBeenCalledWith("ranking-operations:owner", expect.objectContaining({ cost: 1 }));
  });
  it("accepts the maximum reorder batch in one scoped write", async () => {
    db.rows = Array.from({ length: 500 }, (_, i) => ({ id: `item-${i}`, listId: "mine", tmdbId: i + 1, position: i + 1 }));
    const res = await PUT(request({ items: db.rows.map((r) => ({ id: r.id, position: 501 - r.position })) }), context());
    expect(res.status).toBe(200);
    expect(db.raw).toHaveBeenCalledTimes(2);
    expect(db.rows[0].position).toBe(500);
    expect(db.limit).toHaveBeenCalledWith("ranking-operations:owner", expect.objectContaining({ cost: 500 }));
  });
  it("accepts single/batch additions and skips movies already in the list", async () => {
    const single = await POST(request(movie()), context());
    expect(single.status).toBe(201);
    const repeated = await POST(request({ items: [movie(10), movie(11)] }), context());
    expect(await repeated.json()).toMatchObject({ added: 1, skipped: 1 });
    expect(db.rows.filter((r) => r.listId === "mine").map((r) => r.position)).toEqual([1, 2, 3]);
  });
  it("accepts 50 additions but rejects concurrent attempts to exceed 500 items", async () => {
    const batch = await POST(request({ items: Array.from({ length: 50 }, (_, i) => movie(i + 10)) }), context());
    expect(batch.status).toBe(201);
    db.rows = Array.from({ length: 499 }, (_, i) => ({ id: `item-${i}`, listId: "mine", tmdbId: i + 1, position: i + 1 }));
    const res = await Promise.all([POST(request(movie(500)), context()), POST(request(movie(501)), context())]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(db.rows).toHaveLength(500);
  });
  it.each([
    null, [], {}, { items: [] }, { items: Array.from({ length: 51 }, (_, i) => movie(i + 1)) },
    { items: [movie(), movie()] }, { ...movie(), tmdbId: -1 }, { ...movie(), tmdbId: 1.1 },
    { ...movie(), title: " " }, { ...movie(), title: "x".repeat(501) }, { ...movie(), overview: "x".repeat(10001) },
    { ...movie(), genres: [null] }, { ...movie(), year: "2020" },
  ])("rejects malformed or oversized additions before the DB %#", async (body) => {
    expect((await POST(request(body), context())).status).toBe(400);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each([
    null, {}, { items: [] }, { items: Array.from({ length: 501 }, (_, i) => ({ id: `x-${i}`, position: i + 1 })) },
    { items: [{ id: "owned", position: 0 }] }, { items: [{ id: "owned", position: 1.5 }] },
    { items: [{ id: "owned", position: 2147483648 }] },
    { items: [{ id: "owned", position: 1 }, { id: "owned", position: 2 }] },
    { items: [{ id: "owned", position: 1 }, { id: "foreign", position: 1 }] },
    { items: [{ id: "x'; DROP TABLE x;--", position: 1 }] },
  ])("rejects malformed or oversized reorders before the DB %#", async (body) => {
    expect((await PUT(request(body), context())).status).toBe(400);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated, oversized and rate-limited requests without DB work", async () => {
    db.userId = null;
    expect((await POST(request(movie()), context())).status).toBe(401);
    db.userId = "owner";
    expect((await POST(request({ padding: "x".repeat(524289) }), context())).status).toBe(413);
    db.limit.mockImplementation((key: string) => ({ success: !key.startsWith("ranking-operations:") }));
    expect((await POST(request(movie()), context())).status).toBe(429);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
