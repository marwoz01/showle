import { GoogleGenerativeAI, type EmbedContentRequest } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

// Gemini's `gemini-embedding-001` supports MRL truncation via `outputDimensionality`.
// We use 1536 to match the existing pgvector(1536) column shape.
// The SDK's EmbedContentRequest type omits this param, but the API accepts it.
const EMBEDDING_MODEL = "models/gemini-embedding-001";
const EMBEDDING_DIMS = 1536;

type EmbedRequestWithDims = EmbedContentRequest & { outputDimensionality?: number };

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return _genAI;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: EMBEDDING_MODEL });
  const request: EmbedRequestWithDims = {
    content: { role: "user", parts: [{ text: text.slice(0, 2000) }] },
    outputDimensionality: EMBEDDING_DIMS,
  };
  const response = await model.embedContent(request);
  return response.embedding.values;
}

export interface SimilarMovieResult {
  tmdbId: number;
  title: string;
  year: number;
  genres: string[];
  overview: string;
  posterPath: string;
  director: string;
  leadActor: string;
  country: string;
  runtime: number;
  budget: number;
  voteCount: number;
  rating: number;
  tagline: string | null;
  similarity: number;
}

// Single source of truth for the columns we project from MovieEmbedding.
// Keep aligned with SimilarMovieResult and the recommend route's MediaDetails mapping.
const SELECT_FIELDS = `"tmdbId", title, year, genres, overview,
       "posterPath", director, "leadActor", country, runtime, budget,
       "voteCount", rating, tagline`;

// Calibrated to the actual `score` distribution of the catalog (~988 movies).
// Real percentiles: p25≈0.248, p50≈0.279, p75≈0.341, min≈0.191, max≈0.894.
// The previous ranges left "niche" empty and dumped 60% of the catalog into "medium".
const POPULARITY_RANGES: Record<string, { min: number; max: number }> = {
  popular: { min: 0.34, max: 1 },
  medium: { min: 0.25, max: 0.34 },
  niche: { min: 0, max: 0.25 },
};

// Hybrid ranking weights: how much to favor popularity vs raw embedding similarity.
// Pure similarity ranking lets a barely-similar embedding match win over a clearly
// better-known/better-rated film. 0.7/0.3 keeps semantic match dominant but breaks ties
// (and near-ties) toward higher-popularity films.
const SIM_WEIGHT = 0.7;
const SCORE_WEIGHT = 0.3;

interface FindSimilarParams {
  queryText: string;
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  popularity?: string;
  excludeIds?: number[];
  limit?: number;
}

/**
 * Builds a synthetic query from structured inputs when no freeform text is provided.
 */
export function buildQueryText(params: {
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  popularity?: string;
  freeformText?: string;
}): string {
  if (params.freeformText?.trim()) {
    // When freeform text is provided, enrich it with structured context
    const parts = [params.freeformText.trim()];
    if (params.genres?.length) {
      parts.push(`Genres: ${params.genres.join(", ")}`);
    }
    return parts.join(". ");
  }

  // Synthesize from structured inputs
  const parts: string[] = [];
  if (params.genres?.length) {
    parts.push(`I want a ${params.genres.join(", ")} movie`);
  }
  if (params.yearFrom && params.yearTo) {
    parts.push(`from ${params.yearFrom} to ${params.yearTo}`);
  }
  const popLabels: Record<string, string> = {
    popular: "that is well-known and popular",
    medium: "that is moderately known, appreciated by cinephiles",
    niche: "that is a hidden gem, obscure and little-known",
  };
  if (params.popularity && popLabels[params.popularity]) {
    parts.push(popLabels[params.popularity]);
  }
  return parts.join(" ") || "Recommend me a good movie";
}

/**
 * Finds similar movies using pgvector cosine similarity with optional structured filters.
 */
export async function findSimilarMovies(params: FindSimilarParams): Promise<SimilarMovieResult[]> {
  const embedding = await getEmbedding(params.queryText);
  const vectorStr = `[${embedding.join(",")}]`;

  const limit = params.limit ?? 8;
  const yearFrom = params.yearFrom ?? 1900;
  const yearTo = params.yearTo ?? 2030;
  const excludeIds = params.excludeIds?.length ? params.excludeIds : [0];

  // Build the query dynamically
  let query: string;
  let queryParams: unknown[];

  const popRange = params.popularity ? POPULARITY_RANGES[params.popularity] : null;
  const hasFreeform = !!params.queryText && !params.queryText.startsWith("I want a");
  const useGenreFilter = !hasFreeform && params.genres?.length;

  // Hybrid ranking: SIM_WEIGHT * cosine_sim + SCORE_WEIGHT * popularity_score, DESC.
  const rankExpr = `(${SIM_WEIGHT} * (1 - (embedding <=> $1::vector)) + ${SCORE_WEIGHT} * score)`;

  if (useGenreFilter && popRange) {
    query = `
      SELECT ${SELECT_FIELDS},
             1 - (embedding <=> $1::vector) AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $2 AND year <= $3
        AND "tmdbId" != ALL($4::int[])
        AND genres && $5::text[]
        AND score >= $6 AND score <= $7
      ORDER BY ${rankExpr} DESC
      LIMIT $8
    `;
    queryParams = [vectorStr, yearFrom, yearTo, excludeIds, params.genres!, popRange.min, popRange.max, limit];
  } else if (useGenreFilter) {
    query = `
      SELECT ${SELECT_FIELDS},
             1 - (embedding <=> $1::vector) AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $2 AND year <= $3
        AND "tmdbId" != ALL($4::int[])
        AND genres && $5::text[]
      ORDER BY ${rankExpr} DESC
      LIMIT $6
    `;
    queryParams = [vectorStr, yearFrom, yearTo, excludeIds, params.genres!, limit];
  } else if (popRange) {
    query = `
      SELECT ${SELECT_FIELDS},
             1 - (embedding <=> $1::vector) AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $2 AND year <= $3
        AND "tmdbId" != ALL($4::int[])
        AND score >= $5 AND score <= $6
      ORDER BY ${rankExpr} DESC
      LIMIT $7
    `;
    queryParams = [vectorStr, yearFrom, yearTo, excludeIds, popRange.min, popRange.max, limit];
  } else {
    query = `
      SELECT ${SELECT_FIELDS},
             1 - (embedding <=> $1::vector) AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $2 AND year <= $3
        AND "tmdbId" != ALL($4::int[])
      ORDER BY ${rankExpr} DESC
      LIMIT $5
    `;
    queryParams = [vectorStr, yearFrom, yearTo, excludeIds, limit];
  }

  const rows = await prisma.$queryRawUnsafe<SimilarMovieResult[]>(query, ...queryParams);
  return rows;
}

/**
 * Fallback: find movies by structured filters only (no vector search).
 */
export async function findMoviesByFilters(params: {
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  popularity?: string;
  excludeIds?: number[];
  limit?: number;
}): Promise<SimilarMovieResult[]> {
  const yearFrom = params.yearFrom ?? 1900;
  const yearTo = params.yearTo ?? 2030;
  const excludeIds = params.excludeIds?.length ? params.excludeIds : [0];
  const limit = params.limit ?? 8;
  const popRange = params.popularity ? POPULARITY_RANGES[params.popularity] : null;

  let query: string;
  let queryParams: unknown[];

  if (params.genres?.length && popRange) {
    query = `
      SELECT ${SELECT_FIELDS}, 0::float AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $1 AND year <= $2
        AND "tmdbId" != ALL($3::int[])
        AND genres && $4::text[]
        AND score >= $5 AND score <= $6
      ORDER BY score DESC
      LIMIT $7
    `;
    queryParams = [yearFrom, yearTo, excludeIds, params.genres, popRange.min, popRange.max, limit];
  } else {
    query = `
      SELECT ${SELECT_FIELDS}, 0::float AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $1 AND year <= $2
        AND "tmdbId" != ALL($3::int[])
      ORDER BY score DESC
      LIMIT $4
    `;
    queryParams = [yearFrom, yearTo, excludeIds, limit];
  }

  const rows = await prisma.$queryRawUnsafe<SimilarMovieResult[]>(query, ...queryParams);
  return rows;
}
