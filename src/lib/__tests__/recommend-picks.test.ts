import { beforeEach, describe, expect, it, vi } from "vitest";
import { candidate, preferences } from "@/lib/__tests__/fixtures/recommendations";
import { inferRecommendationIntent } from "@/lib/recommend-intent";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), search: vi.fn(), interpret: vi.fn(), reference: vi.fn(), relevance: vi.fn() }));
vi.mock("@/lib/recommend-profile", () => ({ getRecommendationProfile: mocks.profile }));
vi.mock("@/lib/recommend-search", () => ({ findRecommendationCandidates: mocks.search }));
vi.mock("@/lib/recommend-ai", () => ({ interpretRecommendation: mocks.interpret }));
vi.mock("@/lib/recommend-reference", () => ({ getRecommendationReference: mocks.reference }));
vi.mock("@/lib/recommend-relevance", () => ({ reviewRecommendationRelevance: mocks.relevance }));
import { getPersonalPicks } from "@/lib/recommend-picks";
import { parsePickRequest } from "@/lib/recommend-picks-input";
import { parseRecommendationSettings, EMPTY_RECOMMENDATION_SETTINGS } from "@/lib/recommend-settings-input";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({ signals: [], excludedIds: [] });
  mocks.search.mockResolvedValue({ movies: [1, 2, 3, 4, 5].map((id) => candidate(id)), matching: "filters" });
  mocks.interpret.mockImplementation((text: string) => inferRecommendationIntent(text));
  mocks.reference.mockResolvedValue(null);
  mocks.relevance.mockResolvedValue({ scores: null, source: "local" });
});

describe("personal picks", () => {
  it("returns at most three catalog picks without any paid interpretation or reference calls", async () => {
    const result = await getPersonalPicks(preferences, "owner", [10]);
    expect(result.recommendations).toHaveLength(3);
    expect(result.meta).toMatchObject({ mode: "personal", personalized: false, partial: false });
    expect(mocks.interpret).not.toHaveBeenCalled();
    expect(mocks.reference).not.toHaveBeenCalled();
    expect(mocks.relevance).not.toHaveBeenCalled();
    expect(mocks.search.mock.calls[0][0].queryText).toBe("");
    expect(mocks.profile).toHaveBeenCalledWith("owner", preferences, [10]);
  });
  it("enforces runtime, providers, watched and negative selections even if retrieval returns invalid candidates", async () => {
    mocks.profile.mockResolvedValue({ signals: [], excludedIds: [1] });
    mocks.search.mockResolvedValue({ matching: "filters", movies: [
      candidate(1, { providerIds: [8], runtime: 80 }), candidate(2, { runtime: 80 }),
      candidate(3, { providerIds: [8], runtime: 100 }), candidate(4, { providerIds: [8], runtime: 80 }),
      candidate(5, { providerIds: [8], runtime: 80 }),
    ] });
    const result = await getPersonalPicks({ ...preferences, providerIds: [8], maxRuntime: 90, negativeIds: [4] }, "owner", []);
    expect(result.recommendations.map((pick) => pick.movie.id)).toEqual([5]);
    expect(result.meta.partial).toBe(true);
  });
  it("keeps an empty result honest instead of relaxing saved platform preferences", async () => {
    const result = await getPersonalPicks({ ...preferences, providerIds: [8] }, null, []);
    expect(result.recommendations).toEqual([]);
  });
  it("uses bounded AI only for an explicit description and passes just that description", async () => {
    const result = await getPersonalPicks({ ...preferences, freeformText: "ciepła komedia" }, "owner", []);
    expect(mocks.interpret).toHaveBeenCalledWith("ciepła komedia");
    expect(mocks.relevance).toHaveBeenCalled();
    expect(result.meta.mode).toBe("search");
  });
});

describe("saved taste validation", () => {
  it.each([null, [], { favoriteIds: [1, 1], providerIds: [], onboarded: true },
    { favoriteIds: [0], providerIds: [], onboarded: true },
    { favoriteIds: [], providerIds: [999999], onboarded: true },
    { favoriteIds: Array.from({ length: 13 }, (_, i) => i + 1), providerIds: [], onboarded: true },
    { favoriteIds: [], providerIds: [], onboarded: "true" }])("rejects invalid saved settings %#", (value) => {
    expect(parseRecommendationSettings(value)).toBeNull();
  });
  it("accepts an intentional skip and restores platforms without requiring a prompt", () => {
    const saved = { favoriteIds: [1], providerIds: [8], onboarded: true };
    expect(parseRecommendationSettings({ favoriteIds: [], providerIds: [], onboarded: true })).not.toBeNull();
    expect(parsePickRequest({ locale: "pl" }, saved)).toMatchObject({ favorites: [1], request: { providerIds: [8], freeformText: "" } });
  });
  it.each([{ maxRuntime: -5 }, { freeformText: "x".repeat(401) }, { positiveIds: [1], negativeIds: [1] },
    { providerIds: [8, 8] }, { favoriteIds: "1" }, { locale: "xx" }, { source: "private" }])("bounds refinements %#", (value) => {
    expect(parsePickRequest(value, EMPTY_RECOMMENDATION_SETTINGS)).toBeNull();
  });
});
