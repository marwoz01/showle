"use client";

import { UsersRound } from "lucide-react";
import { UserRound } from "@/components/ui/icons";
import GameModeCard from "@/components/home/GameModeCard";
import { useTranslation } from "@/i18n";
import { movieChoiceCopy } from "@/i18n/movie-choice";

export default function RecommendPage() {
  const { locale } = useTranslation();
  const copy = movieChoiceCopy[locale];

  return (
    <div className="mx-auto max-w-5xl py-6 sm:py-12">
      <header className="mb-8 max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-purple">
          Showle
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
          {copy.subtitle}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <GameModeCard
          icon={<UserRound size={22} />}
          title={copy.soloTitle}
          description={copy.soloDescription}
          href="/recommend/solo"
          actionLabel={copy.soloAction}
        />
        <GameModeCard
          icon={<UsersRound size={22} aria-hidden="true" />}
          title={copy.togetherTitle}
          description={copy.togetherDescription}
          href="/recommend/together"
          actionLabel={copy.togetherAction}
        />
      </div>
    </div>
  );
}
