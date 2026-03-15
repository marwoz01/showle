import eligibleMovies from "@/data/eligible-movies.json";
import { getMovieDetails } from "./tmdb";
import { MediaDetails } from "@/types";

const POOL_SIZE = eligibleMovies.length;
const NO_REPEAT_DAYS = 90;

/**
 * Returns today's date key in YYYY-MM-DD format (Europe/Warsaw timezone).
 */
export function getTodayKey(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

/**
 * Returns milliseconds until next midnight in Europe/Warsaw timezone.
 */
export function getTimeUntilReset(): number {
  const now = new Date();
  const warsawNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const midnight = new Date(warsawNow);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - warsawNow.getTime();
}

/**
 * Simple deterministic hash: date string -> number.
 */
function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get the pool index for a given date, avoiding repeats within the last N days.
 */
function getDailyIndex(dateStr: string): number {
  // Compute indices for the previous NO_REPEAT_DAYS to build exclusion set
  const recentIndices = new Set<number>();
  const date = new Date(dateStr + "T00:00:00");

  for (let d = 1; d <= NO_REPEAT_DAYS; d++) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - d);
    const prevStr = prev.toISOString().slice(0, 10);
    const prevHash = hashDate(prevStr);
    // Use raw modulo for previous days (no collision avoidance needed for history)
    recentIndices.add(prevHash % POOL_SIZE);
  }

  // Find the first non-colliding index for today
  const baseHash = hashDate(dateStr);
  let index = baseHash % POOL_SIZE;

  // If pool is large enough relative to NO_REPEAT_DAYS, this resolves quickly
  let attempt = 0;
  while (recentIndices.has(index) && attempt < POOL_SIZE) {
    attempt++;
    index = (baseHash + attempt) % POOL_SIZE;
  }

  return index;
}

/**
 * Get today's daily movie from the pre-built eligible pool.
 * Fetches full details from TMDB at runtime.
 */
export async function getDailyMovie(dateKey?: string): Promise<MediaDetails | null> {
  const today = dateKey || getTodayKey();
  const index = getDailyIndex(today);
  const movie = eligibleMovies[index];
  return getMovieDetails(movie.id);
}
