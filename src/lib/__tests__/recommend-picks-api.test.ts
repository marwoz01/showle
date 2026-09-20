import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), settings: vi.fn(), save: vi.fn(),
  picks: vi.fn(), reserve: vi.fn(), prepare: vi.fn(), watchlist: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
vi.mock("@/lib/server-error", () => ({ reportServerError: () => "safe-request-id" }));
vi.mock("@/lib/recommend-settings", () => ({ getRecommendationSettings: mocks.settings, saveRecommendationSettings: mocks.save }));
vi.mock("@/lib/recommend-picks", async (original) => ({ ...await original<typeof import("@/lib/recommend-picks")>(), getPersonalPicks: mocks.picks }));
vi.mock("@/lib/recommend-quota", () => ({ reserveRecommendation: mocks.reserve }));
vi.mock("@/lib/recommend-watchlist", () => ({ prepareWatchlistCatalog: mocks.prepare, getRecommendationWatchlist: mocks.watchlist }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { GET, POST } from "@/app/api/recommend/picks/route";
import { GET as getSettings, PUT } from "@/app/api/recommend/preferences/route";
const saved = { favoriteIds: [42], providerIds: [8], onboarded: true };
const request = (body?: unknown, method = "POST") => new NextRequest("http://localhost/api/recommend/picks?locale=pl", body === undefined ? undefined : { method, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "owner" }); mocks.limit.mockResolvedValue({ success: true });
  mocks.settings.mockResolvedValue(saved); mocks.save.mockImplementation((_, value) => value);
  mocks.picks.mockResolvedValue({ recommendations: [], meta: { mode: "personal", partial: true } });
  mocks.reserve.mockResolvedValue(19); mocks.prepare.mockResolvedValue(0); mocks.watchlist.mockResolvedValue([100]);
});

describe("personal recommendation endpoints", () => {
  it("loads settings only for the session owner and never spends AI quota on entry", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.settings).toHaveBeenCalledWith("owner");
    expect(mocks.picks).toHaveBeenCalledWith(expect.objectContaining({ providerIds: [8], locale: "pl" }), "owner", [42], undefined);
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("allows guest taste and runtime filtering without an account or AI charge", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await POST(request({ ...saved, maxRuntime: 90 }))).status).toBe(200);
    expect(mocks.settings).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it("reserves the shared expensive quota before an explicit description", async () => {
    await POST(request({ freeformText: "dramat", userId: "victim" }));
    expect(mocks.reserve).toHaveBeenCalledWith(expect.stringContaining("recommend:owner:"), expect.any(String), 20);
    expect(mocks.picks).toHaveBeenCalledWith(expect.anything(), "owner", [42], undefined);
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.picks.mock.invocationCallOrder[0]);
  });
  it("does not call providers after exhausting the quota", async () => {
    mocks.reserve.mockResolvedValue(null);
    const response = await POST(request({ freeformText: "dramat" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: "daily_limit_reached", remaining: 0 });
    expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.picks).not.toHaveBeenCalled();
  });
  it("denies unavailable limits before reading user records", async () => {
    mocks.limit.mockResolvedValue({ success: false, unavailable: true });
    expect((await GET(request())).status).toBe(503);
    expect(mocks.settings).not.toHaveBeenCalled();
  });
  it("rejects oversized and invalid input before generating picks", async () => {
    expect((await POST(request({ freeformText: "x".repeat(20000) }))).status).toBe(413);
    expect((await POST(request({ providerIds: [999] }))).status).toBe(400);
    expect(mocks.picks).not.toHaveBeenCalled();
  });
  it("requires account ownership for preferences reads and writes", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await getSettings(request())).status).toBe(401);
    expect((await PUT(request(saved, "PUT"))).status).toBe(401);
    expect(mocks.settings).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("writes only bounded fields under authenticated identity", async () => {
    expect((await PUT(request({ ...saved, userId: "victim", title: "untrusted" }, "PUT"))).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("owner", saved);
  });
  it("reports persistence failures instead of claiming settings were saved", async () => {
    mocks.save.mockRejectedValue(new Error("database"));
    expect((await PUT(request(saved, "PUT"))).status).toBe(503);
  });
  it("does not save favorites whose metadata could not be prepared", async () => {
    mocks.prepare.mockResolvedValue(1);
    expect((await PUT(request(saved, "PUT"))).status).toBe(503);
    expect(mocks.save).not.toHaveBeenCalled();
    expect((await POST(request(saved))).status).toBe(503);
    expect(mocks.picks).not.toHaveBeenCalled();
  });
});
