import type { DuelMovieCandidate } from "@/lib/tmdb";

export const DUEL_ROUNDS = 6;
export const DUEL_ROUND_MS = 15_000;
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

  const pool = shuffle([...candidates], random);
  const targets = pool.slice(0, DUEL_ROUNDS);

  return targets.map((target) => {
    const distractors = shuffle(
      pool.filter((movie) => movie.id !== target.id),
      random,
    ).slice(0, 3);
    const options = shuffle([target, ...distractors], random).map((movie) => ({
      movieId: movie.id,
      title: movie.title,
      year: movie.year,
    }));

    return {
      movieId: target.id,
      imagePath: target.backdropPath,
      options,
      correctIndex: options.findIndex((option) => option.movieId === target.id),
    };
  });
}

export function createRoomCode(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(random() * alphabet.length)],
  ).join("");
}

function shuffle<T>(values: T[], random: () => number): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}
