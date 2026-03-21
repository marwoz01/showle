"use client";

import { MediaDetails } from "@/types";
import { useTranslation } from "@/i18n";
import { Star, Zap } from "lucide-react";

interface RecommendationCardProps {
  movie: MediaDetails;
  justification: string;
  index: number;
  variant?: "top" | "regular";
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function RecommendationCard({
  movie,
  justification,
  index,
  variant = "regular",
}: RecommendationCardProps) {
  const { t } = useTranslation();

  if (variant === "top") {
    return (
      <div
        className="group relative flex overflow-hidden rounded-2xl border border-white/6 bg-card transition-all hover:bg-card-hover"
        style={{ animation: "fadeSlideUp 0.4s ease-out both" }}
      >
        {/* Poster — left column */}
        <div className="shrink-0 p-4 pr-0">
          <div className="relative w-40 overflow-hidden rounded-xl sm:w-48">
            {movie.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                alt={movie.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex aspect-3/4 items-center justify-center bg-white/5 p-4 text-center text-sm text-muted">
                {movie.title}
              </div>
            )}
          </div>
        </div>

        {/* Info — right column */}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {/* Top Pick badge + meta */}
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-bold uppercase tracking-wider text-accent-purple">
              {t.recommend.topPick}
            </span>
            <span>·</span>
            <span>{movie.year}</span>
            {movie.runtime > 0 && (
              <>
                <span>·</span>
                <span>{formatRuntime(movie.runtime)}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">
            {movie.title}
          </h3>

          {/* Overview */}
          {movie.overview && (
            <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted">
              {movie.overview}
            </p>
          )}

          {/* Rating + genres */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-400">
              <Star size={11} fill="currentColor" />
              {movie.rating}
            </div>
            {movie.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded bg-white/5 px-2 py-0.5 text-xs text-muted"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Justification */}
          <div className="mt-auto rounded-xl bg-white/3 p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-accent-purple">
              <Zap size={12} />
              {t.recommend.whyRecommend}
            </div>
            <p className="text-sm leading-relaxed text-muted">
              {justification}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Regular vertical card
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/6 bg-card transition-all hover:bg-card-hover"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: "fadeSlideUp 0.4s ease-out both",
      }}
    >
      {/* Poster */}
      <div className="p-3 pb-0">
        <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg">
          {movie.posterPath ? (
            <img
              src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
              alt={movie.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-white/5 p-3 text-center text-xs text-muted">
              {movie.title}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        {/* Title */}
        <h3 className="mb-0.5 text-xs font-bold leading-tight text-foreground">
          {movie.title}
        </h3>

        {/* Meta */}
        <div className="mb-1.5 flex items-center gap-1 text-[10px] text-muted">
          <span>{movie.year}</span>
          {movie.runtime > 0 && (
            <>
              <span>·</span>
              <span>{formatRuntime(movie.runtime)}</span>
            </>
          )}
        </div>

        {/* Rating + genres */}
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-0.5 rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">
            <Star size={9} fill="currentColor" />
            {movie.rating}
          </div>
          {movie.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Director */}
        {movie.director && (
          <p className="mb-1.5 text-[10px] text-muted">
            {movie.director}
          </p>
        )}

        {/* Justification tag */}
        <div className="mt-auto rounded-md bg-accent-purple/10 px-2 py-1.5">
          <div className="flex items-start gap-1">
            <Zap
              size={9}
              className="mt-0.5 shrink-0 text-accent-purple"
            />
            <p className="line-clamp-3 text-[10px] leading-relaxed text-accent-purple">
              {justification}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
