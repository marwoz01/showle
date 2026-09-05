"use client";

import { Clapperboard, Swords } from "lucide-react";
import GameModeCard from "@/components/home/GameModeCard";
import { useTranslation } from "@/i18n";

export default function PlayModePage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-5xl py-6 sm:py-12">
      <div className="mb-8 max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-purple">
          Showle
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-5xl">
          {t.duel.selectTitle}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
          {t.duel.selectSubtitle}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <GameModeCard
          icon={<Clapperboard size={22} />}
          title={t.modes.dailyMovie}
          description={t.modes.dailyMovieDesc}
          href="/play/movie"
          actionLabel={t.modes.playChallenge}
          badge={t.modes.popular}
        />
        <GameModeCard
          icon={<Swords size={22} />}
          title={t.duel.modeTitle}
          description={t.duel.modeDesc}
          href="/play/duel"
          actionLabel={t.duel.modeAction}
          badge={t.duel.badge}
        />
      </div>
    </div>
  );
}
