import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/recommend-embedding";
import type { RecommendationFilters } from "@/lib/recommend-filters";
import type { RecommendationCandidate } from "@/types/recommendation";
import { RECOMMENDATION_CANDIDATES } from "@/constants/recommendation";

export interface RecommendationSearch {
  filters: RecommendationFilters;
  queryText: string;
  preferredGenres?: string[];
}
export function buildRecommendationSearch(
  { filters: f, queryText, preferredGenres = [] }: RecommendationSearch, vector?: number[],
) {
  const params: unknown[] = [];
  const bind = (value: unknown) => { params.push(value); return `$${params.length}`; };
  const where = [
    `year >= ${bind(f.yearFrom)} AND year <= ${bind(f.yearTo)}`,
    `"tmdbId" != ALL(${bind(f.excludeIds)}::int[])`,
  ];
  if (f.genres.length) where.push(`genres && ${bind(f.genres)}::text[]`);
  if (f.excludedGenres.length) where.push(`NOT (genres && ${bind(f.excludedGenres)}::text[])`);
  if (f.maxRuntime !== null) where.push(`runtime > 0 AND runtime <= ${bind(f.maxRuntime)}`);
  if (f.providerIds.length) where.push(`"providerIds" && ${bind(f.providerIds)}::int[]`);
  if (f.popularity === "popular") where.push('"voteCount" >= 5000');
  if (f.popularity === "medium") where.push('"voteCount" >= 1000 AND "voteCount" < 5000');
  if (f.popularity === "niche") where.push('"voteCount" < 1000');
  const similarity = vector ? `COALESCE(1 - (embedding <=> ${bind(`[${vector.join(",")}]`)}::vector), 0)` : "0::float";
  const tokens = [...new Set(queryText.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].slice(0, 35);
  const lexical = tokens.length
    ? `ts_rank(to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(keywords, ' ')), to_tsquery('simple', ${bind(tokens.join(" | "))}))`
    : "0::float";
  const taste = preferredGenres.length ? `CASE WHEN genres && ${bind(preferredGenres)}::text[] THEN 0.06 ELSE 0 END` : "0";
  return {
    query: `SELECT "tmdbId", title, "titlePl", year, genres, overview, "overviewPl", "posterPath", "backdropPath",
      director, "leadActor", country, "countryCode", runtime, budget, "voteCount", rating, tagline, "taglinePl", "cast",
      keywords, "collectionId", "providerIds", "providersUpdatedAt", embedding IS NOT NULL AS "hasEmbedding", ${similarity} AS similarity, ${lexical} AS "lexicalScore"
      FROM "RecommendationMovie" WHERE ${where.join(" AND ")}
      ORDER BY (${vector ? "0.75" : "0"} * ${similarity} + 0.2 * ${lexical} + ${taste} +
        0.05 * (("voteCount" * rating + 500 * 6.5) / ("voteCount" + 500.0) / 10.0)) DESC, "tmdbId" ASC
      LIMIT ${bind(RECOMMENDATION_CANDIDATES)}`,
    params,
  };
}

export async function findRecommendationCandidates(search: RecommendationSearch) {
  let vector: number[] | undefined;
  try { vector = await getEmbedding(search.queryText); } catch { /* Keep identical hard filters when the provider is unavailable. */ }
  const { query, params } = buildRecommendationSearch(search, vector);
  const movies = await prisma.$queryRawUnsafe<RecommendationCandidate[]>(query, ...params);
  return { movies, matching: vector && movies.every((movie) => movie.hasEmbedding) ? "semantic" as const : "filters" as const };
}
