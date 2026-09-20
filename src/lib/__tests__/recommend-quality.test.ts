import { describe, expect, it } from "vitest";
import { inferRecommendationIntent } from "@/lib/recommend-intent";
import { parseRecommendRequest } from "@/lib/recommend-input";
import { resolveRecommendationFilters, satisfiesRecommendationFilters } from "@/lib/recommend-filters";
import { rankRecommendations } from "@/lib/recommend-ranking";
import { explainRecommendation } from "@/lib/recommend-explanations";
import { candidate, filters, preferences } from "@/lib/__tests__/fixtures/recommendations";

describe("fixed bilingual recommendation intent scenarios", () => {
  it.each([
    ["bez horroru", [], ["Horror"]], ["heartwarming story", [], []], ["award winning", [], []],
    ["drama without war", ["Drama"], ["War"]], ["komedia bez horroru", ["Comedy"], ["Horror"]],
    ["no horror or romance but comedy", ["Comedy"], ["Horror", "Romance"]],
    ["not only comedy", ["Comedy"], []], ["nie tylko komedia", ["Comedy"], []],
    ["dokument o przyrodzie", ["Documentary"], []], ["filmy dokumentalne", ["Documentary"], []],
    ["science fiction", ["Science Fiction"], []], ["fantastyka naukowa", ["Science Fiction"], []],
    ["romantic comedy", ["Romance", "Comedy"], []], ["komedia romantyczna", ["Romance", "Comedy"], []],
    ["crime thriller", ["Thriller", "Crime"], []], ["thriller bez wojny", ["Thriller"], ["War"]],
    ["no animation, no horror", [], ["Horror", "Animation"]],
    ["bez komedii i romansów", [], ["Romance", "Comedy"]],
    ["family drama", ["Drama"], []], ["a dark comedy", ["Comedy"], []],
    ["no longer than 90 minutes horror", ["Horror"], []],
    ["film bez przemocy, z romantyczną historią", ["Romance"], []],
    ["adventure with no horror", ["Adventure"], ["Horror"]],
    ["western", ["Western"], []], ["film akcji", ["Action"], []],
    ["animated adventure", ["Animation", "Adventure"], []],
    ["detective mystery", ["Mystery"], []], ["fantasy without romance", ["Fantasy"], ["Romance"]],
  ])("%s", (text, included, excluded) => {
    const intent = inferRecommendationIntent(text as string);
    expect(intent.includedGenres.sort()).toEqual([...included].sort());
    expect(intent.excludedGenres.sort()).toEqual([...excluded].sort());
  });
  it.each([["do 90 minut", 90], ["under 120 minutes", 120], ["maksymalnie 1,5 godziny", 90], ["up to 2 hours", 120], ["do 500 minut", null]])("runtime %s", (text, runtime) => {
    expect(inferRecommendationIntent(text as string).maxRuntime).toBe(runtime);
  });
  it("keeps explicit genres and combines the strictest runtime and all exclusions", () => {
    const resolved = resolveRecommendationFilters({ ...preferences, genres: ["Comedy"], maxRuntime: 120, exclude: [1], negativeIds: [2], positiveIds: [3], referenceMovieId: 4 },
      inferRecommendationIntent("thriller bez horroru do 90 minut"), [5]);
    expect(resolved).toMatchObject({ genres: ["Comedy"], excludedGenres: ["Horror"], maxRuntime: 90, excludeIds: [1, 5, 2, 3, 4] });
  });
});

describe("ranking quality and hard constraints", () => {
  it.each([
    { year: 1980 }, { genres: ["Horror"] }, { runtime: 121 }, { runtime: 0 },
    { voteCount: 999 }, { providerIds: [119] },
  ])("does not relax a hard filter even to fill the list: %j", (patch) => {
    const strict = { ...filters, yearFrom: 1990, genres: ["Drama"], excludedGenres: ["Horror"], maxRuntime: 120, popularity: "popular" as const, providerIds: [8] };
    const good = candidate(1, { providerIds: [8] });
    expect(satisfiesRecommendationFilters(good, strict)).toBe(true);
    expect(rankRecommendations([good, candidate(2, { providerIds: [8], ...patch })], strict, [], null).map((m) => m.tmdbId)).toEqual([1]);
  });
  it("deduplicates and never recycles previously shown films", () => {
    expect(rankRecommendations([candidate(1), candidate(1), candidate(2)], { ...filters, excludeIds: [2] }, [], null)).toHaveLength(1);
  });
  it("diversifies franchise sequels without discarding the best first match", () => {
    const pool = [candidate(1, { collectionId: 10 }), candidate(2, { collectionId: 10 }), candidate(3, { similarity: 0.7 })];
    expect(rankRecommendations(pool, filters, [], null).map((m) => m.tmdbId)).toEqual([1, 3, 2]);
  });
  it("uses positive and negative taste without overriding constraints", () => {
    const pool = [candidate(1), candidate(2, { director: "Liked", genres: ["Comedy"] })];
    expect(rankRecommendations(pool, filters, [{ director: "Liked", genres: ["Comedy"], weight: 1 }], null)[0].tmdbId).toBe(2);
    expect(rankRecommendations(pool, filters, [{ director: "Liked", genres: ["Comedy"], weight: -1 }], null)[0].tmdbId).toBe(1);
    expect(rankRecommendations(pool, { ...filters, genres: ["Drama"] }, [{ director: "Liked", genres: ["Comedy"], weight: 1 }], null)[0].tmdbId).toBe(1);
  });
  it("boosts verified reference similarities, not merely the reference title", () => {
    const reference = { id: 99, title: "Reference", overview: "", director: "Liked", genres: ["Drama"], keywords: ["space"] };
    const pool = [candidate(1), candidate(2, { director: "Liked", keywords: ["space"] })];
    expect(rankRecommendations(pool, filters, [], reference)[0].tmdbId).toBe(2);
  });
  it("is deterministic and returns at most eight of sixty candidates", () => {
    const pool = Array.from({ length: 60 }, (_, i) => candidate(i + 1));
    expect(rankRecommendations(pool.reverse(), filters, [], null).map((m) => m.tmdbId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("explains only verified facts and serves localized metadata", () => {
    const explained = explainRecommendation(candidate(1, { runtime: 95, providerIds: [8] }), { ...filters, maxRuntime: 100, providerIds: [8, 119] }, [], null, "pl");
    expect(explained.movie.title).toBe("Film 1");
    expect(explained.justification).toContain("95");
    expect(explained.justification).toContain("Netflix");
    expect(explained.justification).not.toContain("Prime");
  });
});

describe("advanced preference validation", () => {
  it.each([
    { providerIds: [999] }, { providerIds: [8, 8] }, { referenceMovieId: -1 }, { referenceMovieId: "1" },
    { maxRuntime: 0 }, { maxRuntime: 361 }, { excludedGenres: ["unknown"] },
    { genres: ["Drama"], excludedGenres: ["Drama"] }, { positiveIds: [1], negativeIds: [1] },
    { negativeIds: Array.from({ length: 51 }, (_, i) => i + 1) }, { positiveIds: [1.5] },
  ])("rejects invalid new parameters %j", (patch) => {
    expect(parseRecommendRequest({ ...preferences, genres: ["Drama"], ...patch })).toBeNull();
  });
  it("accepts reference-only requests and validated PL providers", () => {
    expect(parseRecommendRequest({ ...preferences, referenceMovieId: 550, providerIds: [8, 1899] })).not.toBeNull();
  });
});
