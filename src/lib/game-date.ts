export function getTodayKey(now = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

export function getTimeUntilReset(): number {
  const now = new Date();
  const warsawNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const midnight = new Date(warsawNow);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - warsawNow.getTime();
}

export function previousDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
