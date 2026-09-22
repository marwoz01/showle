"use client";

import Image from "next/image";
import { useTranslation } from "@/i18n";
import { Check, Loader2 } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";
import { localizeGenres } from "@/lib/localization";
import type { MediaDetails } from "@/types";
import type { MovieSuggestion } from "@/types/movie-suggestion";

export type CollectionMovieOption = MediaDetails | MovieSuggestion;

interface AddMovieResultsProps {
  movies: CollectionMovieOption[];
  selected: Map<number, CollectionMovieOption>;
  loading: boolean;
  disabled: boolean;
  error: boolean;
  onSelect: (movie: CollectionMovieOption) => void;
  onLoadMore: () => void;
}

export default function AddMovieResults({ movies, selected, loading, disabled, error, onSelect, onLoadMore }: AddMovieResultsProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-white/6 bg-card"
      onScroll={(event) => {
        const list = event.currentTarget;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 100) onLoadMore();
      }}>
      {movies.map((movie) => {
        const checked = selected.has(movie.id);
        return (
          <button key={movie.id} type="button" aria-pressed={checked} disabled={disabled}
            onClick={() => onSelect(movie)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4 disabled:opacity-60 ${checked ? "bg-accent-purple/5" : ""}`}>
            <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-accent-purple bg-accent-purple text-white" : "border-white/15 bg-white/3 text-transparent"}`}>
              <Check size={12} strokeWidth={3} />
            </span>
            {movie.posterPath && <Image src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`} alt="" width={32} height={48} className="shrink-0 rounded" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{normalizeDisplayText(movie.title)}</span>
              <span className="block text-xs text-muted">
                {movie.year}
                {"genres" in movie && movie.genres.length > 0 && ` · ${localizeGenres(movie.genres.slice(0, 2), t).join(", ")}`}
              </span>
            </span>
          </button>
        );
      })}
      {loading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-muted" /></div>}
      {error && <p role="alert" className="px-4 py-5 text-center text-sm text-muted">{t.common.genericError}</p>}
      {!loading && !error && movies.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">{t.collection.noSearchResults}</p>}
    </div>
  );
}
