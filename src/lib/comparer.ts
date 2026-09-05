import { MediaDetails, ComparisonField, MatchStatus, Direction } from "@/types";
import type { Locale } from "@/i18n";
import { Translations } from "@/i18n/types";
import {
  localizeCountry,
  localizeGenres,
  localizeUnknown,
} from "@/lib/localization";

export function compareMedia(
  guess: MediaDetails,
  answer: MediaDetails,
  t: Translations,
  locale: Locale = "en",
): ComparisonField[] {
  return [
    compareYear(guess.year, answer.year, t),
    compareGenres(guess.genres, answer.genres, t),
    compareCountry(guess, answer, t, locale),
    compareDirector(guess.director, answer.director, t),
    compareLeadActor(guess.leadActor, answer.leadActor, t),
    compareRuntime(guess.runtime, answer.runtime, t),
    compareBudget(guess.budget, answer.budget, t),
    comparePopularity(guess.popularity, answer.popularity, t, locale),
    compareRating(guess.rating, answer.rating, t),
  ];
}

function compareYear(guess: number, answer: number, t: Translations): ComparisonField {
  const diff = Math.abs(guess - answer);
  let status: MatchStatus = "miss";
  if (diff === 0) status = "exact";
  else if (diff <= 3) status = "partial";

  return {
    label: t.comparison.year,
    guessValue: String(guess),
    answerValue: String(answer),
    status,
    direction: getDirection(guess, answer),
  };
}

function compareGenres(guess: string[], answer: string[], t: Translations): ComparisonField {
  const guessSet = new Set(guess.map((g) => g.toLowerCase()));
  const answerSet = new Set(answer.map((g) => g.toLowerCase()));
  const common = [...guessSet].filter((g) => answerSet.has(g));

  let status: MatchStatus = "miss";
  if (common.length === answerSet.size && common.length === guessSet.size) {
    status = "exact";
  } else if (common.length > 0) {
    status = "partial";
  }

  return {
    label: t.comparison.genre,
    guessValue: localizeGenres(guess, t).join(", "),
    answerValue: localizeGenres(answer, t).join(", "),
    status,
  };
}

function compareCountry(
  guess: MediaDetails,
  answer: MediaDetails,
  t: Translations,
  locale: Locale,
): ComparisonField {
  const status: MatchStatus =
    guess.country.toLowerCase() === answer.country.toLowerCase()
      ? "exact"
      : "miss";

  return {
    label: t.comparison.country,
    guessValue: localizeCountry(
      guess.country,
      guess.countryCode,
      locale,
      t.common.unknown,
    ),
    answerValue: localizeCountry(
      answer.country,
      answer.countryCode,
      locale,
      t.common.unknown,
    ),
    status,
  };
}

function compareDirector(guess: string, answer: string, t: Translations): ComparisonField {
  const status: MatchStatus =
    guess.toLowerCase() === answer.toLowerCase() ? "exact" : "miss";

  return {
    label: t.comparison.director,
    guessValue: localizeUnknown(guess, t.common.unknown),
    answerValue: localizeUnknown(answer, t.common.unknown),
    status,
  };
}

function compareLeadActor(guess: string, answer: string, t: Translations): ComparisonField {
  const status: MatchStatus =
    guess.toLowerCase() === answer.toLowerCase() ? "exact" : "miss";

  return {
    label: t.comparison.leadActor,
    guessValue: localizeUnknown(guess, t.common.unknown),
    answerValue: localizeUnknown(answer, t.common.unknown),
    status,
  };
}

function compareRuntime(guess: number, answer: number, t: Translations): ComparisonField {
  const diff = Math.abs(guess - answer);
  let status: MatchStatus = "miss";
  if (diff === 0) status = "exact";
  else if (diff <= 15) status = "partial";

  return {
    label: t.comparison.runtime,
    guessValue: `${guess} min`,
    answerValue: `${answer} min`,
    status,
    direction: getDirection(guess, answer),
  };
}

function comparePopularity(
  guess: number,
  answer: number,
  t: Translations,
  locale: Locale,
): ComparisonField {
  const guessBucket = getPopularityBucket(guess);
  const answerBucket = getPopularityBucket(answer);
  const diff = Math.abs(guessBucket - answerBucket);

  let status: MatchStatus = "miss";
  if (diff === 0) status = "exact";
  else if (diff === 1) status = "partial";

  return {
    label: t.comparison.popularity,
    guessValue: formatVoteCount(guess, locale),
    answerValue: formatVoteCount(answer, locale),
    status,
    direction: getDirection(guess, answer),
  };
}

function compareBudget(guess: number, answer: number, t: Translations): ComparisonField {
  if (guess === 0 || answer === 0) {
    return {
      label: t.comparison.budget,
      guessValue: guess === 0 ? "?" : `$${guess}M`,
      answerValue: answer === 0 ? "?" : `$${answer}M`,
      status: guess === 0 && answer === 0 ? "exact" : "miss",
    };
  }

  const diff = Math.abs(guess - answer);
  const ratio = diff / Math.max(guess, answer);
  let status: MatchStatus = "miss";
  if (diff === 0) status = "exact";
  else if (ratio <= 0.25) status = "partial";

  return {
    label: t.comparison.budget,
    guessValue: `$${guess}M`,
    answerValue: `$${answer}M`,
    status,
    direction: getDirection(guess, answer),
  };
}

function compareRating(guess: number, answer: number, t: Translations): ComparisonField {
  const diff = Math.abs(guess - answer);
  let status: MatchStatus = "miss";
  if (diff <= 0.3) status = "exact";
  else if (diff <= 1.0) status = "partial";

  return {
    label: t.comparison.rating,
    guessValue: guess.toFixed(1),
    answerValue: answer.toFixed(1),
    status,
    direction: getDirection(guess, answer),
  };
}

function getDirection(guess: number, answer: number): Direction {
  if (guess === answer) return null;
  return guess < answer ? "up" : "down";
}

// Buckets are calibrated to TMDB `vote_count` (now stored in `popularity` — see tmdb.ts).
// Reference points: indie/obscure ~500, lesser-known ~2000, well-known ~8000,
// hits ~17000 (Green Mile), popular hits ~23000 (Shutter Island), blockbuster 35000+.
function getPopularityBucket(value: number): number {
  if (value < 1000) return 0;
  if (value < 5000) return 1;
  if (value < 12000) return 2;
  if (value < 25000) return 3;
  return 4;
}

function formatVoteCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-US").format(
    Math.max(0, Math.round(value)),
  );
}
