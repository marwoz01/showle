"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslation } from "@/i18n";
import { movieChoiceRoomCopy } from "@/i18n/movie-choice-room";
import { normalizeDisplayText } from "@/lib/typography";
import { shortenSynopsis } from "@/lib/synopsis";
import { localizeGenre } from "@/lib/localization";
import { Check, Film, Star, X } from "@/components/ui/icons";
import MovieDetailsModal from "@/components/movie/MovieDetailsModal";
import WatchProviders from "@/components/movie/WatchProviders";
import SaveMovieButton from "@/components/collection/SaveMovieButton";
import type { MediaDetails } from "@/types";

interface Props {
  movie: MediaDetails;
  matched?: boolean;
  pending?: boolean;
  onVote?: (liked: boolean) => void;
}

export default function MovieChoiceFilm({ movie, matched = false, pending = false, onVote }: Props) {
  const { t, locale } = useTranslation();
  const c = movieChoiceRoomCopy[locale];
  const [details, setDetails] = useState(false);
  return (
    <>
      <article className={`soft-card overflow-hidden rounded-2xl ${matched ? "ring-1 ring-match-exact/40" : ""}`} data-choice-film={movie.id}>
        <div className="flex gap-4 p-5 sm:gap-7 sm:p-7">
          <div className="relative aspect-2/3 w-24 shrink-0 self-start overflow-hidden rounded-xl bg-white/5 sm:w-44">
            {movie.posterPath ? <Image src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={normalizeDisplayText(movie.title)} fill sizes="(min-width: 640px) 176px, 96px" className="object-cover" priority /> : <Film size={42} className="absolute inset-0 m-auto text-muted" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 aria-live="polite" className="font-display text-xl font-semibold leading-tight sm:text-3xl">{normalizeDisplayText(movie.title)}</h2>
              {matched && <SaveMovieButton movie={movie} />}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>{movie.year}</span>
              {movie.runtime > 0 && <span>{movie.runtime} min</span>}
              {movie.rating > 0 && <span className="inline-flex items-center gap-1 text-yellow-400"><Star size={14} />{movie.rating.toFixed(1)}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {movie.genres.slice(0, 4).map(genre => <span key={genre} className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-muted">{localizeGenre(genre, t)}</span>)}
            </div>
            <p className="mt-4 hidden text-sm leading-6 text-muted sm:block">{normalizeDisplayText(shortenSynopsis(movie.overview) || c.noOverview)}</p>
            <button type="button" onClick={() => setDetails(true)} className="mt-3 hidden min-h-11 text-sm font-medium text-accent-purple hover:underline focus-visible:outline-accent-purple sm:inline-block">{c.details}</button>
          </div>
        </div>
        <div className="px-5 pb-4 sm:hidden">
          <p className="text-sm leading-6 text-muted">{normalizeDisplayText(shortenSynopsis(movie.overview) || c.noOverview)}</p>
          <button type="button" onClick={() => setDetails(true)} className="mt-2 min-h-11 text-sm font-medium text-accent-purple hover:underline focus-visible:outline-accent-purple">{c.details}</button>
        </div>
        {matched ? <div className="px-5 pb-5 sm:px-7 sm:pb-7"><WatchProviders tmdbId={movie.id} /></div> : <div className="grid grid-cols-2 gap-3 border-t border-white/6 p-4 sm:px-7">
          <button type="button" disabled={pending} onClick={() => onVote?.(false)} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-accent-purple disabled:opacity-50"><X size={18} />{c.skip}</button>
          <button type="button" disabled={pending} onClick={() => onVote?.(true)} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-accent-purple px-3 py-3 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"><Check size={18} />{c.like}</button>
        </div>}
      </article>
      {details && <MovieDetailsModal tmdbId={movie.id} initial={movie} onClose={() => setDetails(false)} />}
    </>
  );
}
