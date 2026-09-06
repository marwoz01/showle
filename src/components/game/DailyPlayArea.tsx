"use client";

import { useId, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { getGuessReceipt, getRevealedFields, type GuessReceipt } from "@/lib/daily-game-feedback";
import { normalizeDisplayText } from "@/lib/typography";
import type { DailyGameView } from "@/types/daily-game";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import SearchBar from "@/components/game/SearchBar";
import GuessCard from "@/components/game/GuessCard";
import MovieRevealCard from "@/components/game/MovieRevealCard";
import HintsPanel from "@/components/game/HintsPanel";
import DailyMobileTabs, { type DailyPanel } from "@/components/game/DailyMobileTabs";
import DailyMobileContent from "@/components/game/DailyMobileContent";
import { Check, Lightbulb, Loader2, Search } from "@/components/ui/icons";

interface DailyPlayAreaProps {
  game: DailyGameView;
  pending: boolean;
  error: boolean;
  onGuess: (movie: MovieSuggestion) => Promise<DailyGameView | undefined>;
  onRefresh: () => Promise<void>;
}

export default function DailyPlayArea({ game, pending, error, onGuess, onRefresh }: DailyPlayAreaProps) {
  const { t, locale } = useTranslation();
  const [panel, setPanel] = useState<DailyPanel>("guesses");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<GuessReceipt | null>(null);
  const [seenHints, setSeenHints] = useState(game.hints.length);
  const regionRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const newHint = game.hints.length > seenHints;
  const receiptMovie = game.guesses.find((result) => result.guess.id === receipt?.movieId)?.guess;

  function showMobileStart() {
    if (window.matchMedia("(max-width: 63.999rem)").matches) {
      requestAnimationFrame(() => regionRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
    }
  }

  function changePanel(next: DailyPanel) {
    setPanel(next);
    if (next === "hints") setSeenHints(game.hints.length);
    showMobileStart();
  }

  async function selectMovie(movie: MovieSuggestion) {
    setReceipt(null);
    const next = await onGuess(movie);
    const confirmation = getGuessReceipt(game, next, movie.id);
    if (!confirmation) return;
    setReceipt(confirmation);
    setSelectedId(movie.id);
    setPanel("guesses");
    // Show the saved comparison after the keyboard closes, not the old scroll position.
    showMobileStart();
  }

  return (
    <div ref={regionRef} className="relative min-h-[calc(100svh-4rem)] scroll-mt-16 space-y-3 lg:min-h-0 lg:space-y-6" data-daily-play-area>
      <div className="sticky top-14 z-30 -mx-1 space-y-2 bg-background px-1 py-2 lg:static lg:z-auto lg:mx-0 lg:bg-transparent lg:p-0" data-daily-controls>
        <SearchBar onSelect={selectMovie} disabled={pending || error} dismissKeyboardOnSelect />
        <div role="status" aria-live="polite" aria-atomic="true">
          {pending ? (
            <p className="flex min-h-9 items-center gap-2 px-2 text-xs text-muted"><Loader2 size={14} className="animate-spin" />{t.game.mobile.checking}</p>
          ) : !error && receipt && receiptMovie ? (
            <div className="flex min-h-9 items-center gap-2 rounded-xl bg-accent-purple/10 px-3 py-2 text-xs">
              <Check size={14} className="shrink-0 text-accent-purple" />
              <p className="min-w-0">
                <span className="font-semibold">{receipt.kind === "accepted" ? t.game.mobile.accepted(receipt.attemptNumber) : t.game.mobile.duplicate(receipt.attemptNumber)}</span>
                <span className="block truncate text-muted">{normalizeDisplayText(receiptMovie.title)}</span>
                {receipt.hintsUnlocked > 0 && <span className="sr-only">{t.game.mobile.newHint}</span>}
              </p>
            </div>
          ) : null}
        </div>
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl bg-match-miss/10 p-3 text-xs">
            <p>{t.game.mobile.saveError}</p>
            <button type="button" disabled={pending} onClick={() => void onRefresh()} className="min-h-11 shrink-0 px-2 underline disabled:opacity-50">{t.game.mobile.reload}</button>
          </div>
        )}
        <DailyMobileTabs id={id} active={panel} counts={{ guesses: game.guesses.length, hints: game.hints.length, revealed: getRevealedFields(game.guesses).length }} newHint={newHint} onChange={changePanel} />
      </div>

      <div className="lg:hidden">
        {newHint && panel !== "hints" && (
          <button type="button" onClick={() => changePanel("hints")} className="mb-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-accent-purple/10 px-3 text-xs font-semibold text-accent-purple">
            <span className="flex items-center gap-2"><Lightbulb size={16} />{t.game.mobile.newHint}</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
        {(["guesses", "hints", "revealed"] as const).map((item) => (
          <div key={item} id={`${id}-${item}-panel`} role="tabpanel" aria-labelledby={`${id}-${item}-tab`} hidden={panel !== item} tabIndex={0} className="rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent-purple">
            {panel === item && <DailyMobileContent game={game} panel={panel} selectedId={selectedId} onSelectGuess={(movieId) => { setSelectedId(movieId); showMobileStart(); }} />}
          </div>
        ))}
      </div>

      <div className="hidden space-y-6 lg:block">
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">{experience[locale].comparisonTitle}</summary>
          <p className="mt-2 max-w-3xl leading-relaxed">{experience[locale].comparisonHelp}</p>
        </details>
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-4">
            <MovieRevealCard guesses={game.guesses} answer={game.revealedPeople} />
            {!game.guesses.length && <div className="soft-card rounded-2xl px-6 py-8 text-center"><Search size={20} className="mx-auto mb-3 text-accent-purple" /><p className="text-sm text-muted">{t.game.emptyState}</p></div>}
            {game.guesses.map((result) => <GuessCard key={result.guess.id} result={result} />)}
          </div>
          <div className="2xl:sticky 2xl:top-8 2xl:self-start"><HintsPanel revealedHints={game.hints} totalHints={3} /></div>
        </div>
      </div>
    </div>
  );
}
