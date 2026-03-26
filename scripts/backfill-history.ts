/**
 * Backfill script: populates targetMovieId, targetTitle, targetYear, targetPoster
 * for existing GameResult rows where targetMovieId = 0.
 *
 * Uses the same deterministic daily selection algorithm from daily.ts to derive
 * the correct answer for each dateKey, then fetches movie details from TMDB.
 *
 * Usage: npx tsx scripts/backfill-history.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import eligibleMovies from "../src/data/eligible-movies.json";

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const POOL_SIZE = eligibleMovies.length;
const NO_REPEAT_DAYS = 90;

// ---------- daily.ts algorithm (duplicated to avoid import issues) ----------

function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getDailyIndex(dateStr: string): number {
  const recentIndices = new Set<number>();
  const date = new Date(dateStr + "T00:00:00");

  for (let d = 1; d <= NO_REPEAT_DAYS; d++) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - d);
    const prevStr = prev.toISOString().slice(0, 10);
    const prevHash = hashDate(prevStr);
    recentIndices.add(prevHash % POOL_SIZE);
  }

  const baseHash = hashDate(dateStr);
  let index = baseHash % POOL_SIZE;
  let attempt = 0;

  while (recentIndices.has(index) && attempt < POOL_SIZE) {
    attempt++;
    index = (baseHash + attempt) % POOL_SIZE;
  }

  return index;
}

// ---------- TMDB fetch ----------

interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
}

async function fetchTmdbMovie(tmdbId: number): Promise<TmdbMovie | null> {
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Main ----------

async function main() {
  const rows = await prisma.gameResult.findMany({
    where: { targetMovieId: 0 },
    select: { id: true, dateKey: true },
  });

  console.log(`Found ${rows.length} rows to backfill.`);

  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Deduplicate dateKeys to minimize TMDB calls
  const dateKeys = [...new Set(rows.map((r) => r.dateKey))];
  const movieCache = new Map<string, { tmdbId: number; title: string; year: number; poster: string }>();

  console.log(`Fetching TMDB data for ${dateKeys.length} unique dates...`);

  for (const dateKey of dateKeys) {
    const index = getDailyIndex(dateKey);
    const tmdbId = eligibleMovies[index].id;

    if (!movieCache.has(dateKey)) {
      const movie = await fetchTmdbMovie(tmdbId);
      if (movie) {
        movieCache.set(dateKey, {
          tmdbId: movie.id,
          title: movie.title,
          year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
          poster: movie.poster_path ?? "",
        });
      } else {
        // Fallback: use data from eligible-movies.json
        movieCache.set(dateKey, {
          tmdbId,
          title: eligibleMovies[index].title,
          year: 0,
          poster: "",
        });
      }
      // Rate limit: ~25 requests per second
      await sleep(40);
    }
  }

  console.log(`Updating ${rows.length} rows...`);

  let updated = 0;
  for (const row of rows) {
    const movie = movieCache.get(row.dateKey);
    if (!movie) continue;

    await prisma.gameResult.update({
      where: { id: row.id },
      data: {
        targetMovieId: movie.tmdbId,
        targetTitle: movie.title,
        targetYear: movie.year,
        targetPoster: movie.poster,
      },
    });
    updated++;
  }

  console.log(`Done. Updated ${updated} rows.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
