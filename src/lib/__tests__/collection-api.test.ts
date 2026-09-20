import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(),
  upsert: vi.fn(), update: vi.fn(), remove: vi.fn(), lock: vi.fn(), limit: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
vi.mock("@/lib/prisma", () => {
  const tx = { savedMovie: { findMany: mocks.findMany, count: mocks.count, findUnique: mocks.findUnique, findFirst: mocks.findFirst,
    upsert: mocks.upsert, update: mocks.update, deleteMany: mocks.remove }, $executeRaw: mocks.lock };
  return { prisma: { ...tx, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } };
});
import { GET, POST } from "@/app/api/collection/route";
import { PATCH, DELETE } from "@/app/api/collection/[id]/route";
import { GET as statuses } from "@/app/api/collection/status/route";
function request(path: string, body?: unknown, method = "POST") {
  return new NextRequest(`http://localhost/api/collection${path}`, body === undefined ? undefined : { method, body: JSON.stringify(body) });
}
const movie = { tmdbId: 42, title: "Film", category: "watched" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId: "user_owner" });
  mocks.limit.mockReturnValue({ success: true });
  mocks.findMany.mockResolvedValue([]); mocks.count.mockResolvedValue(0); mocks.findUnique.mockResolvedValue(null);
  mocks.upsert.mockResolvedValue({ id: "saved", ...movie }); mocks.update.mockResolvedValue({ id: "saved", ...movie });
  mocks.remove.mockResolvedValue({ count: 0 });
});
describe("collection routes", () => {
  it("rejects unauthenticated reads and writes before database work", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await GET(request(""))).status).toBe(401);
    expect((await POST(request("", movie))).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled(); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("looks up an older saved film by IDs and owner, without a first-page limit", async () => {
    mocks.findMany.mockResolvedValue([{ tmdbId: 999, category: "watched" }]);
    const response = await statuses(request("/status?ids=42,999"));
    expect(await response.json()).toEqual({ items: [{ tmdbId: 999, category: "watched" }] });
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { userId: "user_owner", tmdbId: { in: [42, 999] } }, select: { tmdbId: true, category: true } });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("returns 400 for malformed pagination, JSON and nonnumeric ratings", async () => {
    expect((await GET(request("?page=NaN"))).status).toBe(400);
    expect((await POST(new NextRequest("http://localhost/api/collection", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await PATCH(request("/saved", { rating: "8" }, "PATCH"), { params: Promise.resolve({ id: "saved" }) })).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("counts actual request bytes even with an incorrect Content-Length", async () => {
    const response = await POST(new NextRequest("http://localhost/api/collection", {
      method: "POST", headers: { "Content-Length": "1" }, body: JSON.stringify({ ...movie, review: "x".repeat(20000) }),
    }));
    expect(response.status).toBe(413); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("preserves existing watched dates and reviews when saving an existing film", async () => {
    const watchedAt = new Date("2026-01-01");
    mocks.findUnique.mockResolvedValue({ watchedAt });
    expect((await POST(request("", movie))).status).toBe(201);
    expect(mocks.upsert.mock.calls[0][0].update).toEqual({ category: "watched", rating: undefined, review: undefined, watchedAt });
    expect(mocks.lock).toHaveBeenCalledOnce();
  });
  it("rejects another owner's update and scopes deletion to the current account", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await PATCH(request("/foreign", { review: "text" }, "PATCH"), { params: Promise.resolve({ id: "foreign" }) })).status).toBe(404);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "user_owner" } });
    expect(mocks.update).not.toHaveBeenCalled();
    expect((await DELETE(request("/foreign"), { params: Promise.resolve({ id: "foreign" }) })).status).toBe(404);
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "foreign", userId: "user_owner" } });
  });
  it("limits deletes as well as writes", async () => {
    mocks.limit.mockReturnValue({ success: false });
    expect((await DELETE(request("/saved"), { params: Promise.resolve({ id: "saved" }) })).status).toBe(429);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not claim success after a database failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.upsert.mockRejectedValue(new Error("offline"));
    expect((await POST(request("", movie))).status).toBe(503);
    log.mockRestore();
  });
});
