"use client";

import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { getRevealedFields } from "@/lib/daily-game-feedback";
import { normalizeDisplayText } from "@/lib/typography";
import type { DailyGameView } from "@/types/daily-game";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import type { DailyPanel } from "@/components/game/DailyMobileTabs";
import CompactClues from "@/components/game/CompactClues";
import GuessCard from "@/components/game/GuessCard";
import PendingGuessCard from "@/components/game/PendingGuessCard";
import HintsPanel from "@/components/game/HintsPanel";
import { Film } from "@/components/ui/icons";

interface DailyMobileContentProps {
  game: DailyGameView;
  panel: DailyPanel;
  selectedId: number | null;
  animatedGuessId?: number;
  pendingMovie?: MovieSuggestion | null;
  onSelectGuess: (id: number) => void;
}

export default function DailyMobileContent({ game, panel, selectedId, animatedGuessId, pendingMovie, onSelectGuess }: DailyMobileContentProps) {
  const { t, locale } = useTranslation();
  const { guesses, hints } = game;
  const ordered = [...guesses].sort((a, b) => a.attemptNumber - b.attemptNumber);
  const latest = ordered.at(-1);
  const selected = guesses.find((guess) => guess.guess.id === selectedId) ?? latest;
  const revealed = getRevealedFields(guesses);

  return (
    <div className="space-y-3">
      {panel === "guesses" && (pendingMovie || selected ? (
        <section className="space-y-3">
          {ordered.length > 0 && <div role="group" aria-label={t.game.mobile.chooseGuess} className="grid grid-cols-3 gap-1.5 min-[360px]:grid-cols-6">
            {ordered.map((result) => (
              <button
                key={result.guess.id}
                type="button"
                aria-label={t.game.mobile.showGuess(result.attemptNumber, normalizeDisplayText(result.guess.title))}
                aria-pressed={!pendingMovie && selected?.guess.id === result.guess.id}
                disabled={Boolean(pendingMovie)}
                onClick={() => onSelectGuess(result.guess.id)}
                className={`min-h-11 min-w-10 rounded-xl px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${!pendingMovie && selected?.guess.id === result.guess.id ? "bg-accent-purple text-white" : "bg-white/5 text-muted hover:bg-white/10"}`}
              >
                #{result.attemptNumber}
              </button>
            ))}
          </div>}
          {pendingMovie ? <PendingGuessCard movie={pendingMovie} headingLevel={2} /> : selected && <>
            <p className="px-2 text-[10px] text-muted">{selected === latest ? t.game.mobile.latestGuess : `${t.game.attempt} ${selected.attemptNumber}`}</p>
            <GuessCard key={selected.guess.id} result={selected} headingLevel={2} animate={selected.guess.id === animatedGuessId} />
          </>}
        </section>
      ) : (
        <section className="soft-card rounded-3xl px-5 py-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-purple/15 text-accent-purple"><Film size={24} /></span>
          <h2 className="font-display text-lg font-semibold">{t.game.mobile.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-72 text-sm leading-6 text-muted">{t.game.mobile.emptyHelp}</p>
        </section>
      ))}
      {panel === "hints" && <HintsPanel revealedHints={hints} totalHints={3} showUnlockAt />}
      {panel === "revealed" && (
        <section className="soft-card space-y-4 rounded-3xl p-3">
          <p className="px-1 text-xs leading-5 text-muted">{t.game.mobile.revealedHelp}</p>
          <CompactClues fields={Object.values(t.comparison).map((label) => {
            const field = revealed.find((item) => item.label === label);
            return { label, value: field?.answerValue ?? "?", status: field ? "exact" : undefined };
          })} />
        </section>
      )}
      <details className="px-1 text-xs text-muted">
        <summary className="min-h-11 cursor-pointer content-center rounded-lg focus-visible:outline-accent-purple">{experience[locale].comparisonTitle}</summary>
        <p className="pb-3 leading-6">{experience[locale].comparisonHelp}</p>
      </details>
    </div>
  );
}
