export function getTodayKey(now = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

export function getTimeUntilReset(now = new Date()): number {
  const [year, month, day] = getTodayKey(now).split("-").map(Number);
  const midnightUTC = Date.UTC(year, month - 1, day + 1);
  const offsetName = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", timeZoneName: "shortOffset" })
    .formatToParts(new Date(midnightUTC)).find((part) => part.type === "timeZoneName")!.value;
  const offsetHours = Number(offsetName.replace("GMT", ""));
  return midnightUTC - offsetHours * 3600000 - now.getTime();
}

export function previousDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function normalizeStoredDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) && Number.isFinite(Date.parse(normalized)) ? normalized : null;
}
