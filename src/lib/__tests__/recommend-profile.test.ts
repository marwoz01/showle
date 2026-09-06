import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ saved: vi.fn(), feedback: vi.fn(), catalog: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  savedMovie: { findMany: mocks.saved }, recommendationFeedback: { findMany: mocks.feedback }, recommendationMovie: { findMany: mocks.catalog },
} }));
import { getRecommendationProfile } from "@/lib/recommend-profile";
import { preferences } from "@/lib/__tests__/fixtures/recommendations";
beforeEach(() => { vi.clearAllMocks(); mocks.saved.mockResolvedValue([]); mocks.feedback.mockResolvedValue([]); mocks.catalog.mockResolvedValue([]); });
describe("private recommendation profile", () => {
  it("does not read account history for guests", async () => {
    expect(await getRecommendationProfile(null, preferences)).toEqual({ signals: [], excludedIds: [] });
    expect(mocks.saved).not.toHaveBeenCalled();
    expect(mocks.feedback).not.toHaveBeenCalled();
  });
  it("reads only the authenticated viewer and weights high/low ratings", async () => {
    mocks.saved.mockResolvedValueOnce([{ tmdbId: 4 }]).mockResolvedValueOnce([
      { rating: 10, genres: ["Drama"], director: "Liked" },
      { rating: 1, genres: ["Horror"], director: "Disliked" },
      { rating: 5, genres: ["Comedy"], director: "Neutral" },
    ]);
    const result = await getRecommendationProfile("viewer", preferences);
    expect(result.excludedIds).toEqual([4]);
    expect(result.signals.map((signal) => signal.weight)).toEqual([1, -1]);
    for (const [query] of mocks.saved.mock.calls) expect(query.where.userId).toBe("viewer");
    expect(mocks.feedback).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "viewer" }, take: 100 }));
  });
  it("resolves feedback metadata from the catalog, not client-provided facts", async () => {
    mocks.catalog.mockResolvedValue([{ tmdbId: 2, genres: ["Drama"], director: "Known" }]);
    const result = await getRecommendationProfile(null, { ...preferences, positiveIds: [2, 9999] });
    expect(result.signals).toEqual([{ genres: ["Drama"], director: "Known", weight: 1 }]);
    expect(result.excludedIds).toEqual([2]);
  });
});
