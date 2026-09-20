import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { candidate } from "@/lib/__tests__/fixtures/recommendations";
import { inferRecommendationIntent } from "@/lib/recommend-intent";

const mocks = vi.hoisted(() => ({
  count: 0,
  userId: null as string | null,
  lock: vi.fn(),
  upsert: vi.fn(),
  ai: vi.fn(),
  search: vi.fn(),
  profile: vi.fn(),
  reference: vi.fn(),
  watchlist: vi.fn(),
  prepareWatchlist: vi.fn(),
  watchlistCount: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => ({ success: true }) }));
vi.mock("@/lib/recommend-ai", () => ({ interpretRecommendation: mocks.ai }));
vi.mock("@/lib/recommend-search", () => ({ findRecommendationCandidates: mocks.search }));
vi.mock("@/lib/recommend-profile", () => ({ getRecommendationProfile: mocks.profile }));
vi.mock("@/lib/recommend-reference", () => ({ getRecommendationReference: mocks.reference }));
vi.mock("@/lib/recommend-watchlist", () => ({ getRecommendationWatchlist: mocks.watchlist, prepareWatchlistCatalog: mocks.prepareWatchlist }));
vi.mock("@/lib/recommend-relevance", () => ({ reviewRecommendationRelevance: async () => ({ scores: null, source: "local" }) }));
vi.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: mocks.lock,
    dailyUsage: {
      findUnique: vi.fn(async () => ({ count: mocks.count })),
      upsert: mocks.upsert,
    },
    savedMovie: { findMany: vi.fn(async () => []), count: mocks.watchlistCount },
  };
  let queue = Promise.resolve();
  return { prisma: { ...tx, $transaction: async (fn: (client: typeof tx) => unknown) => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await fn(tx); } finally { release(); }
  } } };
});
import { GET, POST } from "@/app/api/recommend/route";

const valid = { genres: ["Drama"], yearFrom: 1990, yearTo: 2026, popularity: "popular", locale: "en", freeformText: "", exclude: [] };
const movie = candidate();
const request = (body: unknown) => new NextRequest("http://localhost/api/recommend", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count = 0;
  mocks.userId = null;
  mocks.upsert.mockImplementation(async () => ({ count: ++mocks.count }));
  mocks.search.mockResolvedValue({ movies: [movie], matching: "semantic" });
  mocks.profile.mockResolvedValue({ signals: [], excludedIds: [] });
  mocks.reference.mockResolvedValue(null);
  mocks.watchlist.mockResolvedValue([1, 2]);
  mocks.prepareWatchlist.mockResolvedValue(0);
  mocks.watchlistCount.mockResolvedValue(2);
  mocks.ai.mockImplementation(async (text: string) => inferRecommendationIntent(text));
});

describe("watchlist-only recommendations", () => {
  it("requires authentication before looking up a list or spending quota", async () => {
    const response = await POST(request({ ...valid, source: "watchlist", userId: "someone-else", includeIds: [1] }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "watchlist_login_required" });
    expect(mocks.watchlist).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(mocks.count).toBe(0);
  });
  it("does not charge an empty list", async () => {
    mocks.userId = "viewer";
    mocks.watchlist.mockResolvedValue([]);
    const response = await POST(request({ ...valid, source: "watchlist" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "watchlist_empty" });
    expect(mocks.count).toBe(0);
    expect(mocks.prepareWatchlist).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("uses the authenticated owner's IDs, ignores supplied scope and rechecks every result", async () => {
    mocks.userId = "viewer";
    mocks.search.mockResolvedValue({ movies: [candidate(1), candidate(999)], matching: "filters" });
    const response = await POST(request({ ...valid, source: "watchlist", userId: "victim", includeIds: [999], watchlistIds: [999] }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.watchlist).toHaveBeenCalledWith("viewer");
    expect(mocks.prepareWatchlist).toHaveBeenCalledWith([1, 2], { budgetKey: "viewer" });
    expect(mocks.search.mock.calls[0][0].filters.includeIds).toEqual([1, 2]);
    expect(data.recommendations.map((r: { movie: { id: number } }) => r.movie.id)).toEqual([1]);
    expect(data.meta.source).toBe("watchlist");
  });
  it("never fills an exhausted watchlist with unrelated catalog movies", async () => {
    mocks.userId = "viewer";
    mocks.search.mockResolvedValue({ movies: [candidate(999)], matching: "filters" });
    const response = await POST(request({ ...valid, source: "watchlist", exclude: [1, 2] }));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "watchlist_no_results", remaining: 19 });
  });
  it("reports incomplete metadata without silently expanding the source", async () => {
    mocks.userId = "viewer";
    mocks.prepareWatchlist.mockResolvedValue(1);
    const response = await POST(request({ ...valid, source: "watchlist" }));
    expect(await response.json()).toMatchObject({ meta: { watchlistUnavailable: 1, source: "watchlist" } });
  });
  it("allows a watchlist pick without requiring a mood or genre", async () => {
    mocks.userId = "viewer";
    expect((await POST(request({ ...valid, genres: [], source: "watchlist" }))).status).toBe(200);
  });
  it("loads only the authenticated watchlist count and does not charge a read", async () => {
    mocks.userId = "viewer";
    const response = await GET(new NextRequest("http://localhost/api/recommend?userId=victim"));
    expect(await response.json()).toMatchObject({ watchlistCount: 2, remaining: 20 });
    expect(mocks.watchlistCount).toHaveBeenCalledWith({ where: { userId: "viewer", category: "watchlist" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.count).toBe(0);
  });
  it("does not read any watchlist for an anonymous quota check", async () => {
    const response = await GET(new NextRequest("http://localhost/api/recommend"));
    expect(await response.json()).toMatchObject({ watchlistCount: null });
    expect(mocks.watchlistCount).not.toHaveBeenCalled();
  });
});

describe("recommendation security boundary", () => {
  it("reserves the only anonymous slot before concurrent provider calls", async () => {
    const responses = await Promise.all([POST(request(valid)), POST(request(valid))]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 429]);
    expect(mocks.count).toBe(1);
    expect(mocks.search).toHaveBeenCalledTimes(1);
    expect(mocks.lock).toHaveBeenCalled();
  });
  it("charges empty results and never starts AI after the quota is exhausted", async () => {
    mocks.search.mockResolvedValue({ movies: [], matching: "semantic" });
    const empty = await POST(request({ ...valid, locale: "pl", freeformText: "romans" }));
    expect(empty.status).toBe(404);
    expect(await empty.json()).toMatchObject({ error: "no_results", remaining: 0, limit: 1 });
    const next = await POST(request(valid));
    expect(next.status).toBe(429);
    expect(mocks.count).toBe(1);
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });
  it("keeps the reservation on an upstream failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.search.mockRejectedValue(new Error("upstream"));
    const response = await POST(request(valid));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ remaining: 0, limit: 1 });
    expect(mocks.count).toBe(1);
    vi.restoreAllMocks();
  });
  it.each([
    null, [], "text", { ...valid, genres: "Drama" }, { ...valid, genres: ["Drama", "Drama"] },
    { ...valid, popularity: "x".repeat(10000) }, { ...valid, popularity: "__proto__" },
    { ...valid, genres: ["not a genre"] }, { ...valid, freeformText: 42 },
    { ...valid, freeformText: "x".repeat(401) }, { ...valid, yearFrom: 2026, yearTo: 1920 },
    { ...valid, yearTo: "2026" }, { ...valid, exclude: [1, 1] }, { ...valid, exclude: [-1] },
    { ...valid, exclude: Array.from({ length: 1001 }, (_, n) => n + 1) }, { ...valid, locale: "xx" },
  ])("rejects malformed preferences before DB/provider work %#", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(mocks.count).toBe(0);
    expect(mocks.lock).not.toHaveBeenCalled();
    expect(mocks.search).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("limits actual bytes even with missing or false Content-Length", async () => {
    const response = await POST(new NextRequest("http://localhost/api/recommend", {
      method: "POST", body: JSON.stringify({ ...valid, padding: "x".repeat(20000) }),
      headers: { "Content-Length": "1" },
    }));
    expect(response.status).toBe(413);
    expect(mocks.count).toBe(0);
  });
  it("preserves valid genres, freeform-only PL and output bounds", async () => {
    mocks.userId = "user-test";
    for (const body of [valid, { ...valid, genres: [], locale: "pl", freeformText: "x".repeat(400) }]) {
      const response = await POST(request(body));
      expect(response.status).toBe(200);
      expect((await response.json()).recommendations).toHaveLength(1);
    }
    expect(mocks.count).toBe(2);
    for (const [text] of mocks.ai.mock.calls) expect(text.length).toBeLessThanOrEqual(400);
  });
  it("never sends catalog descriptions or history to the interpretation model", async () => {
    mocks.search.mockResolvedValue({ movies: [candidate(1, { overview: "x".repeat(6000) })], matching: "semantic" });
    const response = await POST(request({ ...valid, freeformText: "moving drama" }));
    expect(response.status).toBe(200);
    expect(mocks.ai).toHaveBeenCalledWith("moving drama");
    expect((await response.json()).recommendations[0].justification).not.toContain("x".repeat(100));
  });
  it("does not request descriptive retrieval when only explicit filters were supplied", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(mocks.search).toHaveBeenCalledWith(expect.objectContaining({ queryText: "", filters: expect.objectContaining({ genres: ["Drama"] }) }));
  });
  it("exposes degraded/partial matching without silently dropping constraints", async () => {
    mocks.search.mockResolvedValue({ movies: [movie, candidate(2, { genres: ["Horror"] })], matching: "filters" });
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ recommendations: [{ movie: { id: 1 } }], meta: { matching: "filters", partial: true } });
  });
  it("does not return previously displayed movies or refill an exhausted pool", async () => {
    const response = await POST(request({ ...valid, exclude: [1] }));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "pool_exhausted" });
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });
  it("rejects a selected genre contradicted by the description before spending quota", async () => {
    const response = await POST(request({ ...valid, genres: ["Horror"], freeformText: "bez horroru" }));
    expect(response.status).toBe(400);
    expect(mocks.count).toBe(0);
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("does not fabricate an unavailable reference film", async () => {
    const response = await POST(request({ ...valid, referenceMovieId: 123 }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "reference_unavailable", remaining: 0 });
    expect(mocks.search).not.toHaveBeenCalled();
  });
});
