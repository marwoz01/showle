import "server-only";
import { randomInt } from "node:crypto";
import { isRecord } from "@/lib/request-body";
import type {
  HigherLowerCatalogMovie,
  HigherLowerChoice,
  HigherLowerGameView,
  HigherLowerLocale,
  HigherLowerOutcome,
  HigherLowerRequest,
  HigherLowerStatus,
} from "@/types/higher-lower";

export const HIGHER_LOWER_SESSION_MS = 24 * 60 * 60 * 1000;
export const HIGHER_LOWER_MAX_TOKEN_LENGTH = 32_000;
export const HIGHER_LOWER_MAX_BODY_BYTES = 34_000;
const RECENT_MOVIE_COUNT = 12;

export class HigherLowerError extends Error {
  constructor(public readonly code: "invalid_request" | "invalid_session" | "game_unavailable") {
    super(code);
  }
}

export interface HigherLowerRun {
  version: 2;
  catalogVersion: string;
  expiresAt: number;
  round: number;
  score: number;
  status: HigherLowerStatus;
  outcome: HigherLowerOutcome | null;
  leftId: number;
  rightId: number;
  seenIds: number[];
  recentIds: number[];
}

export function parseHigherLowerRequest(value: unknown): HigherLowerRequest {
  if (!isRecord(value) || (value.locale !== "pl" && value.locale !== "en")) {
    throw new HigherLowerError("invalid_request");
  }
  const { action, locale } = value;
  const allowedKeys = action === "answer" ? ["action", "locale", "token", "choice"]
    : action === "next" || action === "resume" ? ["action", "locale", "token"] : ["action", "locale"];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    throw new HigherLowerError("invalid_request");
  }
  if (action === "start") return { action, locale };
  if (typeof value.token !== "string" || !value.token.length || value.token.length > HIGHER_LOWER_MAX_TOKEN_LENGTH) {
    throw new HigherLowerError("invalid_request");
  }
  if (action === "next" || action === "resume") return { action, locale, token: value.token };
  if (action === "answer" && (value.choice === "higher" || value.choice === "lower")) {
    return { action, locale, token: value.token, choice: value.choice };
  }
  throw new HigherLowerError("invalid_request");
}

function movieById(movies: readonly HigherLowerCatalogMovie[], id: number): HigherLowerCatalogMovie {
  const movie = movies.find((item) => item.id === id);
  if (!movie) throw new HigherLowerError("invalid_session");
  return movie;
}

/** Prefer readable differences at first, closer comparisons once the streak grows. */
export function selectNextMovie(
  movies: readonly HigherLowerCatalogMovie[],
  left: HigherLowerCatalogMovie,
  seenIds: readonly number[],
  score: number,
  draw: (max: number) => number = randomInt,
): HigherLowerCatalogMovie {
  const seen = new Set(seenIds);
  const available = movies.filter((movie) => movie.id !== left.id && !seen.has(movie.id));
  if (!available.length) throw new HigherLowerError("game_unavailable");
  const [minGap, maxGap] = score < 5 ? [10, 40] : score < 12 ? [4, 20] : [1, 10];
  const preferred = available.filter((movie) => {
    const gap = Math.abs(movie.year - left.year);
    return gap >= minGap && gap <= maxGap;
  });
  // Ties are fair; prefer distinct eras before introducing close release years.
  const readable = available.filter((movie) => {
    const gap = Math.abs(movie.year - left.year);
    return gap === 0 || gap >= minGap;
  });
  const candidates = preferred.length ? preferred : readable.length ? readable : available;
  const higher = candidates.filter((movie) => movie.year > left.year);
  const lower = candidates.filter((movie) => movie.year < left.year);
  const balanced = higher.length && lower.length ? (draw(2) === 0 ? higher : lower) : candidates;
  return balanced[draw(balanced.length)];
}

export function startHigherLowerRun(
  movies: readonly HigherLowerCatalogMovie[],
  catalogVersion: string,
  now = Date.now(),
  draw: (max: number) => number = randomInt,
): HigherLowerRun {
  if (movies.length < 2) throw new HigherLowerError("game_unavailable");
  const left = movies[draw(movies.length)];
  const right = selectNextMovie(movies, left, [left.id], 0, draw);
  return {
    version: 2, catalogVersion, expiresAt: now + HIGHER_LOWER_SESSION_MS,
    round: 1, score: 0, status: "guessing", outcome: null,
    leftId: left.id, rightId: right.id,
    seenIds: [left.id, right.id], recentIds: [left.id, right.id],
  };
}

export function validateHigherLowerRun(
  value: unknown,
  movies: readonly HigherLowerCatalogMovie[],
  catalogVersion: string,
  now = Date.now(),
): HigherLowerRun {
  const invalid = () => { throw new HigherLowerError("invalid_session"); };
  if (!isRecord(value) || value.version !== 2 || value.catalogVersion !== catalogVersion) return invalid();
  const ids = new Set(movies.map((movie) => movie.id));
  const validIds = (list: unknown, maximum: number) => Array.isArray(list)
    && list.length >= 2 && list.length <= maximum
    && new Set(list).size === list.length
    && list.every((id) => Number.isSafeInteger(id) && ids.has(id));
  if (typeof value.expiresAt !== "number" || !Number.isSafeInteger(value.expiresAt)
    || value.expiresAt <= now || value.expiresAt > now + HIGHER_LOWER_SESSION_MS
    || typeof value.round !== "number" || !Number.isSafeInteger(value.round) || value.round < 1
    || typeof value.score !== "number" || !Number.isSafeInteger(value.score) || value.score < 0
    || typeof value.leftId !== "number" || !ids.has(value.leftId)
    || typeof value.rightId !== "number" || !ids.has(value.rightId) || value.leftId === value.rightId
    || !validIds(value.seenIds, movies.length)
    || !validIds(value.recentIds, Math.min(RECENT_MOVIE_COUNT, movies.length))) return invalid();
  const run = value as unknown as HigherLowerRun;
  if (!run.seenIds.includes(run.leftId) || !run.seenIds.includes(run.rightId)
    || run.recentIds.at(-2) !== run.leftId || run.recentIds.at(-1) !== run.rightId) return invalid();
  if (run.status === "guessing") {
    if (run.outcome !== null || run.score !== run.round - 1) return invalid();
  } else if (run.status === "revealed") {
    if ((run.outcome !== "correct" && run.outcome !== "equal") || run.score !== run.round) return invalid();
  } else if (run.status === "finished") {
    if (run.outcome !== "wrong" || run.score !== run.round - 1) return invalid();
  } else return invalid();
  return run;
}

export function answerHigherLowerRun(
  run: HigherLowerRun,
  movies: readonly HigherLowerCatalogMovie[],
  choice: HigherLowerChoice,
): HigherLowerRun {
  if (run.status !== "guessing") throw new HigherLowerError("invalid_session");
  const left = movieById(movies, run.leftId);
  const right = movieById(movies, run.rightId);
  const equal = left.year === right.year;
  const correct = equal || (choice === "higher" ? right.year > left.year : right.year < left.year);
  return {
    ...run, score: run.score + (correct ? 1 : 0),
    status: correct ? "revealed" : "finished",
    outcome: equal ? "equal" : correct ? "correct" : "wrong",
  };
}

export function nextHigherLowerRound(
  run: HigherLowerRun,
  movies: readonly HigherLowerCatalogMovie[],
  draw: (max: number) => number = randomInt,
): HigherLowerRun {
  if (run.status !== "revealed") throw new HigherLowerError("invalid_session");
  const left = movieById(movies, run.rightId);
  // Once the full pool has appeared, retain a recent window before cycling again.
  const hasUnseen = movies.some((movie) => !run.seenIds.includes(movie.id));
  const retained = Math.min(RECENT_MOVIE_COUNT, movies.length - 1);
  const seenIds = hasUnseen ? run.seenIds : run.recentIds.slice(-retained);
  const right = selectNextMovie(movies, left, seenIds, run.score, draw);
  return {
    ...run, round: run.round + 1, status: "guessing", outcome: null,
    leftId: left.id, rightId: right.id, seenIds: [...seenIds, right.id],
    recentIds: [...run.recentIds.filter((id) => id !== right.id), right.id].slice(-RECENT_MOVIE_COUNT),
  };
}

export function getHigherLowerView(
  run: HigherLowerRun,
  movies: readonly HigherLowerCatalogMovie[],
  locale: HigherLowerLocale,
): HigherLowerGameView {
  const left = movieById(movies, run.leftId);
  const right = movieById(movies, run.rightId);
  const movieView = (movie: HigherLowerCatalogMovie) => ({
    id: movie.id, title: movie.titles[locale], year: movie.year,
    backdropPath: movie.backdropPath,
  });
  return {
    round: run.round, score: run.score, status: run.status, outcome: run.outcome,
    left: movieView(left),
    right: { ...movieView(right), year: run.status === "guessing" ? null : right.year },
  };
}
