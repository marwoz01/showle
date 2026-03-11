"use client";

import Link from "next/link";
import { DAILY_ANSWER } from "@/lib/mock-data";
import { MAX_ATTEMPTS } from "@/constants";
import { useGame } from "@/hooks/useGame";
import { useTranslation } from "@/i18n";
import SearchBar from "@/components/game/SearchBar";
import GuessCard from "@/components/game/GuessCard";
import HintsPanel from "@/components/game/HintsPanel";
import { ChevronLeft, Flag, CheckCircle } from "lucide-react";

export default function PlayMoviePage() {
  const { t } = useTranslation();
  const {
    guesses,
    revealedHints,
    allHints,
    status,
    attemptCount,
    submitGuess,
    giveUp,
  } = useGame(DAILY_ANSWER, t);

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

      {/* Win / Lose banner */}
      {status === "won" && (
        <div className="rounded-2xl border border-match-exact/30 bg-match-exact/5 p-6 text-center">
          <h2 className="mb-1 inline-flex items-center gap-2 text-2xl font-bold text-match-exact">
            {t.game.won}
            <CheckCircle size={20} />
          </h2>
          <p className="text-sm text-muted">
            {t.game.wonMessage(DAILY_ANSWER.title, attemptCount)}
          </p>
        </div>
      )}

      {status === "lost" && (
        <div className="rounded-2xl border border-match-miss/30 bg-match-miss/5 p-6 text-center">
          <h2 className="mb-1 text-2xl font-bold text-match-miss">
            {t.game.lost}
          </h2>
          <p className="text-sm text-muted">
            {t.game.lostMessage(DAILY_ANSWER.title, DAILY_ANSWER.year)}
          </p>
        </div>
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
