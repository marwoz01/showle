"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { MediaDetails, GuessResult, Hint, GameStatus } from "@/types";
import { compareMedia } from "@/lib/comparer";
import { generateHints, getRevealedHints } from "@/lib/hints";
import { MAX_ATTEMPTS } from "@/constants";
import { Translations } from "@/i18n/types";
import { getTodayKey } from "@/lib/daily";

interface SavedGameState {
  dateKey: string;
  guessIds: number[];
  status: GameStatus;
}

const STORAGE_KEY = "showle-daily-movie";

function loadSavedState(): SavedGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: SavedGameState = JSON.parse(raw);
    if (saved.dateKey !== getTodayKey()) return null;
    return saved;
  } catch {
    return null;
  }
}

function saveState(guessIds: number[], status: GameStatus) {
  try {
    const state: SavedGameState = {
      dateKey: getTodayKey(),
      guessIds,
      status,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

interface UseGameReturn {
  guesses: GuessResult[];
  revealedHints: Hint[];
  allHints: Hint[];
  status: GameStatus;
  attemptCount: number;
  submitGuess: (guess: MediaDetails) => void;
  giveUp: () => void;
}

export function useGame(
  answer: MediaDetails,
  t: Translations,
  allMovies?: MediaDetails[]
): UseGameReturn {
  // Restore saved state on mount
  const [initialized, setInitialized] = useState(false);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");

  const allHints = useMemo(() => generateHints(answer, t), [answer, t]);
  const attemptCount = guesses.length;
  const revealedHints = useMemo(
    () => getRevealedHints(allHints, attemptCount),
    [allHints, attemptCount]
  );

  // Restore game from localStorage on first render
  useEffect(() => {
    const saved = loadSavedState();
    if (saved && allMovies) {
      const restoredGuesses: GuessResult[] = [];
      for (const id of saved.guessIds) {
        const movie = allMovies.find((m) => m.id === id);
        if (movie) {
          const comparison = compareMedia(movie, answer, t);
          const isCorrect = movie.id === answer.id;
          restoredGuesses.push({
            guess: movie,
            comparison,
            isCorrect,
            attemptNumber: restoredGuesses.length + 1,
          });
        }
      }
      // Display newest first
      setGuesses(restoredGuesses.reverse());
      setStatus(saved.status);
    }
    setInitialized(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state changes
  useEffect(() => {
    if (!initialized) return;
    const ids = guesses
      .slice()
      .reverse()
      .map((g) => g.guess.id);
    saveState(ids, status);
  }, [guesses, status, initialized]);

  const submitGuess = useCallback(
    (guess: MediaDetails) => {
      if (status !== "playing") return;
      if (guesses.some((g) => g.guess.id === guess.id)) return;

      const comparison = compareMedia(guess, answer, t);
      const isCorrect = guess.id === answer.id;
      const newAttempt = attemptCount + 1;

      const result: GuessResult = {
        guess,
        comparison,
        isCorrect,
        attemptNumber: newAttempt,
      };

      const newGuesses = [result, ...guesses];
      setGuesses(newGuesses);

      if (isCorrect) {
        setStatus("won");
      } else if (newAttempt >= MAX_ATTEMPTS) {
        setStatus("lost");
      }
    },
    [status, guesses, answer, t, attemptCount]
  );

  const giveUp = useCallback(() => {
    if (status === "playing") {
      setStatus("lost");
    }
  }, [status]);

  return {
    guesses,
    revealedHints,
    allHints,
    status,
    attemptCount,
    submitGuess,
    giveUp,
  };
}
