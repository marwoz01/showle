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

async function syncToServer(
  status: GameStatus,
  guessIds: number[],
  hintsUsed: number,
  isComplete: boolean
) {
  const dateKey = getTodayKey();
  const endpoint = isComplete ? "/api/game/complete" : "/api/game/state";
  const method = isComplete ? "POST" : "PUT";

  try {
    await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateKey,
        mode: "daily-movie",
        status,
        guessIds,
        attemptCount: guessIds.length,
        hintsUsed,
      }),
    });
  } catch {
    // Silently fail — localStorage is the primary store
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
  userId?: string
): UseGameReturn {
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
    async function restore() {
      const saved = loadSavedState();
      if (saved && saved.guessIds.length > 0) {
        try {
          const movies = await Promise.all(
            saved.guessIds.map(async (id) => {
              const res = await fetch(`/api/movies/details?id=${id}`);
              if (!res.ok) return null;
              return (await res.json()) as MediaDetails;
            })
          );

          const restoredGuesses: GuessResult[] = [];
          for (const movie of movies) {
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
          setGuesses(restoredGuesses.reverse());
          setStatus(saved.status);
        } catch {
          // Ignore restore errors, start fresh
        }
      }
      setInitialized(true);
    }

    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state changes to localStorage
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

      const newStatus = isCorrect
        ? "won"
        : newAttempt >= MAX_ATTEMPTS
          ? "lost"
          : "playing";

      if (isCorrect) setStatus("won");
      else if (newAttempt >= MAX_ATTEMPTS) setStatus("lost");

      // Sync to server for logged-in users
      if (userId) {
        const ids = newGuesses
          .slice()
          .reverse()
          .map((g) => g.guess.id);
        const hintsCount = getRevealedHints(allHints, newAttempt).length;
        const isComplete = newStatus === "won" || newStatus === "lost";
        syncToServer(newStatus, ids, hintsCount, isComplete).then(() => {
          if (isComplete) {
            window.dispatchEvent(new Event("game-completed"));
          }
        });
      } else if (newStatus === "won" || newStatus === "lost") {
        window.dispatchEvent(new Event("game-completed"));
      }
    },
    [status, guesses, answer, t, attemptCount, userId, allHints]
  );

  const giveUp = useCallback(() => {
    if (status === "playing") {
      setStatus("lost");

      if (userId) {
        const ids = guesses
          .slice()
          .reverse()
          .map((g) => g.guess.id);
        syncToServer("lost", ids, revealedHints.length, true).then(() => {
          window.dispatchEvent(new Event("game-completed"));
        });
      } else {
        window.dispatchEvent(new Event("game-completed"));
      }
    }
  }, [status, userId, guesses, revealedHints]);

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
