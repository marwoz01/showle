"use client";
import { shortenSynopsis } from "@/lib/synopsis";

import { useState, useRef } from "react";
import { MediaDetails, GuessResult, GameStatus } from "@/types";
import { MAX_ATTEMPTS } from "@/constants";
import { useTranslation } from "@/i18n";
import {
  BarChart3,
  Lightbulb,
  Target,
} from "@/components/ui/icons";
import MovieGallery from "@/components/movie/MovieGallery";
import WatchProviders from "@/components/movie/WatchProviders";
import { buildShareResult } from "@/lib/share-result";
import { getTodayKey } from "@/lib/game-date";
import experience from "@/i18n/experience";


import { useResultMedia } from "@/hooks/useResultMedia";
import { useResultCelebration } from "@/hooks/useResultCelebration";
import ResultHero from "@/components/game/ResultHero";
import ResultDetails from "@/components/game/ResultDetails";
import ResultTrailer from "@/components/game/ResultTrailer";
import ResultFooter from "@/components/game/ResultFooter";
import ResultActions from "@/components/game/ResultActions";

interface ResultScreenProps {
  answer: MediaDetails;
  localizedAnswer?: MediaDetails | null;
  status: GameStatus;
  guesses: GuessResult[];
  hintsUsed: number;
  celebrate?: boolean;
  dateKey?: string;
}

export default function ResultScreen({
  answer,
  localizedAnswer,
  status,
  guesses,
  hintsUsed,
  celebrate = false,
  dateKey = getTodayKey(),
}: ResultScreenProps) {
  const { t, locale } = useTranslation();
  const resultRef = useRef<HTMLDivElement>(null);
  const [shareFallback, setShareFallback] = useState("");

  const won = status === "won";
  const { gallery, activeTrailer, youtubeEmbedUrl, trailerPending } = useResultMedia(answer, won, celebrate, locale);
  useResultCelebration(answer.id, won, celebrate, resultRef);
  const attempts = guesses.length;
  const exactCount = guesses.reduce(
    (sum, g) => sum + g.comparison.filter((c) => c.status === "exact").length,
    0,
  );
  const totalFields = guesses.reduce((sum, g) => sum + g.comparison.length, 0);
  const accuracy =
    totalFields > 0 ? Math.round((exactCount / totalFields) * 100) : 0;
  const displayAnswer =
    locale === "pl" && localizedAnswer ? localizedAnswer : answer;
  const localizedTagline =
    locale === "pl" ? localizedAnswer?.tagline : answer.tagline;
  const localizedOverview =
    locale === "pl" ? localizedAnswer?.overview : answer.overview;
  const stats = [
    {
      icon: <Target size={16} />,
      label: t.result.attempts,
      value: `${attempts}/${MAX_ATTEMPTS}`,
    },
    {
      icon: <Lightbulb size={16} />,
      label: t.result.hintsUsed,
      value: `${hintsUsed}`,
    },
    {
      icon: <BarChart3 size={16} />,
      label: experience[locale].matchingFields,
      value: `${accuracy}%`,
    },
  ];

  return (
    <div ref={resultRef} className="soft-panel overflow-hidden rounded-2xl">
      <ResultHero answer={displayAnswer} won={won} />
      {/* Three-column body: poster | details | trailer and stats */}
      <div
        className={`grid grid-cols-1 gap-6 px-6 py-6 lg:gap-8 ${
          won
            ? "lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_360px]"
            : "lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_180px]"
        }`}
      >
        <ResultActions key={`${answer.id}:${dateKey}:${locale}`} answer={displayAnswer}
          getShareText={() => buildShareResult(dateKey, won, guesses, window.location.origin, locale)} onShareFallback={setShareFallback} />

        <ResultDetails answer={displayAnswer} localizedTagline={localizedTagline} />
        <ResultTrailer title={displayAnswer.title} won={won} youtubeEmbedUrl={youtubeEmbedUrl} trailerPending={trailerPending} activeTrailer={activeTrailer} stats={stats} />
        {/* Shared lower row — uses the space beneath both details and trailer */}
        <div
          data-result-reveal="final"
          className="min-w-0 border-t border-white/6 pt-5 lg:col-start-2 lg:row-start-3 xl:col-span-2 xl:row-start-2"
        >
          <div
            className={`grid min-w-0 gap-6 xl:gap-8 ${
              won
                ? "xl:grid-cols-[minmax(0,1fr)_360px]"
                : "xl:grid-cols-[minmax(0,1fr)_180px]"
            }`}
          >
            {localizedOverview && (
              <section className="min-w-0">
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {t.result.storyline}
                </h4>
                <p className="text-sm leading-relaxed text-muted">
                  {shortenSynopsis(localizedOverview, locale)}
                </p>
              </section>
            )}

            <WatchProviders tmdbId={answer.id} divider={false} />
          </div>
        </div>
      </div>

      {/* Gallery — cinematic stills from TMDB */}
      {gallery.length > 0 && (
        <div
          data-result-reveal="final"
          className="border-t border-white/6 px-6 py-5"
        >
          <MovieGallery paths={gallery} label={t.result.gallery} />
        </div>
      )}

      <ResultFooter shareFallback={shareFallback} guesses={guesses} />
    </div>
  );
}
