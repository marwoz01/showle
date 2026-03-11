"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MOCK_MOVIES } from "@/lib/mock-data";
import { getDailyMovie } from "@/lib/daily";
import { MAX_ATTEMPTS } from "@/constants";
import { useGame } from "@/hooks/useGame";
import { useTranslation } from "@/i18n";
import SearchBar from "@/components/game/SearchBar";
import GuessCard from "@/components/game/GuessCard";
import HintsPanel from "@/components/game/HintsPanel";
import ResultScreen from "@/components/game/ResultScreen";
import CountdownTimer from "@/components/game/CountdownTimer";
import { ChevronLeft, Flag } from "lucide-react";

export default function PlayMoviePage() {
  const { t } = useTranslation();
  const dailyAnswer = useMemo(() => getDailyMovie(), []);

  const {
    guesses,
    revealedHints,
    allHints,
    status,
    attemptCount,
    submitGuess,
    giveUp,
  } = useGame(dailyAnswer, t, MOCK_MOVIES);

  const isFinished = status === "won" || status === "lost";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft size={16} />
            {t.game.back}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {t.game.dailyMovie}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <CountdownTimer />

          <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-card px-3 py-2 text-sm">
            <span className="text-muted">{t.game.attempt}</span>
            <span className="font-bold text-foreground">
              {attemptCount}/{MAX_ATTEMPTS}
            </span>
          </div>

          {status === "playing" && (
            <button
              onClick={giveUp}
              className="inline-flex items-center gap-2 rounded-lg border border-match-miss/30 px-3 py-2 text-sm text-match-miss transition-colors hover:bg-match-miss/10"
            >
              <Flag size={16} />
              {t.game.giveUp}
            </button>
          )}
        </div>
      </div>

      {/* Search input */}
      {status === "playing" && <SearchBar onSelect={submitGuess} />}

      {/* Result screen */}
      {isFinished && (
        <ResultScreen
          answer={dailyAnswer}
          status={status}
          guesses={guesses}
          hintsUsed={revealedHints.length}
        />
      )}

      {/* Two-column layout: guesses + hints */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {guesses.length === 0 && status === "playing" && (
            <div className="rounded-2xl border border-dashed border-white/8 p-8 text-center text-sm text-muted">
              {t.game.emptyState}
            </div>
          )}
          {guesses.map((result) => (
            <GuessCard key={result.guess.id} result={result} />
          ))}
        </div>

        <div>
          <HintsPanel
            revealedHints={revealedHints}
            totalHints={allHints.length}
          />
        </div>
      </div>
    </div>
  );
}
