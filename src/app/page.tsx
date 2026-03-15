"use client";

import GameModeCard from "@/components/home/GameModeCard";
import HowItWorks from "@/components/home/HowItWorks";
import { useTranslation } from "@/i18n";
import { Clapperboard, Tv, Infinity } from "lucide-react";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="relative space-y-12 overflow-hidden">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-150 -translate-x-1/2 rounded-full bg-accent-purple/8 blur-3xl" />
      <div className="pointer-events-none absolute -top-20 left-1/3 h-64 w-100 -translate-x-1/2 rounded-full bg-accent-purple/5 blur-3xl" />

      {/* Page header */}
      <div className="relative">
        <h1 className="mb-2 text-4xl font-semibold text-foreground">
          {t.home.title}
        </h1>
        <p className="max-w-xl text-base text-muted">{t.home.subtitle}</p>
      </div>

      {/* Game mode cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <GameModeCard
          icon={<Clapperboard size={22} />}
          title={t.modes.dailyMovie}
          description={t.modes.dailyMovieDesc}
          href="/play/movie"
          actionLabel={t.modes.playChallenge}
          badge={t.modes.popular}
        />
        <GameModeCard
          icon={<Tv size={22} />}
          title={t.modes.dailySeries}
          description={t.modes.dailySeriesDesc}
          href="/play/series"
          actionLabel={t.modes.comingSoon}
          badge={t.modes.comingSoon}
          disabled
        />
        <GameModeCard
          icon={<Infinity size={22} />}
          title={t.modes.unlimited}
          description={t.modes.unlimitedDesc}
          href="/play/unlimited"
          actionLabel={t.modes.comingSoon}
          badge={t.modes.comingSoon}
          disabled
        />
      </div>

      {/* Divider */}
      <div className="border-t border-white/6" />

      {/* How It Works */}
      <HowItWorks />
    </div>
  );
}
