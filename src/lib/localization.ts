import type { MovieGenre } from "@/constants/genres";
import type { Locale } from "@/i18n";
import type { Translations } from "@/i18n/types";

export function localizeGenre(genre: string, t: Translations): string {
  return genre in t.genres
    ? t.genres[genre as MovieGenre]
    : genre;
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
  if (!country || country === "Unknown") return unknownLabel;
  if (!countryCode) return country;

  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ??
      country
    );
  } catch {
    return country;
  }
}

export function localizeUnknown(value: string, unknownLabel: string): string {
  return !value || value === "Unknown" ? unknownLabel : value;
}
