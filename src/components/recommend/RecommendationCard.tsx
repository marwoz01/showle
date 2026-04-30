"use client";

import { useState } from "react";
import Image from "next/image";
import { MediaDetails } from "@/types";
import { useTranslation } from "@/i18n";
import { Star, Zap } from "lucide-react";
import SaveMovieButton from "@/components/collection/SaveMovieButton";
import MovieDetailsModal from "@/components/movie/MovieDetailsModal";

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
  const [showDetails, setShowDetails] = useState(false);

  // Stop nested buttons (SaveMovieButton) from re-triggering the card click.
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  // Keyboard support for the card-as-button pattern.
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setShowDetails(true);
    }
  };

  if (variant === "top") {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowDetails(true)}
          onKeyDown={handleKey}
          className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/6 bg-card transition-all hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:flex-row"
          style={{ animation: "fadeSlideUp 0.4s ease-out both" }}
        >
          {/* Poster */}
          <div className="shrink-0 p-4 pb-0 sm:pb-4 sm:pr-0">
            <div className="relative overflow-hidden rounded-xl">
              {movie.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                  alt={movie.title}
                  width={342}
                  height={513}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:w-48"
                />
              ) : (
                <div className="flex aspect-3/4 items-center justify-center bg-white/5 p-4 text-center text-sm text-muted sm:w-48">
                  {movie.title}
                </div>
              )}
              <div className="absolute right-2 top-2" onClick={stopPropagation}>
                <SaveMovieButton movie={movie} />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col p-4 sm:p-6">
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

        {showDetails && (
          <MovieDetailsModal
            tmdbId={movie.id}
            initial={movie}
            onClose={() => setShowDetails(false)}
          />
        )}
      </>
    );
  }

  // Regular vertical card
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetails(true)}
        onKeyDown={handleKey}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/6 bg-card transition-all hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        style={{
          animationDelay: `${index * 100}ms`,
          animation: "fadeSlideUp 0.4s ease-out both",
        }}
      >
        {/* Poster */}
        <div className="p-2.5 pb-0">
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-lg">
            {movie.posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
                alt={movie.title}
                fill
                sizes="(max-width: 640px) 45vw, 185px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-white/5 p-3 text-center text-xs text-muted">
                {movie.title}
              </div>
            )}
            <div className="absolute right-1.5 top-1.5" onClick={stopPropagation}>
              <SaveMovieButton movie={movie} />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col p-2.5">
          {/* Title */}
          <h3 className="mb-0.5 text-sm font-bold leading-tight text-foreground">
            {movie.title}
          </h3>

          {/* Meta */}
          <div className="mb-1 flex items-center gap-1 text-[10px] text-muted">
            <span>{movie.year}</span>
            {movie.runtime > 0 && (
              <>
                <span>·</span>
                <span>{formatRuntime(movie.runtime)}</span>
              </>
            )}
          </div>

          {/* Rating + genres */}
          <div className="mb-1 flex flex-wrap items-center gap-1">
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

          {/* Justification tag */}
          <div className="mt-auto rounded-md bg-accent-purple/10 px-1.5 py-1">
            <div className="flex items-start gap-1">
              <Zap size={8} className="mt-0.5 shrink-0 text-accent-purple" />
              <p className="line-clamp-4 text-[10px] leading-snug text-accent-purple">
                {justification}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDetails && (
        <MovieDetailsModal
          tmdbId={movie.id}
          initial={movie}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
}
