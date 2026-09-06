import type { DailyGameView } from "@/types/daily-game";
import type { ComparisonField, GuessResult } from "@/types";

export interface GuessReceipt {
  kind: "accepted" | "duplicate";
  movieId: number;
  attemptNumber: number;
  hintsUnlocked: number;
}

export function getGuessReceipt(
  previous: DailyGameView,
  next: DailyGameView | undefined,
  movieId: number,
): GuessReceipt | null {
  if (!next || previous.dateKey !== next.dateKey) return null;
  const guess = next.guesses.find((result) => result.guess.id === movieId);
  if (!guess) return null;
  const duplicate = previous.guesses.some((result) => result.guess.id === movieId);
  return {
    kind: duplicate ? "duplicate" : "accepted",
    movieId,
    attemptNumber: guess.attemptNumber,
    hintsUnlocked: duplicate ? 0 : Math.max(0, next.hints.length - previous.hints.length),
  };
}

export function getRevealedFields(guesses: GuessResult[]): ComparisonField[] {
  const revealed = new Map<string, ComparisonField>();
  for (const result of guesses) {
    for (const field of result.comparison) {
      // Never expose a non-exact answer, including in completed-game fixtures.
      if (field.status === "exact" && field.answerValue && !revealed.has(field.label)) {
        revealed.set(field.label, field);
      }
    }
  }
  return [...revealed.values()];
}
