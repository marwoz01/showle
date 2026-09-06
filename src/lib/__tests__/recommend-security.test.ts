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
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: true }) }));
vi.mock("@/lib/recommend-ai", () => ({ interpretRecommendation: mocks.ai }));
vi.mock("@/lib/recommend-search", () => ({ findRecommendationCandidates: mocks.search }));
vi.mock("@/lib/recommend-profile", () => ({ getRecommendationProfile: mocks.profile }));
vi.mock("@/lib/recommend-reference", () => ({ getRecommendationReference: mocks.reference }));
vi.mock("@/lib/recommend-relevance", () => ({ reviewRecommendationRelevance: async () => ({ scores: null, source: "local" }) }));
vi.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: mocks.lock,
    dailyUsage: {
      findUnique: vi.fn(async () => ({ count: mocks.count })),
      upsert: mocks.upsert,
    },
    savedMovie: { findMany: vi.fn(async () => []) },
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
import { POST } from "@/app/api/recommend/route";

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
  mocks.ai.mockImplementation(async (text: string) => inferRecommendationIntent(text));
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
