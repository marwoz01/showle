import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  count: 0,
  userId: null as string | null,
  lock: vi.fn(),
  upsert: vi.fn(),
  ai: vi.fn(),
  search: vi.fn(),
  fallback: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: true }) }));
vi.mock("@/lib/gemini", () => ({ getOpenRouter: () => ({ chat: { completions: { create: mocks.ai } } }) }));
vi.mock("@/lib/embeddings", () => ({
  findSimilarMovies: mocks.search, findMoviesByFilters: mocks.fallback,
  buildQueryText: () => "Drama", inferGenresFromText: () => [],
}));
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
const movie = { tmdbId: 1, title: "Film", year: 2020, genres: ["Drama"], overview: "Plot", country: "PL", director: "Director", leadActor: "Actor", runtime: 100, budget: 1, voteCount: 100, rating: 7, posterPath: "/poster.jpg", cast: [] };
const request = (body: unknown) => new NextRequest("http://localhost/api/recommend", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count = 0;
  mocks.userId = null;
  mocks.upsert.mockImplementation(async () => ({ count: ++mocks.count }));
  mocks.search.mockResolvedValue([movie]);
  mocks.fallback.mockResolvedValue([movie]);
  mocks.ai.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ justifications: ["Good match"] }) } }] });
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
    mocks.search.mockResolvedValue([]);
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
    mocks.fallback.mockRejectedValue(new Error("upstream"));
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
    for (const [args] of mocks.ai.mock.calls) expect(args.max_tokens).toBeGreaterThan(0);
  });
  it("never submits an oversized combined justification prompt", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.search.mockResolvedValue([{ ...movie, title: "x".repeat(6000) }]);
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect((await response.json()).recommendations[0].justification).toBe(movie.overview);
    expect(mocks.ai).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it("keeps valid recommendations when embeddings or malformed justifications need fallback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.search.mockRejectedValue(new Error("embedding"));
    mocks.ai.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ justifications: [42] }) } }] });
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(mocks.fallback).toHaveBeenCalledTimes(1);
    expect((await response.json()).recommendations[0].justification).toBe(movie.overview);
    expect(mocks.count).toBe(1);
    vi.restoreAllMocks();
  });
});
