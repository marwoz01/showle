import { MOCK_MOVIES } from "./mock-data";
import { MediaDetails } from "@/types";

/**
 * Returns a deterministic daily movie based on the current date.
 * Uses a simple hash of the date string to pick from available movies.
 */
export function getDailyMovie(): MediaDetails {
  const today = getTodayKey();
  const index = hashDateToIndex(today, MOCK_MOVIES.length);
  return MOCK_MOVIES[index];
}

/**
 * Returns today's date key in YYYY-MM-DD format (UTC).
 */
export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Returns milliseconds until next midnight (local time).
 */
export function getTimeUntilReset(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

/**
 * Simple deterministic hash: date string -> index in range [0, length).
 */
function hashDateToIndex(dateStr: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}
