import type { Locale } from "@/i18n";

function validLocale(value: string | null): value is Locale {
  return value === "pl" || value === "en";
}

export function createLocalePreference() {
  let current: Locale | null = null;
  return {
    read(readStorage: () => string | null, fallback: Locale): Locale {
      if (current) return current;
      try { const value = readStorage(); return validLocale(value) ? value : fallback; }
      catch { return fallback; }
    },
    set(value: Locale, writeStorage: (value: Locale) => void) {
      current = value;
      try { writeStorage(value); } catch { /* The current tab can change language without persistent storage. */ }
    },
    external(value: string | null) { current = validLocale(value) ? value : null; },
  };
}
