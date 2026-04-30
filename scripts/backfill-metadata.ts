/**
 * Backfills TMDB metadata (poster, credits, rating, runtime, etc.) into existing
 * MovieEmbedding rows so that /api/recommend can serve full movie data without
 * hitting TMDB at request time.
 *
 * Usage: npx tsx scripts/backfill-metadata.ts
 * Requires .env.local with: TMDB_API_KEY, DATABASE_URL.
 *
 * Safe to re-run — UPDATE is idempotent.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const TMDB_API_KEY = process.env.TMDB_API_KEY!;
if (!TMDB_API_KEY) { console.error("Missing TMDB_API_KEY"); process.exit(1); }

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TMDB_DELAY = 100; // ms between TMDB calls (pair of details+credits per movie)
const PROGRESS_INTERVAL = 25;

interface TmdbDetails {
  id: number;
  title: string;
  poster_path: string | null;
  tagline: string;
  vote_average: number;
  vote_count: number;
  runtime: number;
  budget: number;
  production_countries: { iso_3166_1: string; name: string }[];
}

interface TmdbCredits {
  cast: { name: string; order: number }[];
  crew: { job: string; name: string }[];
}

async function fetchDetails(tmdbId: number): Promise<{ details: TmdbDetails; credits: TmdbCredits } | null> {
  try {
    const [d, c] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
      fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
    ]);
    if (!d.ok || !c.ok) return null;
    return {
      details: (await d.json()) as TmdbDetails,
      credits: (await c.json()) as TmdbCredits,
    };
  } catch {
    return null;
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const rows = await prisma.$queryRawUnsafe<{ tmdbId: number }[]>(
    `SELECT "tmdbId" FROM "MovieEmbedding" ORDER BY "tmdbId"`,
  );
  console.log(`Backfilling metadata for ${rows.length} movies.`);

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const data = await fetchDetails(row.tmdbId);
    if (!data) {
      failed++;
      done++;
      await sleep(TMDB_DELAY);
      continue;
    }

    const { details, credits } = data;
    const director = credits.crew.find((c) => c.job === "Director")?.name ?? "Unknown";
    const leadActor = credits.cast?.[0]?.name ?? "Unknown";
    const country = details.production_countries[0]?.name ?? "Unknown";
    const budget = details.budget ? Math.round(details.budget / 1_000_000) : 0;

    await prisma.$executeRawUnsafe(
      `UPDATE "MovieEmbedding" SET
        "posterPath" = $1,
        director = $2,
        "leadActor" = $3,
        country = $4,
        runtime = $5,
        budget = $6,
        "voteCount" = $7,
        rating = $8,
        tagline = $9
       WHERE "tmdbId" = $10`,
      details.poster_path ?? "",
      director,
      leadActor,
      country,
      details.runtime ?? 0,
      budget,
      details.vote_count ?? 0,
      Math.round((details.vote_average ?? 0) * 10) / 10,
      details.tagline || null,
      row.tmdbId,
    );

    done++;
    if (done % PROGRESS_INTERVAL === 0) {
      console.log(`  ${done}/${rows.length} (${failed} failed)`);
    }
    await sleep(TMDB_DELAY);
  }

  console.log(`\nDone. Updated ${done - failed}/${rows.length} rows. Failed: ${failed}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
