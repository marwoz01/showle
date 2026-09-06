import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ tx: vi.fn(), raw: vi.fn(), query: vi.fn(), limit: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "owner" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: db.tx } }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: db.limit }));
import { PUT } from "@/app/api/collection/rankings/[id]/items/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/collection/rankings/mine/items", { method: "PUT", body: JSON.stringify(body) });
const context = { params: Promise.resolve({ id: "mine" }) };
beforeEach(() => {
  vi.clearAllMocks();
  db.limit.mockReturnValue({ success: true });
  db.query.mockResolvedValue([{ ordinal: 1, total: 1001 }]);
  const tx = { $executeRaw: db.raw, $queryRaw: db.query,
    rankedList: { findUnique: async () => ({ id: "mine", userId: "owner" }) },
    rankedListItem: { findMany: async () => [] },
  };
  db.tx.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
});
describe("atomic ranking move API", () => {
  it("accepts a 1001-position drag as one transaction and charges the full budget", async () => {
    const response = await PUT(request({ move: { id: "owned", position: 1001 } }), context);
    expect(response.status).toBe(200);
    expect(db.tx).toHaveBeenCalledTimes(1);
    expect(db.raw).toHaveBeenCalledTimes(2); // Lock and one UPDATE, never partial batches.
    expect(db.limit).toHaveBeenCalledWith("ranking-operations:owner", { limit: 1000, windowMs: 60000, cost: 1000 });
    expect(db.raw.mock.calls[1].at(-1)).toBe("mine");
  });
  it("does not write any positions if the operation budget is exhausted", async () => {
    db.limit.mockImplementation((key: string) => ({ success: !key.startsWith("ranking-operations:") }));
    expect((await PUT(request({ move: { id: "owned", position: 1001 } }), context)).status).toBe(429);
    expect(db.raw).toHaveBeenCalledTimes(1);
  });
  it("rejects a foreign ID scoped out by the lookup without any update", async () => {
    db.query.mockResolvedValue([]);
    expect((await PUT(request({ move: { id: "foreign", position: 1 } }), context)).status).toBe(404);
    expect(db.query.mock.calls[0].slice(1)).toEqual(["mine", "foreign"]);
    expect(db.raw).toHaveBeenCalledTimes(1);
  });
  it("rejects targets beyond the actual list length", async () => {
    expect((await PUT(request({ move: { id: "owned", position: 1002 } }), context)).status).toBe(400);
    expect(db.raw).toHaveBeenCalledTimes(1);
  });
  it.each([
    null, [], {}, { id: "owned", position: 0 }, { id: "owned", position: -1 },
    { id: "owned", position: 1.5 }, { id: "owned", position: "1" },
    { id: "owned", position: 2147483648 }, { id: "x' OR true;--", position: 1 },
  ])("rejects malformed move payloads before a transaction %#", async (move) => {
    expect((await PUT(request({ move }), context)).status).toBe(400);
    expect(db.tx).not.toHaveBeenCalled();
  });
  it("rejects ambiguous move-plus-items input", async () => {
    expect((await PUT(request({ move: { id: "owned", position: 1 }, items: [{ id: "other", position: 2 }] }), context)).status).toBe(400);
    expect(db.tx).not.toHaveBeenCalled();
  });
});
