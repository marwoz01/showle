"use client";

import GameModeCard from "@/components/home/GameModeCard";
import HowItWorks from "@/components/home/HowItWorks";
import { useTranslation } from "@/i18n";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="space-y-12">
      {/* Page header */}
      <div>
        <h1 className="mb-2 text-4xl font-bold text-foreground">
          {t.home.title}
        </h1>
        <p className="max-w-xl text-base text-muted">{t.home.subtitle}</p>
      </div>

      {/* Game mode cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <GameModeCard
          icon={<FilmIcon />}
          title={t.modes.dailyMovie}
          description={t.modes.dailyMovieDesc}
          href="/play/movie"
          actionLabel={t.modes.playChallenge}
          badge={t.modes.popular}
          accentColor="green"
        />
        <GameModeCard
          icon={<TvIcon />}
          title={t.modes.dailySeries}
          description={t.modes.dailySeriesDesc}
          href="/play/series"
          actionLabel={t.modes.comingSoon}
          badge={t.modes.comingSoon}
          accentColor="purple"
          disabled
        />
        <GameModeCard
          icon={<InfinityIcon />}
          title={t.modes.unlimited}
          description={t.modes.unlimitedDesc}
          href="/play/unlimited"
          actionLabel={t.modes.comingSoon}
          badge={t.modes.comingSoon}
          accentColor="cyan"
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

/* Icons */

function FilmIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M7 2v20" />
      <path d="M17 2v20" />
      <path d="M2 12h20" />
      <path d="M2 7h5" />
      <path d="M2 17h5" />
      <path d="M17 7h5" />
      <path d="M17 17h5" />
    </svg>
  );
}

function TvIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
    </svg>
  );
}
