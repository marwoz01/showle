import type { GuessResult } from "@/types";

export function buildShareResult(
  dateKey: string,
  won: boolean,
  guesses: GuessResult[],
  origin: string,
  locale: "pl" | "en",
) {
  const squares = { exact: "🟩", partial: "🟨", miss: "⬛" } as const;
  const grid = [...guesses]
    .sort((a, b) => a.attemptNumber - b.attemptNumber)
    .map((guess) =>
      guess.comparison.map((field) => squares[field.status]).join(""),
    )
    .join("\n");
  return [
    `Showle · ${locale === "pl" ? "Film dnia" : "Daily movie"} · ${dateKey}`,
    `${won ? guesses.length : "X"}/7`,
    grid,
    `${origin}/play/movie`,
  ]
    .filter(Boolean)
    .join("\n");
}
