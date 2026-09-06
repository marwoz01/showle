import type { MovieGenre } from "@/constants/genres";
import type { Locale } from "@/i18n";
import type { Translations } from "@/i18n/types";
import { normalizeDisplayText } from "@/lib/typography";

export function localizeGenre(genre: string, t: Translations): string {
  return normalizeDisplayText(
    genre in t.genres ? t.genres[genre as MovieGenre] : genre,
  );
}

export function localizeGenres(genres: string[], t: Translations): string[] {
  return genres.map((genre) => localizeGenre(genre, t));
}

export function localizeCountry(
  country: string,
  countryCode: string | undefined,
  locale: Locale,
  unknownLabel: string,
): string {
  if (!country || country === "Unknown") return normalizeDisplayText(unknownLabel);
  if (!countryCode) return normalizeDisplayText(country);

  try {
    return normalizeDisplayText(
      new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ??
      country
    );
  } catch {
    return normalizeDisplayText(country);
  }
}

export function localizeUnknown(value: string, unknownLabel: string): string {
  return normalizeDisplayText(!value || value === "Unknown" ? unknownLabel : value);
}
