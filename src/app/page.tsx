"use client";

import GameModeCard from "@/components/home/GameModeCard";
import HowItWorks from "@/components/home/HowItWorks";
import { useTranslation } from "@/i18n";
import { Clapperboard, Sparkles } from "lucide-react";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="relative space-y-12 overflow-x-hidden">
      {/* Page header */}
      <div className="relative">
        <h1 className="mb-2 text-4xl font-semibold text-foreground">
          {t.home.title}
        </h1>
        <p className="max-w-xl text-base text-muted">{t.home.subtitle}</p>
      </div>

      {/* Game mode cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <GameModeCard
          icon={<Clapperboard size={22} />}
          title={t.modes.dailyMovie}
          description={t.modes.dailyMovieDesc}
          href="/play/movie"
          actionLabel={t.modes.playChallenge}
          badge={t.modes.popular}
        />
        <div className="md:col-span-2 [&>a]:h-full">
          <GameModeCard
            icon={<Sparkles size={22} />}
            title={t.recommend.modeTitle}
            description={t.recommend.modeDesc}
            href="/recommend"
            actionLabel={t.recommend.getRecommendations}
            badge={t.modes.new}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/6" />

      {/* How It Works */}
      <HowItWorks />
    </div>
  );
}
