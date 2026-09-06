import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { preferences } from "@/lib/__tests__/fixtures/recommendations";

// Opt-in only: reads the configured catalog and makes six bounded provider requests.
// Does not mutate user data, usage counters or the catalog.
const enabled = process.env.RECOMMENDATION_LIVE_CHECK === "1";
describe.skipIf(!enabled)("live recommendation catalog", () => {
  let client: PrismaClient;
  beforeAll(async () => {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local", quiet: true });
    dotenv.config({ path: ".env", quiet: true });
    client = (await import("@/lib/prisma")).prisma;
  });
  afterAll(async () => { if (client) await client.$disconnect(); });
  it.each([
    { text: "Ciepła komedia bez horroru do 120 minut", genre: "Comedy", forbidden: "Horror", runtime: 120, providers: [] as number[] },
    { text: "Dokument o przyrodzie", genre: "Documentary", forbidden: "", runtime: null, providers: [] as number[] },
    { text: "Science fiction about space exploration", genre: "Science Fiction", forbidden: "", runtime: null, providers: [] as number[] },
    { text: "romantic comedy", genre: "Comedy", forbidden: "", runtime: null, providers: [8] },
    { text: "drama without war", genre: "Drama", forbidden: "War", runtime: null, providers: [] as number[] },
    { text: "kryminalny thriller bez horroru", genre: "Thriller", forbidden: "Horror", runtime: null, providers: [] as number[] },
  ])("retrieves filtered and distinct results: $text", async ({ text, genre, forbidden, runtime, providers }) => {
    const { interpretRecommendation } = await import("@/lib/recommend-ai");
    const { resolveRecommendationFilters, satisfiesRecommendationFilters } = await import("@/lib/recommend-filters");
    const { findRecommendationCandidates } = await import("@/lib/recommend-search");
    const { rankRecommendations } = await import("@/lib/recommend-ranking");
    const { reviewRecommendationRelevance } = await import("@/lib/recommend-relevance");
    const start = Date.now();
    const intent = await interpretRecommendation(text);
    const filters = resolveRecommendationFilters({ ...preferences, genres: [genre], freeformText: text, providerIds: providers, maxRuntime: runtime }, intent, []);
    if (forbidden) expect(filters.excludedGenres).toContain(forbidden);
    const query = { filters, queryText: intent.queryEnglish };
    const found = await findRecommendationCandidates(query);
    const shortlist = rankRecommendations(found.movies, filters, [], null, { limit: 24 });
    const relevance = await reviewRecommendationRelevance(shortlist, text, null);
    const ranked = rankRecommendations(shortlist, filters, [], null, { relevance: relevance.scores });
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((movie) => satisfiesRecommendationFilters(movie, filters))).toBe(true);
    const againFilters = { ...filters, excludeIds: ranked.map((movie) => movie.tmdbId) };
    const next = await findRecommendationCandidates({ ...query, filters: againFilters });
    expect(next.movies.some((movie) => againFilters.excludeIds.includes(movie.tmdbId))).toBe(false);
    process.stdout.write(JSON.stringify({ query: text, interpretation: intent.source, relevance: relevance.source, matching: found.matching, ms: Date.now() - start,
      top: ranked.slice(0, 4).map((movie) => ({ title: movie.title, score: Number(movie.similarity.toFixed(3)), genres: movie.genres })) }) + "\n");
  }, 30000);
});
