import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ embed: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/recommend-embedding", () => ({ getEmbedding: mocks.embed }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRawUnsafe: mocks.query } }));
import { buildRecommendationSearch, findRecommendationCandidates } from "@/lib/recommend-search";
import { candidate, filters } from "@/lib/__tests__/fixtures/recommendations";
beforeEach(() => { vi.clearAllMocks(); mocks.query.mockResolvedValue([candidate()]); });
describe("one retrieval filter contract", () => {
  const search = { filters: { ...filters, genres: ["Drama"], excludedGenres: ["Horror"], providerIds: [8], maxRuntime: 90, popularity: "niche" as const, excludeIds: [123] }, queryText: "drama" };
  it("uses identical WHERE conditions for semantic and fallback queries", () => {
    const semantic = buildRecommendationSearch(search, [1, 2, 3]);
    const fallback = buildRecommendationSearch(search);
    const where = (query: string) => query.split(" WHERE ")[1].split(" ORDER BY ")[0];
    expect(where(semantic.query)).toBe(where(fallback.query));
    expect(semantic.params.slice(0, 7)).toEqual(fallback.params.slice(0, 7));
    expect(where(fallback.query)).toContain('"voteCount" < 1000');
    expect(where(fallback.query)).toContain('runtime > 0');
    expect(fallback.params.at(-1)).toBe(60);
  });
  it("binds query values separately, including hostile free-form input", () => {
    const hostile = "Drama'); DROP TABLE anything; --";
    const { query, params } = buildRecommendationSearch({ ...search, queryText: hostile });
    expect(query).not.toContain(hostile);
    expect(query).not.toContain("DROP");
    expect(params).toContainEqual([123]);
  });
  it("keeps all filters during a provider outage and exposes degradation", async () => {
    mocks.embed.mockRejectedValue(new Error("provider unavailable"));
    const result = await findRecommendationCandidates(search);
    expect(result.matching).toBe("filters");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    const [query, ...params] = mocks.query.mock.calls[0];
    expect(query).toContain('NOT (genres &&');
    expect(params).toContainEqual(["Drama"]);
    expect(params).toContainEqual([8]);
    expect(params).toContain(90);
  });
  it("limits both retrieval paths to server-owned watchlist IDs", () => {
    const scope = { ...search, filters: { ...search.filters, source: "watchlist" as const, includeIds: [3, 5] } };
    for (const vector of [undefined, [1, 2, 3]]) {
      const { query, params } = buildRecommendationSearch(scope, vector);
      expect(query).toMatch(/"tmdbId" = ANY\(\$\d+::int\[\]\)/);
      expect(params).toContainEqual([3, 5]);
    }
    const missing = buildRecommendationSearch({ ...scope, filters: { ...scope.filters, includeIds: undefined } });
    expect(missing.params).toContainEqual([]);
    expect(missing.query).toContain('"tmdbId" = ANY(');
  });
  it("does not send an empty optional mood to the embedding provider", async () => {
    await findRecommendationCandidates({ ...search, queryText: "" });
    expect(mocks.embed).not.toHaveBeenCalled();
  });
  it("recognizes semantic retrieval in mixed pools while preserving a true unindexed fallback", async () => {
    mocks.embed.mockResolvedValue([1, 2, 3]);
    mocks.query.mockResolvedValue([candidate(1, { hasEmbedding: true }), candidate(2, { hasEmbedding: false })]);
    expect((await findRecommendationCandidates(search)).matching).toBe("semantic");
    mocks.query.mockResolvedValue([candidate(2, { hasEmbedding: false })]);
    expect((await findRecommendationCandidates(search)).matching).toBe("filters");
    mocks.query.mockResolvedValue([candidate(1, { hasEmbedding: true })]);
    expect((await findRecommendationCandidates(search)).matching).toBe("semantic");
  });
});
