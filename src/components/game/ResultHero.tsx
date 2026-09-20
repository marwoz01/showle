"use client";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { Trophy, XCircle, Star } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";
import type { MediaDetails } from "@/types";
export default function ResultHero({ answer: displayAnswer, won }: { answer: MediaDetails; won: boolean }) {
  const { t } = useTranslation();
  return (<>
      {/* Cinematic hero with backdrop */}
      <div
        data-result-reveal="intro"
        className="relative h-72 overflow-hidden sm:h-96"
      >
        {displayAnswer.backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w1280${displayAnswer.backdropPath}`}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="animate-result-backdrop object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-accent-purple/30 to-card" />
        )}

        {/* Layered gradients for legibility of overlay text */}
        <div className="absolute inset-0 bg-linear-to-t from-card via-card/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-card/70 via-transparent to-transparent" />

        {/* Outcome badge — top-right */}
        <div className="animate-result-badge absolute right-5 top-5 flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              won
                ? "bg-match-exact/30 text-match-exact"
                : "bg-match-miss/30 text-match-miss"
            }`}
          >
            {won ? <Trophy size={16} /> : <XCircle size={16} />}
          </span>
          <span
            className={`text-sm font-semibold ${won ? "text-match-exact" : "text-match-miss"}`}
          >
            {won ? t.result.youGuessed : t.game.lost}
          </span>
        </div>

        {/* Title + meta — bottom-left, rating chip — bottom-right */}
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-3xl font-bold text-foreground drop-shadow-2xl sm:text-4xl">
              {normalizeDisplayText(displayAnswer.title)}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80">
              <span className="font-medium">{displayAnswer.year}</span>
              {displayAnswer.runtime > 0 && (
                <>
                  <span className="text-foreground/40">·</span>
                  <span>{displayAnswer.runtime} min</span>
                </>
              )}
              {displayAnswer.director &&
                displayAnswer.director !== "Unknown" && (
                  <>
                    <span className="text-foreground/40">·</span>
                    <span>{normalizeDisplayText(displayAnswer.director)}</span>
                  </>
                )}
            </div>
          </div>

          {displayAnswer.rating > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1.5 backdrop-blur-md">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-100">
                {displayAnswer.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

</>);
}
