import type { DuelMovieCandidate } from "@/types/frame-catalog";

export const DUEL_ROUNDS = 6;
export const DUEL_ROUND_MS = 10_000;
export const DUEL_REVEAL_MS = 2_500;

export interface DuelOption {
  movieId: number;
  title: string;
  year: number;
}

export interface DuelQuestion {
  movieId: number;
  imagePath: string;
  options: DuelOption[];
  correctIndex: number;
}

export function createDuelQuestions(
  candidates: DuelMovieCandidate[],
  random: () => number = Math.random,
): DuelQuestion[] {
  if (candidates.length < DUEL_ROUNDS + 3) {
    throw new Error("Not enough movies to create a duel");
  }

  const neighbors = getNeighbors(candidates);
  const pool = candidates.filter(
    (movie) =>
      movie.frames.length && (neighbors.get(movie.id)?.length ?? 0) >= 3,
  );
  const targets = shuffle(
    [...new Map(pool.map((movie) => [movie.id, movie])).values()],
    random,
  ).slice(0, DUEL_ROUNDS);
  if (targets.length < DUEL_ROUNDS) {
    throw new Error("Not enough movies with plausible distractors");
  }

  return targets.map((target) => {
    // Small jitter among the closest matches adds variety without random outliers.
    const distractors = neighbors
      .get(target.id)!
      .slice(0, 6)
      .map(({ movie, score }) => ({ movie, score: score + random() * 6 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ movie }) => movie);
    const options = shuffle([target, ...distractors], random).map((movie) => ({
      movieId: movie.id,
      title: movie.title,
      year: movie.year,
    }));

    return {
      movieId: target.id,
      imagePath: target.frames[Math.floor(random() * target.frames.length)],
      options,
      correctIndex: options.findIndex((option) => option.movieId === target.id),
    };
  });
}

const neighborCache = new WeakMap<
  DuelMovieCandidate[],
  Map<number, { movie: DuelMovieCandidate; score: number }[]>
>();

/** No animation/live-action, horror/non-horror or sci-fi/non-sci-fi giveaways. */
export function distractorScore(
  target: DuelMovieCandidate,
  candidate: DuelMovieCandidate,
): number | null {
  if (
    candidate.id === target.id ||
    candidate.title.toLocaleLowerCase() === target.title.toLocaleLowerCase()
  )
    return null;
  if (
    [16, 27, 878, 10752, 37].some(
      (genre) =>
        target.genreIds.includes(genre) !== candidate.genreIds.includes(genre),
    )
  )
    return null;
  const sharedGenres = target.genreIds.filter((genre) =>
    candidate.genreIds.includes(genre),
  );
  const yearGap = Math.abs(target.year - candidate.year);
  if (!sharedGenres.length || yearGap > 20) return null;
  const genreWeight = (genre: number) => (genre === 18 || genre === 35 ? 1 : 2);
  const overlap = sharedGenres.reduce(
    (sum, genre) => sum + genreWeight(genre),
    0,
  );
  const total = [...target.genreIds, ...candidate.genreIds].reduce(
    (sum, genre) => sum + genreWeight(genre),
    0,
  );
  const sharedKeywords = target.keywordIds.filter((id) =>
    candidate.keywordIds.includes(id),
  ).length;
  const sharedCast = target.castIds.filter((id) =>
    candidate.castIds.includes(id),
  ).length;
  return (
    36 * ((2 * overlap) / total) +
    Math.max(0, 12 - yearGap * 0.6) +
    Math.min(18, sharedKeywords * 3) +
    Math.min(10, sharedCast * 5) +
    (target.directorIds.some((id) => candidate.directorIds.includes(id))
      ? 8
      : 0) +
    (target.language === candidate.language ? 6 : 0) +
    (target.collectionId && target.collectionId === candidate.collectionId
      ? 12
      : 0) +
    (target.relatedMovieIds?.includes(candidate.id) ? 40 : 0)
  );
}

function getNeighbors(candidates: DuelMovieCandidate[]) {
  const cached = neighborCache.get(candidates);
  if (cached) return cached;
  const neighbors = new Map<
    number,
    { movie: DuelMovieCandidate; score: number }[]
  >();
  for (const target of candidates) {
    const seen = new Set<string>();
    const ranked = candidates
      .flatMap((movie) => {
        const score = distractorScore(target, movie);
        return score === null ? [] : [{ movie, score }];
      })
      .sort((a, b) => b.score - a.score || a.movie.id - b.movie.id);
    neighbors.set(
      target.id,
      ranked
        .filter(({ movie }) => {
          const title = movie.title.toLocaleLowerCase();
          if (seen.has(title)) return false;
          seen.add(title);
          return true;
        })
        .slice(0, 6),
    );
  }
  neighborCache.set(candidates, neighbors);
  return neighbors;
}

export function createRoomCode(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(random() * alphabet.length)],
  ).join("");
}

export function calculateDuelPoints(remainingMs: number): number {
  const timeRatio = Math.min(1, Math.max(0, remainingMs / DUEL_ROUND_MS));
  return Math.round(500 + timeRatio * 500);
}

function shuffle<T>(values: T[], random: () => number): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}
