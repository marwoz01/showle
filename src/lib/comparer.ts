import { MediaDetails, ComparisonField, MatchStatus, Direction } from "@/types";
import { Translations } from "@/i18n/types";

export function compareMedia(
  guess: MediaDetails,
  answer: MediaDetails,
  t: Translations
): ComparisonField[] {
  return [
    compareYear(guess.year, answer.year, t),
    compareGenres(guess.genres, answer.genres, t),
    compareCountry(guess.country, answer.country, t),
    compareDirector(guess.director, answer.director, t),
    compareRuntime(guess.runtime, answer.runtime, t),
    comparePopularity(guess.popularity, answer.popularity, t),
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
    guessValue: guess.join(", "),
    answerValue: answer.join(", "),
    status,
  };
}

function compareCountry(guess: string, answer: string, t: Translations): ComparisonField {
  const status: MatchStatus =
    guess.toLowerCase() === answer.toLowerCase() ? "exact" : "miss";

  return {
    label: t.comparison.country,
    guessValue: guess,
    answerValue: answer,
    status,
  };
}

function compareDirector(guess: string, answer: string, t: Translations): ComparisonField {
  const status: MatchStatus =
    guess.toLowerCase() === answer.toLowerCase() ? "exact" : "miss";

  return {
    label: t.comparison.director,
    guessValue: guess,
    answerValue: answer,
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

function comparePopularity(guess: number, answer: number, t: Translations): ComparisonField {
  const guessBucket = getPopularityBucket(guess);
  const answerBucket = getPopularityBucket(answer);
  const diff = Math.abs(guessBucket - answerBucket);

  let status: MatchStatus = "miss";
  if (diff === 0) status = "exact";
  else if (diff === 1) status = "partial";

  return {
    label: t.comparison.popularity,
    guessValue: getPopularityLabel(guess, t),
    answerValue: getPopularityLabel(answer, t),
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

function getPopularityBucket(value: number): number {
  if (value < 20) return 0;
  if (value < 50) return 1;
  if (value < 100) return 2;
  if (value < 200) return 3;
  return 4;
}

function getPopularityLabel(value: number, t: Translations): string {
  if (value < 20) return t.popularity.low;
  if (value < 50) return t.popularity.medium;
  if (value < 100) return t.popularity.high;
  if (value < 200) return t.popularity.veryHigh;
  return t.popularity.mega;
}
