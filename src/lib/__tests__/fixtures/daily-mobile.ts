import type { GuessResult, MediaDetails } from "@/types";
import type { DailyGameView } from "@/types/daily-game";
import type { Translations } from "@/i18n/types";
import pl from "@/i18n/pl";

export const sampleMovie: MediaDetails = {
  id: 1, title: "Eternal Sunshine of the Spotless Mind", type: "movie", year: 2004,
  genres: ["Science Fiction", "Drama", "Romance"], country: "United States", director: "Michel Gondry",
  leadActor: "Jim Carrey", runtime: 108, budget: 20, popularity: 16680, rating: 8.1, posterPath: "", overview: "",
};

export function mobileGuess(attempt: number, t: Translations = pl): GuessResult {
  const values = ["2004", t === pl ? "Fantastyka naukowa, Dramat, Romans" : "Science Fiction, Drama, Romance", t === pl ? "Stany Zjednoczone" : "United States", "Michel Gondry", "Jim Carrey", "108 min", "$20M", "16 680", "8.1"];
  return {
    guess: { ...sampleMovie, id: attempt, title: attempt % 2 ? "Eternal Sunshine of the Spotless Mind" : "The Notebook" },
    attemptNumber: attempt, isCorrect: false,
    comparison: Object.values(t.comparison).map((label, index) => ({
      label, guessValue: values[index], answerValue: index > 6 ? values[index] : "",
      status: index > 6 ? "exact" : index === 1 ? "partial" : "miss",
      direction: index === 0 ? "up" : index === 5 || index === 6 ? "down" : null,
    })),
  };
}

export function mobileGame(attempts = 0, t: Translations = pl): DailyGameView {
  return {
    dateKey: "2026-09-06", status: "playing", answer: null, revealedPeople: {},
    guesses: Array.from({ length: attempts }, (_, i) => mobileGuess(attempts - i, t)),
    hints: [
      { id: 1, type: "genre" as const, content: t.hints.genresAre(t === pl ? "Romans, Dramat" : "Romance, Drama"), revealedAt: 2 },
      { id: 2, type: "director" as const, content: t.hints.directorIs("Luca Guadagnino"), revealedAt: 4 },
      { id: 3, type: "trivia" as const, content: "Somewhere in Northern Italy.", revealedAt: 6 },
    ].filter((hint) => hint.revealedAt <= attempts),
  };
}
