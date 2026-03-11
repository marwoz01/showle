"use client";

import { useState, useMemo } from "react";
import { MediaDetails, GuessResult, Hint, GameStatus } from "@/types";
import { compareMedia } from "@/lib/comparer";
import { generateHints, getRevealedHints } from "@/lib/hints";
import { MAX_ATTEMPTS } from "@/constants";
import { Translations } from "@/i18n/types";

interface UseGameReturn {
  guesses: GuessResult[];
  revealedHints: Hint[];
  allHints: Hint[];
  status: GameStatus;
  attemptCount: number;
  submitGuess: (guess: MediaDetails) => void;
  giveUp: () => void;
}

export function useGame(answer: MediaDetails, t: Translations): UseGameReturn {
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");

  const allHints = useMemo(() => generateHints(answer, t), [answer, t]);

  const attemptCount = guesses.length;

  const revealedHints = useMemo(
    () => getRevealedHints(allHints, attemptCount),
    [allHints, attemptCount]
  );

  function submitGuess(guess: MediaDetails) {
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

    setGuesses((prev) => [result, ...prev]);

    if (isCorrect) {
      setStatus("won");
    } else if (newAttempt >= MAX_ATTEMPTS) {
      setStatus("lost");
    }
  }

  function giveUp() {
    if (status === "playing") {
      setStatus("lost");
    }
  }

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
