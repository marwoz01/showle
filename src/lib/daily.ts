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
 * Simple deterministic hash: date string -> index in range [0, length).
 */
function hashDateToIndex(dateStr: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}
