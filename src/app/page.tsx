"use client";
import GameModeCard from "@/components/home/GameModeCard";
import DailyEntry from "@/components/home/DailyEntry";
import HowItWorks from "@/components/home/HowItWorks";
import RecommendationHome from "@/components/recommend/RecommendationHome";
import RecommendationLoading from "@/components/recommend/RecommendationLoading";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { Swords, Film, ArrowUpDown } from "@/components/ui/icons";
import experience from "@/i18n/experience";
import { higherLowerCopy } from "@/i18n/higher-lower";

export default function Home() {
  const { t, locale } = useTranslation();
  const { userId, isLoaded } = useAuth();
  return (
    <div className="relative space-y-10">
      {isLoaded ? <RecommendationHome key={`${userId ?? "guest"}:${locale}`} userId={userId ?? null} embedded />
        : <RecommendationLoading />}
      <header id="games" className="scroll-mt-24 border-t border-white/6 pt-8">
        <h2 className="mb-2 text-2xl font-semibold">{t.home.title}</h2>
        <p className="max-w-xl text-base text-muted">{t.home.subtitle}</p>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="min-w-0 md:col-span-2">
          <DailyEntry />
        </div>
        <GameModeCard
          icon={<Swords size={22} idle />}
          title={t.duel.modeTitle}
          description={t.duel.modeDesc}
          href="/play/duel"
          actionLabel={t.duel.modeAction}
          badge={t.duel.badge}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <GameModeCard
          icon={<ArrowUpDown size={22} idle />}
          title={higherLowerCopy[locale].modeTitle}
          description={higherLowerCopy[locale].modeDesc}
          href="/play/higher-lower"
          actionLabel={higherLowerCopy[locale].modeAction}
          badge={t.modes.new}
        />
        <GameModeCard
          icon={<Film size={22} idle />}
          title={experience[locale].practiceTitle}
          description={experience[locale].practiceDesc}
          href="/play/practice"
          actionLabel={experience[locale].practiceAction}
          badge={t.modes.new}
        />
      </div>
      <div className="border-t border-white/6" />
      <HowItWorks />
    </div>
  );
}
