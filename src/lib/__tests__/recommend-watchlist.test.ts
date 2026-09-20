import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ saved: vi.fn(), catalog: vi.fn(), upsert: vi.fn(), metadata: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  savedMovie: { findMany: mocks.saved }, recommendationMovie: { findMany: mocks.catalog, upsert: mocks.upsert },
} }));
vi.mock("@/lib/recommend-catalog-metadata", () => ({ fetchCatalogMetadata: mocks.metadata }));
import { getRecommendationWatchlist, prepareWatchlistCatalog } from "@/lib/recommend-watchlist";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.saved.mockResolvedValue([]);
  mocks.catalog.mockResolvedValue([]);
  mocks.upsert.mockResolvedValue({});
  mocks.metadata.mockImplementation(async (id: number) => ({ tmdbId: id, title: "Canonical movie" }));
  mocks.limit.mockResolvedValue({ success: true });
});

describe("watchlist scope and cold metadata", () => {
  it("loads only IDs from the viewer's watchlist, never private reviews or editable metadata", async () => {
    mocks.saved.mockResolvedValue([{ tmdbId: 1 }, { tmdbId: -1 }, { tmdbId: 1 }, { tmdbId: 5 }]);
    expect(await getRecommendationWatchlist("viewer")).toEqual([1, 5]);
    expect(mocks.saved).toHaveBeenCalledWith({ where: { userId: "viewer", category: "watchlist" }, select: { tmdbId: true }, orderBy: { createdAt: "desc" } });
  });
  it("keeps indexed lists local and performs no unnecessary TMDB imports", async () => {
    mocks.catalog.mockResolvedValue([{ tmdbId: 1 }, { tmdbId: 2 }]);
    expect(await prepareWatchlistCatalog([1, 2])).toBe(0);
    expect(mocks.metadata).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("imports missing canonical facts without overwriting another catalog writer", async () => {
    mocks.catalog.mockResolvedValue([{ tmdbId: 1 }]);
    expect(await prepareWatchlistCatalog([1, 2])).toBe(0);
    expect(mocks.metadata).toHaveBeenCalledWith(2, expect.any(AbortSignal));
    expect(mocks.upsert).toHaveBeenCalledWith({ where: { tmdbId: 2 }, create: { tmdbId: 2, title: "Canonical movie" }, update: {} });
  });
  it("reports unavailable films and leaves existing catalog entries usable", async () => {
    mocks.catalog.mockResolvedValue([{ tmdbId: 1 }]);
    mocks.metadata.mockResolvedValue(null);
    expect(await prepareWatchlistCatalog([1, 2])).toBe(1);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("bounds a large cold list to twelve imports and three concurrent requests", async () => {
    let active = 0;
    let peak = 0;
    mocks.metadata.mockImplementation(async (id: number) => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return { tmdbId: id, title: "Canonical movie" };
    });
    expect(await prepareWatchlistCatalog(Array.from({ length: 30 }, (_, i) => i + 1))).toBe(18);
    expect(mocks.metadata).toHaveBeenCalledTimes(12);
    expect(peak).toBeLessThanOrEqual(3);
  });
  it("does not turn a failed write into a successful import", async () => {
    mocks.upsert.mockRejectedValue(new Error("database"));
    expect(await prepareWatchlistCatalog([1])).toBe(1);
    expect(await prepareWatchlistCatalog([])).toBe(0);
  });
  it("charges only missing metadata and caps the global batch cost", async () => {
    mocks.catalog.mockResolvedValue([{ tmdbId: 1 }]);
    await prepareWatchlistCatalog([1, 2, 3], { budgetKey: "user_owner" });
    expect(mocks.limit.mock.calls).toEqual([
      ["catalog-import:user_owner", { limit: 12, windowMs: 300000, cost: 2 }],
      ["catalog-import:global", { limit: 120, windowMs: 60000, cost: 2 }],
    ]);
  });
  it.each([false, true])("does not call TMDB when personal storage is unavailable or exhausted (%s)", async (unavailable) => {
    mocks.limit.mockResolvedValue({ success: false, unavailable });
    expect(await prepareWatchlistCatalog([1, 2], { budgetKey: "user_owner" })).toBe(2);
    expect(mocks.metadata).not.toHaveBeenCalled(); expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.limit).toHaveBeenCalledTimes(1);
  });
  it("honors the shared global budget before making provider requests", async () => {
    mocks.limit.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
    expect(await prepareWatchlistCatalog([1], { budgetKey: "user_owner" })).toBe(1);
    expect(mocks.metadata).not.toHaveBeenCalled();
  });
});
