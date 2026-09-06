"use client";

import Link from "next/link";
import { MAX_ATTEMPTS } from "@/constants";
import { useGame } from "@/hooks/useGame";
import { useTranslation } from "@/i18n";
import GuessCard from "@/components/game/GuessCard";
import DailyPlayArea from "@/components/game/DailyPlayArea";
import ResultScreen from "@/components/game/ResultScreen";
import CountdownTimer from "@/components/game/CountdownTimer";
import { ChevronLeft, Flag, Loader2 } from "@/components/ui/icons";

export default function PlayMoviePage() {
  const { t, locale } = useTranslation();
  const {
    game,
    loading,
    pending,
    error,
    celebrate,
    refresh,
    submitGuess,
    giveUp,
  } = useGame();
  if (loading)
    return (
      <div className="flex min-h-96 items-center justify-center" role="status">
        <Loader2 size={32} className="animate-spin text-muted" />
        <span className="sr-only">
          {locale === "pl" ? "Wczytywanie gry" : "Loading game"}
        </span>
      </div>
    );
  if (!game)
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4">
        <p role="alert" className="text-muted">
          {t.game.loadError}
        </p>
        <button onClick={() => void refresh()} className="text-accent-purple">
          {locale === "pl" ? "Spróbuj ponownie" : "Try again"}
        </button>
      </div>
    );
  const { status, guesses, hints, answer } = game;
  const finished = status !== "playing";
  return (
    <div className="space-y-3 lg:space-y-8">
      <header className="space-y-3 lg:space-y-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ChevronLeft size={16} />
            {t.game.back}
          </Link>
          <h1 className="text-2xl font-bold">{t.game.dailyMovie}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <div className={finished ? "" : "hidden lg:block"}><CountdownTimer /></div>
          <div className="rounded-lg bg-card px-3 py-2 text-sm">
            <span className="text-muted">{t.game.attempt} </span>
            <b>
              {guesses.length}/{MAX_ATTEMPTS}
            </b>
          </div>
          {!finished && (
            <button
              disabled={pending}
              onClick={() => void giveUp()}
              className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-match-miss/10 hover:text-match-miss disabled:opacity-40 lg:ml-0"
            >
              <Flag size={16} />
              {t.game.giveUp}
            </button>
          )}
        </div>
      </header>
      {finished && error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-xl bg-match-miss/10 p-4 text-sm"
        >
          <p>
            {locale === "pl"
              ? "Nie udało się odczytać lub zapisać próby. Sprawdź połączenie i odśwież stan gry."
              : "Could not load or save your guess. Check your connection and reload the game."}
          </p>
          <button
            disabled={pending}
            onClick={() => void refresh()}
            className="shrink-0 underline"
          >
            {locale === "pl" ? "Odśwież" : "Reload"}
          </button>
        </div>
      )}
      {!finished && (
        <DailyPlayArea key={`${game.dateKey}:${locale}`} game={game} pending={pending} error={error} onGuess={submitGuess} onRefresh={refresh} />
      )}
      {finished && answer && (
        <ResultScreen
          answer={answer}
          localizedAnswer={answer}
          status={status}
          guesses={guesses}
          hintsUsed={hints.length}
          celebrate={celebrate}
          dateKey={game.dateKey}
        />
      )}
      {finished && (
        <div className="space-y-4">
          {guesses.map((result) => (
            <GuessCard key={result.guess.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
