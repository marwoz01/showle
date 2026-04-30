/**
 * One-time script to generate embeddings for all eligible movies.
 * Fetches TMDB details, generates Gemini embeddings, stores in MovieEmbedding table.
 *
 * Usage: npx tsx scripts/generate-embeddings.ts
 * Requires .env.local with: GEMINI_API_KEY, TMDB_API_KEY, DATABASE_URL.
 *
 * Can be safely re-run (upserts).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import eligibleMovies from "../src/data/eligible-movies.json";

const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

if (!TMDB_API_KEY) { console.error("Missing TMDB_API_KEY"); process.exit(1); }
if (!GEMINI_API_KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });

const EMBEDDING_DIMS = 1536; // matches the pgvector(1536) column
const BATCH_SIZE = 20; // movies per batchEmbedContents call
const TMDB_DELAY = 100; // ms between TMDB calls
// gemini-embedding-001 free tier is ~5 RPM. 13s between batches keeps us under that.
const GEMINI_DELAY = 13_000;

interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  genres: { id: number; name: string }[];
  popularity: number;
  vote_average: number;
}

async function fetchTmdbDetails(tmdbId: number): Promise<TmdbMovie | null> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`
    );
    if (!res.ok) return null;
    return (await res.json()) as TmdbMovie;
  } catch {
    return null;
  }
}

function buildEmbeddingText(movie: TmdbMovie): string {
  const genres = movie.genres.map((g) => g.name).join(", ");
  return `Title: ${movie.title}\nYear: ${movie.release_date?.slice(0, 4) || "Unknown"}\nGenres: ${genres}\nOverview: ${movie.overview || "No overview available"}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BatchEmbedRequest {
  content: { role: string; parts: { text: string }[] };
  outputDimensionality: number;
}

async function batchEmbedWithRetry(
  requests: BatchEmbedRequest[],
  maxAttempts = 6,
): Promise<{ embeddings: { values: number[] }[] }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await embeddingModel.batchEmbedContents({ requests });
    } catch (e) {
      const err = e as { status?: number; message?: string };
      const is429 = err.status === 429 || /429/.test(err.message || "");
      if (!is429 || attempt === maxAttempts) throw e;
      // Parse the API-suggested retry delay; default to exponential backoff.
      const match = (err.message || "").match(/retry in ([\d.]+)s/i);
      const waitMs = match
        ? Math.ceil(parseFloat(match[1]) * 1000) + 2_000
        : Math.min(60_000, 5_000 * 2 ** (attempt - 1));
      console.log(`  Rate limited (attempt ${attempt}/${maxAttempts}), sleeping ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  // Check how many already exist
  const existingCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM "MovieEmbedding"`
  );
  const existing = Number(existingCount[0]?.count || 0);
  console.log(`MovieEmbedding table has ${existing} rows. Total movies: ${eligibleMovies.length}`);

  if (existing >= eligibleMovies.length) {
    console.log("All movies already have embeddings. Done.");
    return;
  }

  // Get IDs that already have embeddings
  const existingIds = new Set<number>();
  if (existing > 0) {
    const rows = await prisma.$queryRawUnsafe<{ tmdbId: number }[]>(
      `SELECT "tmdbId" FROM "MovieEmbedding"`
    );
    rows.forEach((r) => existingIds.add(r.tmdbId));
  }

  const toProcess = eligibleMovies.filter((m) => !existingIds.has(m.id));
  console.log(`Need to process ${toProcess.length} movies.`);

  // Step 1: Fetch TMDB details for all movies
  console.log("\n--- Fetching TMDB details ---");
  const movieDetails: { movie: TmdbMovie; score: number }[] = [];
  let fetched = 0;

  for (const entry of toProcess) {
    const details = await fetchTmdbDetails(entry.id);
    if (details && details.overview) {
      movieDetails.push({ movie: details, score: entry.score });
    }
    fetched++;
    if (fetched % 100 === 0) {
      console.log(`  Fetched ${fetched}/${toProcess.length} (${movieDetails.length} with overview)`);
    }
    await sleep(TMDB_DELAY);
  }

  console.log(`\nFetched ${movieDetails.length} movies with valid overviews.`);

  // Step 2: Generate embeddings in batches and upsert
  console.log("\n--- Generating embeddings ---");
  let processed = 0;

  for (let i = 0; i < movieDetails.length; i += BATCH_SIZE) {
    const batch = movieDetails.slice(i, i + BATCH_SIZE);
    const texts = batch.map((b) => buildEmbeddingText(b.movie));

    const response = await batchEmbedWithRetry(
      texts.map((t) => ({
        content: { role: "user", parts: [{ text: t.slice(0, 2000) }] },
        outputDimensionality: EMBEDDING_DIMS,
      })),
    );

    // Upsert each movie
    for (let j = 0; j < batch.length; j++) {
      const { movie, score } = batch[j];
      const embedding = response.embeddings[j].values;
      const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0;
      const genres = movie.genres.map((g) => g.name);

      await prisma.$executeRawUnsafe(
        `INSERT INTO "MovieEmbedding" ("tmdbId", title, year, genres, overview, score, embedding)
         VALUES ($1, $2, $3, $4::text[], $5, $6, $7::vector)
         ON CONFLICT ("tmdbId") DO UPDATE SET
           title = $2, year = $3, genres = $4::text[], overview = $5, score = $6, embedding = $7::vector`,
        movie.id,
        movie.title,
        year,
        genres,
        movie.overview.slice(0, 2000),
        score,
        `[${embedding.join(",")}]`
      );
    }

    processed += batch.length;
    console.log(`  Embedded ${processed}/${movieDetails.length}`);
    await sleep(GEMINI_DELAY);
  }

  console.log(`\nDone. Inserted/updated ${processed} embeddings.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
