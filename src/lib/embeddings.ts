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

// In-memory cache to avoid re-embedding identical queries. Free-tier Gemini
// caps embedding requests per day; the same recommend query (e.g. "thriller
// like Shutter Island") shouldn't burn quota on every click.
const queryEmbedCache = new Map<string, { ts: number; vec: number[] }>();
const QUERY_EMBED_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const QUERY_EMBED_MAX_ENTRIES = 500;

export async function getEmbedding(text: string): Promise<number[]> {
  const key = text.slice(0, 2000);
  const cached = queryEmbedCache.get(key);
  if (cached && Date.now() - cached.ts < QUERY_EMBED_TTL_MS) {
    return cached.vec;
  }

  const model = getGenAI().getGenerativeModel({ model: EMBEDDING_MODEL });
  const request: EmbedRequestWithDims = {
    content: { role: "user", parts: [{ text: key }] },
    outputDimensionality: EMBEDDING_DIMS,
  };

  // Single retry on 429 — gives the rate-limit window a moment to roll over.
  let response;
  try {
    response = await model.embedContent(request);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    const is429 = err.status === 429 || /429/.test(err.message || "");
    if (!is429) throw e;
    const match = (err.message || "").match(/retry in ([\d.]+)s/i);
    const waitMs = match
      ? Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 500, 8_000)
      : 3_000;
    await new Promise((r) => setTimeout(r, waitMs));
    response = await model.embedContent(request);
  }

  const vec = response.embedding.values;
  queryEmbedCache.set(key, { ts: Date.now(), vec });

  // Bound cache size — drop oldest entry when full.
  if (queryEmbedCache.size > QUERY_EMBED_MAX_ENTRIES) {
    let oldestKey: string | undefined;
    let oldestTs = Infinity;
    for (const [k, v] of queryEmbedCache) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestKey = k;
      }
    }
    if (oldestKey) queryEmbedCache.delete(oldestKey);
  }

  return vec;
}

import type { CastMember } from "@/types";

export interface SimilarMovieResult {
  tmdbId: number;
  title: string;
  year: number;
  genres: string[];
  overview: string;
  posterPath: string;
  backdropPath: string;
  director: string;
  leadActor: string;
  country: string;
  runtime: number;
  budget: number;
  voteCount: number;
  rating: number;
  tagline: string | null;
  cast: CastMember[];
  similarity: number;
}

// Single source of truth for the columns we project from MovieEmbedding.
// Keep aligned with SimilarMovieResult and the recommend route's MediaDetails mapping.
const SELECT_FIELDS = `"tmdbId", title, year, genres, overview,
       "posterPath", "backdropPath", director, "leadActor", country, runtime, budget,
       "voteCount", rating, tagline, "cast"`;

// Calibrated to the actual `score` distribution of the catalog (~988 movies).
// Real percentiles: p25≈0.248, p50≈0.279, p75≈0.341, min≈0.191, max≈0.894.
// The previous ranges left "niche" empty and dumped 60% of the catalog into "medium".
const POPULARITY_RANGES: Record<string, { min: number; max: number }> = {
  popular: { min: 0.34, max: 1 },
  medium: { min: 0.25, max: 0.34 },
  niche: { min: 0, max: 0.25 },
};

// Hybrid ranking weights: how much to favor popularity vs embedding similarity.
// Pure similarity ranking lets a barely-similar match win over a clearly more-known
// film; pure popularity ignores the user's actual query.
//
// When the user typed a specific freeform description ("dark slow-burn thriller"),
// their intent is precise — let semantics dominate (0.85/0.15). Otherwise fall back
// to a steadier mix where popularity keeps random near-ties on the well-known side.
const FREEFORM_SIM_WEIGHT = 0.85;
const FREEFORM_SCORE_WEIGHT = 0.15;
const STRUCTURED_SIM_WEIGHT = 0.82;
const STRUCTURED_SCORE_WEIGHT = 0.18;

// Tonal genre clusters used to exclude tonally incompatible films.
// "Neutral" genres (Action, Adventure, Fantasy, Sci-Fi, Documentary, Western)
// are not in either cluster and never trigger exclusions.
const DARK_GENRES = new Set(["Crime", "Thriller", "Mystery", "Horror", "War"]);
const LIGHT_GENRES = new Set(["Comedy", "Animation", "Family", "Romance"]);

function getExcludedGenres(selectedGenres: string[]): string[] {
  const hasDark = selectedGenres.some((g) => DARK_GENRES.has(g));
  const hasLight = selectedGenres.some((g) => LIGHT_GENRES.has(g));
  if (hasDark && !hasLight) return [...LIGHT_GENRES];
  if (hasLight && !hasDark) return [...DARK_GENRES];
  return [];
}

// Maps lowercase keywords → catalog genre names.
// Includes both English and Polish variants so inference works even when
// translation fails or the original user text is used as a fallback.
const GENRE_KEYWORD_MAP: Record<string, string> = {
  // English
  romance: "Romance", romantic: "Romance",
  comedy: "Comedy", comedies: "Comedy", funny: "Comedy", humor: "Comedy", humour: "Comedy",
  horror: "Horror", scary: "Horror",
  thriller: "Thriller", suspense: "Thriller",
  mystery: "Mystery", detective: "Mystery", whodunit: "Mystery",
  crime: "Crime", gangster: "Crime",
  animation: "Animation", animated: "Animation", cartoon: "Animation",
  family: "Family",
  war: "War", military: "War",
  // Polish
  romans: "Romance", romantyczny: "Romance", romantyczna: "Romance",
  "miłosny": "Romance", "miłosna": "Romance",
  komedia: "Comedy", komediowy: "Comedy", komediowa: "Comedy",
  animacja: "Animation",
  "kryminał": "Crime",
  wojenny: "War", wojenna: "War",
};

/**
 * Extracts genre hints from a freeform description (English text expected).
 * Returns catalog genre names that were explicitly mentioned.
 */
export function inferGenresFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, genre] of Object.entries(GENRE_KEYWORD_MAP)) {
    if (lower.includes(keyword)) found.add(genre);
  }
  return [...found];
}

interface FindSimilarParams {
  queryText: string;
  genres?: string[];
  /** Genres inferred from freeform text — used as inclusion filter only (no tonal exclusion). */
  inferredGenres?: string[];
  hasFreeform?: boolean;
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
  const hasFreeform = params.hasFreeform ?? (!!params.queryText && !params.queryText.startsWith("I want a"));

  // Explicit genres selected by the user → hard filter + tonal exclusion.
  // Inferred genres from freeform text → hard filter only (no tonal exclusion so that
  // e.g. "romance" doesn't exclude Drama and then cut out Titanic).
  const useGenreFilter = !!(params.genres?.length || params.inferredGenres?.length);
  const activeGenres = params.genres?.length
    ? params.genres
    : (params.inferredGenres ?? []);
  const excludedGenres = params.genres?.length ? getExcludedGenres(params.genres) : [];

  // Hybrid ranking: simWeight * cosine_sim + scoreWeight * popularity, DESC.
  const simWeight = hasFreeform ? FREEFORM_SIM_WEIGHT : STRUCTURED_SIM_WEIGHT;
  const scoreWeight = hasFreeform ? FREEFORM_SCORE_WEIGHT : STRUCTURED_SCORE_WEIGHT;
  const rankExpr = `(${simWeight} * (1 - (embedding <=> $1::vector)) + ${scoreWeight} * score)`;

  if (useGenreFilter && popRange) {
    query = `
      SELECT ${SELECT_FIELDS},
             1 - (embedding <=> $1::vector) AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $2 AND year <= $3
        AND "tmdbId" != ALL($4::int[])
        AND genres && $5::text[]
        AND (cardinality($6::text[]) = 0 OR NOT genres && $6::text[])
        AND score >= $7 AND score <= $8
      ORDER BY ${rankExpr} DESC
      LIMIT $9
    `;
    queryParams = [vectorStr, yearFrom, yearTo, excludeIds, activeGenres, excludedGenres, popRange.min, popRange.max, limit];
  } else if (useGenreFilter) {
    query = `
      SELECT ${SELECT_FIELDS},
             1 - (embedding <=> $1::vector) AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $2 AND year <= $3
        AND "tmdbId" != ALL($4::int[])
        AND genres && $5::text[]
        AND (cardinality($6::text[]) = 0 OR NOT genres && $6::text[])
      ORDER BY ${rankExpr} DESC
      LIMIT $7
    `;
    queryParams = [vectorStr, yearFrom, yearTo, excludeIds, activeGenres, excludedGenres, limit];
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

  const fallbackExcludedGenres = params.genres?.length ? getExcludedGenres(params.genres) : [];

  if (params.genres?.length && popRange) {
    query = `
      SELECT ${SELECT_FIELDS}, 0::float AS similarity
      FROM "MovieEmbedding"
      WHERE year >= $1 AND year <= $2
        AND "tmdbId" != ALL($3::int[])
        AND genres && $4::text[]
        AND (cardinality($5::text[]) = 0 OR NOT genres && $5::text[])
        AND score >= $6 AND score <= $7
      ORDER BY score DESC
      LIMIT $8
    `;
    queryParams = [yearFrom, yearTo, excludeIds, params.genres, fallbackExcludedGenres, popRange.min, popRange.max, limit];
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
