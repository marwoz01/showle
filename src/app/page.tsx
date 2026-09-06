"use client";
import GameModeCard from "@/components/home/GameModeCard";
import DailyEntry from "@/components/home/DailyEntry";
import HowItWorks from "@/components/home/HowItWorks";
import { useTranslation } from "@/i18n";
import { Sparkles, Swords, Film } from "lucide-react";
import experience from "@/i18n/experience";

export default function Home() {
  const { t, locale } = useTranslation();
  return (
    <div className="relative space-y-10">
      <header>
        <h1 className="mb-2 text-4xl font-semibold">{t.home.title}</h1>
        <p className="max-w-xl text-base text-muted">{t.home.subtitle}</p>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="min-w-0 md:col-span-2">
          <DailyEntry />
        </div>
        <GameModeCard
          icon={<Swords size={22} />}
          title={t.duel.modeTitle}
          description={t.duel.modeDesc}
          href="/play/duel"
          actionLabel={t.duel.modeAction}
          badge={t.duel.badge}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <GameModeCard
          icon={<Film size={22} />}
          title={experience[locale].practiceTitle}
          description={experience[locale].practiceDesc}
          href="/play/practice"
          actionLabel={experience[locale].practiceAction}
          badge={t.modes.new}
        />
        <GameModeCard
          icon={<Sparkles size={22} />}
          title={t.recommend.modeTitle}
          description={t.recommend.modeDesc}
          href="/recommend"
          actionLabel={t.recommend.getRecommendations}
        />
      </div>
      <div className="border-t border-white/6" />
      <HowItWorks />
    </div>
  );
}
