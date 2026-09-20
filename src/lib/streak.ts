import { normalizeStoredDate, previousDateKey } from "@/lib/game-date";

interface StreakStats { currentStreak: number; lastPlayedDate: string | null }
export function resolveStreak(stats: StreakStats | null, freezes: number, today: string) {
  const lastPlayedDate = normalizeStoredDate(stats?.lastPlayedDate);
  const currentStreak = stats?.currentStreak ?? 0;
  const yesterday = previousDateKey(today);
  const missedDays = lastPlayedDate && lastPlayedDate < yesterday
    ? Math.round((Date.parse(yesterday) - Date.parse(lastPlayedDate)) / 86400000) : 0;
  if (!currentStreak || !lastPlayedDate) return { currentStreak: 0, lastPlayedDate, freezesUsed: 0, missedDays };
  if (!missedDays) return { currentStreak, lastPlayedDate, freezesUsed: 0, missedDays: 0 };
  const freezesUsed = freezes >= missedDays ? missedDays : 0;
  return { currentStreak: freezesUsed ? currentStreak : 0, lastPlayedDate: yesterday, freezesUsed, missedDays };
}
