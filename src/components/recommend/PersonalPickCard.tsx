"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { Film, Star } from "@/components/ui/icons";
import MovieDetailsModal from "@/components/movie/MovieDetailsModal";
import WatchProviders from "@/components/movie/WatchProviders";
import SaveMovieButton from "@/components/collection/SaveMovieButton";
import RecommendationFeedback from "@/components/recommend/RecommendationFeedback";
import { normalizeDisplayText } from "@/lib/typography";
import { localizeGenre } from "@/lib/localization";
import type { Recommendation, RecommendationReaction } from "@/types/recommendation";

interface Props { result: Recommendation; selected?: RecommendationReaction; disabled: boolean; onReact: (reaction: RecommendationReaction | null) => void }

export default function PersonalPickCard({ result: { movie, justification }, selected, disabled, onReact }: Props) {
  const { t } = useTranslation();
  const [details, setDetails] = useState(false);
  const title = normalizeDisplayText(movie.title);
  return <article className="soft-card flex min-w-0 flex-col rounded-2xl p-4 sm:p-5">
    <div className="flex items-start gap-4 sm:flex-col">
      <button type="button" aria-label={`${t.recommendationHome.details}: ${title}`} onClick={() => setDetails(true)}
        className="relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5 focus-visible:outline-2 focus-visible:outline-accent-purple sm:aspect-4/5 sm:w-full">
        {movie.posterPath ? <Image src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={title} fill
          sizes="(max-width: 639px) 96px, (max-width: 1023px) 30vw, 300px" className="object-cover" />
          : <Film size={30} className="absolute inset-0 m-auto text-muted" />}
      </button>
      <div className="min-w-0 space-y-2">
        <button type="button" onClick={() => setDetails(true)} className="text-left font-display text-lg font-semibold leading-snug hover:text-accent-purple focus-visible:outline-accent-purple">{title}</button>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {movie.year > 0 && <span>{movie.year}</span>}
          {movie.runtime > 0 && <span>{t.recommendationHome.minutes(movie.runtime)}</span>}
          {movie.rating > 0 && <span className="inline-flex items-center gap-1"><Star size={12} />{movie.rating.toFixed(1)}</span>}
        </p>
        <p className="text-xs leading-relaxed text-muted">{movie.genres.slice(0, 3).map((genre) => localizeGenre(genre, t)).join(" · ")}</p>
      </div>
    </div>
    <p className="my-4 text-sm leading-relaxed text-muted">{normalizeDisplayText(justification)}</p>
    <div className="mt-auto space-y-4">
      <WatchProviders tmdbId={movie.id} />
      <SaveMovieButton movie={movie} variant="button" />
      <RecommendationFeedback selected={selected} disabled={disabled} onReact={onReact} />
    </div>
    {details && <MovieDetailsModal tmdbId={movie.id} initial={movie} onClose={() => setDetails(false)} />}
  </article>;
}
