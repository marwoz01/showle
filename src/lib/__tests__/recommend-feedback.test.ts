import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ userId: "viewer" as string | null, allowed: true, upsert: vi.fn(), remove: vi.fn(), movie: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: mocks.allowed }) }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  recommendationFeedback: { upsert: mocks.upsert, deleteMany: mocks.remove },
  recommendationMovie: { findUnique: mocks.movie },
} }));
import { POST } from "@/app/api/recommend/feedback/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/recommend/feedback", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.userId = "viewer"; mocks.allowed = true; mocks.movie.mockResolvedValue({ tmdbId: 1 }); });
describe("recommendation feedback ownership", () => {
  it("requires authentication", async () => {
    mocks.userId = null;
    expect((await POST(request({ tmdbId: 1, reaction: "more" }))).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("always derives ownership from the verified session", async () => {
    const response = await POST(request({ tmdbId: 1, reaction: "more", userId: "victim" }));
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { userId_tmdbId: { userId: "viewer", tmdbId: 1 } },
      create: { userId: "viewer", tmdbId: 1, reaction: "more" }, update: { reaction: "more" },
    });
  });
  it("undo only deletes the current viewer's reaction", async () => {
    expect((await POST(request({ tmdbId: 1, reaction: null }))).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith({ where: { userId: "viewer", tmdbId: 1 } });
  });
  it.each([{}, [], { tmdbId: -1, reaction: "more" }, { tmdbId: 1, reaction: "other" }, { tmdbId: 1, reaction: {} }])("rejects invalid feedback %#", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("does not store fabricated catalog IDs", async () => {
    mocks.movie.mockResolvedValue(null);
    expect((await POST(request({ tmdbId: 1, reaction: "more" }))).status).toBe(404);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("limits body size and request rate before writes", async () => {
    expect((await POST(request({ padding: "x".repeat(2000) }))).status).toBe(413);
    mocks.allowed = false;
    expect((await POST(request({ tmdbId: 1, reaction: "more" }))).status).toBe(429);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
